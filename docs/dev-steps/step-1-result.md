# STEP 1 — 프로젝트 세팅 + DB 설계 결과

> 상태: 완료 (2026-08-08)

## 구현 내용

- Vercel + 기존 Supabase PostgreSQL 환경을 위한 비밀값 없는 `.env.example`을 추가했다.
- Prisma 스키마와 첫 migration을 추가했다.
  - `User`, `SajuProfile`, `Product`, `Order`, `Report` 모델 및 상태 enum을 정의했다.
  - 비로그인 입력을 위해 `SajuProfile.userId`는 nullable이며, `Report(sajuProfileId, productCode)`는 unique다.
  - `Report.content`는 `paragraphs`와 `meta`를 담는 JSON 계약으로 사용할 자리이며, 보고서 상태머신을 `PENDING → GENERATING → COMPLETED/FAILED`로 정의했다.
- `yearly_2026` / `2026 운세` / 3,900원 상품을 upsert하는 Prisma seed를 추가했다.
- React Query 전역 provider와 `src/lib/db.ts` Prisma singleton을 추가했다.
- `KoreanPolicyAdapter`와 서비스 소유 `Myeongsik` 타입을 추가했다.
  - `lunar-javascript` 결과를 라이브러리 자료형 그대로 저장하지 않고, 원국·오행·십신·지장간·대운/세운/월운을 서비스 JSON으로 변환한다.
  - `sect-2`, 정확한 절입 시각, `Asia/Seoul` 정책을 고정한다.
  - 1987~1988 KDT 기간은 KST로 한 시간 환산하며, 사라진/중복된 전환 시각은 오류 또는 `dstOccurrence` 입력으로 명시 처리한다.
  - 신살은 한국식 규칙 테이블 구현 전까지 `pending-korean-rule-table` 상태로 남긴다. 경도 보정은 적용하지 않는다.

## 검증

- `prisma generate` 성공
- `prisma validate` 성공
- TypeScript 검사 성공
- `npm run build` 성공
- 어댑터의 1995-05-20 20:20 여성 입력이 Step 0 기준 원국 `乙亥 辛巳 辛亥 戊戌`과 일치함을 확인했다.
- 1988-07-01 12:00 KDT 입력이 계산 전에 11:00 KST로 환산됨을 확인했다.

실제 DB 검증은 Supabase 연결 문자열을 준비한 뒤, Docker 없이 신뢰할 수 있는 개발 머신에서 실행한다.

```bash
DATABASE_URL="$SUPABASE_DIRECT_URL" npm run db:deploy
DATABASE_URL="$SUPABASE_DIRECT_URL" npm run db:seed
```

`npm run lint`는 이번 변경과 무관한 기존 레거시 파일의 ESLint 오류로 실패한다. 새 Step 1 파일은 `tsc`와 production build를 통과했다.
