import * as chai from 'chai'

import * as mp from '../metaprogramming'
import * as spankbank from '../spankbank'

let methodReturnStructs = {
  'periods': 'Period',
  'stakers': 'Staker',
}

let ignoreMethods = {
  'stakers': true,
  'periods': true,
}

function findStructName(methodName) {
  let name = methodReturnStructs[methodName]
  if (!name) {
    console.error(`No return type name for method: ${methodName} (see 'methodReturnStructs')`)
    return '<unknown>'
  }

  return name
}

function getExpectedMethodsFromContractAbi(abi): any[] {
  let expectedMethods: any[] = []
  abi.forEach(method => {
    if (method.type !== 'function')
      return

    if (ignoreMethods[method.name])
      return

    if (method.inputs.length && method.inputs[0].name == '')
      method.inputs[0].name = 'key'

    let returnType = (
      method.outputs.length == 0 ? 'TxHash' :
      method.outputs.length == 1 ? method.outputs[0].type :
      findStructName(method.name)
    )

    expectedMethods.push({
      name: method.name,
      returnType,
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
    Buffer: 'bytes',
  }[type] || type
}

function solArgTypeToTsType(type) {
  return {
    'uint256': 'number',
    'address': 'EthAddress',
    'void': 'TxHash',
    'bool': 'boolean',
    'bytes': 'Buffer',
  }[type] || type
}

function methodToExpectedCall(m) {
  let expectedArgs = (
    m.args.length == 0 ? '' :
    `, [${m.args.map(a => a.name).join(', ')}]`
  )
  return `return sol2tsCasts.${solArgTypeToTsType(m.returnType)}(await this._call('${m.name}'${expectedArgs}))`
}

function checkSmartContract(sourceFile, className: string, abi: any): boolean {
  let definedMethods = mp.findSmartContractMethodDefinitions(sourceFile, className)

  // Check that each method correctly calls `return await this._call('name', [args])`
  let mismatchedCalls: any[] = []
  definedMethods.forEach(m => {
    let expectedCall = methodToExpectedCall(m)
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
  let expectedMethods = getExpectedMethodsFromContractAbi(abi)
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

  if (missingMethods.length > 0)
    console.error(`${className}: ${missingMethods.length} missing methods`)

  missingMethods.forEach(m => {
    let expectedCall = methodToExpectedCall(m)
    let expectedArgs = m.args.map(a => `${a.name}: ${solArgTypeToTsType(a.type)}`).join(', ')
    console.error(`  async ${m.name}(${expectedArgs}): Promise<${solArgTypeToTsType(m.returnType)}> {`)
    console.error(`    ${expectedCall}`)
    console.error(`  }`)
    console.error('')
  })

  mismatchedMethods.forEach(m => {
    console.error(className + '.' + m.expected.name + ': argument mismatch!')
    console.error('  Expected:', m.expected.args.map(arg => arg.name + ': ' + arg.type).join(', '))
    console.error('    Actual:', m.actual.args.map(arg => arg.name + ': ' + tsArgTypeToSolType(arg.type)).join(', '))
  })

  return !!(mismatchedMethods.length || mismatchedCalls.length || missingMethods.length)
}

let sourceFile = mp.loadSourceFile('./spankbank.ts')

describe('Static analysis:', () => {
  for (let className of ['SpankBank', 'Token']) {
    it(className + ': matches the ABI', () => {
      let res = checkSmartContract(sourceFile, className, spankbank[className].contractAbi)
      if (res)
        chai.assert.fail(res)
    })
  }
})

