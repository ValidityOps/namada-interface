import { Chain } from "@chain-registry/types";
import { AccountType } from "@namada/types";
import { mapUndefined } from "@namada/utils";
import { params, routes } from "App/routes";
import {
  OnSubmitTransferParams,
  TransferModule,
} from "App/Transfer/TransferModule";
import { allDefaultAccountsAtom } from "atoms/accounts";
import {
  assetBalanceAtomFamily,
  availableChainsAtom,
  enabledIbcAssetsDenomFamily,
  ibcChannelsFamily,
} from "atoms/integrations";
import BigNumber from "bignumber.js";
import { useFathomTracker } from "hooks/useFathomTracker";
import { useIbcTransaction } from "hooks/useIbcTransaction";
import { useTransactionActions } from "hooks/useTransactionActions";
import { useUrlState } from "hooks/useUrlState";
import { useWalletManager } from "hooks/useWalletManager";
import { wallets } from "integrations";
import { KeplrWalletManager } from "integrations/Keplr";
import invariant from "invariant";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { generatePath, useNavigate } from "react-router-dom";
import namadaChain from "registry/namada.json";
import { AddressWithAssetAndAmountMap } from "types";
import { useTransactionEventListener } from "utils";
import { IbcTabNavigation } from "./IbcTabNavigation";
import { IbcTopHeader } from "./IbcTopHeader";

const keplr = new KeplrWalletManager();
const defaultChainId = "cosmoshub-4";

export const IbcTransfer = (): JSX.Element => {
  const navigate = useNavigate();
  const [completedAt, setCompletedAt] = useState<Date | undefined>();

  // Global & Atom states
  const availableChains = useAtomValue(availableChainsAtom);
  const defaultAccounts = useAtomValue(allDefaultAccountsAtom);

  // Wallet & Registry
  const {
    registry,
    walletAddress: sourceAddress,
    connectToChainId,
  } = useWalletManager(keplr);

  // IBC Channels & Balances
  const {
    data: ibcChannels,
    isError: unknownIbcChannels,
    isLoading: isLoadingIbcChannels,
  } = useAtomValue(ibcChannelsFamily(registry?.chain.chain_name));

  const { data: userAssets, isLoading: isLoadingBalances } = useAtomValue(
    assetBalanceAtomFamily({
      chain: registry?.chain,
      walletAddress: sourceAddress,
    })
  );

  const { trackEvent } = useFathomTracker();
  const { data: enabledAssets, isLoading: isLoadingEnabledAssets } =
    useAtomValue(enabledIbcAssetsDenomFamily(ibcChannels?.namadaChannel));
  const [shielded, setShielded] = useState<boolean>(true);
  const [selectedAssetAddress, setSelectedAssetAddress] = useUrlState(
    params.asset
  );
  const [amount, setAmount] = useState<BigNumber | undefined>();
  const [generalErrorMessage, setGeneralErrorMessage] = useState("");
  const [sourceChannel, setSourceChannel] = useState("");
  const [destinationChannel, setDestinationChannel] = useState("");
  const [currentProgress, setCurrentProgress] = useState<string>();
  const [txHash, setTxHash] = useState<string | undefined>();

  // Derived data
  const availableAmount = mapUndefined(
    (address) => userAssets?.[address]?.amount,
    selectedAssetAddress
  );

  const selectedAsset =
    selectedAssetAddress ? userAssets?.[selectedAssetAddress] : undefined;

  const availableAssets = useMemo(() => {
    if (!enabledAssets || !userAssets) return undefined;

    const output: AddressWithAssetAndAmountMap = {};
    for (const key in userAssets) {
      const counterpartyBaseDenom =
        userAssets[key].asset.traces?.[0].counterparty.base_denom || "";

      // We look for both native for chain and in counterparty base denom
      // TODO/IMPORTANT: this will not work for HOUSEFIRE NAM as it's not a part of
      // osmosis asset list
      if (
        enabledAssets.includes(userAssets[key].asset.base) ||
        enabledAssets.includes(counterpartyBaseDenom)
      ) {
        output[key] = { ...userAssets[key] };
      }
    }

    return output;
  }, [enabledAssets, userAssets]);

  // Manage the history of transactions
  const { storeTransaction } = useTransactionActions();

  // Utils for IBC transfers
  const { transferToNamada, gasConfig } = useIbcTransaction({
    registry,
    sourceAddress,
    sourceChannel,
    destinationChannel,
    shielded,
    selectedAsset,
  });

  const namadaAddress = useMemo(() => {
    return (
      defaultAccounts.data?.find(
        (account) => (account.type === AccountType.ShieldedKeys) === shielded
      )?.address || ""
    );
  }, [defaultAccounts, shielded]);

  const requiresIbcChannels = Boolean(
    !isLoadingIbcChannels &&
      (unknownIbcChannels ||
        (shielded && ibcChannels && !ibcChannels?.namadaChannel))
  );

  useEffect(() => setSelectedAssetAddress(undefined), [registry]);

  // Set source and destination channels based on IBC channels data
  useEffect(() => {
    setSourceChannel(ibcChannels?.ibcChannel || "");
    setDestinationChannel(ibcChannels?.namadaChannel || "");
  }, [ibcChannels]);

  useTransactionEventListener("IbcTransfer.Success", (e) => {
    if (txHash && e.detail.hash === txHash) {
      setCompletedAt(new Date());
      trackEvent(
        `${shielded ? "Shielded " : ""}IbcTransfer: tx complete (${e.detail.asset.symbol})`
      );
    }
  });

  useTransactionEventListener("IbcTransfer.Error", (e) => {
    trackEvent(
      `${shielded ? "Shielded " : ""}IbcTransfer: tx error (${e.detail.asset.symbol})`
    );
  });

  const onSubmitTransfer = async ({
    displayAmount,
    destinationAddress,
    memo,
  }: OnSubmitTransferParams): Promise<void> => {
    try {
      invariant(selectedAsset?.originalAddress, "Error: Asset not selected");
      invariant(registry?.chain, "Error: Chain not selected");
      setGeneralErrorMessage("");
      setCurrentProgress("Submitting...");
      const result = await transferToNamada.mutateAsync({
        destinationAddress,
        displayAmount,
        memo,
        onUpdateStatus: setCurrentProgress,
      });
      storeTransaction(result);
      setTxHash(result.hash);
      trackEvent(
        `${shielded ? "Shielded " : ""}IbcTransfer: tx submitted (${result.asset.symbol})`
      );
    } catch (err) {
      setGeneralErrorMessage(err + "");
      setCurrentProgress(undefined);
    }
  };

  const onChangeWallet = (): void => {
    if (registry) {
      connectToChainId(registry.chain.chain_id);
      return;
    }
    connectToChainId(defaultChainId);
  };

  const onChangeChain = (chain: Chain): void => {
    connectToChainId(chain.chain_id);
  };

  return (
    <div className="relative min-h-[600px]">
      <header className="flex flex-col items-center text-center mb-8 gap-6">
        <IbcTopHeader type="ibcToNam" isShielded={shielded} />
      </header>
      <div className="mb-6">
        <IbcTabNavigation />
      </div>
      <TransferModule
        source={{
          isLoadingAssets: isLoadingBalances || isLoadingEnabledAssets,
          availableAssets,
          selectedAssetAddress,
          availableAmount,
          availableChains,
          onChangeChain,
          chain: registry?.chain,
          availableWallets: [wallets.keplr],
          wallet: wallets.keplr,
          walletAddress: sourceAddress,
          onChangeWallet,
          onChangeSelectedAsset: setSelectedAssetAddress,
          amount,
          onChangeAmount: setAmount,
        }}
        destination={{
          chain: namadaChain as Chain,
          availableWallets: [wallets.namada],
          wallet: wallets.namada,
          walletAddress: namadaAddress,
          isShieldedAddress: shielded,
          onChangeShielded: setShielded,
        }}
        gasConfig={gasConfig.data}
        changeFeeEnabled={false}
        isSubmitting={
          transferToNamada.isPending ||
          /* isSuccess means that the transaction has been broadcasted, but doesn't take
           * in consideration if it was applied to Namada chain, or releayed successfully.
           * In order to get this confirmation, we poll the RPC endpoint on useTransactionWatcher hook. */
          transferToNamada.isSuccess
        }
        completedAt={completedAt}
        isIbcTransfer={true}
        currentStatus={currentProgress}
        requiresIbcChannels={requiresIbcChannels}
        ibcOptions={{
          sourceChannel,
          onChangeSourceChannel: setSourceChannel,
          destinationChannel,
          onChangeDestinationChannel: setDestinationChannel,
        }}
        errorMessage={generalErrorMessage || transferToNamada.error?.message}
        onSubmitTransfer={onSubmitTransfer}
        onComplete={() => {
          txHash &&
            navigate(generatePath(routes.transaction, { hash: txHash }));
        }}
      />
    </div>
  );
};
