import Link from "next/link";
import { merchant } from "@/lib/commerce/policy";
import { OVERSEAS_NOTICE_REVIEWED_AT, overseasTransfers } from "@/lib/privacy/overseas-notice";

export function OverseasProcessingNotice() {
  return <section aria-labelledby="overseas">
    <h2 id="overseas">4. 외부 서비스와 국외 처리</h2>
    <p>다봄은 본인의 로그인·운세 생성·보관에 필요한 처리위탁·보관에 개인정보 보호법 제28조의8 제1항 제3호의 계약 체결·이행 및 고지 방식을 적용합니다. 선택한 이메일 문의의 응답도 요청 처리에 필요한 범위로 한정합니다. 입력 화면의 확인란은 본인 정보와 안내를 확인한 기록이며, 다른 사람의 동의나 마케팅·AI 학습 이용 동의를 대신하지 않습니다.</p>
    <p className="commerce-notice">확인 기준: {OVERSEAS_NOTICE_REVIEWED_AT}. 운세 문장 생성은 <strong>Luna · Global</strong>을 사용합니다. Global은 미국 한 나라를 뜻하지 않습니다. 아래에서 확인된 서비스 지역과, 특정 국가로 제한되지 않는 네트워크·로그·이메일 처리를 구분해 안내합니다.</p>
    <p>운세·계정 자료의 기본 데이터베이스와 다봄의 정기 백업은 대한민국 서울에 있습니다. 다만 자료를 입력·조회하는 웹 서버는 대만에 있으므로, 국내 데이터베이스를 쓴다는 이유만으로 모든 처리가 국내에서 이뤄지는 것은 아닙니다.</p>
    <nav className="privacy-jump-links" aria-label="국외 처리 항목 바로가기">
      <a href="#overseas-auth">로그인</a><a href="#overseas-hosting">웹 서버</a><a href="#overseas-logs">운영 로그</a><a href="#overseas-openai">AI 생성</a><a href="#overseas-email">이메일 문의</a><a href="#overseas-rights">거부·권리 행사</a>
    </nav>
    {overseasTransfers.map(entry => <section key={entry.id} id={entry.id} className="privacy-transfer" aria-labelledby={`${entry.id}-title`}>
      <h3 id={`${entry.id}-title`}>{entry.title}</h3>
      <dl className="commerce-details">
        <div><dt>이전받는 자 · 연락처</dt><dd>{entry.recipient}<br /><a href={entry.contact.href}>{entry.contact.label}</a></dd></div>
        <div><dt>국가 · 처리 지역</dt><dd>{entry.countries}</dd></div>
        <div><dt>이전 항목</dt><dd>{entry.items}</dd></div>
        <div><dt>이용 목적</dt><dd>{entry.purpose}</dd></div>
        <div><dt>이전 시기 · 방법</dt><dd>{entry.timingAndMethod}</dd></div>
        <div><dt>보유 · 이용 기간</dt><dd>{entry.retention}</dd></div>
        <div><dt>거부 방법 · 영향</dt><dd>{entry.refusal}</dd></div>
      </dl>
      <ul className="privacy-source-links" aria-label={`${entry.title} 공식 안내`}>{entry.sources.map(source => <li key={source.href}><a href={source.href}>{source.label}</a></li>)}</ul>
    </section>)}
    <h3 className="privacy-subheading">Global 처리와 재위탁 범위를 읽는 방법</h3>
    <p>공식 국가·시설 목록은 처리 가능 범위이며, 모든 요청이 모든 국가로 전송된다는 뜻은 아닙니다. 개별 요청의 처리·경유 국가를 다봄이 지정하거나 전부 확인할 수는 없습니다. 제공자의 법인 소재지와 실제 처리 국가도 다를 수 있습니다.</p>
    <p>Google의 지역 지정 범위 밖 처리는 약관상 Google·재위탁 업체가 시설을 운영하는 국가에서 이뤄질 수 있습니다. <a href="https://cloud.google.com/about/locations">Google Cloud 국가·지역</a>, <a href="https://datacenters.google/locations/">Google 데이터센터</a>, <a href="https://cloud.google.com/terms/subprocessors">재위탁 업체별 국가·역할</a>를 함께 공개합니다. 다봄은 고객의 출생 정보·운세 본문을 외부 기술지원 티켓에 첨부하지 않습니다.</p>
    <p>카카오는 로그인 식별번호·닉네임을 다봄에 전달합니다. 카카오 연결 해제만으로 다봄에 저장한 정보가 삭제되지는 않으므로 탈퇴 요청도 함께 해주세요. 포트원·NHN KCP는 주문·금액·거래 식별자를 이용한 결제 확인·취소·알림을 처리합니다. 결제창의 카드 정보는 결제 제공자가 직접 처리하며, 다봄의 OpenAI 요청에는 포함하지 않습니다.</p>
    <h3 className="privacy-subheading" id="overseas-rights">처리정지 · 삭제 · 국외 이전 거부</h3>
    <ol>
      <li>신청 전에는 로그인·운세 생성·이메일 발송을 진행하지 않는 방법으로 해당 정보 제출을 거부할 수 있습니다. 사이트 접속 자체에 필요한 네트워크·보안 처리는 별도입니다.</li>
      <li>이용 중에는 <Link href="/support">환불 · 개인정보 요청</Link>에서 ‘개인정보 처리정지 · 국외 이전 중단 요청’을 선택하거나 <a href={`tel:${merchant.phone}`}>{merchant.phone}</a>으로 접수할 수 있습니다. 로그인이나 이메일 사용이 어려워도 전화로 요청할 수 있습니다.</li>
      <li>담당자가 요청자·대상·범위와 법정 보존 의무를 확인한 뒤 조치 결과 또는 제한 사유·기간을 안내합니다. 접수만으로 자동 중단되거나 모든 제공자의 기록이 즉시 삭제되는 것은 아닙니다. 환불 등 법정 권리는 유지됩니다.</li>
    </ol>
    <p>공개한 처리 항목·국가 범위·제공자·목적이 달라지면 변경 내용을 안내하고 적용 근거를 다시 확인합니다. 별도 동의가 필요한 처리는 동의받은 범위에서만 진행합니다.</p>
  </section>;
}
