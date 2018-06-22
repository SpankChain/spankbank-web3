declare let SMART_CONTRACT_ROOT: string
declare global {
  interface Window {
    web3: any
  }
}

// A promise that will resolve once web3 is fully loaded, including Ethereum
// accounts.
let web3FullyLoaded = false
let onWeb3Load: Promise<void> = new Promise(res => {
  let onLoad = () => {
    window.removeEventListener('load', onLoad)
    if (window.web3) {
      window.web3.eth.getAccounts(() => {
        web3FullyLoaded = true
        res()
      })
    } else {
      web3FullyLoaded = true
      res()
    }
  }

  typeof window !== 'undefined' && window.addEventListener('load', onLoad)
})


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

abstract class SmartContractWrapper {
  isLoaded: boolean = false
  hasWeb3: boolean | null = null
  loaded: Promise<void>

  contractAddress: EthAddress

  abstract getContractAbi(): any

  constructor(contractAddress: EthAddress) {
    this.contractAddress = contractAddress
    this._refreshLoadingState()
    this.loaded = onWeb3Load
    if (!this.isLoaded)
      this.loaded = this.loaded.then(this._refreshLoadingState)
  }

  _refreshLoadingState = () => {
    this.isLoaded = web3FullyLoaded
    this.hasWeb3 = web3FullyLoaded? !!window.web3 : null
  }

  async _metamaskCall(fn) {
    await this.loaded

    if (!this.hasWeb3) {
      throw new MetamaskError('NO_METAMASK', 'Web3 not found.')
    }

    if (!(window.web3.currentProvider && window.web3.eth.defaultAccount)) {
      throw new MetamaskError('NOT_SIGNED_IN', 'Web3 is not signed in')
    }

    return new Promise((resolve, reject) => {
      // Call async metamask API function
      //  -- metamask expects a callback with parameters (error, value)
      fn((err, val) => {
        console.log('metamask result:', err, val)
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
    return await this._metamaskCall(cb => {
      console.log(this.contractAddress, contractFuncName, args)
      window.web3
        .eth
        .contract(this.getContractAbi())
        .at(this.contractAddress)
        [contractFuncName](...args, cb)
    })
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
    activityKey: EthAddress,
    bootyBase: EthAddress
  ): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('stake', [spankAmount, stakePeriods, activityKey, bootyBase]))
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
    newActivityKey: EthAddress,
    newBootyBase: EthAddress,
    spankAmount: SpankAmount
  ): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('splitStake', [newAddress, newActivityKey, newBootyBase, spankAmount]))
  }

  async voteToUnwind(): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('voteToUnwind'))
  }

  async updateActivityKey(newActivityKey: EthAddress): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('updateActivityKey', [newActivityKey]))
  }

  async updateBootyBase(newBootyBase: EthAddress): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('updateBootyBase', [newBootyBase]))
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
