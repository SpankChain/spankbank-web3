import { readFileSync } from 'fs'
import * as ts from 'typescript'

interface MethodCall {
  name: string
  args: Array<{ name: string, type: string }>
  returnType: string,
  call: string
}

export function findSmartContractMethodDefinitions(sourceFile: ts.SourceFile, targetClassName: string): MethodCall[] {
  function getMethodCallsFromNodes(nodes: ts.Node[]): MethodCall[] {
    let res: MethodCall[] = []

    function findFunctionCall(node: ts.Node, name: string) {
      let call
      function recurse(node: ts.Node) {
        if (node.kind == ts.SyntaxKind.CallExpression && node.getText().indexOf(name) == 0) {
          let srcFileStr = node.getSourceFile().text
          let start = node.getStart()
          while (srcFileStr.charAt(start) != '\n' && start > 0) {
            start -= 1
          }
          call = srcFileStr.slice(start + 1, node.getEnd() + 1).replace(/^\s*/, '')
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

      let typeMatch = node.getText().match(/Promise<([^>]+)>/)
      let returnType = typeMatch && typeMatch[1] || '<invalid>'

      let call = findFunctionCall(node, 'this._call')

      res.push({
        name: methodName,
        args,
        returnType,
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

export function loadSourceFile(name: string) {
  return ts.createSourceFile(
    name,
    readFileSync(name).toString(),
    ts.ScriptTarget.ES2016,
    /*setParentNodes */ true
  )
}

