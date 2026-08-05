# AI 사주 서비스 — STEP 6: 프로덕션 배포

## 프로젝트 컨텍스트

AI 사주 MVP. Next.js 풀스택(standalone) + Prisma/PostgreSQL, 카카오 로그인, PortOne 결제까지 로컬에서 동작 중이다. Oracle Cloud Free VM에 배포한다.

## 작업 요청

1. Docker 구성
   - Next.js 프로덕션 Dockerfile (standalone 빌드)
   - docker-compose.prod.yml: app + postgres + nginx
   - Postgres 볼륨 영속화 + 일일 백업 크론(pg_dump, 7일 보관)

2. Nginx + HTTPS
   - 리버스 프록시, Let's Encrypt(certbot) 자동 갱신
   - 웹훅 경로(/api/webhooks/*) 접근 허용 확인

3. 환경 분리
   - 프로덕션 .env 체크리스트: DATABASE_URL, OPENAI_API_KEY, AUTH_SECRET, KAKAO_*, PORTONE_* — 각각 어디서 발급/변경해야 하는지 표로 정리
   - 카카오 리다이렉트 URI, PortOne 웹훅 URL을 프로덕션 도메인으로 등록하는 절차 안내

4. 운영 최소 장치
   - 헬스체크 엔드포인트 + 컨테이너 restart 정책
   - 리포트 생성 FAILED 발생 시 확인 방법(로그 위치, 간단한 조회 쿼리) 문서화
   - 배포 절차를 DEPLOY.md로 정리 (git pull → build → migrate → restart)

## 검증

- 프로덕션 도메인에서 입력→티저→로그인→테스트결제→리포트 E2E
- 서버 재부팅 후 자동 복구되는지 확인