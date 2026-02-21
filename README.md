# 다봄 (fortune-letter-2026)

운세 서비스 - 본인용 및 선물하기

## Tech Stack

- Next.js 14 App Router
- TypeScript (strict)
- TailwindCSS
- Supabase (Postgres + Auth)
- 결제: 현재 Toss Payments (카드 결제 전용) 사용 중, **추후 변경 예정 (미정)**

## Setup

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com) 프로젝트 생성
2. `db/schema.sql` 내용을 SQL Editor에서 실행
3. Authentication > Providers에서 Kakao OAuth 활성화
   - Kakao Developers에서 앱 생성 후 REST API 키, Redirect URI 설정
   - Supabase Redirect URL: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Kakao Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`

### 3. 결제 설정 (현재 Toss Payments, 추후 변경 예정)

1. [Toss Payments](https://www.tosspayments.com) 가입
2. 테스트/라이브 키 발급
3. **카드 결제 전용** 위젯용 Variant Key 생성 (위젯 설정에서 카드만 노출)

### 4. 환경 변수

`.env.example`을 복사해 `.env.local` 생성 후 값 입력:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
NEXT_PUBLIC_TOSS_CARD_VARIANT_KEY=
TOSS_WEBHOOK_SECRET=  # optional
```

### 5. 로컬 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인

## 주요 라우트

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 |
| `/login` | 카카오 로그인 |
| `/products/2026` | 본인용 운세 결제 |
| `/products/2026-gift` | 선물하기 결제 |
| `/products/2026-gift/sent?token=` | 선물 링크 공유 |
| `/checkout/success` | 결제 성공 콜백 |
| `/checkout/fail` | 결제 실패 |
| `/reports/[id]` | 운세 결과 |
| `/reports/[id]/letter` | 운세 편지 |
| `/gift/[token]` | 선물 수령 (1회용) |

## Vercel 배포

1. Vercel에 프로젝트 연결
2. 환경 변수 동일하게 설정
3. `NEXT_PUBLIC_APP_URL`을 프로덕션 URL로 변경
4. Supabase/Kakao Redirect URI에 프로덕션 URL 추가

## 보안

- `SUPABASE_SERVICE_ROLE_KEY`는 **절대 클라이언트에 노출 금지**
- API 라우트에서만 사용
- 선물 토큰은 1회 사용 후 소멸
