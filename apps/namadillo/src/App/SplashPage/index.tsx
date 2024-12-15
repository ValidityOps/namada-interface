import { TopNavigation } from "App/Layout/TopNavigation";
import IncrementBonding from "App/Staking/IncrementBonding";
import { defaultAccountAtom } from "atoms/accounts";
import { atomsAreLoading, atomsAreNotInitialized } from "atoms/utils";
import { allValidatorsAtom } from "atoms/validators";
import { BigNumber } from "bignumber.js";
import { useAtomValue } from "jotai";
import validityOpsLogo from "./assets/validitylogo.png";

const ValidatorSplashPage = (): JSX.Element => {
  const validators = useAtomValue(allValidatorsAtom);
  const { data: account } = useAtomValue(defaultAccountAtom);

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

  const validatorList = validators.data.filter((validator) =>
    validator.alias?.includes("ValidityOps")
  );

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
    : new BigNumber(0);

  const commission =
    validatorList
      .reduce(
        (sum, validator) => sum.plus(validator.commission),
        new BigNumber(0)
      )
      .dividedBy(validatorList.length) || new BigNumber(0);

  const FilteredIncrementBonding = (): JSX.Element => {
    const totalNetworkStake = validators.data.reduce(
      (sum, validator) =>
        sum.plus(validator.votingPowerInNAM || new BigNumber(0)),
      new BigNumber(0)
    );

    const validityOps1Stake = validators.data
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

    return <IncrementBonding initialFilter={initialFilter} />;
  };

  return (
    <div className="bg-[#261b51] px-10 min-h-screen">
      {account?.address && (
        <div className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 p-6 mb-6 shadow-lg transform transition-all hover:shadow-xl">
          <div className="flex flex-col space-y-3">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Thank you for choosing ValidityOps
            </h3>
            <div className="text-white/90">
              Here is a referral link to earn back rewards for each staking
              delegation that uses your referral link:
            </div>
            <div className="mt-2 flex items-center gap-2 bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/20">
              <input
                type="text"
                readOnly
                value={`https://validityops.com?/referral=${account.address}`}
                className="flex-1 bg-transparent text-white font-medium focus:outline-none text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://validityops.com?/referral=${account.address}`
                  );
                  const button = document.getElementById("copyButton");
                  if (button) {
                    button.innerHTML = "Copied!";
                    setTimeout(() => {
                      button.innerHTML = "Copy";
                    }, 2000);
                  }
                }}
                id="copyButton"
                className="px-4 py-1.5 bg-white text-green-600 rounded-md text-sm font-medium hover:bg-green-50 transition-colors duration-200"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-5">
          <div className="p-6 bg-[#261b51] border-4 border-[#3f65a3] rounded-lg">
            <h2 className="text-xl font-semibold text-[#3f65a3]">
              Total Voting Power
            </h2>
            <p className="text-3xl font-bold text-[#48b9d2] mt-4">
              {totalVotingPower.toFormat(2)} NAM
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
        </div>
        <FilteredIncrementBonding />
      </div>
    </div>
  );
};

export default ValidatorSplashPage;
