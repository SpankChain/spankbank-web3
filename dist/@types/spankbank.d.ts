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
    periodLength(): Promise<number>;
    maxPeriods(): Promise<number>;
    totalSpankStaked(): Promise<number>;
    unwindVotes(): Promise<number>;
    unwindPeriod(): Promise<number>;
    currentPeriod(): Promise<number>;
    stake(spankAmount: SpankAmount, stakePeriods: number, delegateKey: EthAddress, bootyBase: EthAddress): Promise<TxHash>;
    getSpankPoints(stakerAddress: EthAddress, period: number): Promise<SpankPoints>;
    getDidClaimBooty(stakerAddress: EthAddress, period: number): Promise<boolean>;
    sendFees(bootyAmount: BootyAmount): Promise<TxHash>;
    mintBooty(): Promise<TxHash>;
    updatePeriod(): Promise<TxHash>;
    checkIn(updatedEndingPeriod: number): Promise<TxHash>;
    claimBooty(period: number): Promise<TxHash>;
    withdrawStake(): Promise<TxHash>;
    splitStake(newAddress: EthAddress, newDelegateKey: EthAddress, newBootyBase: EthAddress, spankAmount: SpankAmount): Promise<TxHash>;
    voteToUnwind(): Promise<TxHash>;
    updateActivityKey(newDelegateKey: EthAddress): Promise<TxHash>;
    updateSendBootyAddress(newSendBootyAddress: EthAddress): Promise<TxHash>;
    updateBootyBase(newBootyBase: EthAddress): Promise<TxHash>;
    closingVotes(): Promise<number>;
    bootyToken(): Promise<EthAddress>;
    spankToken(): Promise<EthAddress>;
    isClosed(): Promise<boolean>;
    closingPeriod(): Promise<number>;
    delegateKeys(key: EthAddress): Promise<EthAddress>;
    receiveApproval(from: EthAddress, amount: number, tokenContract: EthAddress, extraData: Buffer): Promise<boolean>;
    getVote(stakerAddress: EthAddress, period: number): Promise<boolean>;
    getPeriod(period: number): Promise<Period>;
    getStaker(stakerAddress: EthAddress): Promise<Staker>;
    getStakerFromDelegateKey(delegateAddress: EthAddress): Promise<EthAddress>;
    voteToClose(): Promise<TxHash>;
    updateDelegateKey(newDelegateKey: EthAddress): Promise<TxHash>;
    stakerByDelegateKey(key: EthAddress): Promise<EthAddress>;
}
export declare class Token extends SmartContractWrapper {
    static contractAbi: any;
    getContractAbi(): any;
    balanceOf(owner: EthAddress): Promise<BootyAmount>;
    transfer(to: EthAddress, value: BootyAmount): Promise<TxHash>;
    transferFrom(from: EthAddress, to: EthAddress, value: BootyAmount): Promise<TxHash>;
    approve(spender: EthAddress, value: BootyAmount): Promise<TxHash>;
    allowance(owner: EthAddress, spender: EthAddress): Promise<BootyAmount>;
    totalSupply(): Promise<number>;
}
export declare class HumanStandardToken extends Token {
    static contractAbi: any;
    getContractAbi(): any;
    approveAndCall(spender: EthAddress, value: BootyAmount, extraData: string): Promise<TxHash>;
}
export {};
