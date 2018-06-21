#!/usr/bin/env ts-node

import { readFileSync } from 'fs'
import * as ts from 'typescript'

import * as spankbank from './spankbank'

function findFunctionCall(node: ts.Node, name: string) {
  let call
  function recurse(node: ts.Node) {
    if (node.kind == ts.SyntaxKind.CallExpression && node.getText().indexOf(name) == 0) {
      call = node.getText()
      return
    }

    ts.forEachChild(node, recurse)
  }

  ts.forEachChild(node, recurse)
  return call
}

function handleMethodNode(node: ts.MethodDeclaration): any {
  let methodName = node.name.getText()
  let args = node.parameters.map((p: ts.ParameterDeclaration) => {
    return {
      name: p.name.getText(),
      type: p.type!.getText(),
    }
  })

  let call = findFunctionCall(node, 'this._call')

  definedMethods.push({
    name: methodName,
    args,
    call,
  })
}

function handleSpankBank(node: ts.ClassDeclaration) {
  ts.forEachChild(node, (node: ts.Node) => {
    if (node.kind == ts.SyntaxKind.MethodDeclaration) {
      let methodText = node.getText()
      if (methodText.indexOf('return await this._call') >= 0)
        handleMethodNode(node as ts.MethodDeclaration)
    }
  })
}

export function processSpankBank(sourceFile: ts.SourceFile) {
  function recurse(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.ClassDeclaration:
        let clsDef = node as ts.ClassDeclaration
        if (clsDef.name && clsDef.name.getText() == 'SpankBank')
          handleSpankBank(clsDef)
        return
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.BinaryExpression:
        return
    }

    ts.forEachChild(node, processSpankBank)
  }

  recurse(sourceFile)
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

function writeMethodsJson() {
  process.stderr.write(JSON.stringify(definedMethods.map(m => ({
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

let sourceFile = ts.createSourceFile(
  'spankbank.ts',
  readFileSync('spankbank.ts').toString(),
  ts.ScriptTarget.ES2016,
  /*setParentNodes */ true
)

// todo: clean this up
let definedMethods: any[] = []
processSpankBank(sourceFile)

let mismatchedCalls: any[] = []
definedMethods.forEach(m => {
  let expectedArgs = (
    m.args.length == 0 ? '' :
    `, [${m.args.map(a => a.name).join(', ')}]`
  )
  let expectedCall = `this._call('${m.name}'${expectedArgs})`
  if (expectedCall != m.call) {
    mismatchedCalls.push({
      method: m,
      expected: expectedCall,
      actual: m.call,
    })
  }
})

mismatchedCalls.forEach(mc => {
  console.error(mc.method.name + ': does not correctly call metamask!')
  console.error('Expected:', mc.expected)
  console.error('  Actual:', mc.actual)
})

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
  console.error(m.expected.name + ': argument mismatch!')
  console.error('Expected:', m.expected.args.map(arg => arg.name + ': ' + arg.type).join(', '))
  console.error('  Actual:', m.actual.args.map(arg => arg.name + ': ' + tsArgTypeToSolType(arg.type)).join(', '))
})

if (mismatchedMethods.length || mismatchedCalls.length)
  process.exit(1)

console.log('Okay!')

// TODO:
// - Add token methods
