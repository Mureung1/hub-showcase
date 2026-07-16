# 냉장고 레시피 앱 (fridge-recipe-app)

자취생을 위한 냉장고 재고 관리 + 레시피 추천 웹 서비스. `frontend/`(React + Vite)와 `backend/`(Express)로 구성된 풀스택 프로젝트입니다.

## 문서

- [제품 명세](docs/product.md) — 페르소나·문제정의·MVP 범위·화면별 기능 정리 (`기획서.md`+`화면-기능-정리.md` 통합)
- [API & 기술 명세](docs/api.md) — 엔드포인트 계약, DB 스키마, Supabase 마이그레이션 (`api-design.md` 등 통합)
- [알고리즘 설계](docs/algorithms.md) — 식단 추천·장보기 최적화 알고리즘
- [백로그](docs/backlog.md) — 완료 작업 요약, 남은 작업, Day별 진행 기록(현재 9일차)
- [2주차 계획수립](docs/2주차%20계획수립.md) — Day 1~10 초기 로드맵(참고용 — 최신 진행 상황은 backlog.md 참고)

## 개발 계획 / 로드맵

9일차(2026-07-16)까지 진행되었습니다. 현재 진행 중인 작업과 우선순위는 GitHub Issues에서 관리합니다.

- 📋 **[통합 개발 백로그 (#19)](https://github.com/baejh3333-del/hub/issues/19)** — 진행 중 / 다음 작업 / 백로그로 정리된 전체 작업 체크리스트
- 🗂 **[전체 이슈 목록](https://github.com/baejh3333-del/hub/issues)** — 각 작업의 상세 구현 가이드(현재 상태 · 구현 방향 · 주의할 점 · 테스트 방법)

## 시작하기

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && npm install && npm run dev
```

자세한 명령어와 아키텍처 설명은 [CLAUDE.md](CLAUDE.md)를 참고하세요.
