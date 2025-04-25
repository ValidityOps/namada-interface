import { Panel } from "@namada/components";
import { routes } from "App/routes";
import { defaultAccountAtom } from "atoms/accounts";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReferralsFromSupabase } from "../../utils/supabase";
import { ReferralsTable } from "./ReferralsTable";
import { Referral } from "./types";

export const Referrals = (): JSX.Element => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const defaultAccount = useAtomValue(defaultAccountAtom);
  const isValidityOps =
    defaultAccount.data?.address &&
    [
      "tnam1q8lhvxys53dlc8wzlg7dyqf9avd0vff6wvav4amt",
      "tnam1qr0e06vqhw9u0yqy9d5zmtq0q8ekckhe2vkqc3ky",
    ].includes(defaultAccount.data?.address);

  const navigate = useNavigate();
  useEffect(() => {
    const fetchReferrals = async (): Promise<void> => {
      try {
        setLoading(true);
        const { success, data, error } = await getReferralsFromSupabase();

        if (success && data) {
          setReferrals(data as Referral[]);
        } else {
          console.error("Failed to fetch referrals:", error);
          setError("Failed to fetch referrals");
        }
      } catch (err) {
        console.error("Error fetching referrals:", err);
        setError("Error fetching referrals");
      } finally {
        setLoading(false);
      }
    };
    if (!isValidityOps) return navigate(routes.root);
    fetchReferrals();
  }, []);

  if (!isValidityOps) {
    return <div>You are not authorized to view this page</div>;
  }

  return (
    <Panel className="min-h-600">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Referrals</h1>

        {loading && (
          <div className="text-center py-4">Loading referrals...</div>
        )}

        {error && <div className="text-red-500 py-2">{error}</div>}

        {!loading && !error && referrals.length === 0 && (
          <div className="text-center py-4">No referrals found</div>
        )}

        {!loading && !error && referrals.length > 0 && (
          <ReferralsTable
            id="referrals-table"
            referrals={referrals}
            resultsPerPage={10}
          />
        )}
      </div>
    </Panel>
  );
};
