#!/usr/bin/env ts-node

import {readFileSync} from "fs"
import * as ts from "typescript"

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

let sourceFile = ts.createSourceFile(
  'spankbank.ts',
  readFileSync('spankbank.ts').toString(),
  ts.ScriptTarget.ES2016,
  /*setParentNodes */ true
)

let definedMethods: any[] = []
processSpankBank(sourceFile)
console.log(definedMethods)

process.stderr.write(JSON.stringify(definedMethods.map(m => ({
  name: m.name,
  args: m.args.map(a => [a.name, a.type]),
}))))


  
