import { ActionButton, Alert, Panel } from "@namada/components";
import { BondMsgValue } from "@namada/types";
import { AtomErrorBoundary } from "App/Common/AtomErrorBoundary";
import { NamCurrency } from "App/Common/NamCurrency";
import { TableRowLoading } from "App/Common/TableRowLoading";
import { TransactionFees } from "App/Common/TransactionFees";
import { accountBalanceAtom, defaultAccountAtom } from "atoms/accounts";
import { chainParametersAtom } from "atoms/chain";
import { createBondTxAtom } from "atoms/staking";
import { allValidatorsAtom } from "atoms/validators";
import BigNumber from "bignumber.js";
import clsx from "clsx";
import { useStakeModule } from "hooks/useStakeModule";
import { useTransaction } from "hooks/useTransaction";
import { useValidatorFilter } from "hooks/useValidatorFilter";
import { useValidatorSorting } from "hooks/useValidatorSorting";
import { useAtomValue } from "jotai";
import { useRef, useState } from "react";
import { GoAlert } from "react-icons/go";
import { useLocation } from "react-router-dom";
import { ValidatorFilterOptions } from "types";
import { BondingAmountOverview } from "./BondingAmountOverview";
import { IncrementBondingTable } from "./IncrementBondingTable";
import { ValidatorFilterNav } from "./ValidatorFilterNav";

type IncrementBondingProps = {
  initialFilter?: string;
  onClose?: () => void;
};

const IncrementBonding = ({
  initialFilter = "",
}: IncrementBondingProps): JSX.Element => {
  const [filter, setFilter] = useState<string>(initialFilter);
  const [onlyMyValidators, setOnlyMyValidators] = useState(false);
  const [validatorFilter, setValidatorFilter] =
    useState<ValidatorFilterOptions>("all");
  const accountBalance = useAtomValue(accountBalanceAtom);
  const seed = useRef(Math.random());
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const referralAddress = queryParams.get("referral");

  const { data: chainParameters } = useAtomValue(chainParametersAtom);
  const { data: account } = useAtomValue(defaultAccountAtom);
  const validators = useAtomValue(allValidatorsAtom);
  const validatorList = validators.data?.filter((validator) =>
    validator.alias?.includes("ValidityOps")
  );
  const totalVotingPower = validatorList?.reduce(
    (sum, validator) =>
      sum.plus(validator.votingPowerInNAM || new BigNumber(0)),
    new BigNumber(0)
  );
  const resultsPerPage = 100;

  const {
    myValidators,
    totalUpdatedAmount,
    totalStakedAmount,
    totalNamAfterStaking,
    stakedAmountByAddress,
    updatedAmountByAddress,
    onChangeValidatorAmount,
  } = useStakeModule({ account });

  const parseUpdatedAmounts = (): BondMsgValue[] => {
    if (!account?.address) return [];
    return Object.keys(updatedAmountByAddress)
      .map((validatorAddress) => ({
        validator: validatorAddress,
        source: account.address,
        amount: updatedAmountByAddress[validatorAddress],
      }))
      .filter((entries) => entries.amount.gt(0));
  };

  const onCloseModal = (): void => {};

  const {
    execute: performBonding,
    gasConfig,
    isEnabled,
    isPending: isPerformingBonding,
  } = useTransaction({
    createTxAtom: createBondTxAtom,
    params: parseUpdatedAmounts(),
    eventType: "Bond",
    parsePendingTxNotification: () => ({
      title: "Staking transaction in progress",
      description: (
        <>
          Your staking transaction of{" "}
          <NamCurrency amount={totalUpdatedAmount} /> is being processed
        </>
      ),
    }),
    parseErrorTxNotification: (err?: unknown) => {
      return {
        title: "Staking transaction failed",
        description: "",
      };
    },

    onSuccess: async () => {
      const message = `New Staking Transaction Complete! 🎉\nAmount: ${Number(totalUpdatedAmount)?.toLocaleString()} $NAM\nTotal Bonded: ${Number(totalVotingPower)?.toLocaleString()} $NAM`;
      onCloseModal();
      await sendTelegramMessage(
        message,
        Number(totalUpdatedAmount),
        referralAddress ? account!.address : null
      );
    },
  });

  const filteredValidators = useValidatorFilter({
    validators: validators.isSuccess ? validators.data : [],
    myValidatorsAddresses: Array.from(
      new Set([
        ...Object.keys(stakedAmountByAddress),
        ...Object.keys(updatedAmountByAddress),
      ])
    ),
    searchTerm: filter,
    validatorFilter,
    onlyMyValidators,
  });

  const sortedValidators = useValidatorSorting({
    validators: filteredValidators,
    updatedAmountByAddress,
    seed: seed.current,
  });

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (process.env.NODE_ENV === "development") {
      const message = `New Staking Transaction Complete! 🎉\nAmount: ${Number(totalUpdatedAmount)?.toLocaleString()} $NAM\nTotal Bonded: ${Number(totalVotingPower)?.toLocaleString()} $NAM`;
      await sendTelegramMessage(
        message,
        Number(totalUpdatedAmount),
        account!.address
      );
    }
    performBonding();
  };

  const errorMessage = ((): string => {
    if (accountBalance.isPending) return "Loading...";
    if (accountBalance.data?.lt(totalUpdatedAmount))
      return "Error: not enough balance";
    return "";
  })();

  const sendTelegramMessage = async (
    message: string,
    total: number,
    userAddress: string | null
  ): Promise<void> => {
    try {
      const response = await fetch(
        "https://namada-telegram-api-service.vercel.app/api/telegram",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message, total, userAddress }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to send Telegram notification: ${JSON.stringify(errorData)}`
        );
      }
    } catch (error) {
      console.error("Error sending Telegram notification:", error);
      throw error;
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-rows-[max-content_auto_max-content] gap-2 h-full"
    >
      <div className="grid grid-cols-[repeat(auto-fit,_minmax(8rem,_1fr))] gap-1.5">
        <BondingAmountOverview
          title="Available to Stake"
          className="col-span-2"
          stackClassName="grid grid-rows-[auto_auto_auto]"
          amountInNam={accountBalance.data ?? 0}
          updatedAmountInNam={totalNamAfterStaking}
          extraContent={
            <>
              <Alert
                type="warning"
                className={clsx(
                  "rounded-sm text-xs",
                  "py-3 right-2 top-4 max-w-[240px]",
                  "sm:col-start-2 sm:row-span-full sm:justify-self-end"
                )}
              >
                <div className="flex items-center gap-3 text-xs">
                  <i className="text-base">
                    <GoAlert />
                  </i>
                  <p className="text-balance">
                    Staking will lock and bind your assets to an unbonding
                    schedule of {chainParameters?.unbondingPeriod}. To make your
                    NAM liquid again, you will need to unstake.
                  </p>
                </div>
              </Alert>
            </>
          }
        />
        <BondingAmountOverview
          title="Current Stake"
          amountInNam={totalStakedAmount}
        />
        <BondingAmountOverview
          title="Increased Stake"
          updatedAmountInNam={totalUpdatedAmount}
          updatedValueClassList="text-yellow"
          amountInNam={0}
        />
      </div>
      {account?.address && (
        <Panel className="grid grid-rows-[max-content_auto] w-full relative overflow-hidden">
          {validators.isSuccess && !initialFilter && (
            <ValidatorFilterNav
              validators={validators.data}
              updatedAmountByAddress={updatedAmountByAddress}
              stakedAmountByAddress={stakedAmountByAddress}
              onChangeSearch={(value: string) => setFilter(value)}
              onlyMyValidators={onlyMyValidators}
              onFilterByMyValidators={setOnlyMyValidators}
              validatorFilter={validatorFilter}
              onChangeValidatorFilter={setValidatorFilter}
            />
          )}
          {(validators.isLoading || myValidators.isLoading) && (
            <div className="mt-3">
              <TableRowLoading count={2} />
            </div>
          )}
          <AtomErrorBoundary
            result={[validators, myValidators]}
            niceError="Unable to load validators list"
            containerProps={{ className: "span-2" }}
          >
            {validators.isSuccess && myValidators.isSuccess && (
              <IncrementBondingTable
                resultsPerPage={resultsPerPage}
                validators={sortedValidators}
                onChangeValidatorAmount={onChangeValidatorAmount}
                updatedAmountByAddress={updatedAmountByAddress}
                stakedAmountByAddress={stakedAmountByAddress}
              />
            )}
          </AtomErrorBoundary>
        </Panel>
      )}
      <div className="relative grid grid-cols-[1fr_25%_1fr] items-center">
        {account?.address && (
          <>
            <ActionButton
              type="submit"
              size="sm"
              className="mt-2 col-start-2"
              backgroundColor="cyan"
              disabled={
                !!errorMessage || totalUpdatedAmount.eq(0) || !isEnabled
              }
            >
              {isPerformingBonding ? "Processing..." : errorMessage || "Stake"}
            </ActionButton>
            {gasConfig && (
              <TransactionFees
                className="justify-self-end px-4"
                gasConfig={gasConfig}
              />
            )}
          </>
        )}
      </div>
    </form>
  );
};

export default IncrementBonding;
