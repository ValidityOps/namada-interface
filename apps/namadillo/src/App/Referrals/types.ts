import BigNumber from "bignumber.js";

export type Referral = {
  id: number;
  referrer_address: string;
  referee_address: string;
  last_paid_epoch: number;
  active: boolean;
  created_at?: string;
};
export type ReferralsTableProps = {
  id: string;
  referrals: Referral[];
  resultsPerPage?: number;
  initialPage?: number;
  tableClassName?: string;
};

export type ValidatorInfo = {
  address: string;
  votingPower: string;
  maxCommission: string;
  commission: string;
  state: string;
  name: string;
  email: string;
  website: string;
  description: string;
  discordHandle: string | null;
  avatar: string;
  validatorId: string;
  rank: string | null;
};

export type RewardData = {
  minDenomAmount: string;
  validator: ValidatorInfo;
};

export type ReferralReward = {
  epoch: number;
  referrerAddress: string;
  refereeAddress: string;
  amount: BigNumber;
  validator: ValidatorInfo;
};
