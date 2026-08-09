# AI 사주 서비스 — STEP 6: 프로덕션 배포

## 프로젝트 컨텍스트

AI 사주 MVP. Next.js 풀스택 + Prisma/PostgreSQL, 카카오 로그인, PortOne 결제까지 Vercel에 배포한다. 데이터베이스는 Docker/VM이나 새 서비스가 아니라 기존 Supabase 관리형 PostgreSQL을 사용한다.

## 작업 요청

1. Vercel + Supabase 연결
   - Supabase Connect에서 Transaction pooler URL과 Direct connection URL을 복사한다.
   - Vercel의 Production/Preview/Development에는 `pgbouncer=true`를 포함한 transaction-pooler `DATABASE_URL`을 저장한다. migration은 trusted machine에서 direct URL을 `DATABASE_URL`로 넘겨 실행한다.
   - Dockerfile, docker-compose, VM, Nginx, 서버 백업 크론은 만들지 않는다.

2. 환경 분리
   - 프로덕션 .env 체크리스트: DATABASE_URL, OPENAI_API_KEY, AUTH_SECRET, KAKAO_*, PORTONE_* — 각각 어디서 발급/변경해야 하는지 표로 정리
   - 카카오 리다이렉트 URI, PortOne 웹훅 URL을 프로덕션 도메인으로 등록하는 절차 안내

3. 운영 최소 장치
   - 헬스체크 엔드포인트 + Vercel 함수 로그 확인 경로
   - 리포트 생성 FAILED 발생 시 확인 방법(로그 위치, 간단한 조회 쿼리) 문서화
   - 배포 절차를 DEPLOY.md로 정리 (migration → Vercel deploy → E2E 확인)

## 검증

- 프로덕션 도메인에서 입력→명식 확인→로그인→테스트결제→리포트 E2E
- Vercel Production/Preview에서 환경변수가 분리되고 웹훅이 수신되는지 확인
