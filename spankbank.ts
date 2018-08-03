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

  then(...args) {
    return this.onWeb3Load.then(...args)
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

function p(host, method, ...args): Promise<any> {
  return new Promise((res, rej) => {
    host[method](...args, (err, result) => {
      err ? rej(err) : res(result)
    })
  })
}

let networkDefaultRpcUrls = {
  1: 'https://mainnet.infura.io/metamask',
  2: 'https://morden.infura.io/metamask',
  3: 'https://ropsten.infura.io/metamask',
  4: 'https://rinkeby.infura.io/metamask',
  42: 'https://kovan.infura.io/metamask',
}

interface LedgerWeb3WrapperOpts {
  networkId?: string | number
  rpcUrl?: string
}

export class LedgerWeb3Wrapper {
  web3FullyLoaded = false
  engine: any
  web3: any
  provider: any
  ready: Promise<any>
  isU2FSupported: boolean

  constructor(_opts?: LedgerWeb3WrapperOpts) {
    let opts = _opts || {}

    var Web3 = require('web3')
    var ProviderEngine = require('web3-provider-engine')

    this.engine = new ProviderEngine()
    this.web3 = new Web3(this.engine)
    this.web3._isLedger = true

    this.ready = this._init(opts)
      ['catch'](err => {
        if (/Sign failed/.exec('' + err) && this.web3._isLedger)
          throw new MetamaskError('LEDGER_LOCKED', 'Ledger is unplugged, locked, or the Ethereum app is not running.')
        throw err
      })
      ['finally'](() => this.web3FullyLoaded = true)
  }

  async _init(opts: LedgerWeb3WrapperOpts) {
    let TransportU2F = require('@ledgerhq/hw-transport-u2f').default
    var LedgerWalletSubproviderFactory = require('@ledgerhq/web3-subprovider').default
    var RpcSubprovider = require('web3-provider-engine/subproviders/rpc')

    if (!opts.networkId) {
      let windowWeb3 = await windowWeb3Wrapper.onWeb3Load
      if (!windowWeb3)
        throw new Error('Web3 not found and no networkId provided to LedgerWeb3Wrapper')
      opts.networkId = await p(windowWeb3.version, 'getNetwork')
    }

    if (!opts.rpcUrl) {
      let windowWeb3 = await windowWeb3Wrapper.onWeb3Load
      if (!windowWeb3)
        throw new Error('Web3 not found and no rpcUrl provided to LedgerWeb3Wrapper')
      opts.rpcUrl = networkDefaultRpcUrls[opts.networkId!]
      if (!opts.rpcUrl)
        throw new Error('No default RPC URL for network "' + opts.networkId + '"; one must be provided.')
    }

    this.isU2FSupported = await TransportU2F.isSupported()
    if (!this.isU2FSupported) {
      throw new MetamaskError('LEDGER_NOT_SUPPORTED', (
        'LedgerWallet uses U2F which is not supported by your browser. ' +
        'Use Chrome, Opera or Firefox with a U2F extension.' +
        'Also, make sure you\'re using an HTTPS connection.'
      ))
    }

    this.provider = await LedgerWalletSubproviderFactory(() => TransportU2F.create(), opts)

    this.engine.addProvider(this.provider)
    this.engine.addProvider(new RpcSubprovider({ rpcUrl: opts.rpcUrl}))
    this.engine.start()

    let accounts = await p(this.web3.eth, 'getAccounts')

    this.web3.eth.defaultAccount = accounts[0]
    console.log('Using Ledger address:', accounts[0], 'on network', opts.networkId, 'with RPC URL', opts.rpcUrl)
    
    return this.web3
  }

  then(...args) {
    return this.ready.then(...args)
  }
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
  'METAMASK_ERROR' | // For Metamask errors with codes (ex, -32000 = insufficient funds)
  'LEDGER_LOCKED' | // Error when the Ledger is likely locked
  'LEDGER_NOT_SUPPORTED' | // u2f isn't supported
  'UNKNOWN_ERROR'

class MetamaskError extends Error {
  metamaskError: MetamaskErrorType
  code: number | null // Metamask error code, or null if the code is unknown

  constructor(metamaskError: MetamaskErrorType, msg, code=null) {
    super(msg + ' (' + metamaskError + ')')
    this.metamaskError = metamaskError
    this.code = code
  }
}

let sol2tsCasts = {
  boolean: x => !!x,
  number: x => +x,
  TxHash: x => x,
  BootyAmount: x => x,
  SpankPoints: x => x,
  EthAddress: x => x,
  Period: (x): Period => ({
    bootyFees: x[0].toFixed(),
    totalSpankPoints: x[1].toFixed(),
    bootyMinted: x[2].toFixed(),
    mintingComplete: !!x[3],
    startTime: x[4].toNumber(),
    endTime: x[5].toNumber(),
  }),
  Staker: (x): Staker => ({
    spankStaked: x[0].toFixed(),
    startingPeriod: x[1].toNumber(),
    endingPeriod: x[2].toNumber(),
    delegateKey: x[3],
    bootyBase: x[4],
  }),
}


export async function waitForTransactionReceipt(web3: any, txHash: string, timeout: number = 120): Promise<any> {
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

  constructor(contractAddress: EthAddress, web3OrWrapper: any = null) {
    this.contractAddress = contractAddress

    web3OrWrapper = web3OrWrapper || windowWeb3Wrapper

    if (web3OrWrapper && web3OrWrapper.web3FullyLoaded)
      web3OrWrapper = web3OrWrapper.web3

    if (web3OrWrapper && web3OrWrapper.then) {
      this.loaded = web3OrWrapper.then(web3 => {
        this.web3 = web3
        this.isLoaded = true
        this.hasWeb3 = !!web3
      })
    } else {
      this.web3 = web3OrWrapper
      this.hasWeb3 = !!web3OrWrapper
      this.isLoaded = true
      this.loaded = Promise.resolve()
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
          if (/User denied transaction signature/.exec('' + err))
            return reject(new MetamaskError('REJECTED_SIGNATURE', 'User denied message signature'))

          if (/Sign failed/.exec('' + err) && this.web3._isLedger)
            return reject(new MetamaskError('LEDGER_LOCKED', 'Ledger is unplugged, locked, or the Ethereum app is not running.'))

          if (err && err.code && err.message)
            return reject(new MetamaskError('METAMASK_ERROR', err.message, err.code))

          return reject(new MetamaskError('UNKNOWN_ERROR', '' + err))
        }
        return resolve(val)
      })
    })
  }

  async _call(contractFuncName, args?): Promise<any> {
    args = args || []
    return await this._metamaskCall(contractFuncName, args, cb => {
      this.web3.getGasPrice((_error, gasPrice) => {
        const contract = this.web3.eth.contract(this.getContractAbi()).at(this.contractAddress)

        // Automatically set the gas limit and gas price
        // Can be overriden by callOptions
        const gasLimit = contract[contractFuncName].estimateGas(...args)
        const options = { gas: gasLimit, gasPrice, ...this.callOptions }

        contract[contractFuncName](...args, options, cb)
      })
    })
  }

  async waitForTransactionReceipt(tx: string, timeout: number = 120): Promise<any> {
    await this.loaded
    return await waitForTransactionReceipt(this.web3, tx, timeout)
  }
}


interface Period {
  bootyFees: BootyAmount // the amount of BOOTY collected in fees
  totalSpankPoints: SpankPoints // the total spankPoints of all stakers
  bootyMinted: BootyAmount // the amount of BOOTY minted
  mintingComplete: boolean // true if BOOTY has already been minted for this period
  startTime: number // the starting unix timestamp in seconds
  endTime: number // the ending unix timestamp in seconds
}

interface Staker {
  spankStaked: SpankAmount // the amount of spank staked
  startingPeriod: number // the period this staker started staking
  endingPeriod: number // the period after which this stake expires
  delegateKey: EthAddress
  bootyBase: EthAddress
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

  async updateBootyBase(newBootyBase: EthAddress): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('updateBootyBase', [newBootyBase]))
  }

  async closingVotes(): Promise<number> {
    return sol2tsCasts.number(await this._call('closingVotes'))
  }

  async bootyToken(): Promise<EthAddress> {
    return sol2tsCasts.EthAddress(await this._call('bootyToken'))
  }

  async spankToken(): Promise<EthAddress> {
    return sol2tsCasts.EthAddress(await this._call('spankToken'))
  }

  async isClosed(): Promise<boolean> {
    return sol2tsCasts.boolean(await this._call('isClosed'))
  }

  async closingPeriod(): Promise<number> {
    return sol2tsCasts.number(await this._call('closingPeriod'))
  }

  async delegateKeys(key: EthAddress): Promise<EthAddress> {
    return sol2tsCasts.EthAddress(await this._call('delegateKeys', [key]))
  }

  async receiveApproval(from: EthAddress, amount: number, tokenContract: EthAddress, extraData: Buffer): Promise<boolean> {
    return sol2tsCasts.boolean(await this._call('receiveApproval', [from, amount, tokenContract, extraData]))
  }

  async getVote(stakerAddress: EthAddress, period: number): Promise<boolean> {
    return sol2tsCasts.boolean(await this._call('getVote', [stakerAddress, period]))
  }

  async getPeriod(period: number): Promise<Period> {
    return sol2tsCasts.Period(await this._call('getPeriod', [period]))
  }

  async getStaker(stakerAddress: EthAddress): Promise<Staker> {
    return sol2tsCasts.Staker(await this._call('getStaker', [stakerAddress]))
  }

  async getStakerFromDelegateKey(delegateAddress: EthAddress): Promise<EthAddress> {
    return sol2tsCasts.EthAddress(await this._call('getStakerFromDelegateKey', [delegateAddress]))
  }

  async voteToClose(): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('voteToClose'))
  }

  async updateDelegateKey(newDelegateKey: EthAddress): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('updateDelegateKey', [newDelegateKey]))
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

  async totalSupply(): Promise<number> {
    return sol2tsCasts.number(await this._call('totalSupply'))
  }
}
