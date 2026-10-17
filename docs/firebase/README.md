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
- 개발 모드만 무료 리포트 생성 가능. 운영은 유효한 결제 완료 주문이 있어야 생성/조회 가능.
- Admin 키는 `secrets/firebase-admin.json` (0600), `.env.local` (0600)에 경로만 저장한다. 둘 다 Git에서 제외한다.
- 가입 과정에 새 유료 서비스/Blaze 플랜을 활성화하지 않았다. 무료 할당량을 넘으면 서비스 제한을 받을 수 있으므로 출시 전 사용량을 관찰한다.

## 실행

```sh
npm run dev
npm run firebase:check
npm run firebase:seed
npm run firebase:preflight
npm run firebase:store-check
npm run security:check
npm run report:check
npm run auth:check
npm run saju:spike
npm run saju:compare
```

`firebase:store-check`/`library:check`/`security:concurrency`는 같은 통합 검사를 실행한다. 임의의 test_ 접두사 컬렉션만 생성하고 finally에서 삭제한다. 실제 카카오 사용자·주문은 건드리지 않고, 모델/결제 API를 호출하지 않는다.

`legacy:*` 명령과 Prisma/SQL 자료는 이전 Supabase 배포 참고용이다. 현재 앱/build에서 사용하지 않는다. 이전 DB를 변경하는 명령은 새 Firebase 설정에 사용하지 않는다.

## 운영 배포 전

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
- 전체 lint에는 기존 파일의 오류 6개/경고가 남아 있다. 이번 변경 파일은 별도로 검사한다.
- 비밀 스캔: 현재 소스/브라우저 번들 노출 없음. Git 과거 기록의 기존 DB 연결문자열 경고는 별도 이력 정리 대상이며 이번 작업에서 기록을 재작성하지 않았다.
