import { supabaseServer } from "./supabase/server";

export type FeatureFlags = {
  open_house_mvp: boolean;
  property_factsheet_upload: boolean;
  marketing_packs: boolean;
  property_qa: boolean;
  idx_integration: boolean;
  transactions_os: boolean;
  documents_esign: boolean;
  vendor_directory: boolean;
  vendor_scheduling: boolean;
};

/**
 * Get feature flags for the current authenticated agent
 */
export async function getFeatureFlags(): Promise<FeatureFlags | null> {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .eq("agent_id", user.id)
    .single();

  if (error || !data) {
    // Return default flags if not found
    return {
      open_house_mvp: true,
      property_factsheet_upload: true,
      marketing_packs: false,
      property_qa: false,
      idx_integration: false,
      transactions_os: false,
      documents_esign: false,
      vendor_directory: false,
      vendor_scheduling: false,
    };
  }

  return {
    open_house_mvp: data.open_house_mvp,
    property_factsheet_upload: data.property_factsheet_upload,
    marketing_packs: data.marketing_packs,
    property_qa: data.property_qa,
    idx_integration: data.idx_integration,
    transactions_os: data.transactions_os,
    documents_esign: data.documents_esign,
    vendor_directory: data.vendor_directory,
    vendor_scheduling: data.vendor_scheduling,
  };
}

/**
 * Check if a specific feature is enabled
 */
export async function isFeatureEnabled(
  feature: keyof FeatureFlags
): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags?.[feature] ?? false;
}
