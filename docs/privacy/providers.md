# 외부 처리·국외 이전 확인표

검토일: 2026-10-28 · 공개 고지 버전: 2026-10-28.5. 사용자 결정으로 **GPT-6 Luna + Global을 유지**한다. 이 문서는 확인한 설정·공식 자료와 공개 고지의 대응 기록이며 법률 검토 완료 증명은 아니다.

## 실제 서비스 경로

| 서비스 | 확인한 실제 범위 | 시점·목적·보관 | 확인·제한 |
|---|---|---|---|
| Firestore | dabom-10a35 기본 DB 서울(asia-northeast3), 백업도 같은 위치 | 정보 저장·운세함 조회. 서비스/거래 보존표 및 백업별 7일 | 대한민국 청구 프로필과 Google Cloud Korea LLC·약관상 Google Asia Pacific Pte. Ltd. 정의 대조 완료 |
| App Hosting | 서버 대만(asia-east1), 원본 서버 익명 접근 차단 | 접속·입력·로그인·조회 요청을 TLS로 전달. 계산 및 응답. 일반 로그 30일, 필수 감사 로그 400일 | 대만은 앱 서버의 지역이다. 글로벌 CDN·네트워크·유지보수 범위는 별도이며 전체 처리를 대만으로 고정한다고 표시하지 않음 |
| Firebase Authentication | 공식 기준 미국, 카카오 기반 내부 계정 사용 | 로그인/탈퇴 시 계정 식별·인증. Google의 삭제 API 이후 자체 시스템/백업 삭제 최대 180일 | Google 계약 법인 및 서비스별 삭제 기준을 공개 고지에 포함 |
| OpenAI Responses | 코드상 store:false. 이름·생년월일·출생 시각 원문 제외. 명리 계산 결과와 프롬프트/출력을 처리 | 생성 요청마다 TLS 전송. 기본 악용 방지 보관 최대 30일, 법률·안전 예외 및 모델별 임시 캐시 별도 | 운영 키와 콘솔 dabom 키 마스킹 식별자 대조 완료. Personal / Default project, Residency Global, 공유 3종 Disabled, 호출 저장 Enabled per call(store:false 사용). ZDR/MAM 승인 근거 없음 |
| Gmail 고객센터 | 공개 주소 att1667.hj@gmail.com. 일반 Gmail을 Workspace 계약으로 간주하지 않음 | 고객이 문의를 보낼 때 연락처·내용·첨부를 수신/회신. 완료 문의 3년 관리, 만료 원문·첨부·휴지통 수동 정리 | 일반 Gmail 사용. Workspace 기업용 계약·국가 지정이 적용된 것으로 표시하지 않음. 온라인·전화 대안 공개 |
| Cloud Logging | 기존 `_Default`, `_Required` 저장 위치 Global. 서버/DB 리전과 별도 | 일반 로그 30일, 필수 관리 감사 로그 400일. 전 세계 데이터센터에 저장·이동 가능 | Global을 그대로 고지하며 버킷·싱크 변경 없음. 정확한 개별 기록의 국가를 확인한 것으로 표시하지 않음 |

## 계약·제공자 기준

- [Firebase 약관 표](https://firebase.google.com/terms/)에서 Firestore, Authentication, App Hosting은 Google Cloud Platform 약관 적용 대상이다. 별도 체결 계약이 있으면 그 계약을 확인한다.
- [Google 계약 법인 표](https://cloud.google.com/terms/google-entity)는 **실제 청구 주소** 기준이다. 한국 청구 계정은 Google Cloud Korea LLC(재판매 법인), 관련 서비스 약관상 Google Asia Pacific Pte. Ltd. 및 관계사 정의가 함께 있다. 2026-10-28 실제 `Firebase 결제` 프로필의 국가/지역 `대한민국(KR)`를 확인했다. 개인 청구 주소·프로필 ID는 공개 문서에 기록하지 않는다.
- [Google Cloud CDPA](https://cloud.google.com/terms/data-processing-addendum)는 대상 계약에 편입되며, 복구 불가능한 고객 삭제 지시 후 자체 시스템 삭제 최대 180일과 법적 보존 예외를 규정한다. 다봄의 7일 백업과 다른 단계다.
- [Google 재위탁 목록](https://cloud.google.com/terms/subprocessors)은 서비스·리전에 따라 적용 범위가 다르다. 고객이 지원 사건에 자료를 제공할 때만 접근하는 업체를 모든 운세 본문 처리 업체로 적지 않는다. 고객 자료를 외부 지원 티켓에 업로드하지 않는다.
- [OpenAI DPA](https://openai.com/policies/data-processing-addendum/)의 한국 고객 표준 계약 법인은 OpenAI OpCo, LLC이며 연락처는 privacy@openai.com이다. 실제 운영 키가 사용하는 조직·프로젝트는 아래 계정 확인 기록과 대조했다. 별도 계약이 체결되면 표준 조건을 그대로 적용하지 않는다.
- [OpenAI 데이터 관리](https://developers.openai.com/api/docs/guides/your-data): API 모델 학습은 기본 비활성이나 조직의 명시적 공유 선택은 별개다. store:false는 응답 애플리케이션 상태 저장 제어이며 ZDR 승인이 아니다. 기본 악용 방지 로그의 30일 보관과 법률·안전 예외를 함께 안내한다.
- [OpenAI 재위탁 목록](https://openai.com/policies/sub-processor-list/)은 지역 미지정 API의 인프라 국가를 미국 한 나라로 제한하지 않는다. Microsoft/CoreWeave/Oracle/GCP/AWS/Cerebras, CDN, 조건부 악용 검토·지원 등이 목적별로 구분된다. 모든 요청이 모든 업체·국가로 간다는 뜻도 아니다. 실제 Default project의 Project Residency = Global을 확인했다. 특정 국가만 처리되는 프로젝트가 아니다. 공식 목록의 클라우드 처리 가능 국가는 미국·호주·벨기에·브라질·캐나다·덴마크·핀란드·프랑스·독일·인도·인도네시아·아일랜드·이탈리아·일본·말레이시아·멕시코·네덜란드·뉴질랜드·노르웨이·폴란드·싱가포르·남아프리카공화국·대한민국·스페인·스웨덴·스위스·아랍에미리트·영국이다. 조건부 악용 검토에는 필리핀 등이 포함되고 CDN은 요청 위치에 따라 달라진다. 이 목록을 실제 개별 요청의 전송 기록으로 표현하지 않는다.
- [Google 일반 개인정보처리방침](https://policies.google.com/privacy?hl=ko)은 Gmail 내용을 포함하며 전 세계 서버 처리를 안내한다. 연락처 googlekrsupport@google.com. 일반 Gmail 계정에 Cloud/Workspace CDPA가 적용된다고 추정하지 않는다.

## 계정 확인과 공개 고지 적용

1. 운영 Cloud Run의 비밀정보 참조와 콘솔 dabom 키의 마스킹 식별자를 대조했다. 공식 `/v1/models` 읽기 200, 모델 `gpt-6-luna`, 별도 base URL 없음. Personal / Default project, Residency Global. 학습용 피드백·평가/미세조정·입출력 공유 모두 Disabled, API call logging Enabled per call, 코드 `store:false`. 키 원문을 출력하거나 고객 자료로 새 생성 요청을 하지 않았다.
2. 다봄에 연결된 `Firebase 결제` 프로필 국가 `대한민국(KR)` 확인 완료. 인증 미국, App Hosting 대만, DB·정기 백업 서울, 기존 로그 Global을 구분했다.
3. `src/lib/privacy/overseas-notice.ts`에 서비스별 수탁자·연락처, 항목, 국가 범위, 목적, 시기·방법, 보유 기간, 거부 방법·영향과 공식 출처를 기록했다. `/privacy#overseas`에서 공개하며 로그인·입력 화면에 요약 및 링크, 고객센터·푸터에 선택적 이메일 안내를 연결했다. 국가 목록은 가능 범위이며 실제 요청별 경로의 증명으로 사용하지 않는다.
4. [개인정보 보호법 제28조의8](https://www.law.go.kr/법령/개인정보보호법/제28조의8)의 계약 체결·이행에 필요한 처리위탁·보관 고지 방식과 별도 동의가 필요한 처리를 구분한다. 신규 입력은 만 14세 이상 본인만 허용하고, 확인란을 실명 인증·타인의 동의·학습 동의로 취급하지 않는다.
5. 일반 Gmail은 선택적인 고객 문의 채널이다. 전화·온라인 접수를 함께 제공하고, 운세 원문·신분증·카드정보를 요청하거나 사이트 자료를 이메일로 자동 전송하지 않는다. 메일 사본·첨부·휴지통 정리는 운영자가 보존 기간에 맞춰 실행한다.
6. 지원 화면의 `PRIVACY_STOP`은 요청 접수다. 자동 중단·삭제 완료로 안내하지 않으며, 요청 범위·법정 보존 의무 확인 후 운영 절차를 수행하고 결과를 통지한다.

### 남은 출시 판단과 유지관리

- 공개 고지를 작성한 것과 법률 검토·운영 배포·판매 개방은 별개다. 정책 시행일과 신규 실결제 차단은 유지한다.
- Global CDN·로그·일반 Gmail은 개별 요청의 정확한 국가를 다봄이 특정할 수 없다. 그 사실과 제공자 공식 국가·시설 목록을 공개했다. 이 고지만으로 법정 국가 특정 요건을 충족한다고 단정하지 않으며, 판매 개방 전 계약 근거와 함께 적정성을 최종 검토한다. 특정 국가만 이용한다는 설명으로 바꾸지 않는다.
- 모델·프로젝트·공유/보관 설정·리전·수탁자 변경 전 실제 설정과 공식 목록을 대조한다. 항목·목적·국가 범위가 바뀌면 고지와 확인 버전을 갱신하고 필요한 추가 근거·동의 절차를 확인한다. 비용 절감을 이유로 고지하지 않은 제공자로 바꾸지 않는다.
- 고객 자료를 외부 기술지원 티켓에 올리지 않는다. 제공자 문의가 필요한 사건은 최소 정보·권한·전송 근거를 별도로 확인한다.

## 2026-10-28 비용·리전 선택 검토

- 사용자가 `gpt-6-luna`와 Global 유지를 선택했다. 기본 API 엔드포인트·현재 모델 옵션을 유지하며 미국 리전 전환이나 추가 요금 설정을 적용하지 않는다.
- [공식 데이터 관리 문서](https://developers.openai.com/api/docs/guides/your-data)는 Global 프로젝트에서 지원 모델의 요청별 지역 엔드포인트 사용을 안내한다. 기존 자격·보관 조건이 적용되므로 URL 변경만으로 계정 적격성과 모든 부수 처리의 국가 제한이 검증된 것은 아니다.
- [공식 요금표](https://developers.openai.com/api/docs/pricing)의 지역 처리 추가요금은 10%다. 판매가나 Firebase 비용이 아닌 해당 API 비용에 적용된다. Global 유지는 이 추가요금을 피하지만 국가 범위 고지 의무가 사라지는 것은 아니다.
- 모델 품질을 유지하는 절감 후보는 중복 생성 방지, 불필요한 재시도 축소, 실제 캐시 읽기/쓰기 비율 측정이다. 현재 Luna reasoning은 none이며 일부 문단만 재수정한다. 더 줄이기 전 실제 비용·품질을 측정한다. Flex/Batch는 응답 지연을 동반하므로 즉시 구매 리포트 경로에 임의 적용하지 않는다.
- [Cloud Logging 지역 문서](https://docs.cloud.google.com/logging/docs/region-support)에서 Global 저장은 어느 데이터센터로도 이동 가능하다. 미국 OpenAI 엔드포인트만 선택해도 Google 로그·지원·Gmail의 국외 처리 검토가 함께 완료되는 것은 아니다.
