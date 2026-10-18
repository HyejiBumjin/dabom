import Link from "next/link";
import type { Metadata } from "next";
import { CommercePage } from "@/components/CommercePage";
import { reportSample } from "@/lib/commerce/sample";
import { YEARLY_PRICE } from "@/lib/commerce/policy";

export const metadata: Metadata = { title: "2026 올해 운세 · 상품 안내 | 다봄" };
export default function YearlyProductPage() {
  return <CommercePage title="2026년의 너에게">
    <p>생년월일과 태어난 시각을 바탕으로, 올해의 흐름을 다봄의 긴 메시지로 받아봐.</p>
    <p className="commerce-price">{YEARLY_PRICE.toLocaleString("ko-KR")}원 <span>1인 · 2026년 리포트 1건 / 총 결제금액</span></p>
    <dl className="commerce-details">
      <div><dt>어떤 내용이야?</dt><dd>타고난 기질과 올해의 큰 흐름, 일·돈·관계에서 살펴볼 포인트와 마무리 메시지를 담아. 입력 정보에 따라 내용이 달라져.</dd></div>
      <div><dt>어떻게 받아?</dt><dd>카카오 로그인 → 대상 정보 입력 → 주문 확인·결제 → 리포트 생성 → 내 운세함. 별도 배송 없이 웹에서 읽는 디지털콘텐츠야.</dd></div>
      <div><dt>언제 볼 수 있어?</dt><dd>결제 확인 후 결과 화면에서 생성이 시작돼. 보통 수 분이 걸리며, 생성이 끝나면 바로 읽을 수 있어. 오류나 지연이 생기면 다시 시도하거나 고객센터에 문의해줘. 제공하지 못한 리포트는 전액 환불 대상이야.</dd></div>
      <div><dt>다시 읽을 때도 결제해?</dt><dd>같은 계정·같은 출생 정보·같은 연도는 추가 결제 없이 내 운세함에서 다시 읽어. 이름이나 관계 표시를 바꿔도 새 상품이 되지 않아. 정기결제나 포인트 충전은 없어.</dd></div>
    </dl>
    <section id="sample" className="commerce-sample" aria-labelledby="sample-title">
      <h2 id="sample-title">메시지 미리보기</h2>
      <p className="commerce-muted">상품의 말투와 구성 일부를 보여주는 가상 예시야. 실제 고객의 정보나 리포트를 사용하지 않았어.</p>
      {reportSample.paragraphs.map((text, i) => <p className="retro-bubble" key={i}>{text}</p>)}
    </section>
    <h2>구매 전에 확인해줘</h2>
    <p>명리 계산 결과를 바탕으로 AI가 해석 문장을 작성해. 미래의 사건이나 결과를 보장하는 서비스는 아니야. 의료·법률·투자 판단을 대신하지 않아.</p>
    <p>정상 제공이 시작된 뒤에는 법령상 요건을 갖춘 경우 단순 변심에 의한 청약철회가 제한돼. 미제공·중복 결제·하자 또는 계약과 다른 이행은 <Link href="/refund">환불 안내</Link>에서 확인할 수 있어.</p>
    <Link href="/saju" className="retro-button">내 정보로 운세 확인하기 →</Link>
  </CommercePage>;
}
