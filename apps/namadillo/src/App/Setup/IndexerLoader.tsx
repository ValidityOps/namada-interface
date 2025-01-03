import { indexerUrlAtom } from "atoms/settings";
import { cycleTomlIndexerAtom, cycleTomlRpcAtom } from "atoms/settings/atoms";
import { useAtomValue } from "jotai";
import { ReactNode } from "react";

export const IndexerLoader = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const indexerUrl = useAtomValue(indexerUrlAtom);
  const cycleTomlIndexer = useAtomValue(cycleTomlIndexerAtom);
  const cycleTomlRpc = useAtomValue(cycleTomlRpcAtom);

  // if (!indexerUrl) {
  //   return <Setup />;
  // }

  return <>{children}</>;
};
