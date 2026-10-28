import Link from "next/link";
import { merchant } from "@/lib/commerce/policy";

export function CommerceFooter() {
  return <footer className="commerce-footer">
    <nav aria-label="서비스 및 정책 안내">
      <Link href="/yearly">상품 안내·미리보기</Link>
      <Link href="/terms">이용약관</Link>
      <Link href="/privacy">개인정보처리방침</Link>
      <Link href="/refund">환불 안내</Link>
      <Link href="/support" prefetch={false}>환불·개인정보 요청</Link>
    </nav>
    <p>{merchant.name} · 대표 {merchant.representative}</p>
    <p>사업자등록번호 {merchant.registrationNumber}</p>
    <p>{merchant.address}</p>
    <p>통신판매업 신고번호: {merchant.mailOrderRegistration || "확인 중 · 정식 판매 준비 중"}</p>
    <p>고객 문의 <a href={`tel:${merchant.phone}`}>{merchant.phone}</a><br />
      <a href={`mailto:${merchant.email}`}>{merchant.email}</a></p>
  </footer>;
}
