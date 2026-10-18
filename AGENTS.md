<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 화면 리뷰 리포트

- 화면 리포트의 개별 스크린샷은 기본 표시 너비를 560px로 설정하고 원본 종횡비를 유지한다. 좁은 문서 패널에서는 사용 가능한 너비에 맞춘다.
- ChatGPT Page에는 이미지마다 명시적인 표시 크기를 저장한다. 긴 화면도 높이에 맞춰 작은 썸네일로 축소하지 않고, 큰 너비로 세로 스크롤하며 읽도록 배치한다.
- 여러 화면을 모은 작은 이미지 한 장으로 개별 스크린샷을 대체하지 않는다. 각 화면 아래에는 빈 수정 사항 영역을 유지한다.
