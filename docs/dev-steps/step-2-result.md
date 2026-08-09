# STEP 2 — 핵심 루프 결과

> 상태: 구현 완료, 실제 OpenAI 호출 검증 대기 (2026-08-09)

## 구현 내용

- 새 Prisma 경로 `/saju`를 추가했다. 비로그인 사용자가 이름·성별·생년월일·시:분·양/음력·윤달을 입력하면 `SajuProfile`과 서비스 소유 `Myeongsik` JSON이 생성된다.
- 출생 시각을 모르는 경우에는 시주가 미확정임을 JSON에 기록한다. 이 경우 임시 기준 시각으로 계산하므로, 이후 UX에서 시각 입력을 보완할 수 있다.
- 개발용 리포트 생성 경로를 추가했다.
  - `POST /api/saju/profiles/:profileId/reports`는 같은 `(sajuProfileId, yearly_2026)` 요청에 기존 리포트를 돌려준다.
  - 결제 전 개발용 리포트를 위해 `Report.orderId`를 nullable로 바꾸는 migration을 적용했다. 결제 단계에서 주문을 연결한다.
  - 리포트는 `PENDING → GENERATING → COMPLETED/FAILED` 상태로 저장한다. 사용자 대기 시간을 제한하기 위해 자동 재시도 대신 실패 화면의 명시적 재시도 버튼을 사용한다.
- OpenAI Responses API의 JSON Schema Structured Output을 사용해 `{ paragraphs, meta }` 계약을 받도록 구현했다. 저장 전 분량·제목/번호·서사 비트·용어 풀이·금지어를 검증한다.
- `/saju/reports/:reportId`에 React Query 폴링과 모바일 우선 에세이 렌더링을 추가했다.

## 검증

- Supabase의 기존 레거시 스키마를 유지한 채, `20260808130000_allow_development_reports` migration을 적용했다.
- 로컬 API로 사주 프로필과 개발용 리포트를 생성하고, `OPENAI_API_KEY` 부재 시 `FAILED` 및 오류 메시지가 저장되는 것을 확인했다. 검증 fixture는 삭제했다.
- `tsc --noEmit`, `npm run build`, 사주 기준 원국(`乙亥 辛巳 辛亥 戊戌`) 검증을 통과했다.

## 실제 AI 생성 전 남은 한 가지

`OPENAI_API_KEY`를 로컬 `.env.local`과 Vercel의 server-only 환경변수로 등록한 뒤 `/saju`에서 한 번 생성한다. 키는 `NEXT_PUBLIC_` 접두사 없이 저장하며, 채팅·GitHub에 공유하지 않는다. 실제 결과가 1,700~2,600자 및 에세이 형식 검증을 통과하는지 확인한 뒤 톤 조정은 Step 3에서 한다.
