# 배포 및 외부 서비스 구성

**현재 실제로 어떻게 구성되어 있는지**를 기록한 문서다.
앞으로 무엇을 할지에 대한 계획은 `dev-steps/` 에 있다.

최종 확인: 2026-08-06

> ⚠️ 이 레포는 **public** 이다. API 키·시크릿·토큰 값을 절대 여기 적지 않는다.
> 변수 이름과 발급처만 적고, 값은 Vercel 환경변수와 각 서비스 대시보드에만 둔다.

---

## 현재 배포 상태

레거시 코드(Supabase + Ablecity + 룰 기반 리포트)를 **임시로** 배포해 둔 상태다.
목적은 도메인·HTTPS 확보와 PG 가맹 심사용 URL 마련이며,
PRD대로 재구축한 뒤 같은 프로젝트에 덮어쓴다. (`dev-steps/README.md` 참고)

| 항목 | 값 |
|---|---|
| 호스팅 | Vercel |
| 팀 스코프 | `bjhj` (팀명 hyeji) |
| 프로젝트 | `dabom` |
| 프로덕션 URL | https://dabom-letter.com |
| Vercel 기본 URL | `dabom-theta.vercel.app` (Preview 용도로 유지) |
| 배포 방식 | **로컬에서 `vercel --prod` 수동 배포** (Git 미연결) |
| Node 버전 | 24.x |

### Git 연결이 안 되어 있다

`VERCEL_GIT_*` 환경변수가 모두 비어 있고, 지금까지 전부 로컬 CLI로 배포했다.
GitHub 레포를 연결하면 push 시 자동 배포되고 Production Branch를 `main`으로 고정할 수 있다.
연결할 때 **Production Branch는 `main`** 으로 지정한다 (기본값은 레포 기본 브랜치인 `develop`).

---

## 도메인 / DNS

- 등록기관: **가비아**, 등록일 2026-08-06
- 네임서버: 가비아 기본 유지 (Vercel 네임서버로 이전하지 않음)

| 타입 | 호스트 | 값 |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

**대표 도메인은 apex(`dabom-letter.com`)** 이고 `www`는 apex로 308 리다이렉트된다.

```
dabom-letter.com      → 200
www.dabom-letter.com  → 308 → dabom-letter.com
```

대표 도메인 방향은 Vercel 대시보드
(**Settings → Domains → 각 도메인 Edit → Redirect to**)에서 바꾼다.
CLI에는 해당 기능이 없으며, 필요하면 `api.vercel.com/v9/projects/{id}/domains/{domain}` 에
`{"redirect": ..., "redirectStatusCode": 308}` 을 PATCH 한다.

> 주의: OAuth 콜백이 리다이렉트를 거치면 PKCE 검증 쿠키가 호스트별로 갈릴 수 있으므로,
> 외부 서비스에 등록하는 URL은 **반드시 대표 도메인(apex)** 으로 통일한다.

---

## 환경변수

값은 Vercel에만 존재한다. 레포에 `.env.example` 이 없으므로 이 표가 사실상 그 역할을 한다.

| 변수 | 발급처 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 동일 | 공개 값 |
| `SUPABASE_SERVICE_ROLE_KEY` | 동일 | **절대 클라이언트 노출 금지.** 현재 Vercel에서 Non-sensitive로 저장돼 있어 Sensitive 전환 권장 |
| `NEXT_PUBLIC_APP_URL` | 직접 입력 | 환경별로 다름 (아래) |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | PortOne 콘솔 | |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | PortOne 콘솔 | |
| `PORTONE_API_SECRET` | PortOne 콘솔 | 서버 검증용 |
| `ABLECITY_API_URL` / `ABLECITY_API_KEY` | Ablecity | **레거시.** 재구축 시 내장 만세력으로 교체되어 폐기 |
| `ABLECITY_TIMEOUT_MS` | 직접 입력 | 기본 10000 |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | OpenAI | 현재 코드에서 `gpt.ts`는 dead code라 미사용. 재구축 후 필수 |

`NEXT_PUBLIC_APP_URL` 은 환경별로 값이 다르다. 이 값으로 OAuth 리다이렉트 URL을 만들기 때문에
틀리면 로그인이 엉뚱한 도메인으로 돌아간다.

| 환경 | 값 |
|---|---|
| Production | `https://dabom-letter.com` |
| Preview | `https://dabom-theta.vercel.app` |
| Development | `http://localhost:3000` |

`NEXT_PUBLIC_*` 는 브라우저 번들에 인라인되는 공개 값이므로 Sensitive로 두지 않는다
(값을 다시 읽을 수 없게 되어 확인만 불가능해지고 보안 이점은 없다).

---

## Supabase

- Authentication → **URL Configuration**
  - Site URL: `https://dabom-letter.com/`
  - Redirect URLs:
    - `https://dabom-letter.com/api/auth/callback`
    - `https://dabom-letter.com/**` (와일드카드 — 경로 추가 시 재등록 불필요)
  - Preview 배포에서 로그인을 테스트하려면 `https://dabom-theta.vercel.app/**` 를 추가해야 한다.
    현재는 등록돼 있지 않아 **Preview 환경 로그인은 동작하지 않는다.**
- Authentication → **Providers → Kakao**: 활성화 + 카카오 REST API 키 / Client Secret 입력
- 스키마는 `db/schema.sql` 을 SQL Editor에서 실행한 것
  (재구축 시 Prisma로 교체되므로 이 파일도 폐기 예정)

---

## 카카오 로그인

**카카오 콘솔에 등록하는 Redirect URI는 우리 도메인이 아니다.**
Supabase Auth가 OAuth를 중개하므로 카카오는 Supabase로 돌려보내야 한다.
여기서 실수가 가장 많이 난다.

```
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```

`<supabase-project-ref>` 는 Supabase 대시보드 또는 Vercel의 `NEXT_PUBLIC_SUPABASE_URL` 에서 확인한다.

### 카카오 개발자 콘솔 (https://developers.kakao.com)

내 애플리케이션 → 앱 선택 후:

| 메뉴 | 설정 |
|---|---|
| 카카오 로그인 | 활성화 ON + 위 Supabase 콜백을 Redirect URI로 등록 |
| 앱 키 | **REST API 키** → Supabase Kakao provider에 입력 |
| 보안 | Client Secret 생성·활성화 → Supabase Kakao provider에 입력 |
| 플랫폼 → Web | 사이트 도메인에 `https://dabom-letter.com` 등록 |
| 동의항목 | 닉네임, 이메일 |

### 전체 로그인 흐름

```
/login → /api/auth/login
  → https://<ref>.supabase.co/auth/v1/authorize?provider=kakao
      &redirect_to=https://dabom-letter.com/api/auth/callback
  → 카카오 인증
  → https://<ref>.supabase.co/auth/v1/callback     (카카오에 등록하는 값)
  → https://dabom-letter.com/api/auth/callback     (Supabase 허용목록에 있어야 하는 값)
  → exchangeCodeForSession → 세션 쿠키 설정 → next 경로로 이동
```

2026-08-06 프로덕션에서 로그인 정상 동작 확인.

---

## PortOne 결제

**미설정.** 환경변수 자리는 있으나 KCP 가맹 심사 후 실제 값이 나온다.
심사 통과 후 해야 할 일:

- Vercel 환경변수에 실제 Store ID / Channel Key / API Secret 입력
- PortOne 콘솔에 웹훅 URL 등록 (재구축 후 경로: `/api/webhooks/portone`)

---

## 알려진 문제 (배포 전 처리 필요)

레거시 코드를 임시 배포한 상태이므로 아래가 그대로 프로덕션에 노출돼 있다.

1. **개발용 경고 배너 노출** — `/products/2026`, `/products/2026-gift`, `/login` 에
   "Supabase / PortOne 환경 변수가 설정되지 않았습니다" 문구가 뜬다.
   `ConfigNotice` 는 개발 진단용이므로 프로덕션에서는 렌더하지 않도록 막아야 한다.
   내부 기술 스택이 노출되는 문제도 있다.
2. **전자상거래 필수 표기 페이지 부재** — 이용약관, 개인정보처리방침, 청약철회·환불 규정,
   사업자정보(상호/대표자/사업자등록번호/통신판매업신고번호/주소/연락처)가 하나도 없다.
   **PG 가맹 심사에 직결되므로 심사 신청 전에 반드시 필요하다.**
3. **세션 갱신 버그** — `middleware.ts` 의 `setAll` 이 갱신된 쿠키를 `request.cookies` 에만
   쓰고 응답에 반영하지 않는다. 로그인은 되지만 토큰 만료 시 세션이 풀린다.
4. `/preview/*`, `/design/*` 목업 페이지가 프로덕션에 공개되어 있다.
   Git 연결 후 Production Branch를 `main`으로 잡으면 `/design`은 빠진다.

---

## 재배포 방법

Git 미연결 상태이므로 로컬에서 직접 배포한다.

```bash
vercel --prod --yes          # 현재 작업트리를 프로덕션으로 배포
vercel env ls                # 환경변수 목록
vercel env pull .env.local --environment=production   # 값 내려받기 (시크릿 주의)
vercel ls dabom              # 배포 이력
```

환경변수를 바꾼 뒤에는 **반드시 재배포해야** 적용된다
(`NEXT_PUBLIC_*` 는 빌드 시점에 번들에 인라인되기 때문).
