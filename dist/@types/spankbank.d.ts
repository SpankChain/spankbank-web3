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
declare abstract class SmartContractWrapper {
    isLoaded: boolean;
    hasWeb3: boolean | null;
    loaded: Promise<void>;
    contractAddress: EthAddress;
    abstract getContractAbi(): any;
    constructor(contractAddress: EthAddress);
    _refreshLoadingState: () => void;
    _metamaskCall(fn: any): Promise<{}>;
    _call(contractFuncName: any, args?: any): Promise<any>;
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
    stake(spankAmount: SpankAmount, stakePeriods: number, activityKey: EthAddress, bootyBase: EthAddress): Promise<TxHash>;
    getSpankPoints(stakerAddress: EthAddress, period: number): Promise<SpankPoints>;
    getDidClaimBooty(stakerAddress: EthAddress, period: number): Promise<boolean>;
    sendFees(bootyAmount: BootyAmount): Promise<TxHash>;
    mintBooty(): Promise<TxHash>;
    updatePeriod(): Promise<TxHash>;
    checkIn(updatedEndingPeriod: number): Promise<TxHash>;
    claimBooty(period: number): Promise<TxHash>;
    withdrawStake(): Promise<TxHash>;
    splitStake(newAddress: EthAddress, newActivityKey: EthAddress, newBootyBase: EthAddress, spankAmount: SpankAmount): Promise<TxHash>;
    voteToUnwind(): Promise<TxHash>;
    updateActivityKey(newActivityKey: EthAddress): Promise<TxHash>;
    updateBootyBase(newBootyBase: EthAddress): Promise<TxHash>;
}
export declare class Token extends SmartContractWrapper {
    static contractAbi: any;
    getContractAbi(): any;
    balanceOf(owner: EthAddress): Promise<BootyAmount>;
    transfer(to: EthAddress, value: BootyAmount): Promise<TxHash>;
    transferFrom(from: EthAddress, to: EthAddress, value: BootyAmount): Promise<TxHash>;
    approve(spender: EthAddress, value: BootyAmount): Promise<TxHash>;
    allowance(owner: EthAddress, spender: EthAddress): Promise<BootyAmount>;
}
export {};
