import { accountScope } from "@/lib/account-scope";
import { SajuPaymentReturn } from "@/components/SajuPaymentReturn";
import { RetroPage, RetroWindow } from "@/components/RetroWindow";
import { requireSajuAccount } from "@/lib/saju/account";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";

export default async function SajuPaymentReturnPage({ searchParams }: { searchParams: Promise<{ orderId?: string; paymentId?: string }> }) {
  const params = await searchParams;
  const returnQuery = new URLSearchParams();
  if (params.orderId) returnQuery.set("orderId", params.orderId);
  if (params.paymentId) returnQuery.set("paymentId", params.paymentId);
  const returnPath = `/saju/checkout/return${returnQuery.size ? `?${returnQuery}` : ""}`;
  const account = await requireSajuAccount(returnPath);
  return <AccountPrivacyBoundary key={accountScope(account)} accountId={accountScope(account)} returnPath={returnPath}><RetroPage><RetroWindow title="다봄 · 결제 확인" closeHref="/saju/library"><SajuPaymentReturn orderId={params.orderId ?? ""} paymentId={params.paymentId ?? params.orderId ?? ""} /></RetroWindow></RetroPage></AccountPrivacyBoundary>;
}
