import { accountScope } from "@/lib/account-scope";
import { CommercePage } from "@/components/CommercePage";
import { SupportRequestForm } from "@/components/SupportRequestForm";
import { AccountPrivacyBoundary } from "@/components/AccountPrivacyBoundary";
import { requireSajuAccount } from "@/lib/saju/account";
import { merchant } from "@/lib/commerce/policy";
export const metadata = { title: "환불 · 개인정보 요청 | 다봄" };
export default async function SupportPage() {
  const account = await requireSajuAccount("/support");
  return <AccountPrivacyBoundary accountId={accountScope(account)} returnPath="/support"><CommercePage title="환불 · 개인정보 요청">
    <p>지금 로그인한 계정으로 요청을 남겨줘. 운영자가 주문과 요청 내용을 확인해 처리해.</p>
    <SupportRequestForm />
    <p className="commerce-muted mt-6">로그인할 수 없거나, 다른 사람이 입력한 내 정보의 열람·정정·삭제를 요청하려면 <a href={`mailto:${merchant.email}`}>{merchant.email}</a> / {merchant.phone}으로 연락해줘. 필요한 범위에서 본인·대리인 여부를 확인할게. 신분증 전체, 카드번호, 비밀번호는 보내지 마.</p>
  </CommercePage></AccountPrivacyBoundary>;
}
