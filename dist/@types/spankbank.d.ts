/// <reference types="node" />
declare global {
    interface Window {
        web3: any;
    }
}
declare type EthAddress = string;
declare type TxHash = string;
declare type SpankAmount = string;
declare type SpankPoints = string;
declare type BootyAmount = string;
export declare function waitForTransactionReceipt(web3: any, txHash: string, timeout?: number): Promise<any>;
declare abstract class SmartContractWrapper {
    isLoaded: boolean;
    hasWeb3: boolean | null;
    loaded: Promise<void>;
    web3: any;
    callOptions: any;
    contractAddress: EthAddress;
    abstract getContractAbi(): any;
    constructor(contractAddress: EthAddress, web3?: null);
    _metamaskCall(funcName: any, args: any, fn: any): Promise<{}>;
    _call(contractFuncName: any, args?: any): Promise<any>;
    waitForTransactionReceipt(tx: string, timeout?: number): Promise<any>;
}
interface Period {
    bootyFees: BootyAmount;
    totalSpankPoints: SpankPoints;
    bootyMinted: BootyAmount;
    mintingComplete: boolean;
    startTime: number;
    endTime: number;
}
interface Staker {
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
export {};