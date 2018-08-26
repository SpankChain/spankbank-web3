#!/usr/bin/env ts-node

require('tsconfig-paths/register')

const Web3 = require('web3')
const Tx = require('ethereumjs-tx')

import * as fs from 'fs'

import { SpankBank } from './spankbank'

function sleep(time) {
  return new Promise(res => setTimeout(res, time))
}

function usage() {
  console.error(`Usage: poll-contract.ts CONTRACT_ADDRESS [PRIVATE_KEY:updatePeriod] [PRIVATE_KEY_TO_CHECK_IN[:NUM_PERIODS] ...]`)
  console.error(`Example:`)
  console.error(`  $ ./poll-contract.ts 0xaae465ad04b12e90c32291e59b65ca781c57e361 f0f18fd1df636821d2d6a04b4d4f4c76fc33eb66c253ae1e4028bf33c48622bc:12 f0f18fd1df636821d2d6a04b4d4f4c76fc33eb66c253ae1e4028bf33c48622bc:updatePeriod`)
  return 1
}

function fixPk(pk) {
  pk = pk.replace(/\s*/g, '')
  if (!/^(0x)?[0-9a-fA-F]+$/.exec(pk))
    throw new Error('Invalid private key: ' + pk)
  if (pk.indexOf('0x') != 0)
    pk = '0x' + pk
  return pk
}

async function callMethod(web3, contractAddr, account, method) {
  let name = method._method.name
  let args = method.arguments

  let toHex = web3.utils.toHex
  let rawTx = new Tx({
    nonce: await web3.eth.getTransactionCount(account.address),
    gasPrice: toHex(await web3.eth.getGasPrice()),
    gas: toHex(await method.estimateGas()),
    to: contractAddr,
    data: method.encodeABI(),
  })
  let privateKey = new Buffer(account.privateKey.replace(/0x/, ''), 'hex')
  rawTx.sign(privateKey)

  console.log(`Sending transaction for: ${name}(${JSON.stringify(args).slice(1, -1)})`)

  let tx = web3.eth.sendSignedTransaction('0x' + rawTx.serialize().toString('hex'))
  await tx
    .on('transactionHash', hash => console.log('  Tx hash:', hash))

  console.log('  Done!')
  return tx
}

async function run() {
  let web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/T1S8a0bkyrGD7jxJBgeH'))
  let contractAddr = process.argv[2]
  let sb = new SpankBank(contractAddr, web3)
  console.log('Contract:', contractAddr)

  while (true) {
    let curPeriodNum = await sb.currentPeriod()
    console.log('Current period:', curPeriodNum)

    let toCheckIn = process.argv.slice(3)
    for (let _addr of toCheckIn) {
      let [pk, periodsStr] = _addr.split(':')
      let account = web3.eth.accounts.privateKeyToAccount(fixPk(pk))

      if (periodsStr && periodsStr.toLowerCase() == 'updateperiod') {
        let period = await sb.periods(curPeriodNum)
        let untilNext = +((period.endTime - Date.now() / 1000 ) + 5).toFixed()
        if (untilNext > 0) {
          console.log(`Sleeping ${untilNext}s until next period...`)
          await sleep(untilNext * 1000)
        } else {
          console.log(`Period ended ${untilNext}s ago`)
        }

        await callMethod(web3, contractAddr, account, sb.contract.methods['updatePeriod']())
      } else {
        if (!periodsStr)
          periodsStr = '0'
        if (!isFinite(+periodsStr))
          throw new Error('Invalid periods: ' + periodsStr)

        let periods = +periodsStr
        console.log('Checking in for:', account.address)
        curPeriodNum = await sb.currentPeriod()
        let method = sb.contract.methods['checkIn'](periods && curPeriodNum + periods)
        try {
          await callMethod(web3, contractAddr, account, method)
        } catch (e) {
          console.error(e)
        }
      }
    }
  }
}

run().then(code => process.exit(code || 0), err => {
  console.error(err)
  process.exit(1)
})
