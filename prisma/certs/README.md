# Supabase DB 인증서

공개 서버 root CA이며 개인 키나 DB 접속 비밀값이 아니다.

- 출처: 다봄 프로젝트의 Supabase Dashboard → Database → Settings → Download certificate
- 공식 다운로드 URL: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
- 확보일: 2026-10-13
- 발급자/이름: Supabase Root 2021 CA
- 유효기간: 2021-04-28 ~ 2031-04-26
- SHA-256 지문: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`

`prisma/client.cjs`는 이 CA의 지문·유효기간을 확인하고, 공식 `@prisma/adapter-pg`를 통해 TLS 1.2 이상·서버 인증서·호스트명을 검증한다. Channel binding도 켜져 있다. URL의 SSL 옵션은 driver에 넘기기 전에 제거해 강제 정책이 덮어써지지 않게 한다. 비밀번호·상점·API 키는 바꾸지 않는다.

Mac의 Prisma 기본 TLS 엔진은 현재 Supabase 풀러 인증서를 `OtherTrustValidityPeriod`/`ServerAuthEKU`로 거부했다. 앱과 검수 스크립트는 위 공식 어댑터로 동일한 TLS 정책을 사용한다. OS 전체 신뢰 저장소는 수정하지 않았다. Prisma CLI의 migration 엔진은 별개이므로 엄격한 CA 검증이 가능한 Linux/CI에서 실행한다. Mac 오류를 피하려고 검증을 끄면 안 된다.

CA 교체 시 공식 Dashboard의 새 파일과 지문을 함께 검토해 업데이트하고 `npm run security:tls` 및 실제 Production 빌드 검증을 통과시킨다.
