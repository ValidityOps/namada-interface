import { accountBalanceAtom, defaultAccountAtom } from "atoms/accounts";
import { shieldedBalanceAtom } from "atoms/balance/atoms";
import { chainStatusAtom } from "atoms/chain";
import { shouldUpdateBalanceAtom, shouldUpdateProposalAtom } from "atoms/etc";
import { claimableRewardsAtom } from "atoms/staking";
import { useAtomValue, useSetAtom } from "jotai";
import { TransferStep, TransferTransactionData } from "types";
import { useTransactionEventListener } from "utils";
import { saveReferralToSupabase } from "utils/supabase";
import { useTransactionActions } from "./useTransactionActions";

export const useTransactionCallback = (): void => {
  const { refetch: refetchBalances } = useAtomValue(accountBalanceAtom);
  const { refetch: refetchShieldedBalance } = useAtomValue(shieldedBalanceAtom);
  const { refetch: refetchRewards } = useAtomValue(claimableRewardsAtom);

  const { data: account } = useAtomValue(defaultAccountAtom);
  const { changeTransaction } = useTransactionActions();
  const shouldUpdateProposal = useSetAtom(shouldUpdateProposalAtom);
  const shouldUpdateBalance = useSetAtom(shouldUpdateBalanceAtom);
  const chainStatus = useAtomValue(chainStatusAtom);
  const onBalanceUpdate = (): void => {
    // TODO: refactor this after event subscription is enabled on indexer
    shouldUpdateBalance(true);
    refetchBalances();

    const timePolling = 6 * 1000;
    setTimeout(() => shouldUpdateBalance(false), timePolling);

    if (account?.address) {
      refetchRewards();
      setTimeout(() => refetchRewards(), timePolling);
    }
  };

  const successfulBond = async (): Promise<void> => {
    onBalanceUpdate();
    const referrerAddress = localStorage.getItem("referrerAddress");
    const refereeAddress = localStorage.getItem("refereeAddress");
    const epoch = chainStatus?.epoch;
    await saveReferralToSupabase(referrerAddress!, refereeAddress!, epoch!);

    // After this write an authenticated page that allows Paul to grab all referrals from DB
    // Then loop through them and check if the referee has received rewards in the epochs searched for.
    // Once that's done display all the referrers, referees, amounts in a table.
    // Remove all delegates that have been paid 0 on their last epoch from the DB.
    // When he presses submit then do a batch transaction of all the rewards to be paid out.
    // Make sure to add my 25% of the rewards in the transaction too.
  };

  useTransactionEventListener("Bond.Success", successfulBond);
  useTransactionEventListener("Unbond.Success", onBalanceUpdate);
  useTransactionEventListener("Withdraw.Success", onBalanceUpdate);
  useTransactionEventListener("Redelegate.Success", onBalanceUpdate);
  useTransactionEventListener("ClaimRewards.Success", onBalanceUpdate);

  useTransactionEventListener("VoteProposal.Success", () => {
    shouldUpdateProposal(true);

    // This does not guarantee that the proposal will be updated,
    // but because this is temporary solution(don't quote me on this), it should be fine :)
    const timePolling = 12 * 1000;
    setTimeout(() => shouldUpdateProposal(false), timePolling);
  });

  const onTransferSuccess = (e: CustomEvent<TransferTransactionData>): void => {
    if (!e.detail.hash) return;
    changeTransaction(e.detail.hash, {
      status: "success",
      currentStep: TransferStep.Complete,
    });
    shouldUpdateBalance(true);
    refetchBalances();
    refetchShieldedBalance();
  };

  const onTransferError = (e: CustomEvent<TransferTransactionData>): void => {
    if (!e.detail.hash) return;
    changeTransaction(e.detail.hash, {
      status: "error",
      currentStep: TransferStep.Complete,
      errorMessage: String(e.detail.errorMessage),
    });
  };

  useTransactionEventListener("TransparentTransfer.Success", onTransferSuccess);
  useTransactionEventListener("ShieldedTransfer.Success", onTransferSuccess);
  useTransactionEventListener("ShieldingTransfer.Success", onTransferSuccess);
  useTransactionEventListener("UnshieldingTransfer.Success", onTransferSuccess);
  useTransactionEventListener("IbcTransfer.Success", onTransferSuccess);
  useTransactionEventListener("IbcWithdraw.Success", onTransferSuccess);

  useTransactionEventListener("TransparentTransfer.Error", onTransferError);
  useTransactionEventListener("ShieldedTransfer.Error", onTransferError);
  useTransactionEventListener("ShieldingTransfer.Error", onTransferError);
  useTransactionEventListener("UnshieldingTransfer.Error", onTransferError);
  useTransactionEventListener("IbcTransfer.Error", onTransferError);
  useTransactionEventListener("IbcWithdraw.Error", onTransferError);
};
