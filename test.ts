#!/usr/bin/env ts-node

import { readFileSync } from 'fs'
import * as ts from 'typescript'

import * as spankbank from './spankbank'

interface MethodCall {
  name: string
  args: Array<{ name: string, type: string }>
  call: string
}

function findSmartContractMethodDefinitions(sourceFile: ts.SourceFile, targetClassName: string): MethodCall[] {

  function getMethodCallsFromNodes(nodes: ts.Node[]): MethodCall[] {
    let res: MethodCall[] = []

    function findFunctionCall(node: ts.Node, name: string) {
      let call
      function recurse(node: ts.Node) {
        if (node.kind == ts.SyntaxKind.CallExpression && node.getText().indexOf(name) == 0) {
          let srcFileStr = node.getSourceFile().text
          // 13 == 'return await '.length
          call = srcFileStr.slice(node.getStart() - 13, node.getEnd())
        }

        ts.forEachChild(node, recurse)
      }

      ts.forEachChild(node, recurse)
      return call
    }

    nodes.forEach((node: ts.MethodDeclaration) => {
      let methodName = node.name.getText()
      let args = node.parameters.map((p: ts.ParameterDeclaration) => {
        return {
          name: p.name.getText(),
          type: p.type!.getText(),
        }
      })

      let call = findFunctionCall(node, 'this._call')

      res.push({
        name: methodName,
        args,
        call,
      })
    })

    return res
  }

  function findSmartContractCalls(node: ts.ClassDeclaration) {
    let res: ts.MethodDeclaration[] = []

    ts.forEachChild(node, (node: ts.Node) => {
      if (node.kind == ts.SyntaxKind.MethodDeclaration) {
        let methodText = node.getText()
        if (methodText.indexOf('this._call') >= 0)
          res.push(node as ts.MethodDeclaration)
      }
    })

    return res
  }

  function findClass(sourceFile: ts.SourceFile, targetClassName: string) {
    let res

    function recurse(node: ts.Node) {
      switch (node.kind) {
        case ts.SyntaxKind.ClassDeclaration:
          let clsDef = node as ts.ClassDeclaration
          if (clsDef.name && clsDef.name.getText() == targetClassName)
            res = clsDef
          return
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.BinaryExpression:
          return
      }

      ts.forEachChild(node, recurse)
    }

    recurse(sourceFile)
    return res
  }

  let cls = findClass(sourceFile, targetClassName)
  let methodNodes = findSmartContractCalls(cls)
  return getMethodCallsFromNodes(methodNodes)
}

function loadSourceFile(name: string) {
  return ts.createSourceFile(
    name,
    readFileSync(name).toString(),
    ts.ScriptTarget.ES2016,
    /*setParentNodes */ true
  )
}

function getExpectedMethodsFromContractAbi(abi): any[] {
  let expectedMethods: any[] = []
  abi.forEach(method => {
    if (method.type !== 'function')
      return

    expectedMethods.push({
      name: method.name,
      returnType: method.outputs[0] && method.outputs[0].type,
      args: method.inputs.map(arg => ({
        ...arg,
        name: arg.name.replace(/^_*/, ''),
      })),
    })
  })
  return expectedMethods
}

function writeMethodsJson(methods) {
  process.stderr.write(JSON.stringify(methods.map(m => ({
    name: m.name,
    args: m.args.map(a => [a.name, a.type]),
  }))))
}

function tsArgTypeToSolType(type) {
  return {
    number: 'uint256',
    EthAddress: 'address',
    SpankAmount: 'uint256',
    BootyAmount: 'uint256',
  }[type] || type
}

function checkSmartContract(sourceFile, className: string, abi: any): boolean {
  let definedMethods = findSmartContractMethodDefinitions(sourceFile, className)

  // Check that each method correctly calls `return await this._call('name', [args])`
  let mismatchedCalls: any[] = []
  definedMethods.forEach(m => {
    let expectedArgs = (
      m.args.length == 0 ? '' :
      `, [${m.args.map(a => a.name).join(', ')}]`
    )
    let expectedCall = `return await this._call('${m.name}'${expectedArgs})`
    if (expectedCall != m.call) {
      mismatchedCalls.push({
        method: m,
        expected: expectedCall,
        actual: m.call,
      })
    }
  })

  mismatchedCalls.forEach(mc => {
    console.error(className + '.' + mc.method.name + ': incorrect smart contract call!')
    console.error('  Expected:', mc.expected)
    console.error('    Actual:', mc.actual)
  })

  // Check that, for each method defined on the class, it matches the
  // corresponding method on the smart contract.
  let expectedMethods = getExpectedMethodsFromContractAbi(spankbank.SpankBank.contractAbi)
  let missingMethods: any[] = []
  let mismatchedMethods: any[] = []
  expectedMethods.forEach(method => {
    let definedMethod = definedMethods.filter(m => m.name == method.name)[0]
    if (!definedMethod) {
      missingMethods.push(method)
      return
    }

    // compare arguments
    for (let i = 0; i < Math.max(definedMethod.args.length, method.args.length); i += 1) {
      let dArg = definedMethod.args[i]
      let mArg = method.args[i]
      let argMismatch = (
        (!dArg || !mArg) ||
        (dArg.name != mArg.name) ||
        (tsArgTypeToSolType(dArg.type) != mArg.type)
      )

      if (argMismatch) {
        mismatchedMethods.push({
          expected: method,
          actual: definedMethod,
        })
        return
      }
    }
  })

  mismatchedMethods.forEach(m => {
    console.error(className + '.' + m.expected.name + ': argument mismatch!')
    console.error('  Expected:', m.expected.args.map(arg => arg.name + ': ' + arg.type).join(', '))
    console.error('    Actual:', m.actual.args.map(arg => arg.name + ': ' + tsArgTypeToSolType(arg.type)).join(', '))
  })

  return !!(mismatchedMethods.length || mismatchedCalls.length)
}

let hasErr = false
let sourceFile = loadSourceFile('./spankbank.ts')

for (let className of ['SpankBank', 'Token']) {
  console.log(`Checking ${className}...`)
  let res = checkSmartContract(sourceFile, className, spankbank[className].contractAbi)
  hasErr = hasErr || res
  if (res)
    console.log()
}

console.log(hasErr ? 'Errors were found!' : 'Looks good!')
process.exit(hasErr ? 1 : 0)
