/*
 * Chai things
 */

import * as chai from 'chai'
chai.use(require('chai-subset'))
chai.use(require('chai-as-promised'))
chai.assert.containsSubset = chai.assert.containSubset
export const assert = chai.assert
export const expect = chai.expect

/*
 * End chai things
 */

import { spawn } from 'child_process'

import 'mocha'

import { SpankBank, Token } from '../spankbank'
const Web3 = require('web3')

function runCommand(opts, cmd, ...args): Promise<string> {
  let didLogCmd = false
  let proc = spawn(cmd, args, opts)
  let allStdout = ''

  let resolve: any
  let reject: any

  proc.stdout.on('data', (data) => {
    allStdout += data
  })

  proc.stderr.on('data', (data) => {
    if (!didLogCmd) {
      console.log(`running: '${cmd} ${args.join(' ')}' from '${opts.cwd}'`)
      didLogCmd = true
    }
    console.log(`stderr: ${data.toString().replace(/\s*$/, '')}`)
  })

  proc.on('close', (code) => {
    if (code)
      return reject(new Error(`'${cmd} ${args.join(' ')}' exited with status '${code}'`))
    resolve(allStdout)
  })

  return new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
}


describe('SpankBank: live tests', () => {
  let web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
  let token: Token
  let sb: SpankBank
  let resetAfterTest = true

  async function goNextPeriod() {
    let periodLength = await sb.periodLength()

    await new Promise((res, rej) => web3.currentProvider.sendAsync({
      id: 69,
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [periodLength + 100],
    }, (err, result) => err ? rej(err) : res(result)))
    
    let tx = await sb.updatePeriod()
  }

  beforeEach(async () => {
    if (!resetAfterTest)
      return

    await runCommand({ cwd: __dirname + '/../node_modules/@spankdev/spankbank/' }, 'yarn')
    let stdout: string
    try {
      stdout = await runCommand({ cwd: __dirname + '/../node_modules/@spankdev/spankbank/' }, 'truffle', 'deploy', '--reset')
    } catch (e) {
      throw new Error(e + '\nTHINGS TO CHECK:\n1. Did the install fail?\n2. Is ganache-cli running? (see "Testin" section of the README')
    }
    let getAddress = name => {
      let match = stdout.match(new RegExp(name + ': (0x.*)'))
      if (!match)
        throw new Error(`'${name}' not found in:\n${stdout}`)
      return match[1]
    }
    token = new Token(getAddress('HumanStandardToken'), web3)
    sb = new SpankBank(getAddress('SpankBank'), web3)
    sb.callOptions = {
      gas: 696969,
    }
    let accounts = await new Promise((res, rej) => {
      web3.eth.getAccounts((err, accounts) => {
        return err ? rej(err) : res(accounts)
      })
    })
    web3.eth.defaultAccount = accounts[0]
    await sb.loaded
    resetAfterTest = true
  })

  it('periodLength()', async () => {
    resetAfterTest = false
    assert.equal(2592000, await sb.periodLength())
  })

  it('should be able to wait for transactions', async () => {
    resetAfterTest = false
    let txHash = await token.approve(sb.contractAddress, '100')
    let receipt = await token.waitForTransactionReceipt(txHash)
    assert.equal(txHash, receipt.transactionHash)
  })

  it('should be able to stake', async () => {
    resetAfterTest = true

    assert.equal(0, await sb.currentPeriod())

    await goNextPeriod()
    assert.equal(1, await sb.currentPeriod())

    await token.approve(sb.contractAddress, '100')
    await sb.stake('100', 12, web3.eth.defaultAccount, web3.eth.defaultAccount)

    let totalSpankStaked = await token.balanceOf(sb.contractAddress)
    assert.equal(totalSpankStaked, 100)

    await goNextPeriod()
    assert.equal(2, await sb.currentPeriod())

    await sb.checkIn(0)

    await goNextPeriod()
    await sb.mintBooty()

    assert.containSubset(await sb.getPeriod(1), {
      bootyFees: '0',
      totalSpankPoints: '0',
      bootyMinted: '0',
      mintingComplete: false,
    })

    assert.containSubset(await sb.getPeriod(2), {
      bootyFees: '0',
      totalSpankPoints: '100',
      bootyMinted: '0',
      mintingComplete: true,
    })

    assert.containSubset(await sb.getPeriod(3), {
      bootyFees: '0',
      totalSpankPoints: '95',
      bootyMinted: '0',
      mintingComplete: false,
    })

    assert.deepEqual(await sb.getStaker(web3.eth.defaultAccount), {
      spankStaked: '100',
      startingPeriod: 2,
      endingPeriod: 13,
      delegateKey: web3.eth.defaultAccount,
      bootyBase: web3.eth.defaultAccount,
    })
  })

})
