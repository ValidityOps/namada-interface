import { ActionButton, TableRow } from "@namada/components";
import { shortenAddress } from "@namada/utils";
import { TableWithPaginator } from "App/Common/TableWithPaginator";
import { chainStatusAtom } from "atoms/chain";
import BigNumber from "bignumber.js";
import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";
import { IoIosCopy } from "react-icons/io";
import {
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
} from "react-icons/io5";
import { twMerge } from "tailwind-merge";
import { downloadMultiSheetExcel } from "./excel";
import { ReferralSheetModal } from "./ReferralSheetModal";
import {
  Referral,
  ReferralReward,
  ReferralsTableProps,
  RewardData,
  ValidatorInfo,
} from "./types";

export const ReferralsTable = ({
  id,
  referrals,
  resultsPerPage = 50,
  initialPage = 0,
  tableClassName,
}: ReferralsTableProps): JSX.Element => {
  const [page, setPage] = useState(initialPage);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [rewardsData, setRewardsData] = useState<ReferralReward[]>([]);
  const [showModal, setShowModal] = useState(false);
  const chainStatus = useAtomValue(chainStatusAtom);

  const headers = [
    "Referrer Address",
    "Referee Address",
    "Start Epoch",
    "Created At",
    "Is Active",
    "Check On Chain",
  ];

  const renderRow = useCallback(
    (ref: Referral): TableRow => ({
      key: `referral-${ref.id}`,
      cells: [
        <div
          key="referrer"
          className="text-left font-medium max-w-[200px] flex items-center gap-2"
        >
          {shortenAddress(ref.referrer_address, 10, 6)}
          <button
            onClick={() => {
              navigator.clipboard.writeText(ref.referrer_address);
            }}
            className="text-neutral-400 hover:text-white"
            title="Copy address"
          >
            <IoIosCopy className="h-4 w-4" />
          </button>
        </div>,
        <div
          key="referee"
          className="text-left font-medium max-w-[200px] flex items-center gap-2"
        >
          {shortenAddress(ref.referee_address, 10, 6)}
          <button
            onClick={() => {
              navigator.clipboard.writeText(ref.referee_address);
            }}
            className="text-neutral-400 hover:text-white"
            title="Copy address"
          >
            <IoIosCopy className="h-4 w-4" />
          </button>
        </div>,
        <div key="start-epoch" className="text-left font-medium">
          {ref.last_paid_epoch}
        </div>,
        <div key="created-at" className="text-left font-medium">
          {ref.created_at ? new Date(ref.created_at).toLocaleString() : "N/A"}
        </div>,
        <div key="is-active" className="text-left font-medium">
          {ref.active ?
            <IoCheckmarkCircleOutline className="text-green-500 h-7 w-7" />
          : <IoCloseCircleOutline className="text-red-500 h-7 w-7" />}
        </div>,
        <div key="view-on-chain" className="text-left font-medium">
          <ActionButton
            href={`https://explorer75.org/namada/accounts/${ref.referee_address}`}
            target="_blank"
          >
            Verify
          </ActionButton>
        </div>,
      ],
    }),
    []
  );

  // Sort referrals - active ones first
  const sortedReferrals = [...referrals].sort((a, b) => {
    // Sort by active status (active first)
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    // If both have same active status, sort by creation date (newest first)
    if (a.created_at && b.created_at) {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return 0;
  });

  const paginatedItems = sortedReferrals.slice(
    page * resultsPerPage,
    page * resultsPerPage + resultsPerPage
  );
  const pageCount = Math.ceil(referrals.length / resultsPerPage);

  const generateReferralSheet = async (): Promise<void> => {
    if (!chainStatus?.epoch) {
      setGenerationError("Chain status not available");
      return;
    }
    setIsGenerating(true);
    setGenerationError(null);
    setRewardsData([]);

    try {
      type ReferralEpochMapItem = {
        type: "current" | "previous";
        referrerAddress: string;
        refereeAddress: string;
        epoch: number;
      };
      type ResponseData = ReferralEpochMapItem & {
        data: RewardData[] | null;
        success: boolean;
      };

      // map: referralKey → { epoch: { amount, validator } }
      const cumByReferral = new Map<
        string,
        Record<number, { amount: BigNumber; validator: ValidatorInfo }>
      >();
      const fetchPromises: Promise<Response>[] = [];
      const referralEpochMap: ReferralEpochMapItem[] = [];

      for (const {
        referrer_address,
        referee_address,
        last_paid_epoch,
        active,
      } of referrals) {
        // Dont fetch inactive referrals
        if (!active) continue;

        console.log(
          `Fetching rewards for ${referrer_address}-${referee_address}, last paid: ${last_paid_epoch}`
        );

        // fetch previous epoch cumulative
        if (last_paid_epoch > 0) {
          referralEpochMap.push({
            type: "previous",
            referrerAddress: referrer_address,
            refereeAddress: referee_address,
            epoch: last_paid_epoch - 1,
          });
          fetchPromises.push(
            fetch(
              `${process.env.INDEXER_URL}/api/v1/pos/reward/${referrer_address}/tnam1q8lhvxys53dlc8wzlg7dyqf9avd0vff6wvav4amt/${
                last_paid_epoch - 1
              }`
            )
          );
        }

        // Ensure we're fetching ALL epochs since last_paid_epoch
        if (chainStatus.epoch > last_paid_epoch) {
          console.log(
            `Fetching ${chainStatus.epoch - last_paid_epoch} epochs for this referral`
          );
        }

        // fetch current epochs
        for (let epoch = last_paid_epoch; epoch < chainStatus.epoch; epoch++) {
          referralEpochMap.push({
            type: "current",
            referrerAddress: referrer_address,
            refereeAddress: referee_address,
            epoch,
          });
          fetchPromises.push(
            fetch(
              `${process.env.INDEXER_URL}/api/v1/pos/reward/${referrer_address}/tnam1q8lhvxys53dlc8wzlg7dyqf9avd0vff6wvav4amt/${epoch}`
            )
          );
        }
      }

      const responses = await Promise.all(fetchPromises);
      const responseData: ResponseData[] = await Promise.all(
        responses.map(async (res, i) => {
          if (res.ok) {
            const data = (await res.json()) as RewardData[];
            return { ...referralEpochMap[i], data, success: true };
          }
          return { ...referralEpochMap[i], data: null, success: false };
        })
      );

      console.log("Processed response data count:", responseData.length);
      console.log("Cumulative rewards map entries:", cumByReferral.size);

      // build cumulative map
      responseData.forEach((r) => {
        if (!r.success || !r.data?.length) return;
        const key = `${r.referrerAddress}-${r.refereeAddress}`;
        const amt = new BigNumber(r.data[0].minDenomAmount).dividedBy(1e6);
        if (!cumByReferral.has(key)) cumByReferral.set(key, {});
        cumByReferral.get(key)![r.epoch] = {
          amount: amt,
          validator: r.data[0].validator,
        };
      });

      // compute incremental rewards
      const rewards: ReferralReward[] = [];

      console.log("Processed response data count:", responseData.length);
      console.log("Cumulative rewards map entries:", cumByReferral.size);

      for (const [key, epochMap] of cumByReferral) {
        const [referrerAddress, refereeAddress] = key.split("-");
        console.log(`Processing pair: ${referrerAddress}-${refereeAddress}`);
        console.log(`Epochs available:`, Object.keys(epochMap));

        const startEpoch = referrals.find(
          (r) =>
            r.referrer_address === referrerAddress &&
            r.referee_address === refereeAddress
        )!.last_paid_epoch;

        console.log(`Starting epoch: ${startEpoch}`);

        const epochs = Object.keys(epochMap)
          .map((n) => +n)
          .filter((e) => e >= startEpoch)
          .sort((a, b) => a - b);

        console.log(`Filtered epochs to process: ${epochs.join(", ")}`);

        // Track number of rewards added for this referral pair
        let rewardsAdded = 0;

        for (const epoch of epochs) {
          const curr = epochMap[epoch];
          const prev = epochMap[epoch - 1];

          // Calculate delta between current and previous epoch
          const delta = prev ? curr.amount.minus(prev.amount) : curr.amount;

          // Always add the reward, even if zero or negative (for debugging)
          // In production you might want to filter these out again
          if (true) {
            // Changed from delta.isGreaterThan(0)
            rewardsAdded++;
            rewards.push({
              epoch,
              referrerAddress,
              refereeAddress,
              amount: delta.isLessThan(0) ? curr.amount : delta, // Use full amount if delta is negative
              validator: curr.validator,
            });
          }
        }

        console.log(`Added ${rewardsAdded} rewards for this referral pair`);
      }

      console.log(`Total rewards to be exported: ${rewards.length}`);
      console.log(
        `Unique epochs in rewards:`,
        [...new Set(rewards.map((r) => r.epoch))].sort((a, b) => a - b)
      );

      // Group rewards by referrer address for the multi-tab file
      const rewardsByReferrer: Record<string, ReferralReward[]> = {};
      rewards.forEach((reward) => {
        if (!rewardsByReferrer[reward.referrerAddress]) {
          rewardsByReferrer[reward.referrerAddress] = [];
        }
        rewardsByReferrer[reward.referrerAddress].push(reward);
      });

      setRewardsData(rewards);

      if (rewards.length > 0) {
        // Log data to help troubleshoot generation
        console.log(
          `Generated ${rewards.length} reward entries for ${Object.keys(rewardsByReferrer).length} referrers`
        );

        // Group rewards by epoch to check how many rewards per epoch
        const rewardsByEpoch = rewards.reduce(
          (acc, reward) => {
            acc[reward.epoch] = (acc[reward.epoch] || 0) + 1;
            return acc;
          },
          {} as Record<number, number>
        );

        console.log("Rewards per epoch:", rewardsByEpoch);

        // Download the multi-sheet Excel file
        downloadMultiSheetExcel(rewardsByReferrer);
      }

      setShowModal(true);
    } catch (error) {
      console.error("Error generating referral sheet:", error);
      setGenerationError("Failed to generate referral sheet");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <TableWithPaginator
        id={id}
        headers={headers}
        renderRow={renderRow}
        itemList={paginatedItems}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        tableProps={{
          className: twMerge(
            "w-full flex-1 [&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-4 [&_td]:h-[64px]",
            "[&_td]:font-normal [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4",
            "[&_td:first-child]:rounded-s-md [&_td:last-child]:rounded-e-md",
            tableClassName
          ),
        }}
        headProps={{
          className: twMerge(
            "[&_th:last-child]:text-center",
            "text-neutral-500"
          ),
        }}
      />
      {generationError && (
        <div className="text-red-500 text-center">{generationError}</div>
      )}
      <ActionButton
        className="w-fit mx-auto my-10"
        onClick={generateReferralSheet}
        disabled={isGenerating}
      >
        {isGenerating ? "Generating..." : "Generate Referral Sheets"}
      </ActionButton>

      {showModal && rewardsData.length > 0 && (
        <ReferralSheetModal
          rewardsData={rewardsData}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};
