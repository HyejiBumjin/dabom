/**
 * Access control helpers for reports and letters
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function canAccessReport(
  supabase: SupabaseClient,
  reportId: string,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase
    .from("fortune_reports")
    .select("owner_id")
    .eq("id", reportId)
    .single();
  return data?.owner_id === userId;
}

export async function canAccessReportByGiftToken(
  supabase: SupabaseClient,
  reportId: string,
  giftToken: string | null
): Promise<boolean> {
  if (!giftToken) return false;
  const { data: gift } = await supabase
    .from("gifts")
    .select("id")
    .eq("token", giftToken)
    .eq("gift_status", "used")
    .single();
  if (!gift) return false;
  const { data: report } = await supabase
    .from("fortune_reports")
    .select("gift_id")
    .eq("id", reportId)
    .single();
  return report?.gift_id === gift.id;
}
