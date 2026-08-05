# AI 사주 서비스 — STEP 1: 프로젝트 세팅 + DB 설계

## 프로젝트 컨텍스트

AI 사주 MVP를 만들고 있다.

- 컨셉: 만세력 계산(내장 라이브러리, 결정론적) → GPT가 에세이/편지 형식의 사주 리포트 생성
  (소제목·번호 없는 한 편의 긴 글. 섹션 카드형 리포트가 아님 — STEP 3에서 톤을 확정한다)
- 스택: Next.js 풀스택(App Router, TypeScript, Tailwind, React Query) + Prisma + PostgreSQL
- 핵심 정책: 리포트는 결제 후 1회만 생성하여 영구 저장(사용자 재생성 불가), 비동기 상태머신(PENDING→GENERATING→COMPLETED/FAILED)으로 생성

## 작업 요청

1. Next.js 프로젝트 생성 (App Router, TypeScript, Tailwind, ESLint, src 디렉토리)
   - React Query 셋업
   - 폴더 구조: `src/lib/saju`(만세력 모듈 자리), `src/lib/llm`(리포트 생성), `src/lib/prompts`(버전별 프롬프트)

2. 로컬 개발용 PostgreSQL — docker-compose.yml 작성

3. Prisma 스키마 설계 및 마이그레이션:
   - **User**: id, kakaoId(unique), nickname, email?, createdAt
   - **SajuProfile**: id, userId?(비로그인 입력 허용, 로그인 시 연결), name, gender, birthDate, birthTime?, isLunar, isLeapMonth, myeongsik(Json — 계산된 명식), teaser(Json? — 무료 티저 본문), createdAt
     - `myeongsik`은 원국 8글자 + 오행/십신/지장간 + **신살 + 대운/세운/월운**을 모두 담는다 (STEP 0 산출물)
     - `teaser`는 결제 전에 생성되는 무료 티저(300자 내외)를 캐시하는 자리다.
       Order/Report가 없는 시점에 만들어지므로 프로필에 붙인다. 재방문 시 재생성하지 않아 LLM 비용 상한이 된다
   - **Product**: id, code(unique, 예: "yearly_2026"), name, price, active
   - **Order**: id, userId, productId, sajuProfileId, merchantUid(unique), status(READY/PAID/FAILED/CANCELLED), paidAmount?, paidAt?, pgTxId?, createdAt
   - **Report**: id, orderId(unique), sajuProfileId, productCode, status(PENDING/GENERATING/COMPLETED/FAILED), content(Json? — 에세이 본문), promptVersion, model, retryCount, lastError?, createdAt, completedAt?
     - `content` 형태: `{ paragraphs: string[], meta: { charCount, beats, termsUsed } }`
     - **단락 배열로 저장한다.** 리포트는 소제목·번호가 없는 한 편의 글이므로 섹션 배열이 아니며,
       LLM이 의도한 단락 구분을 그대로 보존해야 렌더링 시 리듬감이 유지된다 (UI가 문장을 임의로 묶지 않는다)
   - 유니크 제약: `Report(sajuProfileId, productCode)` — 동일 리포트 1회 생성 정책

4. 환경변수 구조(.env.example): DATABASE_URL, OPENAI_API_KEY, KAKAO_CLIENT_ID/SECRET, PORTONE_* (뒤 단계용 자리만)

5. seed 스크립트: Product 1건("2026 운세")

## 검증

- prisma migrate dev + seed 성공, npm run dev로 기동 확인