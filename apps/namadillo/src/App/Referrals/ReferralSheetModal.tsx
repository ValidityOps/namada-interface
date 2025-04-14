import { Modal } from "@namada/components";

import { Tooltip } from "@namada/components";

import { TableRow } from "@namada/components";
import { shortenAddress } from "@namada/utils";
import { ModalTransition } from "App/Common/ModalTransition";
import { TableWithPaginator } from "App/Common/TableWithPaginator";
import BigNumber from "bignumber.js";
import { useCallback, useState } from "react";
import { IoClose } from "react-icons/io5";
import { twMerge } from "tailwind-merge";
import { ReferralReward } from "./ReferralsTable";

export const ReferralSheetModal = ({
  rewardsData,
  onClose,
}: {
  rewardsData: ReferralReward[];
  onClose: () => void;
}): JSX.Element => {
  const [page, setPage] = useState(0);
  const resultsPerPage = 10;

  // Define table headers
  const headers = [
    "Referrer Address",
    "Referee Address",
    "Epoch",
    "Reward (NAM)",
  ];

  const renderRow = useCallback((reward: ReferralReward): TableRow => {
    return {
      key: `reward-${reward.referrerAddress}-${reward.refereeAddress}-${reward.epoch}`,
      cells: [
        // Referrer address (truncated for display)
        <div
          key="referrer"
          className="text-left font-medium max-w-[200px] group/tooltip relative"
        >
          {shortenAddress(reward.referrerAddress, 10, 6)}
          <Tooltip className="z-20" position="right">
            {reward.referrerAddress}
          </Tooltip>
        </div>,
        // Referee address (truncated for display)
        <div
          key="referee"
          className="text-left font-medium max-w-[200px] group/tooltip relative"
        >
          {shortenAddress(reward.refereeAddress, 10, 6)}
          <Tooltip className="z-20" position="right">
            {reward.refereeAddress}
          </Tooltip>
        </div>,
        // Epoch
        <div key="epoch" className="text-left font-medium">
          {reward.epoch}
        </div>,
        // Reward amount in NAM
        <div key="reward" className="text-left font-medium">
          {reward.amount.toFormat(6)}
        </div>,
      ],
    };
  }, []);

  const paginatedItems = rewardsData.slice(
    page * resultsPerPage,
    page * resultsPerPage + resultsPerPage
  );

  const pageCount = Math.ceil(rewardsData.length / resultsPerPage);

  // Calculate total rewards per referrer
  const totalRewards = rewardsData.reduce(
    (acc, reward) => {
      if (!acc[reward.referrerAddress]) {
        acc[reward.referrerAddress] = BigNumber(0);
      }
      acc[reward.referrerAddress] = acc[reward.referrerAddress].plus(
        reward.amount
      );
      return acc;
    },
    {} as Record<string, BigNumber>
  );

  // Group rewards by referrer address for easier navigation
  const rewardsByReferrer = rewardsData.reduce(
    (acc, reward) => {
      if (!acc[reward.referrerAddress]) {
        acc[reward.referrerAddress] = [];
      }
      acc[reward.referrerAddress].push(reward);
      return acc;
    },
    {} as Record<string, ReferralReward[]>
  );

  return (
    <Modal onClose={onClose}>
      <ModalTransition
        className="relative flex flex-col w-[100vw] sm:w-[95vw] lg:w-[90vw] 2xl:w-[75vw] 
                   h-[90svh] overflow-auto px-6 pt-3.5 pb-4 bg-neutral-800 text-white rounded-md"
      >
        <i
          className="cursor-pointer text-white absolute top-1.5 right-6 text-3xl p-1.5 hover:text-yellow z-50"
          onClick={onClose}
        >
          <IoClose />
        </i>
        <header className="flex w-full justify-center items-center relative mb-0 text-lg text-medium">
          Referral Rewards
        </header>

        <div className="flex-1 overflow-hidden pt-4">
          {rewardsData.length === 0 ?
            <div className="text-center py-4">No rewards found</div>
          : <div className="flex flex-col gap-6">
              <div className="bg-neutral-700 p-4 rounded-md">
                <h3 className="text-lg font-semibold mb-2">
                  Total Rewards by Referrer
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(totalRewards).map(([address, amount]) => (
                    <div
                      key={address}
                      className="flex flex-col p-3 border border-neutral-600 rounded-md"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-neutral-400">
                          Referrer:
                        </span>
                        <div className="group/tooltip relative">
                          {shortenAddress(address, 10, 6)}
                          <Tooltip className="z-20" position="right">
                            {address}
                          </Tooltip>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-400">
                          Total NAM:
                        </span>
                        <span className="font-bold text-green-400">
                          {amount.toFormat(6)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Rewards by Epoch</h3>

                {/* Referrer selector tabs */}
                <div className="mb-4 border-b border-neutral-600">
                  <div className="flex overflow-x-auto">
                    {Object.keys(rewardsByReferrer).map(
                      (referrerAddress, index) => (
                        <button
                          key={referrerAddress}
                          className={`px-4 py-2 whitespace-nowrap ${
                            page === index ?
                              "border-b-2 border-yellow text-yellow"
                            : "text-neutral-400"
                          }`}
                          onClick={() => setPage(index)}
                        >
                          {shortenAddress(referrerAddress, 6, 4)}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <TableWithPaginator
                  id="referral-rewards-table"
                  headers={headers}
                  renderRow={renderRow}
                  itemList={paginatedItems}
                  page={page % resultsPerPage}
                  pageCount={pageCount}
                  onPageChange={setPage}
                  tableProps={{
                    className: twMerge(
                      "w-full flex-1 [&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-4 [&_td]:h-[64px]",
                      "[&_td]:font-normal [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4",
                      "[&_td:first-child]:rounded-s-md [&_td:last-child]:rounded-e-md"
                    ),
                  }}
                  headProps={{ className: "text-neutral-500" }}
                />
              </div>
            </div>
          }
        </div>
      </ModalTransition>
    </Modal>
  );
};
