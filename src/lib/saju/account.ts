import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/auth-return-path";

/** The verified login owns the library; the person whose fortune is read is separate. */
export async function getSajuAccount() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.is_anonymous) return null;
  const nickname = String(user.user_metadata?.nickname ?? user.user_metadata?.name ?? "다봄 사용자").slice(0, 80);
  // Use Supabase's stable verified identity rather than accepting an owner ID from input.
  return prisma.user.upsert({
    where: { kakaoId: user.id },
    create: { kakaoId: user.id, nickname },
    update: { nickname },
  });
}

export async function requireSajuAccount(returnPath: string) {
  const account = await getSajuAccount();
  if (!account) redirect(`/login?next=${encodeURIComponent(safeReturnPath(returnPath))}`);
  return account;
}

export function canAccessSajuProfile(profile: { userId: string | null }, account: { id: string } | null) {
  return Boolean(account && profile.userId && profile.userId === account.id);
}

export function canReadSajuReport(report: { sajuProfile: { userId: string | null }; order: { userId: string; status: string } | null }, account: { id: string } | null, development = process.env.NODE_ENV === "development") {
  if (!canAccessSajuProfile(report.sajuProfile, account)) return false;
  return development || Boolean(account && report.order?.userId === account.id && report.order.status === "PAID");
}
