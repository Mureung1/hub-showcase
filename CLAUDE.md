# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요
- `FirstPR`: 오픈소스 레포 추천 에이전트 소개용 React 프론트엔드
- 현재는 프론트엔드만 존재하며, 추후 백엔드(API 서버)를 추가할 예정
- 기획 문서: [docs/plan.md](docs/plan.md)
- 작업 체크리스트: [docs/checklist.md](docs/checklist.md)

## 기술 스택
### Frontend
- React 19 + Vite
- Lint: oxlint

### Backend (예정, 미착수)
- Node.js + Express
- DB: 미정 (MVP는 MongoDB 검토 중, 관계가 복잡해지면 PostgreSQL 전환 고려)

## 명령어
- `npm run dev` — 개발 서버 실행
- `npm run build` — 빌드
- `npm run preview` — 빌드 결과 미리보기
- `npm run lint` — 린트 검사

## 디렉토리 구조
- `src/App.jsx` — 앱 엔트리 컴포넌트
- `src/components/` — UI 컴포넌트 (`ProjectIntro`, `HeroIllustration`, `icons` 등)
- `docs/` — 기획서, 체크리스트 등 프로젝트 문서

## 작업 시 참고사항
- 백엔드가 추가되면 이 파일에 백엔드 스택/명령어/디렉토리 구조를 함께 갱신할 것
- 새 컴포넌트는 `src/components/`에 추가하고 필요한 경우에만 분리
