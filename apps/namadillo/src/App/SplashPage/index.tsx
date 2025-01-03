import { TopNavigation } from "App/Layout/TopNavigation";
import IncrementBonding from "App/Staking/IncrementBonding";
import { StakingSummary } from "App/Staking/StakingSummary";
import { chainStatusAtom } from "atoms/chain";
import { atomsAreLoading, atomsAreNotInitialized } from "atoms/utils";
import { allValidatorsAtom } from "atoms/validators";
import { BigNumber } from "bignumber.js";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import validityOpsLogo from "./assets/validitylogo.png";
import EpochCard from "./EpochCard";

const ValidatorSplashPage = (): JSX.Element => {
  const validators = useAtomValue(allValidatorsAtom);
  const chainStatus = useAtomValue(chainStatusAtom);

  const validatorList =
    validators.isSuccess ?
      (validators.data?.filter((validator) =>
        validator.alias?.includes("ValidityOps")
      ) ?? [])
    : [];

  const validatorData = validators?.data ?? [];

  const totalVotingPower = validatorList.reduce(
    (sum, validator) =>
      sum.plus(validator.votingPowerInNAM || new BigNumber(0)),
    new BigNumber(0)
  );

  const averageApr =
    validatorList.length > 0 ?
      validatorList
        .reduce(
          (sum, validator) => sum.plus(validator.expectedApr),
          new BigNumber(0)
        )
        .dividedBy(validatorList.length)
        .times(100)
    : new BigNumber(0);

  const commission =
    validatorList
      .reduce(
        (sum, validator) => sum.plus(validator.commission),
        new BigNumber(0)
      )
      .dividedBy(validatorList.length) || new BigNumber(0);

  // UseMemo to avoid remounting IncrementBonding unnecessarily
  const IncrementBondingMemo = useMemo(() => {
    const totalNetworkStake = validatorData.reduce(
      (sum, validator) =>
        sum.plus(validator.votingPowerInNAM || new BigNumber(0)),
      new BigNumber(0)
    );

    const validityOps1Stake = validatorData
      .filter((validator) => validator.alias === "ValidityOps#1")
      .reduce(
        (sum, validator) =>
          sum.plus(validator.votingPowerInNAM || new BigNumber(0)),
        new BigNumber(0)
      );

    const stakePercentage = validityOps1Stake
      .dividedBy(totalNetworkStake)
      .multipliedBy(100);

    const initialFilter =
      stakePercentage.isGreaterThanOrEqualTo(10) ? "ValidityOps#2" : (
        "ValidityOps#1"
      );

    // Instead of relying on internal state in IncrementBonding, we pass in the filter and a callback:
    return <IncrementBonding initialFilter={initialFilter} />;
  }, [validators]);

  if (atomsAreLoading(validators) || atomsAreNotInitialized(validators)) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#261b51]">
        <div className="loader"></div>
      </div>
    );
  }

  if (!validators.isSuccess) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#261b51]">
        <div className="text-red-600">Failed to load validator data</div>
      </div>
    );
  }

  return (
    <div className="bg-[#261b51] px-10 min-h-screen">
      <div className="pt-8 pb-16 bg-[#261b51] dark-scrollbar">
        <div className="relative z-10">
          <TopNavigation />
        </div>

        <div className="relative flex justify-center -my-35">
          <img
            src={validityOpsLogo}
            alt="ValidityOps"
            className="w-[500px] h-auto"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="p-6 bg-[#261b51] border-4 border-[#3f65a3] rounded-lg">
            <h2 className="text-xl font-semibold text-[#3f65a3]">
              Total Voting Power
            </h2>
            <p className="text-3xl font-bold text-[#48b9d2] mt-4">
              {totalVotingPower.toFormat(0)} NAM
            </p>
          </div>
          <div className="p-6 bg-[#261b51] border-4 border-[#3f65a3] rounded-lg">
            <h2 className="text-xl font-semibold text-[#3f65a3]">APR</h2>
            <p className="text-3xl font-bold text-[#48b9d2] mt-4">
              {averageApr.toFormat(2)}%
            </p>
          </div>
          <div className="p-6 bg-[#261b51] border-4 border-[#3f65a3] rounded-lg">
            <h2 className="text-xl font-semibold text-[#3f65a3]">Commission</h2>
            <p className="text-3xl font-bold text-[#48b9d2] mt-4">
              {Number(commission.multipliedBy(100).toFixed(2))}%
            </p>
          </div>
          <EpochCard />
        </div>
        <div className="mb-2">
          <StakingSummary />
        </div>

        {IncrementBondingMemo}
      </div>
    </div>
  );
};

export default ValidatorSplashPage;
