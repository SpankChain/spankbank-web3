#!/usr/bin/env ts-node

import { writeFileSync } from 'fs'

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

writeFileSync(__dirname + '/dist/example-defs.js', 'window.exampleDefs = ' + JSON.stringify(defs))
