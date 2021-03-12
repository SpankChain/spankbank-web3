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
    console.log("Hello there")
    console.log(web3)
    this.web3 = web3

    if (web3) {
      console.log("LOOKS LIKE WE MADE IT")
      console.log(web3)
      console.log(web3.request)
      console.log("CONFUSED_CAT")

      web3.request({ method: 'eth_accounts' })((ressy) => {
        console.log("Here's the ressy: ", ressy)
        this.web3FullyLoaded = true
        this._onLoadRes(web3)
      })
      console.log("DID WE MAKE IT?!?!?!")
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

let windowWeb3Wrapper = new Web3Wrapper()

if (typeof window == 'undefined') {
  console.log("NOT HERE RIGHT?")
  windowWeb3Wrapper.setWeb3(null)
} else {
  let onLoad = () => {
    if ((window as any).ethereum) {
      window.removeEventListener('load', onLoad)
      windowWeb3Wrapper.setWeb3((window as any).ethereum)
    }
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

export interface LedgerWeb3WrapperOpts {
  networkId?: string | number
  rpcUrl?: string
  ledgerTimeoutSeconds?: number
}

export class LedgerWeb3Wrapper {
  web3FullyLoaded = false
  engine: any
  web3: any
  provider: any
  ready: Promise<any>
  isU2FSupported?: boolean
  isLedgerPresent?: boolean
  ledgerTransport: any

  private ledgerTimeoutSeconds: number

  constructor(_opts?: LedgerWeb3WrapperOpts) {
    let opts = _opts || {}

    this.ledgerTimeoutSeconds = opts.ledgerTimeoutSeconds || 30

    var Web3 = require('web3')
    var ProviderEngine = require('web3-provider-engine')

    this.engine = new ProviderEngine()
    this.web3 = new Web3(this.engine)
    this.web3._isLedger = true

    this.ready = this._init(opts)
      ['then'](res => {
        this.isLedgerPresent = true
        return res
      })
      ['catch'](err => {
        this.isLedgerPresent = false
        if (/Failed to sign/.exec('' + err) && this.web3._isLedger)
          err = new MetamaskError('LEDGER_LOCKED', 'Ledger is unplugged, locked, or the Ethereum app is not running.')
        this.web3 = null
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

    this.provider = await LedgerWalletSubproviderFactory(async () => {
      this.ledgerTransport = await TransportU2F.create(1000, 1000)
      this.ledgerTransport.exchangeTimeout = this.ledgerTimeoutSeconds * 1000

      // There's a bug in `transport.close` where it throws an error if it has
      // already been removed from a list of "active transports". Work around
      // that bug by ignoring the error.
      let oldClose = this.ledgerTransport.close.bind(this.ledgerTransport)
      this.ledgerTransport.close = () => {
        this.ledgerTransport = null
        try {
          return oldClose()
        } catch (e) {
          if ('' + e == 'Error: invalid transport instance')
            return Promise.resolve()
          throw e
        }
      }

      return this.ledgerTransport
    }, opts)

    this.engine.addProvider(this.provider)
    this.engine.addProvider(new RpcSubprovider({ rpcUrl: opts.rpcUrl}))
    this.engine.start()

    let accounts = await p(this.web3.eth, 'getAccounts')

    this.web3.eth.defaultAccount = accounts[0]
    log.info('Using Ledger address:', accounts[0], 'on network', opts.networkId, 'with RPC URL', opts.rpcUrl)

    return this.web3
  }

  setLedgerTimeoutSeconds(ledgerTimeoutSeconds: number) {
    this.ledgerTimeoutSeconds = ledgerTimeoutSeconds
    if (this.ledgerTransport)
      this.ledgerTransport.exchangeTimeout = this.ledgerTimeoutSeconds * 1000
  }

  getLedgerTimeoutSeconds(): number {
    return this.ledgerTimeoutSeconds
  }

  then(...args) {
    return this.ready.then(...args)
  }
}


export type EthAddress = string
export type TxHash = string

export type SpankAmount = string
export type SpankPoints = string
export type BootyAmount = string

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
  number: x => (
    typeof x == 'string' ? +x :
    typeof x == 'number' ? x :
    x.toNumber()
  ),
  string: x => (
    typeof x == 'string' ? x :
    typeof x == 'number' ? x.toString() :
    x.toFixed()
  ),
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
    closingVotes: x[6].toFixed(),
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

export interface Logger { debug: any, info: any, warn: any, error: any }

let log: Logger = console

export function setSpankBankLogger(logger: Logger) {
  log = logger
}

export abstract class SmartContractWrapper {
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
      this.loaded = web3OrWrapper
        .then(null, err => null)
        .then(web3 => {
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

    return new Promise((resolve, reject) => {
      // Call async metamask API function
      //  -- metamask expects a callback with parameters (error, value)
      fn((err, val) => {
        log.debug(`metamask result of ${funcName}(${args.map(x => JSON.stringify(x)).join(', ')}):`, err, val)
        if (err) {
          if (/User denied transaction signature/.exec('' + err))
            return reject(new MetamaskError('REJECTED_SIGNATURE', 'User denied message signature'))

          if (/Failed to sign/.exec('' + err) && this.web3._isLedger)
            return reject(new MetamaskError('LEDGER_LOCKED', 'Ledger is unplugged, locked, or the Ethereum app is not running.'))

          if (err && err.code && err.message)
            return reject(new MetamaskError('METAMASK_ERROR', err.message, err.code))

          return reject(new MetamaskError('UNKNOWN_ERROR', '' + err))
        }
        return resolve(val)
      }).then(null, reject)
    })
  }

  async _call(contractFuncName, args?): Promise<any> {
    args = args || []
    return await this._metamaskCall(contractFuncName, args, async (cb) => {
      const contract = this.web3.eth.contract(this.getContractAbi()).at(this.contractAddress)
      const constant = contract.abi.filter(x => x.type === 'function' && x.name === contractFuncName)[0].constant

      if (!constant && !(this.web3.currentProvider && this.web3.eth.defaultAccount)) {
        throw new MetamaskError('NOT_SIGNED_IN', `Web3 is not signed in, but ${contractFuncName} requires gas.`)
      }

      let options = { ...this.callOptions }

      if (!this.callOptions.gas && !constant)
        options.gas = await p(contract[contractFuncName], 'estimateGas', ...args)

      if (!this.callOptions.gasPrice)
        options.gasPrice = (await p(this.web3.eth, 'getGasPrice')).toNumber()

      contract[contractFuncName](...args, options, cb)
    })
  }

  async waitForTransactionReceipt(tx: string, timeout: number = 120): Promise<any> {
    await this.loaded
    return await waitForTransactionReceipt(this.web3, tx, timeout)
  }
}


export interface Period {
  bootyFees: BootyAmount // the amount of BOOTY collected in fees
  totalSpankPoints: SpankPoints // the total spankPoints of all stakers
  bootyMinted: BootyAmount // the amount of BOOTY minted
  mintingComplete: boolean // true if BOOTY has already been minted for this period
  startTime: number // the starting unix timestamp in seconds
  endTime: number // the ending unix timestamp in seconds
  closingVotes: SpankPoints // the total votes to close this period
}

export interface Staker {
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

  async currentPeriod(): Promise<number> {
    return sol2tsCasts.number(await this._call('currentPeriod'))
  }

  async bootyToken(): Promise<EthAddress> {
    return sol2tsCasts.EthAddress(await this._call('bootyToken'))
  }

  async maxPeriods(): Promise<string> {
    return sol2tsCasts.string(await this._call('maxPeriods'))
  }

  async stakerByDelegateKey(key: EthAddress): Promise<EthAddress> {
    return sol2tsCasts.EthAddress(await this._call('stakerByDelegateKey', [key]))
  }

  async spankToken(): Promise<EthAddress> {
    return sol2tsCasts.EthAddress(await this._call('spankToken'))
  }

  async pointsTable(key: string): Promise<string> {
    return sol2tsCasts.string(await this._call('pointsTable', [key]))
  }

  async isClosed(): Promise<boolean> {
    return sol2tsCasts.boolean(await this._call('isClosed'))
  }

  async totalSpankStaked(): Promise<string> {
    return sol2tsCasts.string(await this._call('totalSpankStaked'))
  }

  async periodLength(): Promise<number> {
    return sol2tsCasts.number(await this._call('periodLength'))
  }

  async stake(spankAmount: string, stakePeriods: string | number, delegateKey: EthAddress, bootyBase: EthAddress): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('stake', [spankAmount, stakePeriods, delegateKey, bootyBase]))
  }

  async receiveApproval(from: EthAddress, amount: string, tokenContract: EthAddress, extraData: Buffer): Promise<boolean> {
    return sol2tsCasts.boolean(await this._call('receiveApproval', [from, amount, tokenContract, extraData]))
  }

  async sendFees(bootyAmount: string): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('sendFees', [bootyAmount]))
  }

  async mintBooty(): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('mintBooty'))
  }

  async updatePeriod(): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('updatePeriod'))
  }

  async checkIn(updatedEndingPeriod: string | number): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('checkIn', [updatedEndingPeriod]))
  }

  async claimBooty(claimPeriod: string | number): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('claimBooty', [claimPeriod]))
  }

  async withdrawStake(): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('withdrawStake'))
  }

  async splitStake(newAddress: EthAddress, newDelegateKey: EthAddress, newBootyBase: EthAddress, spankAmount: string): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('splitStake', [newAddress, newDelegateKey, newBootyBase, spankAmount]))
  }

  async voteToClose(): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('voteToClose'))
  }

  async updateDelegateKey(newDelegateKey: EthAddress): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('updateDelegateKey', [newDelegateKey]))
  }

  async updateBootyBase(newBootyBase: EthAddress): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('updateBootyBase', [newBootyBase]))
  }

  async getSpankPoints(stakerAddress: EthAddress, period: string | number): Promise<string> {
    return sol2tsCasts.string(await this._call('getSpankPoints', [stakerAddress, period]))
  }

  async getDidClaimBooty(stakerAddress: EthAddress, period: string | number): Promise<boolean> {
    return sol2tsCasts.boolean(await this._call('getDidClaimBooty', [stakerAddress, period]))
  }

  async getVote(stakerAddress: EthAddress, period: string | number): Promise<boolean> {
    return sol2tsCasts.boolean(await this._call('getVote', [stakerAddress, period]))
  }

  async getStakerFromDelegateKey(delegateAddress: EthAddress): Promise<EthAddress> {
    return sol2tsCasts.EthAddress(await this._call('getStakerFromDelegateKey', [delegateAddress]))
  }

  async periods(key: string | number): Promise<Period> {
    return sol2tsCasts.Period(await this._call('periods', [key]))
  }

  async stakers(key: EthAddress): Promise<Staker> {
    return sol2tsCasts.Staker(await this._call('stakers', [key]))
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

  async totalSupply(): Promise<string> {
    return sol2tsCasts.string(await this._call('totalSupply'))
  }
}


export class HumanStandardToken extends Token {
  static contractAbi: any = require('@contracts/HumanStandardToken.json').abi

  getContractAbi() {
    return HumanStandardToken.contractAbi
  }

  async approveAndCall(spender: EthAddress, value: BootyAmount, extraData: string): Promise<TxHash> {
    return sol2tsCasts.TxHash(await this._call('approveAndCall', [spender, value, extraData]))
  }
}
