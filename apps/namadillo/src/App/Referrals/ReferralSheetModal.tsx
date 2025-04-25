import { Modal, TableRow } from "@namada/components";
import { shortenAddress } from "@namada/utils";
import { ModalTransition } from "App/Common/ModalTransition";
import { TableWithPaginator } from "App/Common/TableWithPaginator";
import BigNumber from "bignumber.js";
import { useCallback, useState } from "react";
import { IoClose } from "react-icons/io5";
import { twMerge } from "tailwind-merge";
import { ReferralReward } from "./types";

// TODO:
// - Once we pay a user we need to update their entry in the DB to last_paid_epoch
// - After this we should send a confirmation email to Paul et al to let them know:
//   - A user has been paid
//   - The amount paid
//   - The address of the user paid
//   - The epoch at which the user was paid

export const ReferralSheetModal = ({
  rewardsData,
  onClose,
}: {
  rewardsData: ReferralReward[];
  onClose: () => void;
}): JSX.Element => {
  const [selectedReferrer, setSelectedReferrer] = useState<string | null>(null);

  const headers = [
    "Referrer Address",
    "Referee Address",
    "Epoch",
    "Reward (NAM)",
  ];

  const renderRow = useCallback(
    (r: ReferralReward): TableRow => ({
      key: `rw-${r.referrerAddress}-${r.refereeAddress}-${r.epoch}`,
      cells: [
        <Addr key="ref" value={r.referrerAddress} />,
        <Addr key="ree" value={r.refereeAddress} />,
        <div key="ep">{r.epoch}</div>,
        <div key="amt">{r.amount.toFormat(6)}</div>,
      ],
    }),
    []
  );

  const byReferrer = rewardsData.reduce<Record<string, ReferralReward[]>>(
    (a, r) => ((a[r.referrerAddress] ??= []).push(r), a),
    {}
  );

  if (!selectedReferrer && Object.keys(byReferrer).length)
    setSelectedReferrer(Object.keys(byReferrer)[0]);

  const rows =
    selectedReferrer ? (byReferrer[selectedReferrer] ?? []) : rewardsData;

  const totals = rewardsData.reduce<Record<string, BigNumber>>((acc, r) => {
    const amt = new BigNumber(r.amount); // ensure BigNumber
    acc[r.referrerAddress] = (acc[r.referrerAddress] ?? new BigNumber(0)).plus(
      amt
    );
    return acc;
  }, {});

  return (
    <Modal onClose={onClose}>
      <ModalTransition
        className="relative flex flex-col w-[90vw] max-w-[1200px] h-[90svh]
                   bg-neutral-800 text-white rounded-md"
      >
        {/* header */}
        <div className="sticky top-0 z-10 bg-neutral-800 px-6 pt-3.5 pb-2 border-b border-neutral-700">
          <IoClose
            onClick={onClose}
            className="absolute top-1.5 right-6 text-3xl cursor-pointer hover:text-yellow"
          />
          <header className="text-lg text-center">Referral Rewards</header>
        </div>

        {/* body – single scroll */}
        <div className="flex-1 px-6 py-4 flex flex-col overflow-y-auto">
          {rows.length === 0 ?
            <div className="text-center py-8">No rewards found</div>
          : <>
              {/* totals */}
              <div className="bg-neutral-700 p-4 rounded-md mb-4">
                <h3 className="text-lg font-semibold mb-2">Referrer Total</h3>
                <div className="grid grid-cols-1 gap-4">
                  {selectedReferrer && totals[selectedReferrer] && (
                    <TotalCard
                      key={selectedReferrer}
                      addr={selectedReferrer}
                      amount={totals[selectedReferrer]}
                    />
                  )}
                </div>
              </div>

              {/* epoch table */}
              <div className="bg-neutral-700 p-4 rounded-md flex flex-col flex-1">
                <h3 className="text-lg font-semibold mb-2">Rewards by Epoch</h3>

                {/* referrer selector */}
                <div className="mb-4 border-b border-neutral-600 flex flex-wrap">
                  {Object.keys(byReferrer).map((addr) => (
                    <button
                      key={addr}
                      onClick={() => setSelectedReferrer(addr)}
                      className={`px-4 py-2 whitespace-nowrap ${
                        selectedReferrer === addr ?
                          "border-b-2 border-yellow text-yellow"
                        : "text-neutral-400"
                      }`}
                    >
                      {shortenAddress(addr, 6, 4)}
                    </button>
                  ))}
                </div>

                <TableWithPaginator
                  id="rewards-table"
                  headers={headers}
                  renderRow={renderRow}
                  itemList={rows}
                  page={0}
                  pageCount={1}
                  onPageChange={() => {}} /* no-op */
                  tableProps={{
                    className: twMerge(
                      "w-full min-w-[600px] [&_td]:px-3 [&_th]:px-3 [&_td]:h-[64px]",
                      "[&_td:first-child]:pl-4 [&_td:last-child]:pr-4",
                      "[&_td:first-child]:rounded-s-md [&_td:last-child]:rounded-e-md"
                    ),
                  }}
                  headProps={{ className: "text-neutral-500" }}
                />
              </div>
            </>
          }
        </div>
      </ModalTransition>
    </Modal>
  );
};

const Addr = ({ value }: { value: string }): JSX.Element => (
  <div className="text-left font-medium max-w-[200px] group/tooltip relative">
    {shortenAddress(value, 10, 6)}
  </div>
);

const TotalCard = ({
  addr,
  amount,
}: {
  addr: string;
  amount: BigNumber;
}): JSX.Element => {
  return (
    <div className="flex flex-col p-3 border border-neutral-600 rounded-md w-[400px]">
      <div className="flex justify-between mb-1 text-sm text-neutral-400">
        <span>Referrer:</span>
        <div className="text-left font-medium">
          {shortenAddress(addr, 10, 6)}
          <button
            className="p-1 ml-2 bg-neutral-800 rounded text-xs"
            onClick={() => {
              navigator.clipboard.writeText(addr);
            }}
          >
            Copy
          </button>
        </div>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-neutral-400">Total NAM Referred:</span>
        <span className="font-bold text-green-400">{amount.toFormat(6)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-neutral-400">Total NAM Owed:</span>
        <span className="font-bold text-green-400">
          {amount.multipliedBy(0.05).toFormat(6)}
        </span>
      </div>
    </div>
  );
};
