# Firebase 전환 (develop, 2026-10-17)

## 현재 연결

- 다봄 전용 프로젝트: `dabom-10a35`, Firestore Standard 서울 `asia-northeast3`.
- 기존 Supabase 데이터는 이관하지 않는다. 기존 프로젝트를 삭제하거나 운영 배포를 변경하지 않았다.
- 로컬 로그인: Kakao OAuth → 서버에서 Kakao 사용자 확인 → Firebase custom token → ID token → HttpOnly session cookie.
- 웹 클라이언트에 Firebase ID/refresh token이나 Admin 키를 전달하지 않는다.
- 카카오 앱 574237에 로컬과 운영 `/api/auth/callback`을 등록했다. 이전 운영 로그인 유지용 Supabase callback은 아직 남겨 두었다.

## 데이터와 권한

`src/lib/firebase/store.ts`가 users, profiles, products, orders, reports, sessions, oauthAttempts, rateLimits를 관리한다.

- 모든 브라우저의 Firestore 직접 읽기/쓰기를 `firestore.rules`로 거부한다. Admin SDK는 IAM으로 접근하므로 각 서버 요청에서 소유자·결제를 확인한다.
- 프로필은 계정 + 출생 정보 해시, 리포트는 프로필 + 상품 코드, 주문은 계정 + 프로필 + 상품 코드로 식별한다.
- Firestore transaction으로 중복 생성, 결제 승인/취소 경합, 생성 작업 점유, 요청 제한을 처리한다. 취소된 주문은 자동 재승인하지 않는다.
- 명식과 리포트 JSON은 문자열 필드로 저장해 Firestore의 중첩 배열 제한을 피한다.
- OAuth state는 브라우저의 별도 비밀값과 묶고 한 번만 사용한다. 세션은 Firebase 서명/만료/폐기 및 서버 allowlist를 모두 확인한다. 로그아웃은 해당 세션을 즉시 폐기한다.
- 개발 모드만 무료 리포트 생성 가능. 운영의 새 리포트 생성/조회는 유효한 결제 완료 주문을 요구한다. 아래의 명시적 개발 미리보기 권한은 이미 완료된 특정 리포트의 열람만 예외로 허용한다.
- 운영에서 다시 읽을 개발용 완료본은 관리자가 해당 리포트에 `developmentPreviewAccess`를 명시적으로 부여할 수 있다. 계정 일치 + 주문 미연결 + 완료 상태 + 본문 존재를 모두 요구하며, 일반 미결제 리포트나 다른 계정에는 적용하지 않는다. 이 권한으로 새 리포트 생성/재생성은 허용하지 않는다. 고객 API 입력으로 권한을 설정할 수 없다.
- Admin 키는 `secrets/firebase-admin.json` (0600), `.env.local` (0600)에 경로만 저장한다. 둘 다 Git에서 제외한다.
- 최초 연결은 Spark였으며 2026-10-17 사용자가 다봄 프로젝트에 Blaze 결제 계정을 연결했다. App Hosting API 활성화와 실제 배포까지 확인했다.

## 실행

```sh
npm run dev
npm run firebase:check
npm run firebase:seed
npm run firebase:preflight
npm run firebase:hosting-check
npm run firebase:store-check
npm run security:check
npm run security:login-limit
npm run report:check
npm run auth:check
npm run saju:spike
npm run saju:compare
```

`firebase:store-check`/`library:check`/`security:concurrency`는 같은 통합 검사를 실행한다. 임의의 test_ 접두사 컬렉션만 생성하고 finally에서 삭제한다. 실제 카카오 사용자·주문은 건드리지 않고, 모델/결제 API를 호출하지 않는다.

`legacy:*` 명령과 Prisma/SQL 자료는 이전 Supabase 배포 참고용이다. 현재 앱/build에서 사용하지 않는다. 이전 DB를 변경하는 명령은 새 Firebase 설정에 사용하지 않는다.

## 로그인 반복 요청 방어 (2026-10-17)

- Vercel `dabom` 프로젝트에 `Dabom login rate limit` 규칙을 활성화했다. `/api/auth/login` 및 끝의 `/` 경로를 IP별 10분당 30회로 제한하며, 초과 요청은 앱/Firestore에 도달하기 전 429로 응답한다. 카카오 콜백, 계정 확인, 리포트 폴링, 결제 웹훅은 이 규칙의 대상이 아니다.
- 현재 Hobby 플랜을 유지했다. 검토한 규칙은 `scripts/security/login-rate-limit-rule.json`에 보관한다. 변경 시 다른 방화벽 초안이 섞이지 않았는지 확인하고 게시 후 활성 설정을 다시 조회한다. 이 JSON 파일을 커밋하는 것만으로 방화벽 설정이 적용되지는 않는다.
- 앱에도 같은 제한의 메모리 사전 검사를 추가했다. 초과 요청은 공유 DB 카운터 및 OAuth state 생성 전에 반환하며 `Retry-After`와 `private, no-store`를 설정한다. 메모리에는 최대 10,000개만 보관하고 만료 항목은 다음 요청에서 제거한다. 활성 항목을 밀어내 제한을 초기화하지 않는다.
- Vercel은 덮어쓴 단일 XFF를 신뢰한다. App Hosting은 `DABOM_HOSTING` 및 Cloud Run `K_SERVICE=dabom` 환경에서만 XFF 끝의 client → load balancer → GFE 세 항목을 해석한다. 실측한 기본 도메인 LB `35.219.200.76`과 커스텀 도메인 LB `35.219.200.50`을 `DABOM_APPHOSTING_LB_IPS`에 지정했다. 임의의 앞부분, X-Real-IP, Fastly-Client-IP는 신뢰하지 않는다. 누락·잘못된 IP·알 수 없는 LB·직접 실행 환경은 공통 버킷으로 제한한다. Google 프록시 구성이 바뀌면 실측 후 허용 목록/해석을 함께 갱신해야 한다.
- 메모리 제한은 프로세스 재시작 시 초기화되는 보조 방어다. 기존 Firestore의 원자적 공유 제한을 유지한다. Vercel WAF 카운터도 리전별로 적용되므로 IP/리전을 분산한 공격까지 전역 할당량으로 제한한다고 보지 않는다. [Vercel 공식 문서](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- `npm run security:login-limit`: 모의 요청 75개 중 초과한 45개가 추가 DB/OAuth 호출 0회로 차단되는지, 동시 요청·만료·메모리 상한·헤더 위조·공유 제한·WAF 설정 일치를 검사한다. 실제 로그인이나 DB/결제/모델 API 호출은 없다.

## 운영 배포 전

### 최신 운영 반영 (2026-10-29)

- 현재 운영 소스 **`1a10c4e`**, App Hosting **`build-2026-10-29-001`**. 배포 완료, Cloud Run Ready, 트래픽 100%, backend/traffic reconciling=false 확인.
- 본인 운세만 신규 신청, 계정별 이름·양력 환산 생일·연도 중복 구매 방지, 버전 있는 정보 안내 확인, 처리정지 요청 접수, 국외 처리 고지 `2026-10-28.5`를 반영했다. 기존 완료본의 소유자·결제 기반 재열람을 유지한다.
- 모델 `gpt-6-luna`, 기본 OpenAI 엔드포인트/Global 유지. 정책 시행일 미지정, `businessDetailsVerified=false`, 운영 테스트 플래그 없음으로 신규 실결제는 계속 차단한다.
- 배포 전 Firebase 연결·deny-all 규칙·상품 preflight, Hosting 설정 20건, 본인 정보 확인 25건, 비밀정보 검사 통과. 실제 CLI 압축 302개 파일에서 신규 소스 포함 및 환경파일·개인키·캐시·문서 제외를 확인했다.
- 배포 도구가 추가한 `roles/firebase.sdkAdminServiceAgent`만 앱 실행 계정에서 회수했다. 기존 최소 권한, 6개 Secret Manager 참조, 비공개 Cloud Run invoker를 확인했다. 두 원본 서버 URL의 익명 응답은 403이다.
- 운영 `/privacy`, `/login`, `/terms`, `/refund`, `/`의 새 고지·연결을 확인했다. 실제 고객 데이터 삭제, 실결제/환불, 유료 리포트 생성은 실행하지 않았다. PG 승인·실거래 확인, 정책 적정성 최종 검토와 실제 정기 백업 복원은 별도 후속 작업이다.
- 운영 HTTP 보안 검사 91건 통과. 익명·위조 인증·외부 출처 차단, 보안 헤더, 로그인 경로, 미리보기/레거시 비공개와 위조 웹훅 거절을 확인했다.

### 이전 운영 반영 (2026-10-28)

- **당시 운영: `793ee97`, `build-2026-10-28-005`**, READY·트래픽 100%·reconciling=false 확인. 개인정보/환불/탈퇴 절차, 12개 만료 삭제 정책과 만 14세 이상 조회 제한이 반영됐다. 정책 버전 `2026-10-28.2`, 시행일 미지정·실결제 차단 유지. 검증·제한·후속 작업은 [개인정보 운영 절차](../privacy/operations.md)를 따른다. 운영 HTTP 91건 통과, 배포 후 광범위 SDK 역할 회수·Secret Manager 참조·비공개 원본 서버 유지 확인.
- `develop` 소스 커밋 `11bed5c`를 원격에 푸시하고 Firebase App Hosting `build-2026-10-28-001`로 최초 배포했다. 이후 아래 Zod 보안 패치를 포함한 **1단계 운영은 커밋 `8952b5f`, `build-2026-10-28-002`**이며 Cloud Run Ready, backend reconciling=false, 운영 트래픽 100%를 확인했다. 아래 목록은 이 단계의 기록이다.
- 통신판매업 신고번호 `2026-서울관악-2068`과 건물번호를 포함한 사업장 주소가 운영 `/`, `/yearly`, `/terms`, `/privacy`, `/refund`에서 모두 표시된다. 최신 해석 근거·정확한 월운 기간·쉬운 말투·귀여운 표정·주제별 메시지 묶음 및 로그인 버튼 표시 보완도 포함한다. 기존 리포트 데이터를 삭제하거나 유료 모델로 재생성하지 않았다.
- Node 22 운영 빌드/TypeScript 통과. 전체 lint는 오류 0, 기존 경고 16이다. `saju:spike`, `saju:compare`, 추가 사실·코퍼스·개인화·가독성·표정·표시 검사를 통과했다. compare의 기존 입춘 정책 차이 1건은 유지한다.
- 주요 회귀: 리포트 복구 117, API 보안 151, 실제 격리 Firestore 81, 취소/권한 대조 43, 로컬 비로그인 접근 12, 결제 클라이언트 17, 운세 요청 클라이언트 14, 결제 모드 18, 로그인 제한 42, 조회 제한 25 PASS. 실제 DB 검사는 합성 문서만 사용하고 정리를 확인했다. Firebase preflight와 의존성·비밀키 검사도 통과했다.
- 로컬 최초 빌드/네트워크 검사는 실행 환경 제한으로 중단됐고, 빌드 캐시를 분리한 뒤 필요한 권한으로 재실행해 성공했다. 실제 Firebase CLI 소스 압축 279개 파일에서 로컬 환경 파일·개인키·캐시가 제외됨을 확인했다. `.env.example`에는 검사한 예시만 들어간다.
- 배포 도구가 추가한 runtime의 `roles/firebase.sdkAdminServiceAgent`만 제거했다. 필요한 기존 역할, Secret Manager 참조 6개, 운영 테스트 플래그 없음, 공개 Cloud Run invoker 없음이 확인됐다. 직접 서버 주소 2개는 익명 403, www는 대표 도메인으로 이동한다.
- 운영 도메인 HTTP 보안 85 PASS. 실제 결제·취소나 유료 LLM 호출은 이번 배포 검사의 범위에 포함하지 않았다. KCP 카드사 최종 승인과 실제 거래 웹훅은 별도 확인해야 한다.
- **판매 차단 유지:** `businessDetailsVerified=false`, `POLICY_EFFECTIVE_DATE=null`. 개인정보 위탁/국외 이전·보관/삭제 운영 절차, 고객센터 번호의 PG 수용 여부, 백업/복구·만료 데이터 정리(F4/F5)를 완료한 것으로 간주하지 않는다.
- 푸시 중 새로 표시된 Dependabot #63([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), Zod의 큰 배열 검증 시 메모리 과다 사용)를 확인하고 4.3.6 → **4.6.7**로 패치했다. lockfile과 실제 설치의 모든 Zod 복사본이 수정 범위인지, 리포트 형태의 초과 배열을 요소별 오류 누적 전에 거절하는지 동기/비동기 회귀 검사를 추가했다. 의존성 검사 11, API 보안 151, 리포트 복구 117, 결제 클라이언트 17, 운세 요청 클라이언트 14 및 Node 22 운영 빌드를 재통과했다. npm 감사 결과 0건, GitHub #63 fixed 및 열린 Dependabot 알림 0건을 확인했다.
- 최종 `build-2026-10-28-002`에서도 SDK 관리자 역할을 다시 제거하고 Secret Manager 참조·테스트 모드 없음·비공개 invoker를 재확인했다. 최종 운영 HTTP 보안 85 PASS, 메인 신고번호 표시, 직접 서버 주소 두 곳의 403을 확인했다. 로컬도 Node 22로 재시작하여 HTTP 200을 확인했다.

### Firebase App Hosting 배포 (2026-10-17)

- 프로젝트 `dabom-10a35`, backend `dabom`, 리전 `asia-east1`(대만). Firestore 서울 리전은 유지한다.
- 기본 URL: https://dabom--dabom-10a35.asia-east1.hosted.app
- Node.js 22 / Next.js 16.4.0으로 클라우드 빌드 성공. 빌드 로그에서 프로젝트/Auth/실제 deny-all 규칙/상품 검사의 PASS를 확인했다.
- 최소 인스턴스 0, 최대 2, 동시 요청 20, CPU 1, 메모리 512 MiB. 이는 확장 설정이며 금액 기준 과금 상한은 아니다.
- `firebase.json`은 로컬 소스 배포 대상 `dabom`을 정의한다. GitHub 자동 배포는 연결하지 않았다. 배포에 현재 작업 트리가 들어가므로 먼저 diff와 검사를 확인한다.

```sh
npm run firebase:hosting-check
npm run security:login-limit
npm run security:read-limit
npm run security:check
npm run report:check
npm run security:secrets
npx firebase-tools@15.34.0 deploy --only apphosting:dabom --project dabom-10a35 --non-interactive
NEXT_PUBLIC_APP_URL=https://dabom-letter.com SECURITY_CHECK_URL=https://dabom--dabom-10a35.asia-east1.hosted.app npm run security:http
```

#### 관리 자격 증명과 IAM

- `FIREBASE_ADMIN_CREDENTIAL_MODE=application-default`를 명시해 Google 관리 자격 증명을 사용한다. 프로젝트/서명 계정을 검증하며 키 파일·JSON·emulator와 혼합하지 않는다. 장기 Admin 개인키를 업로드하지 않는다. 로컬 키 파일과 Vercel JSON 방식은 계속 지원한다.
- 서버 계정: `firebase-app-hosting-compute@dabom-10a35.iam.gserviceaccount.com`.
- 앱 권한: `roles/datastore.user`, `roles/firebaserules.viewer`, 사용자 정의 `projects/dabom-10a35/roles/dabomAuthServer` (`firebaseauth.users.get`, `firebaseauth.users.create`, `firebaseauth.users.createSession`). 토큰 서명은 자기 서비스 계정 리소스에만 `roles/iam.serviceAccountTokenCreator`를 부여했다.
- 기본 인프라 역할 `firebaseapphosting.computeRunner`, `storage.objectViewer`, `developerconnect.readTokenAccessor`는 유지한다.
- **배포 후 IAM 확인 필요:** Firebase CLI 15.34.0은 배포 준비 중 기본 계정에 `roles/firebase.sdkAdminServiceAgent`를 다시 부여한다. 이는 Auth 설정/보안 규칙 변경 권한까지 포함하므로 배포 완료 후 해당 계정의 이 역할만 제거하고 로그인 확인을 다시 한다. 다른 계정의 역할이나 서비스 에이전트 권한을 삭제하지 않는다. gcloud를 사용하는 운영자는 다음처럼 좁은 binding만 제거할 수 있다.

```sh
gcloud projects remove-iam-policy-binding dabom-10a35 \
  --member='serviceAccount:firebase-app-hosting-compute@dabom-10a35.iam.gserviceaccount.com' \
  --role='roles/firebase.sdkAdminServiceAgent' --condition=None
```

- Secret Manager의 `dabom-firebase-web-api-key`, `dabom-kakao-rest-api-key`, `dabom-kakao-client-secret`, `dabom-openai-api-key`를 backend에 연결했다. YAML에는 이름만 있고 OpenAI 키는 RUNTIME에만 제공한다.
- 관련 공식 문서: [Firebase 관리 인증](https://firebase.google.com/docs/app-hosting/firebase-sdks), [custom-token 서명](https://firebase.google.com/docs/auth/admin/create-custom-tokens).

#### 네트워크와 검증

- 기본 App Hosting 주소에 위조 XFF 단일값/여러 값과 X-Real-IP/Fastly-Client-IP를 보내 실제 프록시 체인을 확인했다. 검사에 사용한 임시 진단 코드는 최종 소스에서 제거했다.
- Cloud Run 원본 URL 두 개 모두 익명 요청 403. Run IAM에 공개 invoker를 추가하면 전달 IP 보호의 전제가 깨지므로 금지한다. 새 배포 후 원본 URL 차단을 재확인한다.
- Vercel WAF 규칙은 Firebase URL에 적용되지 않는다. Firebase에서는 앱 메모리 제한 + Firestore 공유 제한이 동작하며, 이것이 모든 분산 공격/요청 과금을 차단하는 별도 edge WAF는 아니다.
- Firebase CLI의 실제 소스 압축을 검사했다. `.env.local`, `secrets/`, `.vercel/`, `.next/`, 개인키와 실제 비밀 값은 제외되며 `.env.example`에는 예시만 있다.
- 모의 검사: 관리 자격 증명 20 / 로그인 제한 40 / 보안 118 / 리포트 복구 61 PASS. 실제 Firebase URL에서 익명·위조 인증/CSRF/비밀 파일/폐기 API/결제 웹훅/리다이렉트 등 HTTP 검사 79 PASS. 넓은 SDK 역할 제거 후, 합성 Firebase Auth 계정 두 개로 실제 세션 검증·프로필 계산/저장·미결제 402·교차 계정 404·운세함 렌더링 5개도 통과했다. 해당 계정/세션/프로필/카운터는 모두 정리했다. OAuth 시작/취소 3개 검사로 관리 자격 증명의 Firestore 접근과 Secure/HttpOnly 쿠키, canonical callback을 확인했다. 도메인 전환 후 실제 운영 로그인 성공은 사용자가 직접 확인했다. 런타임 서명 로그를 별도로 검사한 결과로 해석하지 않는다.
- 현재 PortOne 설정은 비어 있다. 운영 결제 검증은 계속 적용되며 테스트를 위해 무료 생성으로 바꾸지 않았다. 실결제/유료 LLM 생성은 이 배포 검사에 포함하지 않는다.

#### 도메인 전환 완료 (2026-10-17)

- 2026-10-17 사용자 요청으로 Vercel `dabom` 운영 프로젝트를 API로 일시중지했다(`paused: true`). 프로젝트/환경 변수/배포 기록은 보존한다. Vercel 배포 주소는 `503 DEPLOYMENT_PAUSED`를 반환하며 Firebase 기본 URL은 정상 제공된다.

- `dabom-letter.com`, `www.dabom-letter.com`을 App Hosting에 등록했다. www는 https://dabom-letter.com 으로 301 이동하도록 설정했다.
- 2026-10-17 21:00 UTC 가비아에서 root와 www를 A `35.219.200.50`으로 변경하고, 각 호스트의 소유 확인 TXT와 인증서 검증 CNAME까지 총 5개 레코드를 저장했다(TTL 600). Google/Cloudflare DNS 및 가비아 권한 서버 3곳에서 새 A/TXT를 확인했다. 인증서 CNAME과 연결된 Google 검증 TXT도 공개 DNS에서 정상 조회된다.
- 2026-10-17 21:33 UTC 확인 시 root와 www 모두 `HOST_ACTIVE` / `OWNERSHIP_ACTIVE` / `CERT_ACTIVE`였다. Firebase IP를 지정하고 인증서 검증을 유지한 운영 도메인 HTTPS 요청은 200, www는 운영 도메인으로 301 응답했다. 당시 Mac의 로컬 DNS 조회에는 이전 Vercel IP가 남아 있었으나, 이후 사용자가 새 주소 접속과 운영 로그인 성공을 직접 확인했다. [공식 커스텀 도메인 안내](https://firebase.google.com/docs/app-hosting/custom-domain)
- 복구용 기존 값: root A `76.76.21.21`, www CNAME `cname.vercel-dns.com.` (기존 TTL 3600). 복구하려면 Vercel 일시중지도 해제해야 한다. 자동 복구하거나 프로젝트를 삭제하지 않는다.
- 도메인 HTTPS, www 이동, 실제 운영 로그인 확인을 완료했다. 이후 아래 수정 배포에서 실제 로그아웃/재로그인과 기존 운세 재조회 흐름도 확인했다. PortOne 결제 연결 및 실제 결제·취소·환불 검증은 별도 남은 작업이다.

#### 운영 로그인·기존 테스트 운세 수정 (2026-10-17)

- 일반 로그인 기본 목적지를 `/saju/library`에서 `/`로 바꿨다. 결제 반환/리포트 접근 중 재로그인처럼 명시한 안전한 `next` 경로는 유지한다.
- 사용자가 문의한 기존 리포트는 완료 상태였지만 로컬에서 생성되어 연결된 결제 주문이 없었다. 해당 완료본 한 건에만 소유자용 개발 미리보기 열람 권한을 부여했으며 본문과 결제 상태를 변경하지 않는다.
- 운세함, 동일 정보 조회, 리포트 API/화면, 이전 checkout 링크에서 같은 열람 규칙을 적용한다. 이미 읽을 수 있는 리포트는 새 주문이나 LLM 호출 없이 연다. 취소된 결제 및 다른 계정 접근은 계속 차단한다.
- 입력 저장 요청은 20초, 조회 요청은 15초로 제한하고 오류 안내를 표시한다. 입력 후 클라이언트 페이지 이동이 10초 동안 완료되지 않으면 같은 내부 주소로 전체 페이지 이동을 시도한다. 리포트 조회 실패 시 무한 폴링을 중단한다.
- 수정 검증: 모의 API 보안 134 / 로그인 제한·복귀 경로 42 / 리포트 61 / 관리 자격 증명 20 / 격리 Firestore 통합 48 PASS. TypeScript와 변경 파일 lint 통과.
- App Hosting `build-2026-10-17-003` 배포 성공. 배포가 다시 부여한 넓은 SDK 관리자 역할은 제거하고 필요한 runtime 역할을 재확인했다. 운영 도메인 HTTP 보안 79 PASS, Cloud Run 직접 주소 두 곳 익명 403 유지.
- 실제 브라우저 검증: 이전 checkout URL → 기존 완료 리포트, 로그아웃 → 일반 카카오 로그인 → 메인(`/`), 동일한 테스트 정보 제출 → 중복 안내 → 운세함 → 기존 본문 열람까지 성공했다. 실제 결제나 새 LLM 생성은 실행하지 않았다.

#### PortOne 로컬 테스트 연결 (2026-10-17)

- 기존 `다봄` NHN KCP V2 테스트 채널을 연결했다. PG 계약 전이므로 운영 App Hosting 결제 환경 변수와 실결제는 활성화하지 않았다.
- 사용자 승인으로 30일짜리 V2 API Secret(2026-11-16 만료)과 테스트 웹훅 시크릿을 발급했다. 값은 권한 `0600`의 Git 제외 `.env.local`에만 저장한다. API 인증을 실제 조회 요청으로 확인했다.
- `DABOM_PAYMENT_TEST_MODE=true`는 `NODE_ENV=development`와 localhost에서만 허용한다. 테스트 프로필·주문·리포트·세션은 `payment_test_*` 컬렉션에 저장하며, 이 모드에서도 결제 완료 전에는 리포트를 생성할 수 없다. 테스트 주문번호는 운영 주문번호와 분리한다.
- KCP의 주문번호 최대 40자 규격에 맞춰 새 주문번호 길이를 수정했다. 변경 전에 운영 `orders`가 0건임을 확인했다. 기존 리포트 문서는 수정하지 않았다. [KCP 연동 규격](https://developers.portone.io/opi/ko/integration/pg/v2/kcp-v2)
- 로컬 테스트 상품 초기화는 `NODE_ENV=development npm run firebase:seed`, 실행은 `npm run dev`로 진행한다. 테스트 종료 후 일반 개발 모드로 돌아가려면 `DABOM_PAYMENT_TEST_MODE=false`로 바꾸고 서버를 재시작한다. 운영 배포에는 테스트 플래그·테스트 채널·로컬 env 파일을 업로드하지 않는다.
- 임시 Cloudflare 터널은 loopback의 웹훅 전용 프록시에 연결했다. 공개되는 경로는 `POST /api/saju/payments/webhook` 하나이며 64 KiB 본문 제한, 시간 제한, 서명 검증을 거친다. 다른 경로 404, 서명 없는 요청 400을 확인했다. 검증 후 포트원의 **V2 / 테스트** 웹훅 URL을 해제하고 터널과 프록시를 종료했다. 재테스트 시 새 임시 주소를 등록해야 한다. 로컬 서버와 테스트 모드는 리포트 확인을 위해 유지한다.
- 사용자가 KCP `[TEST]` 카드 결제를 완료한 뒤 실제 `Transaction.Paid` 웹훅 서명 검증 및 앱의 200 응답을 확인했다. PortOne 재조회와 Firestore 주문 모두 `PAID`, 금액은 3,900 KRW이며 연결된 리포트는 `COMPLETED`다. 테스트 주문·리포트 각 1건, 운영 주문 0건을 확인했다.
- 브라우저에서 운세함의 ‘구매한 운세 · 추가 결제 없이 다시 보기’, 동일 정보 제출 시 중복 안내, 운세함 복귀 및 같은 리포트 재열람까지 확인했다. 재조회 전후 주문·리포트 수, 본문 해시, 생성 완료 시각이 동일하여 추가 주문과 LLM 재생성이 없었다. 실제 취소·부분 취소 및 모바일 카드사 리다이렉트 흐름은 후속 검증 대상이다.
- 결제 준비/확인 HTTP 요청과 본문 읽기에 20초 제한을 두고 실패하면 같은 주문 확인을 다시 제공한다. 결제 완료 화면으로 이동할 때 전체 페이지 이동으로 서버 상태를 새로 읽는다. 잘못된 응답 ID·가격을 브라우저에서도 거른다.
- 검증: `payment:check` 17, `payment:mode-check` 18, `security:check` 134, 격리 Firestore 통합 48 PASS. TypeScript 및 변경 파일 lint 통과. 결제창 SDK는 임의로 시간 초과 처리하지 않아 카드사 인증 중 재결제를 유도하지 않는다.

### KCP 실연동 준비 (2026-10-21, 진행 중)

- KCP 계약 서류·고객확인 심사는 완료 상태다. 카드사 등록·심사 완료와는 별개이며, 실상점 결제창 연동 후 카드사 심사를 진행해야 한다. [PortOne KCP 채널 안내](https://help.portone.io/content/kcp_channel)
- 사용자가 PortOne 이용료 납부 카드를 등록했다. 재발급한 인증서와 암호화된 개인키 두 파일을 별도 업로드 승인 후 PortOne에 첨부했고, 사용자가 비밀번호 입력·저장을 완료했다. `다봄 KCP 실결제` LIVE / NHN KCP V2 / 사이트코드 `IPDD1` 채널 생성과 채널 키를 확인하여 `apphosting.yaml`에 반영했다. 실제 결제창 호출·승인 검증은 아직 별개로 남아 있다.
- 사용자 승인으로 `다봄 Firebase 운영` V2 API Secret을 발급했다. 만료일은 **2027-01-19**이며 만료 전에 새 버전을 배포해야 한다. 존재하지 않는 결제 ID 조회가 404로 응답하여 인증 성공을 확인했다. 실제 승인·취소는 실행하지 않았다.
- 실연동 V2 웹훅 시크릿을 발급하고 `https://dabom-letter.com/api/saju/payments/webhook`을 JSON / `2024-04-25` 버전으로 저장했다. Firebase Secret Manager의 `dabom-portone-api-secret`, `dabom-portone-webhook-secret`을 App Hosting 런타임에서 참조한다. LIVE 채널과 진단 로그를 최종 `build-2026-10-21-002`로 배포하고 트래픽 100%·준비 완료를 확인했다. 운영 환경에 테스트 모드가 없고 서버 키가 평문 환경 변수로 들어가지 않았음을 확인했다.
- 존재하지 않는 검사 주문으로 운영 웹훅에 보낸 합성 요청 5건: 정상 서명 200, 무서명·변조·만료·다른 상점 400. 운영 HTTP 보안 85건 통과. 직접 Cloud Run 주소 2개는 403이고 public invoker가 없으며 배포 과정에서 추가된 광범위 SDK 관리 역할은 다시 제거했다. 실제 거래·주문·리포트 변경은 없다.
- PortOne 콘솔의 실연동 ‘호출 테스트’는 서명 검증을 통과한 뒤 **상점 정보 불일치(`STORE_MISMATCH`)**로 400 응답했다. 2026-10-21 21:16:27 UTC 요청과 21:16:31 UTC 서버 분류 로그로 원인을 확인했다. 콘솔에는 ‘웹훅 호출에 성공했습니다 / 호출 응답코드는 400’으로 표시된다. 따라서 PortOne 발송→서명 검증까지 확인했으며, 상점 검사 예외를 추가하지 않았다. 실제 승인·취소 웹훅의 정상 처리는 카드사 심사 후 별도 검증해야 한다.
- 웹훅 오류 분류는 SDK가 정의한 이유와 고정된 상점/결제 ID 검증 결과만 서버 로그에 남긴다. 헤더·페이로드·식별자·비밀키는 기록하지 않는다. 추가 변경 후 API 보안 회귀 144건·변경 파일 lint·운영 빌드가 통과했고, 최종 배포에서 합성 웹훅 5건을 다시 확인했다.
- 기존 `.env.local`의 테스트 채널·API 키·웹훅 키는 유지한다. KCP 개인키와 비밀번호는 애플리케이션 환경 변수나 Git에 넣지 않고 PortOne 채널 설정에서 관리한다.
- 모바일 KCP 결제 요청에 등록 상호, 다봄 결제창 제목, 카카오 계정 ID 원문 대신 서버에서 만든 상점 전용 고객 식별자를 전달하도록 보완했다. Next 빌드·타입 검사, 변경 파일 lint, 결제 클라이언트 17건·테스트 모드 18건, 소스·이력·클라이언트 빌드 비밀정보 검사 통과.
- 실연동 설정을 마쳐도 아래 사업자·정책 준비 조건을 자동 완료 처리하지 않는다. 현재 운영 신규 결제는 닫혀 있으며, 채널·웹훅·정책을 모두 확인한 뒤 판매를 연다.

### PG 심사 준비 페이지와 거래 증빙 (2026-10-17, 로컬 작업)

- 로그인 없이 `/yearly`에서 2026년 리포트 1건 3,900원, 제공 방법·시점, 가상 예시 일부와 환불 요약을 확인한다. 예시는 생성 프롬프트/코퍼스에 들어가지 않는다.
- `/terms`, `/privacy`, `/refund`를 추가하고 메인과 결제 화면에 사업자 정보를 표시한다. 공개 정보는 `src/lib/commerce/policy.ts` 한 곳에서 관리한다.
- 현재 정책은 **초안**이다. 사업장 주소는 사용자 확인에 따라 `서울특별시 관악구 시흥대로158가길 9, 301호`로 보완했다. 사용자 제공 통신판매업 신고증(관악구청, 발급일 2026-10-28)에서 신고번호 `2026-서울관악-2068`과 상호·대표자·주소를 확인하여 공통 사업자 정보에 반영했다. 휴대폰 고객센터 번호의 PG 수용 여부는 미확인이다. 개인정보 국외 이전 고지·위탁 조건·삭제/보존 운영 절차도 확정해야 한다. `businessDetailsVerified=false`, `POLICY_EFFECTIVE_DATE=null` 상태에서 신규 실결제는 서버와 화면에서 차단한다. 로컬 전용 결제 테스트 모드는 유지한다.
- 정책이 최종 확정되면 시행일·버전을 갱신하고 해당 버전의 전문과 예시를 Git 이력에 보존한다. 정책을 바꾸면서 버전을 재사용하지 않는다. 설정 플래그만 바꾸어 미완료 고지를 활성화하지 않는다. 개인정보 방침은 한국법에 따른 국외 이전 항목, 실제 수탁자 계약·재위탁, 계정/로그/백업의 보관 및 삭제 절차를 운영자가 확인해야 한다.
- 결제 준비 API/저장소는 현재 정책 버전과 `terms=true`, `digitalContent=true`를 검증한다. 선택 항목을 사전 체크하지 않는다. 서버가 확인한 계정·프로필·상품·금액과 동의 문구·버전·서버 시각·예시 버전을 `checkoutConsents`에 트랜잭션으로 저장한다. 동일 주문·버전은 재시도해도 최초 증빙이 바뀌지 않는다. 주문의 `checkoutConsent`에도 해당 스냅샷을 연결한다. IP나 카드번호를 추가 수집하지 않는다.
- 이미 구매했거나 명시적으로 허용된 개발 리포트는 새 약관 동의나 판매 개시 설정과 무관하게 기존 권한으로 재열람한다. 취소된 주문과 다른 계정은 계속 차단한다.
- `completedAt`는 생성 완료, `firstDeliveredAt`는 권한을 확인한 완료 본문 API 응답 준비 시각, `firstOpenedAt`는 보이는 브라우저에서 완료 본문 렌더 후 보낸 확인 요청의 서버 수신 시각이다. ‘생성 시작’이나 기록 하나만으로 실제 이용/청약철회 제한을 단정하지 않는다. 기록 장애로 구매 콘텐츠를 숨기지 않는다. 환불 판단에는 결제·제공 여부·하자·계약 이행을 함께 확인한다.
- `POST /api/saju/reports/:id/opened`는 인증·동일 출처·요청 제한과 트랜잭션 내 계정/프로필/결제/완료 상태를 확인한다. 서버의 제공 기록이 있어야 열람 기록을 남기며 최초 시각은 덮어쓰지 않는다. 미리보기·미결제·취소·다른 계정에는 남기지 않는다.
- 환불 접수는 공개 고객센터로 받는다. 자동 카드 취소 기능을 새로 만든 것은 아니다. 주문의 실제 결제 상태를 확인하여 PortOne에서 취소하고 기존 서명 검증 웹훅으로 권한 회수를 확인해야 한다. 법정 기산일부터 환급 기한을 관리하고 결과를 고객에게 안내한다. 기존 계정/리포트 삭제 및 법정보존 자료의 분리·만료 삭제 절차는 출시 전 검증 대상이다.
- 참고 근거: [PortOne 서비스 요건](https://help.portone.io/content/requirements), [전자상거래법 제17조](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1024961473), [Firebase 개인정보 처리](https://firebase.google.com/support/privacy), [OpenAI 데이터 보관](https://developers.openai.com/api/docs/guides/your-data). `store:false`를 무보관 승인으로 해석하지 않는다.
- 검증: API 보안 144, 격리 Firestore 66, 로컬 production HTTP 86, 결제 클라이언트 17, 리포트 61 PASS. Node 22 production build와 TypeScript 통과; lint 오류 0, 기존 경고 17. 브라우저에서 상품 공개 접근·메인 링크와 결제 동의 0/1/2개 상태 및 해제 시 차단을 확인했다. 실제 결제·LLM 호출·운영 배포는 하지 않았다.

### 기존 Vercel 배포 참고 (이전 구성)

1. Vercel에 Firebase 프로젝트 ID, web API key, Kakao REST API key/client secret을 서버 환경 변수로 설정한다.
2. `FIREBASE_ADMIN_CREDENTIALS_JSON`을 비밀 환경 변수로 넣고 `FIREBASE_ADMIN_CREDENTIALS_FILE`은 비운다. 두 소스를 동시에 설정하지 않는다. 개인키를 저장소/클라이언트에 넣지 않는다.
3. **빌드 시점부터** `NEXT_PUBLIC_APP_URL=https://dabom-letter.com`을 설정한다. Next가 NEXT_PUBLIC 값을 빌드에 포함한다. 로컬 HTTP 주소로 빌드한 결과를 운영에 배포하지 않는다.
4. Vercel production build는 프로젝트 일치, Auth 접속, 실제 배포된 Firestore deny-all 규칙, 운세 상품을 확인하고 실패 시 중단한다.
5. 운영 PortOne 설정과 실제 결제 확인은 별도 출시 검증이 필요하다. 이번 연결에서는 실결제를 하지 않았다.
6. 새 로그인/조회 확인 후에만 이전 Supabase 서비스 중단 여부를 결정한다. 기존 사용자는 Firebase로 다시 로그인해야 한다.

## 검증 결과

- Firestore 실제 트랜잭션/권한/OAuth/세션 검사: 43 PASS (검사 데이터 삭제).
- 합성 계정 API 보안 회귀: 118 PASS.
- 리포트 생성/복구: 55 PASS.
- 익명 로그인 차단: 12 PASS.
- HTTPS 운영 설정으로 빌드한 로컬 production HTTP 보안 검사: 79 PASS.
- 실제 카카오 로그인 → 테스트 정보 저장 → 리포트 생성 → 운세함 보관 → 동일 정보 재조회 팝업 확인.
- TypeScript/production build 통과; 명리 spike/compare 통과 (기존 입춘 정책 차이 1건 유지).
- 전체 lint 오류 6개 수정 완료: 0 errors, 17 warnings. CommonJS 검증 도구의 ES module 전환, 불필요한 마운트 상태 제거, 날짜 선택 상태 동기화, 예전 편지 화면의 요청 상태 처리를 정리했다.
- 비밀 스캔: 현재 소스/Git 기록/브라우저 번들 모두 통과.
- 과거 DB 경고는 `c4a68b30f33e:.env.example`에 들어 있던 로컬 Docker 예시다. 동일 커밋의 `docker-compose.yml`에 명시된 사용자·비밀번호·DB명과 일치하며 현재 DB 비밀번호와는 다르다. `62d0bee3ab68`에서 삭제됐다. 해당 전체 URL의 SHA-256만 과거 기록 검사에서 예외 처리한다. 현재 소스 및 다른 localhost 접속 정보는 계속 검사한다. 운영 자격 증명 교체나 Git 이력 재작성은 하지 않았다.
- `npm run security:secrets:check`: 이력 예외 범위/변형 URL/서비스 역할 토큰 회귀 검사 8개. 과거 fixture를 확인할 수 있는 Git 이력이 필요하다.


### 조회 요청 방어와 운세함 페이지 조회 (2026-10-18)

- `getFirebaseAccount`에서 세션 쿠키가 있는 요청은 인증 서버/DB 접근 전에 메모리 제한을 받는다. IP별 10초 180회·1분 600회, 세션별 10초 60회·1분 180회다. 신뢰하는 프록시의 IP 해석은 로그인 방어와 동일하며, 세션 원문은 메모리 키로 저장하지 않는다. 비어 있거나 20,000자를 넘는 쿠키는 DB 호출 없이 거절한다.
- 검증된 계정은 모든 서버에서 분당 180회의 고정 시간창을 공유한다. `rateLimits`의 계정별 고정 문서에서 최대 10회씩 트랜잭션으로 예약하고, 사용하지 않은 예약은 서버 재시작 시 복원하지 않는다. 문서를 요청/시간창마다 새로 만들지 않는다. 한도 조회 장애는 짧은 대기 후 재시도하며 읽기를 허용하지 않는다. 메모리 캐시는 최대 10,000개이고 권한/세션 확인 결과는 캐시하지 않는다.
- API의 제한 응답은 `429`, `Retry-After`, `private, no-store`를 포함한다. 리포트 클라이언트는 지정된 시간 후 재시도하고, 로그인 상태 확인도 대기 시간을 지킨다. 세션 폐기 검사와 Firestore 세션 허용 목록 검사는 허용된 요청마다 유지하며 로그아웃 경로는 읽기 한도와 분리한다.
- 운세함 페이지 조회는 계정당 분당 12회로 추가 제한한다. 프로필은 최신순 12명씩, 개인별 운세 이력은 최대 32개씩 조회하고 각각 다음 페이지 링크를 제공한다. 관계 필터는 서버의 전체 해당 계정 목록에 적용한다. 커서는 정렬 위치일 뿐이며 모든 조회에 소유자 조건을 다시 적용한다. 목록 조회에서 명식과 유료 리포트 본문은 제외한다. 예전 관리자가 부여한 개발 미리보기만 기존의 본문 존재 확인을 유지한다.
- 새 버전을 처음 배포하기 전에 `firestore.indexes.json`의 프로필/리포트 인덱스 6개(운영 및 결제 테스트용)를 배포하고 모두 READY인지 확인한다. 생성 중에는 이전 앱을 유지한다. 격리 통합 검사는 테스트 루트 문서 아래의 하위 컬렉션을 사용해 같은 인덱스를 검증한다. [Firestore 커서 페이지 조회 공식 문서](https://firebase.google.com/docs/firestore/query-data/query-cursors)
- 운영의 `/saju/profiles/[profileId]` 진단 화면은 인증/DB 접근 전에 404를 반환한다. 개발 환경의 소유자 검사 및 `/checkout` 경로는 유지한다.
- 이 방어는 앱의 인증/DB 사용량을 제한한다. 분산 공격 전체나 네트워크 요청 과금을 금액 기준으로 차단하는 edge WAF는 아니며, 메모리 제한은 서버 재시작 시 초기화된다.

### 취소 알림 누락 시 구매 권한 재확인 (2026-10-18)

- `src/lib/portone/entitlement.ts`가 리포트 본문 전달, 결제 확인, 기존 구매 재열람과 실제 `generateReport` 호출을 보호한다. 새로운 생성은 매번 PortOne을 조회하고, Firestore의 생성 선점 트랜잭션도 30초 이내에 확인한 결제만 허용한다. 이미 시작된 모델 작업 중 취소가 반영되면 결과 저장도 거절한다.
- 기존 리포트 읽기는 마지막 검증 후 5분까지 조회 결과를 재사용한다. 이후 요청에서 결제사를 다시 확인한다. 실제 `CANCELLED`/`PARTIAL_CANCELLED`는 둘 다 구매 권한을 회수하며 `CANCELLED`는 되돌릴 수 없는 로컬 상태다. 늦은 확인 응답이나 재전송 웹훅으로 활성화되지 않는다. [PortOne V2 결제 조회 상태](https://developers.portone.io/api/rest-v2/payment)
- 네트워크 오류·429·5xx에만 **마지막 성공 검증 시점부터 최대 15분**까지 완료된 리포트의 열람을 유예한다. 실패할 때 유예 시간을 연장하지 않는다. 미완성 리포트/새 생성/결제 확인에는 유예가 없다. 401/403/404, 설정 오류, 잘못된 응답, 금액·통화·주문 불일치는 유예 없이 중단한다. 이전에 거절된 권한도 후속 네트워크 장애로 복구되지 않는다.
- 주문 문서의 `paymentCheckId`와 20초 임대로 여러 서버의 재확인 요청을 하나로 묶는다. 실패 뒤 30초 대기하며, 오래된 작업은 새 검증 결과를 덮어쓸 수 없다. 마지막 성공 시각은 조회 시작 시각으로 저장한다. 기존 결제에 검증 시각이 없으면 최초 접근에서 검증하며 자동 유예를 부여하지 않는다.
- 검증 불가 응답은 `503`, `Retry-After: 30`, `PAYMENT_VERIFICATION_REQUIRED`, `private, no-store`를 반환한다. 클라이언트도 이 응답에서는 캐시된 본문을 가리고 재결제 없이 다시 확인하도록 안내한다. 이미 고객에게 전달·저장된 내용 자체를 원격 회수하는 기능은 아니다.
- 이 방식은 **접근 시 대조**다. 고객 접근이 없는 주문을 정기적으로 전수 조회하는 Cloud Scheduler 작업이나 별도 운영 알림은 이번에 설치하지 않았다. 웹훅이 누락돼도 다음 접근에서 위 유효시간에 따라 권한을 확인한다. 실결제 개통 전에는 실제 테스트 카드 취소/부분 취소, 웹훅 누락·재전송 및 장시간 PG 장애를 추가로 확인한다. 운영 결제 환경 변수는 계속 비활성 상태다.
- `npm run payment:reconciliation-check`: 실제 격리 Firestore에서 취소 누락, 부분 취소, 직접 생성 호출, 웹훅 재전송, 장애 유예, 자격/무결성 오류, 확인 경합, 취소 중 발행 방지와 정리를 검증한다. Auth/PortOne/LLM은 합성 응답을 사용한다.
