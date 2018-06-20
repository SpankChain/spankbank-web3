// TODO:
// - waitForWeb3 kinda thing

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

export class SpankBank {
  contractAddress: EthAddress

  constructor(contractAddress: EthAddress) {
    this.contractAddress = contractAddress
  }

  async stake(
    spankAmount: SpankAmount,
    stakePeriods: number,
    activityKey: EthAddress,
    bootyBase: EthAddress
  ): Promise<void> {

  }

  async getSpankPoints(stakerAddress: EthAddress, period: number): Promise<SpankPoints> {
    return 69
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
