#!/usr/bin/env ts-node

import * as mp from './metaprogramming'
import * as spankbank from './spankbank'


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

function tsArgTypeToSolType(type) {
  return {
    number: 'uint256',
    EthAddress: 'address',
    SpankAmount: 'uint256',
    BootyAmount: 'uint256',
  }[type] || type
}

function checkSmartContract(sourceFile, className: string, abi: any): boolean {
  let definedMethods = mp.findSmartContractMethodDefinitions(sourceFile, className)

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
let sourceFile = mp.loadSourceFile('./spankbank.ts')

for (let className of ['SpankBank', 'Token']) {
  console.log(`Checking ${className}...`)
  let res = checkSmartContract(sourceFile, className, spankbank[className].contractAbi)
  hasErr = hasErr || res
  if (res)
    console.log()
}

console.log(hasErr ? 'Errors were found!' : 'Looks good!')
process.exit(hasErr ? 1 : 0)
