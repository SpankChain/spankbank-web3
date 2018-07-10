declare let SMART_CONTRACT_ROOT: string
declare global {
  interface Window {
    web3: any
  }
}

// A promise that will resolve once web3 is fully loaded, including Ethereum
// accounts.
class Web3Wrapper {
  web3FullyLoaded = false
  onWeb3Load: Promise<any>
  web3 = null
  _onLoadRes: any = null

  constructor() {
    this.onWeb3Load = new Promise(res => this._onLoadRes = res)
  }

  setWeb3(web3) {
    this.web3 = web3
    if (web3) {
      web3.eth.getAccounts(() => {
        this.web3FullyLoaded = true
        this._onLoadRes(web3)
      })
    } else {
      this.web3FullyLoaded = true
      this._onLoadRes(web3)
    }
    return this
  }
}

let windowWeb3Wrapper = new Web3Wrapper();

if (typeof window == 'undefined') {
  windowWeb3Wrapper.setWeb3(null)
} else {
  let onLoad = () => {
    window.removeEventListener('load', onLoad)
    windowWeb3Wrapper.setWeb3(window.web3)
  }
  window.addEventListener('load', onLoad)
}

type EthAddress = string
type TxHash = string

type SpankAmount = string
type SpankPoints = string
type BootyAmount = string

type MetamaskErrorType =
  'NO_METAMASK' |
  'NOT_SIGNED_IN' |
  'REJECTED_SIGNATURE' |
  'UNKNOWN_ERROR'

class MetamaskError extends Error {
  metamaskError: MetamaskErrorType

  constructor(metamaskError: MetamaskErrorType, msg) {
    super(msg + ' (' + metamaskError + ')')
    this.metamaskError = metamaskError
  }
}

let sol2tsCasts = {
  boolean: x => !!x,
  number: x => +x,
  TxHash: x => x,
  BootyAmount: x => x,
  SpankPoints: x => x,
}

async function waitForTransactionReceipt(web3: any, txHash: string, timeout: number = 120): Promise<any> {
  let POLL_INTERVAL = 500
  let startTime = Date.now()

  while (true) {
    if (startTime > Date.now() + (timeout * 1000))
      throw new Error(`Timeout waiting for transaction '${txHash}' (${timeout} seconds)`)

    let receipt: any = await new Promise((res, rej) => {
      try {
        web3.eth.getTransactionReceipt(txHash, (err, receipt) => {
          if (err)
            return rej(err)
          res(receipt)
        })
      } catch (e) {
        rej(e)
      }
    })

    if (!receipt) {
      await new Promise(res => setTimeout(res, POLL_INTERVAL))
      continue
    }

    return receipt
  }
}

abstract class SmartContractWrapper {
  isLoaded: boolean = false
  hasWeb3: boolean | null = null
  loaded: Promise<void>
  web3: any

  // Web3 options to pass to smart contract calls (ex, { gas: 69696969 })
  callOptions: any = {}

  contractAddress: EthAddress

  abstract getContractAbi(): any

  constructor(contractAddress: EthAddress, web3=null) {
    this.contractAddress = contractAddress

    if (!web3 && windowWeb3Wrapper.web3FullyLoaded)
      web3 = windowWeb3Wrapper.web3

    if (web3) {
      this.web3 = web3
      this.hasWeb3 = !!web3
      this.isLoaded = true
      this.loaded = Promise.resolve()
    } else {
      this.loaded = windowWeb3Wrapper.onWeb3Load.then(web3 => {
        this.web3 = web3
        this.isLoaded = true
        this.hasWeb3 = !!web3
      })
    }
  }

  async _metamaskCall(funcName, args, fn) {
    await this.loaded

    if (!this.hasWeb3) {
      throw new MetamaskError('NO_METAMASK', 'Web3 not found.')
    }

    if (!(this.web3.currentProvider && this.web3.eth.defaultAccount)) {
      throw new MetamaskError('NOT_SIGNED_IN', 'Web3 is not signed in')
    }

    return new Promise((resolve, reject) => {
      // Call async metamask API function
      //  -- metamask expects a callback with parameters (error, value)
      fn((err, val) => {
        console.log(`metamask result of ${funcName}(${args.map(x => JSON.stringify(x)).join(', ')}):`, err, val)
        if (err) {
          if (/User denied transaction signature/.exec('' + err)) {
            return reject(new MetamaskError('REJECTED_SIGNATURE', 'User denied message signature'))
          }
          return reject(new MetamaskError('UNKNOWN_ERROR', '' + err))
        }
        return resolve(val)
      })
    })
  }

  async _call(contractFuncName, args?): Promise<any> {
    args = args || []
    return await this._metamaskCall(contractFuncName, args, cb => {
      this.web3
        .eth
        .contract(this.getContractAbi())
        .at(this.contractAddress)
        [contractFuncName](...args, this.callOptions, cb)
    })
  }

  async waitForTransactionReceipt(tx: string, timeout: number = 120): Promise<any> {
    await this.loaded
    return await waitForTransactionReceipt(this.web3, tx, timeout)
  }
}


export class SpankBank extends SmartContractWrapper {
  static contractAbi: any = require('@contracts/SpankBank.json').abi

  getContractAbi() {
    return SpankBank.contractAbi
  }

  async periodLength(): Promise<number> {
    return sol2tsCasts.number(await this._call('periodLength'))
  }

  async maxPeriods(): Promise<number> {
    return sol2tsCasts.number(await this._call('maxPeriods'))
  }

  async totalSpankStaked(): Promise<number> {
    return sol2tsCasts.number(await this._call('totalSpankStaked'))
  }

  async unwindVotes(): Promise<number> {
    return sol2tsCasts.number(await this._call('unwindVotes'))
  }

  async unwindPeriod(): Promise<number> {
    return sol2tsCasts.number(await this._call('unwindPeriod'))
  }

  async currentPeriod(): Promise<number> {
    return sol2tsCasts.number(await this._call('currentPeriod'))
  }

  async stake(
    spankAmount: SpankAmount,
    stakePeriods: number,
    delegateKey: EthAddress,
    bootyBase: EthAddress
  ): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('stake', [spankAmount, stakePeriods, delegateKey, bootyBase]))
  }

  async getSpankPoints(stakerAddress: EthAddress, period: number): Promise<SpankPoints> {
    return sol2tsCasts.SpankPoints(await this._call('getSpankPoints', [stakerAddress, period]))
  }

  async getDidClaimBooty(stakerAddress: EthAddress, period: number): Promise<boolean> {
    return sol2tsCasts.boolean(await this._call('getDidClaimBooty', [stakerAddress, period]))
  }

  async sendFees(bootyAmount: BootyAmount): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('sendFees', [bootyAmount]))
  }

  async mintBooty(): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('mintBooty'))
  }

  async updatePeriod(): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('updatePeriod'))
  }

  async checkIn(updatedEndingPeriod: number): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('checkIn', [updatedEndingPeriod]))
  }

  async claimBooty(period: number): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('claimBooty', [period]))
  }

  async withdrawStake(): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('withdrawStake'))
  }

  async splitStake(
    newAddress: EthAddress,
    newDelegateKey: EthAddress,
    newBootyBase: EthAddress,
    spankAmount: SpankAmount
  ): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('splitStake', [newAddress, newDelegateKey, newBootyBase, spankAmount]))
  }

  async voteToUnwind(): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('voteToUnwind'))
  }

  async updateActivityKey(newDelegateKey: EthAddress): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('updateActivityKey', [newDelegateKey]))
  }

  async updateSendBootyAddress(newSendBootyAddress: EthAddress): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('updateSendBootyAddress', [newSendBootyAddress]))
  }
}


export class Token extends SmartContractWrapper {
  static contractAbi: any = require('@contracts/Token.json').abi

  getContractAbi() {
    return Token.contractAbi
  }

  async balanceOf(owner: EthAddress): Promise<BootyAmount> {
    return sol2tsCasts.BootyAmount(await this._call('balanceOf', [owner]))
  }

  async transfer(to: EthAddress, value: BootyAmount): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('transfer', [to, value]))
  }

  async transferFrom(from: EthAddress, to: EthAddress, value: BootyAmount): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('transferFrom', [from, to, value]))
  }

  async approve(spender: EthAddress, value: BootyAmount): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('approve', [spender, value]))
  }

  async allowance(owner: EthAddress, spender: EthAddress): Promise<BootyAmount> {
    return sol2tsCasts.BootyAmount(await this._call('allowance', [owner, spender]))
  }
}
