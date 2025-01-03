import { Heading, PieChart, SkeletonLoading } from "@namada/components";
import { ProgressBarNames, SdkEvents } from "@namada/sdk/web";
import { AtomErrorBoundary } from "App/Common/AtomErrorBoundary";
import { FiatCurrency } from "App/Common/FiatCurrency";
import { shieldedSyncAtom, shieldedTokensAtom } from "atoms/balance/atoms";
import { getTotalDollar } from "atoms/balance/functions";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { colors } from "theme";
import {
  ProgressBarFinished,
  ProgressBarIncremented,
} from "workers/ShieldedSyncWorker";

export const ShieldedBalanceChart = (): JSX.Element => {
  const shieldedTokensQuery = useAtomValue(shieldedTokensAtom);
  const [{ data: shieldedSyncProgress, refetch: shieledSync }] =
    useAtom(shieldedSyncAtom);
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  const [progress, setProgress] = useState({
    [ProgressBarNames.Scanned]: 0,
    [ProgressBarNames.Fetched]: 0,
    [ProgressBarNames.Applied]: 0,
  });

  useEffect(() => {
    if (!shieldedSyncProgress) return;
    const onProgressBarIncremented = ({
      name,
      current,
      total,
    }: ProgressBarIncremented): void => {
      if (name === ProgressBarNames.Fetched) {
        // TODO: this maybe can be improved by passing total in ProgressBarStarted event
        // If total is more than one batch of 100, show progress
        if (total > 100) {
          setShowSyncProgress(true);
        }

        const perc =
          total === 0 ? 0 : Math.min(Math.floor((current / total) * 100), 100);

        setProgress((prev) => ({
          ...prev,
          [name]: perc,
        }));
      }
    };

    const onProgressBarFinished = ({ name }: ProgressBarFinished): void => {
      if (name === ProgressBarNames.Fetched) {
        setProgress((prev) => ({
          ...prev,
          [name]: 100,
        }));

        setShowSyncProgress(false);
      }
    };

    shieldedSyncProgress.on(
      SdkEvents.ProgressBarIncremented,
      onProgressBarIncremented
    );

    shieldedSyncProgress.on(
      SdkEvents.ProgressBarFinished,
      onProgressBarFinished
    );

    return () => {
      shieldedSyncProgress.off(
        SdkEvents.ProgressBarIncremented,
        onProgressBarIncremented
      );
      shieldedSyncProgress.off(
        SdkEvents.ProgressBarFinished,
        onProgressBarFinished
      );
    };
  }, [shieldedSyncProgress]);

  useEffect(() => {
    shieledSync();
  }, []);

  const shieldedDollars = getTotalDollar(shieldedTokensQuery.data);

  return (
    <div className="flex items-center justify-center h-full w-full relative">
      <div className="h-[250px] w-[250px]">
        <AtomErrorBoundary
          result={shieldedTokensQuery}
          niceError="Unable to load balance"
        >
          {shieldedTokensQuery.isPending || showSyncProgress ?
            <SkeletonLoading
              height="100%"
              width="100%"
              className={twMerge(
                "rounded-full border-neutral-800 border-[24px] bg-transparent",
                "flex items-center justify-center"
              )}
            >
              {showSyncProgress && (
                <div>{progress[ProgressBarNames.Fetched]}%</div>
              )}
            </SkeletonLoading>
          : <>
              <PieChart
                id="balance-chart"
                data={[{ value: 100, color: colors.shielded }]}
                strokeWidth={24}
                radius={125}
                segmentMargin={0}
              >
                <div className="flex flex-col gap-1 items-center leading-tight max-w-[180px]">
                  {!shieldedDollars ?
                    "N/A"
                  : <>
                      <Heading className="text-sm" level="h3">
                        Shielded Balance
                      </Heading>
                      <FiatCurrency
                        className="text-2xl sm:text-3xl whitespace-nowrap after:content-['*']"
                        amount={shieldedDollars}
                      />
                    </>
                  }
                </div>
              </PieChart>
              <div className="absolute -bottom-4 -left-2 text-[10px]">
                *Balances exclude NAM until phase 5{" "}
              </div>
            </>
          }
        </AtomErrorBoundary>
      </div>
    </div>
  );
};
