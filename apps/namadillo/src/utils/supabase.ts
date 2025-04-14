import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export const saveReferralToSupabase = async (
  referrerAddress: string,
  refereeAddress: string,
  epoch: number
): Promise<{ success: boolean; error?: unknown; data?: unknown }> => {
  try {
    // Make sure we have the required data
    if (!referrerAddress || !refereeAddress || !epoch) {
      console.error("Missing required referral data");
      return { success: false, error: "Missing required referral data" };
    }

    // First check if this referee already exists in the database
    const { data: existingReferrals, error: fetchError } = await supabase
      .from("referrals")
      .select("*")
      .eq("referee_address", refereeAddress)
      .eq("referrer_address", referrerAddress)
      .limit(1);

    if (fetchError) {
      console.error("Error checking existing referral:", fetchError);
      return { success: false, error: fetchError };
    }

    // If referee already exists, skip insertion
    if (existingReferrals && existingReferrals.length > 0) {
      console.log("Referee already exists in database, skipping insertion");
      return { success: true, data: existingReferrals[0] };
    }

    // Create referral record with timestamp
    const referralData = {
      referrer_address: referrerAddress,
      referee_address: refereeAddress,
      start_epoch: epoch,
      active: true,
    };

    // Send data to Supabase
    const { data, error } = await supabase
      .from("referrals")
      .insert([referralData]);

    if (error) {
      console.error("Error saving referral:", error);
      return { success: false, error };
    }

    console.log("Referral saved successfully:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Unexpected error saving referral:", err);
    return { success: false, error: err };
  }
};

export const getReferralsFromSupabase = async (): Promise<{
  success: boolean;
  error?: unknown;
  data?: unknown;
}> => {
  try {
    const { data, error } = await supabase
      .from("referrals")
      .select("*")
      .eq("active", true);

    if (error) {
      console.error("Error fetching referrals:", error);
      return { success: false, error };
    }

    console.log("Referrals fetched successfully:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Unexpected error fetching referrals:", err);
    return { success: false, error: err };
  }
};
