/// <reference types="node" />
declare global {
    interface Window {
        web3: any;
    }
}
interface LedgerWeb3WrapperOpts {
    networkId?: string | number;
    rpcUrl?: string;
}
export declare class LedgerWeb3Wrapper {
    web3FullyLoaded: boolean;
    engine: any;
    web3: any;
    provider: any;
    ready: Promise<any>;
    isU2FSupported?: boolean;
    isLedgerPresent?: boolean;
    constructor(_opts?: LedgerWeb3WrapperOpts);
    _init(opts: LedgerWeb3WrapperOpts): Promise<any>;
    then(...args: any[]): Promise<any>;
}
declare type EthAddress = string;
declare type TxHash = string;
declare type SpankAmount = string;
declare type SpankPoints = string;
declare type BootyAmount = string;
export declare function waitForTransactionReceipt(web3: any, txHash: string, timeout?: number): Promise<any>;
interface Logger {
    debug: any;
    info: any;
    warn: any;
    error: any;
}
export declare function setSpankBankLogger(logger: Logger): void;
declare abstract class SmartContractWrapper {
    isLoaded: boolean;
    hasWeb3: boolean | null;
    loaded: Promise<void>;
    web3: any;
    callOptions: any;
    contractAddress: EthAddress;
    abstract getContractAbi(): any;
    constructor(contractAddress: EthAddress, web3OrWrapper?: any);
    _metamaskCall(funcName: any, args: any, fn: any): Promise<{}>;
    _call(contractFuncName: any, args?: any): Promise<any>;
    waitForTransactionReceipt(tx: string, timeout?: number): Promise<any>;
}
export interface Period {
    bootyFees: BootyAmount;
    totalSpankPoints: SpankPoints;
    bootyMinted: BootyAmount;
    mintingComplete: boolean;
    startTime: number;
    endTime: number;
    closingVotes: number;
}
export interface Staker {
    spankStaked: SpankAmount;
    startingPeriod: number;
    endingPeriod: number;
    delegateKey: EthAddress;
    bootyBase: EthAddress;
}
export declare class SpankBank extends SmartContractWrapper {
    static contractAbi: any;
    getContractAbi(): any;
    currentPeriod(): Promise<number>;
    bootyToken(): Promise<EthAddress>;
    maxPeriods(): Promise<string>;
    stakerByDelegateKey(key: EthAddress): Promise<EthAddress>;
    spankToken(): Promise<EthAddress>;
    pointsTable(key: string): Promise<string>;
    isClosed(): Promise<boolean>;
    totalSpankStaked(): Promise<string>;
    periodLength(): Promise<number>;
    stake(spankAmount: string, stakePeriods: string | number, delegateKey: EthAddress, bootyBase: EthAddress): Promise<TxHash>;
    receiveApproval(from: EthAddress, amount: string, tokenContract: EthAddress, extraData: Buffer): Promise<boolean>;
    sendFees(bootyAmount: string): Promise<TxHash>;
    mintBooty(): Promise<TxHash>;
    updatePeriod(): Promise<TxHash>;
    checkIn(updatedEndingPeriod: string | number): Promise<TxHash>;
    claimBooty(claimPeriod: string | number): Promise<TxHash>;
    withdrawStake(): Promise<TxHash>;
    splitStake(newAddress: EthAddress, newDelegateKey: EthAddress, newBootyBase: EthAddress, spankAmount: string): Promise<TxHash>;
    voteToClose(): Promise<TxHash>;
    updateDelegateKey(newDelegateKey: EthAddress): Promise<TxHash>;
    updateBootyBase(newBootyBase: EthAddress): Promise<TxHash>;
    getSpankPoints(stakerAddress: EthAddress, period: string | number): Promise<string>;
    getDidClaimBooty(stakerAddress: EthAddress, period: string | number): Promise<boolean>;
    getVote(stakerAddress: EthAddress, period: string | number): Promise<boolean>;
    getStakerFromDelegateKey(delegateAddress: EthAddress): Promise<EthAddress>;
    periods(key: string | number): Promise<Period>;
    stakers(key: EthAddress): Promise<Staker>;
}
export declare class Token extends SmartContractWrapper {
    static contractAbi: any;
    getContractAbi(): any;
    balanceOf(owner: EthAddress): Promise<BootyAmount>;
    transfer(to: EthAddress, value: BootyAmount): Promise<TxHash>;
    transferFrom(from: EthAddress, to: EthAddress, value: BootyAmount): Promise<TxHash>;
    approve(spender: EthAddress, value: BootyAmount): Promise<TxHash>;
    allowance(owner: EthAddress, spender: EthAddress): Promise<BootyAmount>;
    totalSupply(): Promise<string>;
}
export declare class HumanStandardToken extends Token {
    static contractAbi: any;
    getContractAbi(): any;
    approveAndCall(spender: EthAddress, value: BootyAmount, extraData: string): Promise<TxHash>;
}
export {};
