# 개발 인수인계 — 다음 세션 시작점

최종 갱신: 2026-08-08  
현재 브랜치: `develop` (원격 `origin/develop`과 동기화됨)

## 지금까지 완료한 일

- PRD 문서를 `docs/dev-steps/` 아래 Step 0~6으로 정리하고, 기존 섹션 카드형 리포트 요구를 **에세이/편지형 리포트** 요구로 교체했다.
- 작업 규칙을 문서화했다. 각 Step은 구현·검증·결론 기록 뒤 하나의 의미 있는 커밋으로 남기고, `develop`에서 작업 브랜치를 만든 뒤 완료 시 `develop`에 머지·push한다.
- 현재 `src/`는 레거시(Supabase + Ablecity + 룰 기반 리포트)이며, 새 PRD 구현을 위해 대부분 교체해도 된다. 재사용 후보는 `src/components/ui/*`, `globals.css`의 폰트·애니메이션, 폼 입력 구조뿐이다.
- 레거시를 Vercel에 임시 배포했다. 대표 URL은 `https://dabom-letter.com`이며 HTTPS와 카카오 로그인까지 확인했다. 이 배포는 새 제품을 만들기 전 도메인·심사용 임시 상태다.
- 만세력 Step 0를 완료했다.
  - `lunar-javascript`(MIT)를 내장 계산 라이브러리로 채택했다.
  - `npm run saju:spike`로 원국·오행·십신·지장간·대운·세운·월운 API를 확인했다.
  - `npm run saju:compare`로 무료만세력(`sajuinfo.co.kr`) 30건과 비교했다. 29건은 원국 8글자가 일치한다.
  - 입춘 당일 새벽 1건은 기준 사이트가 날짜 단위로, 라이브러리가 정확한 절입 시각 단위로 전환해 달랐다. 제품은 **정확한 절입 시각** 정책을 채택하며 이 차이는 회귀 fixture에 의도적으로 남겼다.
  - 1987~1988 한국 서머타임과 자시 정책을 정리했다.

## 확정된 제품·계산 정책

- 만세력 계산은 결정론적인 내장 라이브러리로 수행한다. LLM은 계산하지 않으며, `Myeongsik` JSON에 있는 사실만 리포트에서 사용한다.
- 입력 시간은 출생지의 법정 현지 시각이다. 한국 기본값은 `Asia/Seoul`.
- 연주·월주는 절입 **날짜가 아닌 시각**으로 전환한다.
- MVP 자시 정책은 `sect-2`(조자시)다. 00:00~00:59는 해당 양력일로 계산한다.
- 1987~1988년 한국 DST는 KDT(UTC+10) 입력을 KST(UTC+9) 기준으로 1시간 환산해 계산한다. 시작 시 사라진 시간과 종료 시 중복 시간은 입력 UI에서 사용자 확인이 필요하다.
- `Myeongsik`은 원국 8글자, 오행, 십신, 지장간, 신살, 대운, 세운, 월운을 모두 포함하는 서비스 소유 JSON이다.
- 리포트는 제목/번호/섹션 카드 없이 자연스럽게 이어지는 에세이·편지이며, DB에는 문단 배열로 저장한다.
- 결제 웹훅과 서버 검증만 전체 리포트 생성의 트리거가 된다. 리포트는 `(sajuProfileId, productCode)`당 한 번만 생성한다.

## 바로 다음에 할 일 — Step 1

새 작업 브랜치를 `develop`에서 만들고, `docs/dev-steps/step-1-프로젝트-세팅-DB.md`를 기준으로 진행한다. 기존 Next.js 앱이 있으므로 프로젝트를 새로 만들기보다는 필요한 의존성·구조를 기존 저장소에 추가한다.

1. Prisma와 PostgreSQL(docker compose)을 추가하고, `.env.example`을 만든다. 실제 비밀값은 커밋하지 않는다.
2. `User`, `SajuProfile`, `Product`, `Order`, `Report` 모델과 enum·제약을 Prisma 스키마에 구현한다.
   - `Report(sajuProfileId, productCode)` unique
   - `Report.content`는 `{ paragraphs, meta }` 형태 JSON
   - 비로그인 입력을 위해 `SajuProfile.userId`는 nullable
3. `Product` seed에 `yearly_2026`(2026 운세) 1건을 넣는다.
4. `src/lib/saju/`에 `KoreanPolicyAdapter`와 `Myeongsik` 타입의 골격을 만든다.
   - Step 1에서는 입력 정규화·시간 정책·라이브러리 호출 경계를 만들고, 신살과 경도 보정의 실제 규칙은 별도 구현 항목으로 남긴다.
5. Prisma migration, seed, `npm run build`, 가능한 범위의 단위 테스트를 통과시킨 뒤 Step 1 결과를 문서화하고 하나의 커밋으로 `develop`에 머지·push한다.

## Step 1에서 주의할 점

- `lunar-javascript` 결과를 DB 스키마의 장기 계약으로 그대로 노출하지 않는다. 어댑터가 서비스 `Myeongsik` JSON으로 변환한다.
- 신살(도화·역마·형살 등)은 라이브러리 결과만 믿지 말고 한국식 규칙 테이블과 근거 값을 별도 설계해야 한다.
- 출생지 경도 보정의 적용 여부·규칙은 아직 미결정이다. 적용 전에는 UX와 계산 기준을 문서화해야 한다.
- 레거시 Supabase/Ablecity API를 새 구현에 끌고 가지 않는다. 기존 환경변수는 임시 배포를 위한 것이며, Step 1부터는 PostgreSQL/Prisma 기준이다.
- Step 6 문서는 아직 Oracle Cloud 전제다. 실제 배포는 Vercel이므로 후속 단계에서 Vercel 기준으로 다시 쓴다.

## 유용한 명령과 문서

```bash
npm run saju:spike
npm run saju:compare
npm run build
```

- Step 0 상세 결과: `docs/dev-steps/step-0-result.md`
- 다음 구현 명세: `docs/dev-steps/step-1-프로젝트-세팅-DB.md`
- Vercel·도메인·카카오의 현재 상태: `docs/deployment.md`
- 비교 fixture: `scripts/fixtures/sajuinfo-reference.json`
- 비교 스크립트: `scripts/saju-compare.cjs`

## 최근 커밋

- `c2453f2 test(saju): add external manseoryeok comparison fixtures`
- `886a03c feat(saju): add lunar calculation spike`
- `c414ef5 docs: 배포 구성 문서 추가 및 진행 상황 갱신`

