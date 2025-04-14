import { Panel } from "@namada/components";
import { useEffect, useState } from "react";
import { getReferralsFromSupabase } from "../../utils/supabase";
import { ReferralsTable } from "./ReferralsTable";

export type Referral = {
  id: number;
  referrer_address: string;
  referee_address: string;
  start_epoch: number;
  created_at?: string;
};

export const Referrals = (): JSX.Element => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    fetchReferrals();
  }, []);

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
          <ReferralsTable id="referrals-table" referrals={referrals} />
        )}
      </div>
    </Panel>
  );
};
