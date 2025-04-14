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

// Helper function to generate CSV data
const generateCsvContent = (rewardsData: ReferralReward[]): string => {
  // CSV Headers
  const headers =
    "Referrer Address,Referee Address,Epoch,Reward (NAM),Validator Name\n";

  // Format each reward as a CSV row
  const csvData = rewardsData
    .map((reward) => {
      return [
        reward.referrerAddress,
        reward.refereeAddress,
        reward.epoch,
        reward.amount.toFixed(6),
        reward.validator.name,
      ].join(",");
    })
    .join("\n");

  return headers + csvData;
};

// Helper function to download CSV
const downloadCsv = (data: string, filename: string): void => {
  const csvContent = `data:text/csv;charset=utf-8,${data}`;
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
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

  // Define table headers
  const headers = [
    "Referrer Address",
    "Referee Address",
    "Start Epoch",
    "Created At",
  ];

  const renderRow = useCallback((referral: Referral): TableRow => {
    return {
      key: `referral-${referral.id}`,
      cells: [
        // Referrer address (truncated for display)
        <div
          key="referrer"
          className="text-left font-medium max-w-[200px] group/tooltip relative"
        >
          {shortenAddress(referral.referrer_address, 10, 6)}
          <Tooltip className="z-20" position="right">
            {referral.referrer_address}
          </Tooltip>
        </div>,
        // Referee address (truncated for display)
        <div
          key="referee"
          className="text-left font-medium max-w-[200px] group/tooltip relative"
        >
          {shortenAddress(referral.referee_address, 10, 6)}
          <Tooltip className="z-20" position="right">
            {referral.referee_address}
          </Tooltip>
        </div>,
        // Epoch
        <div key="start-epoch" className="text-left font-medium">
          {referral.start_epoch}
        </div>,
        // Created at date
        <div key="created-at" className="text-left font-medium">
          {referral.created_at ?
            new Date(referral.created_at).toLocaleString()
          : "N/A"}
        </div>,
      ],
    };
  }, []);

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
      const rewards: ReferralReward[] = [];

      // Process each referral
      for (const referral of referrals) {
        const referrerAddress = referral.referrer_address;
        const refereeAddress = referral.referee_address;

        // Get rewards for each epoch from start_epoch to current epoch
        for (
          let epoch = referral.start_epoch;
          epoch < chainStatus.epoch;
          epoch++
        ) {
          try {
            const url = `${process.env.INDEXER_URL}/api/v1/pos/reward/${referrerAddress}/tnam1q8lhvxys53dlc8wzlg7dyqf9avd0vff6wvav4amt/${epoch}`;

            const response = await fetch(url);

            if (response.ok) {
              const data = (await response.json()) as RewardData[];

              if (data && data.length > 0) {
                const rewardData = data[0];

                // Convert minDenomAmount (uNam) to NAM (1 NAM = 1,000,000 uNam)
                const amount = new BigNumber(
                  rewardData.minDenomAmount
                ).dividedBy(1_000_000);

                rewards.push({
                  epoch,
                  referrerAddress,
                  refereeAddress,
                  amount,
                  validator: rewardData.validator,
                });
              }
            } else {
              console.error(
                `Failed to fetch rewards for epoch ${epoch} for referrer ${referrerAddress}: ${response.statusText}`
              );
            }
          } catch (error) {
            console.error(
              `Error fetching rewards for epoch ${epoch} for referrer ${referrerAddress}:`,
              error
            );
          }
        }
      }

      setRewardsData(rewards);

      // Download CSV automatically
      if (rewards.length > 0) {
        const csvContent = generateCsvContent(rewards);
        downloadCsv(csvContent, "referral_rewards.csv");
      }

      // Show modal
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
