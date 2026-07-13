# 🍊 리뷰 매니저 AI

소상공인이 손님 리뷰를 붙여넣으면 감정 분석·키워드 추출·반복 문제 감지·답변 초안 3종을 제공하고, 리뷰마다 AI 점수를 매겨 총 분석·월별 통계까지 보여주는 리뷰 관리 도구입니다. (구 "리뷰 답변 도우미")

## 📄 관련 문서
- [기획서](https://github.com/rldbs5353/hub/wiki/기획서-작성)
- [개발 환경 / 컨벤션 (CLAUDE.md)](CLAUDE.md)
- [개발 Task / 4주 로드맵 (TASKS.md)](TASKS.md)

## 프로젝트 구성

- `review-assistant-react/` — 프론트엔드 (Vite + React)
- `review-assistant-server/` — 백엔드 (Express + `node:sqlite`)
