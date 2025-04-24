import { ActionButton, TableRow, Tooltip } from "@namada/components";
import { shortenAddress } from "@namada/utils";
import { TableWithPaginator } from "App/Common/TableWithPaginator";
import { chainStatusAtom } from "atoms/chain";
import BigNumber from "bignumber.js";
import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Referral } from "./Referrals";
import { ReferralSheetModal } from "./ReferralSheetModal";

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

const generateCsvContent = (rewardsData: ReferralReward[]): string => {
  const headers =
    "Referrer Address,Referee Address,Epoch,Reward (NAM),Validator Name\n";
  const csvData = rewardsData
    .map((r) =>
      [
        r.referrerAddress,
        r.refereeAddress,
        r.epoch,
        r.amount.toFixed(6),
        r.validator.name,
      ].join(",")
    )
    .join("\n");
  return headers + csvData;
};

const downloadCsv = (data: string, filename: string): void => {
  const uri = encodeURI(`data:text/csv;charset=utf-8,${data}`);
  const link = document.createElement("a");
  link.setAttribute("href", uri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const ReferralsTable = ({
  id,
  referrals,
  resultsPerPage = 10,
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
  ];

  const renderRow = useCallback(
    (ref: Referral): TableRow => ({
      key: `referral-${ref.id}`,
      cells: [
        <div
          key="referrer"
          className="text-left font-medium max-w-[200px] group/tooltip relative"
        >
          {shortenAddress(ref.referrer_address, 10, 6)}
          <Tooltip position="right">{ref.referrer_address}</Tooltip>
        </div>,
        <div
          key="referee"
          className="text-left font-medium max-w-[200px] group/tooltip relative"
        >
          {shortenAddress(ref.referee_address, 10, 6)}
          <Tooltip position="right">{ref.referee_address}</Tooltip>
        </div>,
        <div key="start-epoch" className="text-left font-medium">
          {ref.start_epoch}
        </div>,
        <div key="created-at" className="text-left font-medium">
          {ref.created_at ? new Date(ref.created_at).toLocaleString() : "N/A"}
        </div>,
      ],
    }),
    []
  );

  const paginatedItems = referrals.slice(
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
        start_epoch,
      } of referrals) {
        const key = `${referrer_address}-${referee_address}`;
        // fetch previous epoch cumulative
        if (start_epoch > 0) {
          referralEpochMap.push({
            type: "previous",
            referrerAddress: referrer_address,
            refereeAddress: referee_address,
            epoch: start_epoch - 1,
          });
          fetchPromises.push(
            fetch(
              `${process.env.INDEXER_URL}/api/v1/pos/reward/${referrer_address}/tnam1q8lhvxys53dlc8wzlg7dyqf9avd0vff6wvav4amt/${
                start_epoch - 1
              }`
            )
          );
        }
        // fetch current epochs
        for (let epoch = start_epoch; epoch < chainStatus.epoch; epoch++) {
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
      for (const [key, epochMap] of cumByReferral) {
        const [referrerAddress, refereeAddress] = key.split("-");
        const startEpoch = referrals.find(
          (r) =>
            r.referrer_address === referrerAddress &&
            r.referee_address === refereeAddress
        )!.start_epoch;
        const epochs = Object.keys(epochMap)
          .map((n) => +n)
          .filter((e) => e >= startEpoch)
          .sort((a, b) => a - b);

        for (const epoch of epochs) {
          const curr = epochMap[epoch];
          const prev = epochMap[epoch - 1];
          let delta = prev ? curr.amount.minus(prev.amount) : new BigNumber(0);
          if (!prev || delta.isLessThan(0)) delta = curr.amount;
          if (delta.isGreaterThan(0)) {
            rewards.push({
              epoch,
              referrerAddress,
              refereeAddress,
              amount: delta,
              validator: curr.validator,
            });
          }
        }
      }

      setRewardsData(rewards);
      if (rewards.length > 0) {
        downloadCsv(generateCsvContent(rewards), "referral_rewards.csv");
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
        headProps={{ className: "text-neutral-500" }}
      />
      {generationError && (
        <div className="text-red-500 text-center">{generationError}</div>
      )}
      <ActionButton
        className="w-fit mx-auto my-10"
        onClick={generateReferralSheet}
        disabled={isGenerating}
      >
        {isGenerating ? "Generating..." : "Generate Referral Sheet"}
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
