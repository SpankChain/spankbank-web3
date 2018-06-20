// TODO:
// - waitForWeb3 kinda thing

declare global {
  interface Window {
    web3: any
  }
}

let contractJson = require('./contracts/20180615-51f61af5/SpankBank.json')

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

  window.addEventListener('load', onLoad)
})


type EthAddress = string

// Technically these are both safe to be numbers, because there are 1e9 SPANK
// in circulation, so the largest possible value for SpankPoints is 1e12, which
// is safely below the largest integer that can be accurately represented as
// a 64 bit float (9e15: https://stackoverflow.com/a/3793950/71522)
// HOWEVER, we may want to switch these to BigNums to make it harder for
// users to make mistakes with math involving them.
type SpankAmount = number
type SpankPoints = number
type BootyAmount = number

class MetamaskError extends Error {
  metamaskError: string

  constructor(metamaskError, msg) {
    super(msg + ' (' + metamaskError + ')')
    this.metamaskError = metamaskError
  }
}

export class SpankBank {
  isLoaded: boolean = false
  hasWeb3: boolean | null = null
  loaded: Promise<void>

  contractAddress: EthAddress

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
          if (/MetaMask Message Signature: User denied message signature/.exec(err.message)) {
            return reject(new MetamaskError('REJECTED_SIGNATURE', 'User denied message signature'))
          }
          return reject(new MetamaskError('UNKNOWN_ERROR', '' + err))
        }
        return resolve(val)
      })
    })
  }

  async _call(contractFuncName, args): Promise<any> {
    return await this._metamaskCall(cb => {
      window.web3
        .eth
        .contract(contractJson.abi)
        .at(this.contractAddress)
        [contractFuncName](...args, cb)
    })
  }

  async stake(
    spankAmount: SpankAmount,
    stakePeriods: number,
    activityKey: EthAddress,
    bootyBase: EthAddress
  ): Promise<void> {

  }

  getSpankPoints(stakerAddress: EthAddress, period: number): Promise<SpankPoints> {
    return this._call('getSpankPoints', [stakerAddress, period])
  }

  async getDidClaimBooty(stakerAddress: EthAddress, period: number): Promise<boolean> {
    return false
  }

  async sendFees(bootyAmount: BootyAmount): Promise<void> {
  }

  async mintBooty(): Promise<void> {
  }

  async checkIn(updatedEndingPeriod: number): Promise<void> {
  }

  async claimBooty(period: number): Promise<void> {
  }

  async withdrawStake(): Promise<void> {
  }

  async splitStake(
    newAddress: EthAddress,
    newActivityKey: EthAddress,
    newBootyBase: EthAddress,
    spankAmount: SpankAmount
  ): Promise<void> {
  }

  async voteToUnwind(): Promise<void> {
  }

  async updateActivityKey(newActivityKey: EthAddress): Promise<void> {
  }

  async updateBootyBase(newBootyBase: EthAddress): Promise<void> {
  }
}
