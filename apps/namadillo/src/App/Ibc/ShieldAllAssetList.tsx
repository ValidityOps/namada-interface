import { Asset } from "@chain-registry/types";
import { Checkbox } from "@namada/components";
import { TokenCurrency } from "App/Common/TokenCurrency";
import BigNumber from "bignumber.js";
import clsx from "clsx";
import { getAssetImageUrl } from "integrations/utils";
import { AddressWithAssetAndBalance } from "types";

export type SelectableAddressWithAssetAndBalance =
  AddressWithAssetAndBalance & {
    checked: boolean;
  };

type ShieldAllAssetListProps = {
  assets: SelectableAddressWithAssetAndBalance[];
  onToggleAsset: (asset: Asset) => void;
};

export const ShieldAllAssetList = ({
  assets,
  onToggleAsset,
}: ShieldAllAssetListProps): JSX.Element => {
  return (
    <ul className="max-h-[200px] dark-scrollbar -mr-2">
      {assets.map(
        (
          assetWithBalance: SelectableAddressWithAssetAndBalance,
          idx: number
        ) => {
          const image = getAssetImageUrl(assetWithBalance.asset);
          return (
            <li
              key={idx}
              className={clsx(
                "flex items-center justify-between bg-black text-white",
                "text-sm rounded-sm px-2.5 py-1.5"
              )}
            >
              <span className="flex gap-4 items-center">
                <Checkbox
                  className="!border-yellow"
                  checked={assetWithBalance.checked}
                  onChange={() => onToggleAsset(assetWithBalance.asset)}
                />
                {image && (
                  <img
                    src={image}
                    alt={`${assetWithBalance.asset.name} logo image`}
                    className="w-6"
                  />
                )}
                {assetWithBalance.asset.symbol}
              </span>
              <span className="text-xs">
                <TokenCurrency
                  currencySymbolClassName="hidden"
                  asset={assetWithBalance.asset}
                  amount={assetWithBalance.balance || new BigNumber(0)}
                />
              </span>
            </li>
          );
        }
      )}
    </ul>
  );
};