# SUBZIP
**구독 중인 서비스를 한눈에 파악하고, 그룹원들과 정산하는 서비스**

[기획서]
https://github.com/hyunjinch/hub/wiki/%5B%EA%B8%B0%ED%9A%8D%EC%84%9C%5D-SUBZIP-(%EA%B0%80%EC%A0%9C)

[개발 Task]
https://github.com/hyunjinch/hub/wiki/%EA%B0%9C%EB%B0%9C-Task

## 구조
- `frontend/` — React (Vite) 프론트엔드
- `backend/` — Express 백엔드
- `docs/` — 기획/디자인 문서

npm workspaces로 관리합니다. 루트에서 `npm install` 후 `npm run dev`를 실행하면 프론트/백엔드가 동시에 켜집니다.