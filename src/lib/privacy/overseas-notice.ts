import { RETENTION } from "./retention";

// Public disclosure only. This snapshot describes the existing configuration;
// it does not configure API routing or claim where an individual request ran.
export const OVERSEAS_NOTICE_REVIEWED_AT = "2026-10-28";
export const overseasNoticeSummary = {
  login: "계정 연결에 카카오 식별번호·닉네임을 사용해. 인증은 미국, 웹 서버는 대만에서 처리하며 네트워크·운영 로그는 여러 국가에서 처리될 수 있어.",
  profile: "AI 해석에는 명리 계산 결과를 OpenAI에 보내. 이름·생년월일·출생 시각 원문은 보내지 않아. 웹 서버는 대만, 인증은 미국, AI·네트워크·로그는 여러 국가에서 처리될 수 있어.",
  email: "이메일 문의는 선택 사항이며 Google의 해외 서버에서도 처리될 수 있어. 신분증·카드정보·운세 전체는 보내지 말아줘.",
} as const;

type Source = { label: string; href: string };
type TransferNotice = {
  id: string;
  title: string;
  recipient: string;
  contact: Source;
  countries: string;
  items: string;
  purpose: string;
  timingAndMethod: string;
  retention: string;
  refusal: string;
  sources: Source[];
};

const googleRecipient = "Google Asia Pacific Pte. Ltd. 및 Google의 서비스 운영 관계사. 대한민국 청구 계정의 계약 법인은 Google Cloud Korea LLC입니다.";
const googleContact = { label: "Google 개인정보 문의: googlekrsupport@google.com", href: "mailto:googlekrsupport@google.com" };
const googleSources = [
  { label: "Firebase 개인정보 처리 기준", href: "https://firebase.google.com/support/privacy" },
  { label: "Google Cloud 데이터 처리 약관", href: "https://cloud.google.com/terms/data-processing-addendum" },
];

export const overseasTransfers: readonly TransferNotice[] = [
  {
    id: "overseas-auth", title: "로그인 인증 · Google Firebase Authentication",
    recipient: googleRecipient, contact: googleContact,
    countries: "미국. 다봄의 대만 웹 서버를 거쳐 Firebase 인증 서비스에 전달됩니다.",
    items: "카카오 식별번호를 이용한 내부 계정번호, 닉네임, 인증 토큰·상태, 가입·로그인 기록. 인증 요청에 수반되는 접속 정보도 제공자가 보안 목적으로 처리할 수 있습니다.",
    purpose: "계정 연결, 로그인 확인, 부정 접근 방지와 계정 삭제 처리.",
    timingAndMethod: "로그인·인증 확인·계정 관리 시 서버 간 암호화 통신(HTTPS)으로 전달합니다.",
    retention: "계정 삭제 요청 처리 시 Firebase 인증 계정도 삭제합니다. Google의 운영·백업 시스템에서 제거되는 데 삭제 호출 이후 최대 180일이 걸릴 수 있습니다. 제공자의 인증 IP 로그는 수 주간 보관됩니다.",
    refusal: "카카오 로그인을 진행하지 않거나 로그인 후 처리정지·탈퇴를 요청할 수 있습니다. 필수 인증을 중단하면 로그인과 운세함 이용이 제한됩니다.",
    sources: googleSources,
  },
  {
    id: "overseas-hosting", title: "웹 요청 처리 · Google Firebase App Hosting",
    recipient: googleRecipient, contact: googleContact,
    countries: "애플리케이션 서버는 대만입니다. 앞단의 Google 네트워크·CDN은 글로벌 경로를 사용하므로 경유·처리 국가가 대만으로만 고정되지 않습니다. 서비스 유지보수는 Google 약관의 시설·재위탁 범위가 적용됩니다.",
    items: "이름·성별·생년월일·출생 시각(입력한 경우)·달력 기준, 계정·세션 식별자, 계산 결과·리포트, 주문·결제 상태와 고객 요청, 접속 IP·요청 경로 등 해당 요청 처리에 필요한 정보.",
    purpose: "화면 제공, 사주 계산, 리포트·주문·운세함 및 고객 요청 처리, 보안과 장애 대응.",
    timingAndMethod: "접속·로그인·정보 입력·결제 확인·조회·고객 요청 시 암호화된 네트워크로 전달합니다.",
    retention: `요청을 처리하는 동안 사용하며, 개인 화면과 리포트 응답은 공유 CDN에 캐시하지 않습니다. 저장 자료는 서울 데이터베이스의 보관 기준(이 방침 2항), 백업 ${RETENTION.backupDays}일을 따릅니다. 로그는 다음 항목의 기간을 따릅니다. Google 자체 시스템 삭제에는 Cloud 데이터 처리 약관의 최대 180일 및 법적 보존 예외가 적용될 수 있습니다.`,
    refusal: "정보 제출을 진행하지 않거나 처리정지·삭제를 요청할 수 있습니다. 필수 호스팅 처리를 중단하면 사이트의 로그인·운세 생성·조회 등 이용이 제한됩니다.",
    sources: [...googleSources, { label: "App Hosting CDN 및 캐시 기준", href: "https://firebase.google.com/docs/app-hosting/optimize-cache" }],
  },
  {
    id: "overseas-logs", title: "보안·장애 기록 · Google Cloud Logging",
    recipient: googleRecipient, contact: googleContact,
    countries: "Global. Google은 전 세계 데이터센터에 로그를 저장하고 다른 데이터센터로 이동할 수 있으며, 국가를 서울·대만·미국 중 한 곳으로 제한하지 않습니다.",
    items: "접속 IP·시각·요청 경로·응답 상태, 오류·보안 기록과 내부 요청·리포트 식별자, 운영자 관리 감사 기록. 운세 본문·출생 정보 원문·비밀키를 애플리케이션 로그에 기록하지 않도록 제한합니다.",
    purpose: "부정 접근 탐지, 서비스 장애 분석과 운영 변경 추적.",
    timingAndMethod: "접속·오류·관리 작업이 발생할 때 Google 인프라의 암호화된 통신으로 전달합니다.",
    retention: `일반 로그 ${RETENTION.defaultLogDays}일, Google 필수 관리 감사 로그 ${RETENTION.requiredAuditLogDays}일. 해당 로그의 보관 만료와 Google 삭제 절차가 적용됩니다.`,
    refusal: "사이트 이용을 중단하거나 처리정지를 요청할 수 있습니다. 안전한 서비스 제공에 필요한 기록을 전부 끄는 개인별 옵션은 없으며, 이미 생성된 기록의 삭제 제한이 있으면 사유·기간을 안내합니다.",
    sources: [{ label: "Cloud Logging의 Global 저장 기준", href: "https://docs.cloud.google.com/logging/docs/region-support" }, ...googleSources.slice(1)],
  },
  {
    id: "overseas-openai", title: "운세 문장 생성 · OpenAI API",
    recipient: "OpenAI OpCo, LLC(미국). 모델은 GPT-6 Luna, 처리 지역 설정은 Global입니다.",
    contact: { label: "OpenAI 개인정보 문의: privacy@openai.com", href: "mailto:privacy@openai.com" },
    countries: "Global. 공식 클라우드 재위탁 목록의 처리 가능 국가: 미국, 호주, 벨기에, 브라질, 캐나다, 덴마크, 핀란드, 프랑스, 독일, 인도, 인도네시아, 아일랜드, 이탈리아, 일본, 말레이시아, 멕시코, 네덜란드, 뉴질랜드, 노르웨이, 폴란드, 싱가포르, 남아프리카공화국, 대한민국, 스페인, 스웨덴, 스위스, 아랍에미리트, 영국. 조건부 콘텐츠 검토 국가는 미국·캐나다·필리핀입니다. Cloudflare CDN은 요청 위치에 가까운 데이터센터에서 처리하므로 이 목록만으로 전체 경유 국가를 제한하지 않습니다.",
    items: "계산된 명식·십신·세운·월운 등의 해석 근거, 생성 지시와 생성·수정되는 리포트 문장. 입력한 이름·생년월일·출생 시각 원문, 카카오 계정번호·연락처·결제정보는 보내지 않습니다. 계산 결과도 개인정보로 취급합니다.",
    purpose: "신청한 운세 리포트의 문장 생성과 필요한 부분 수정, 제공자의 악용 방지·안전 처리.",
    timingAndMethod: "새 리포트 생성이나 필요한 수정 시 다봄 서버에서 OpenAI로 HTTPS 전송합니다. 이미 저장된 리포트를 열람할 때에는 새 생성 요청을 보내지 않습니다.",
    retention: "응답 저장은 비활성화(store:false)합니다. 기본 악용 방지 로그는 최대 30일이며 법률·안전상 더 긴 보관 예외가 있습니다. 암호화된 모델 임시 캐시는 최대 24시간 보관될 수 있습니다. 응답 저장 비활성화가 모든 정보의 즉시 삭제를 뜻하지는 않습니다. 학습용 입력·출력, 피드백, 평가 데이터 공유는 꺼져 있습니다.",
    refusal: "운세 생성을 신청하지 않거나 생성 전·이용 중 처리정지를 요청할 수 있습니다. AI 처리를 거부하면 새 리포트 생성·수정이 제한됩니다. 기존 저장 자료의 삭제는 별도로 요청할 수 있습니다.",
    sources: [
      { label: "OpenAI 데이터 관리·보관 기준", href: "https://developers.openai.com/api/docs/guides/your-data" },
      { label: "OpenAI 재위탁 업체·국가 목록", href: "https://openai.com/policies/sub-processor-list/" },
      { label: "Cloudflare 데이터센터 범위", href: "https://www.cloudflare.com/network/" },
    ],
  },
  {
    id: "overseas-email", title: "선택적인 이메일 문의 · Gmail",
    recipient: "Google LLC 및 Google의 메일 서비스 운영 관계사. 일반 Gmail을 사용하며 Google Workspace 기업용 계약이나 국가 지정 저장을 적용한 것으로 안내하지 않습니다.",
    contact: googleContact,
    countries: "Google의 전 세계 서버에서 처리될 수 있습니다. 일반 Gmail은 다봄 문의 메일의 저장·처리 국가를 하나로 지정하지 않으며, 개별 메일의 국가도 다봄에서 확인할 수 없습니다.",
    items: "고객이 보낸 이메일 주소·이름·회신 연락처·문의 내용·첨부 및 송수신 기록. 사이트의 운세·주문 자료를 Gmail로 자동 전송하지 않습니다.",
    purpose: "고객이 선택한 이메일 채널을 통한 문의 응답과 분쟁 처리.",
    timingAndMethod: "고객이 이메일을 보내거나 담당자가 회신할 때 메일 서비스 간 전송으로 처리합니다. 전송 보안은 송·수신 메일 서비스의 지원과 설정에 따릅니다.",
    retention: `문의 처리 완료 후 관련 기록 ${RETENTION.complaintYears}년. 정당한 보존 사유가 없으면 만료 시 메일·첨부·휴지통을 정리합니다. 이후 Google 자체 백업·법적 보존에는 Google의 삭제·보관 기준이 적용됩니다.`,
    refusal: "이메일을 사용하지 않아도 서비스 신청·환불·개인정보 권리 행사가 가능합니다. 사이트의 온라인 접수 또는 전화로 문의할 수 있습니다. 이메일로 신분증·카드정보·운세 전체를 보내지 마세요.",
    sources: [
      { label: "Google 개인정보처리방침", href: "https://policies.google.com/privacy?hl=ko" },
      { label: "Google의 정보 보관·삭제 기준", href: "https://policies.google.com/technologies/retention?hl=ko" },
    ],
  },
];
