# 외부 처리·국외 이전 확인표

검토일: 2026-10-28. **확인된 사실과 미확인 계정 조건을 구분한다. 이 문서만으로 국외 이전 고지·동의가 완료된 것은 아니다.**

## 실제 서비스 경로

| 서비스 | 확인한 실제 범위 | 시점·목적·보관 | 남은 확인 |
|---|---|---|---|
| Firestore | dabom-10a35 기본 DB 서울(asia-northeast3), 백업도 같은 위치 | 정보 저장·운세함 조회. 서비스/거래 보존표 및 백업별 7일 | 대한민국 청구 프로필 확인. Google Cloud Korea LLC 및 약관상 Google Asia Pacific Pte. Ltd. 정의 대조 |
| App Hosting | 서버 대만(asia-east1), 원본 서버 익명 접근 차단 | 접속·입력·로그인·조회 요청을 TLS로 전달. 계산 및 응답. 일반 로그 30일, 필수 감사 로그 400일 | 서비스 지역과 별개인 Google의 지원·부수 처리 범위 |
| Firebase Authentication | 공식 기준 미국, 카카오 기반 내부 계정 사용 | 로그인/탈퇴 시 계정 식별·인증. Google의 삭제 API 이후 자체 시스템/백업 삭제 최대 180일 | Google 계약 법인 확인; 부수 처리 범위 최종 고지에 포함 |
| OpenAI Responses | 코드상 store:false. 이름·생년월일·출생 시각 원문 제외. 명리 계산 결과와 프롬프트/출력을 처리 | 생성 요청마다 TLS 전송. 기본 악용 방지 보관 최대 30일, 법률·안전 예외 및 모델별 임시 캐시 별도 | 운영 키와 콘솔 dabom 키 마스킹 식별자 대조 완료. Personal / Default project, Residency Global, 공유 3종 Disabled, 호출 저장 Enabled per call(store:false 사용). ZDR/MAM 승인 근거 없음 |
| Gmail 고객센터 | 공개 주소 att1667.hj@gmail.com. 일반 Gmail을 Workspace 계약으로 간주하지 않음 | 고객이 문의를 보낼 때 연락처·내용·첨부를 수신/회신. 완료 문의 3년 관리, 만료 원문·첨부·휴지통 수동 정리 | 기업용 처리 계약/국가 지정 여부 미확인. 특정 국가라고 임의 기재하지 않음 |

## 계약·제공자 기준

- [Firebase 약관 표](https://firebase.google.com/terms/)에서 Firestore, Authentication, App Hosting은 Google Cloud Platform 약관 적용 대상이다. 별도 체결 계약이 있으면 그 계약을 확인한다.
- [Google 계약 법인 표](https://cloud.google.com/terms/google-entity)는 **실제 청구 주소** 기준이다. 한국 청구 계정은 Google Cloud Korea LLC(재판매 법인), 관련 서비스 약관상 Google Asia Pacific Pte. Ltd. 및 관계사 정의가 함께 있다. 2026-10-28 실제 `Firebase 결제` 프로필의 국가/지역 `대한민국(KR)`를 확인했다. 개인 청구 주소·프로필 ID는 공개 문서에 기록하지 않는다.
- [Google Cloud CDPA](https://cloud.google.com/terms/data-processing-addendum)는 대상 계약에 편입되며, 복구 불가능한 고객 삭제 지시 후 자체 시스템 삭제 최대 180일과 법적 보존 예외를 규정한다. 다봄의 7일 백업과 다른 단계다.
- [Google 재위탁 목록](https://cloud.google.com/terms/subprocessors)은 서비스·리전에 따라 적용 범위가 다르다. 고객이 지원 사건에 자료를 제공할 때만 접근하는 업체를 모든 운세 본문 처리 업체로 적지 않는다. 고객 자료를 외부 지원 티켓에 업로드하지 않는다.
- [OpenAI DPA](https://openai.com/policies/data-processing-addendum/)의 한국 고객 표준 계약 법인은 OpenAI OpCo, LLC이며 연락처는 privacy@openai.com이다. 별도 계약 여부와 실제 API 조직은 추가 대조한다.
- [OpenAI 데이터 관리](https://developers.openai.com/api/docs/guides/your-data): API 모델 학습은 기본 비활성이나 조직의 명시적 공유 선택은 별개다. store:false는 응답 애플리케이션 상태 저장 제어이며 ZDR 승인이 아니다. 기본 악용 방지 로그의 30일 보관과 법률·안전 예외를 함께 안내한다.
- [OpenAI 재위탁 목록](https://openai.com/policies/sub-processor-list/)은 지역 미지정 API의 인프라 국가를 미국 한 나라로 제한하지 않는다. Microsoft/CoreWeave/Oracle/GCP/AWS/Cerebras, CDN, 조건부 악용 검토·지원 등이 목적별로 구분된다. 모든 요청이 모든 업체·국가로 간다는 뜻도 아니다. 실제 Default project의 Project Residency = Global을 확인했다. 특정 국가만 처리되는 프로젝트가 아니다. 공식 목록의 클라우드 처리 가능 국가는 미국·호주·벨기에·브라질·캐나다·덴마크·핀란드·프랑스·독일·인도·인도네시아·아일랜드·이탈리아·일본·말레이시아·멕시코·네덜란드·뉴질랜드·노르웨이·폴란드·싱가포르·남아프리카공화국·대한민국·스페인·스웨덴·스위스·아랍에미리트·영국이다. 조건부 악용 검토에는 필리핀 등이 포함되고 CDN은 요청 위치에 따라 달라진다. 이 목록을 실제 개별 요청의 전송 기록으로 표현하지 않는다.
- [Google 일반 개인정보처리방침](https://policies.google.com/privacy?hl=ko)은 Gmail 내용을 포함하며 전 세계 서버 처리를 안내한다. 연락처 googlekrsupport@google.com. 일반 Gmail 계정에 Cloud/Workspace CDPA가 적용된다고 추정하지 않는다.

## 출시 전 최종 확정

1. OpenAI 확인 완료: 운영 Cloud Run의 비밀정보 참조로 실제 키를 확인해 콘솔 dabom 키와 마스킹 부분을 대조했다. 공식 /v1/models 읽기는 200, 운영 모델 gpt-6-luna, 별도 base URL 없음. Personal / Default project에서 학습용 피드백·평가/미세조정·입출력 공유가 모두 Disabled. API call logging은 Enabled per call, 코드에서 store:false. Residency Global. 키 원문은 출력·저장하지 않았고, 고객 데이터 전송·새 키 발급·모델 생성·설정 변경은 하지 않았다.
2. Google 결제 프로필에서 청구 국가/계약 법인을 확인한다. 2026-10-28 다봄에 연결된 `Firebase 결제` 프로필 국가 `대한민국(KR)` 확인 완료. 상세 페이지는 재로딩 후 정상 표시되었다.
3. 각 서비스별 이전 항목·국가·시점/방법·수탁자/연락처·목적/기간·거부 방법/영향을 실제 설정에 맞춰 확정한다. 온라인 접수·전화는 이메일 거부 시 대안으로 유지한다.
4. [개인정보 보호법 제28조의8](https://www.law.go.kr/법령/개인정보보호법/제28조의8)의 계약 이행에 필요한 위탁·보관 고지 방식과 별도 동의가 필요한 범위를 구분한다. 특히 **다른 사람의 운세 정보**는 구매자 본인의 계약만으로 당사자의 이전 근거가 해결된 것으로 보지 않는다. 당사자 고지/동의·대리 권한을 확인할 절차가 필요하다.
5. 이메일의 처리 계약/국가 고지를 확정할 수 없으면 온라인 접수를 주 경로로 하고 이메일로 운세 원문·신분증·카드정보를 받지 않는다. 이메일 주소 공개만으로 모든 개인정보 처리 요건이 해결되었다고 표시하지 않는다.

정책 시행일·신규 실결제 차단은 유지한다. 일반 문서 확인을 실제 계정 확인이나 법률 자문 완료로 보고하지 않는다.
