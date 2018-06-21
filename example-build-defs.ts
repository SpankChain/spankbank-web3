#!/usr/bin/env ts-node

import * as fs from 'fs'

import * as mp from './metaprogramming'

let sourceFile = mp.loadSourceFile('./spankbank.ts')

let defs: any[] = []
for (let className of ['SpankBank', 'Token']) {
  let methods = mp.findSmartContractMethodDefinitions(sourceFile, className)
  defs.push({
    className,
    methods,
  })
}

if (!fs.existsSync(__dirname + '/dist/'))
  fs.mkdirSync(__dirname + '/dist/')
fs.writeFileSync(__dirname + '/dist/example-defs.js', 'window.exampleDefs = ' + JSON.stringify(defs))
