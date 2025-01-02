import { indexerUrlAtom } from "atoms/settings";
import { cycleTomlIndexerAtom, cycleTomlRpcAtom } from "atoms/settings/atoms";
import { useAtomValue } from "jotai";
import { ReactNode } from "react";
import { Setup } from "../Common/Setup";

export const IndexerLoader = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const indexerUrl = useAtomValue(indexerUrlAtom);
  const cycleTomlIndexer = useAtomValue(cycleTomlIndexerAtom);
  const cycleTomlRpc = useAtomValue(cycleTomlRpcAtom);
  console.log("cycleTomlIndexer", cycleTomlIndexer);
  console.log("indexerUrl", indexerUrl);
  console.log("cycleTomlRpc", cycleTomlRpc);

  if (!indexerUrl) {
    return <Setup />;
  }

  return <>{children}</>;
};
