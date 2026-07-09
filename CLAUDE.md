## 프로젝트
채용공고 기반 대학생 진로탐색 리서치 에이전트. 관심 직무 입력 → 요구역량 분석 → 학습 로드맵 제공.

## 기술 스택
- Frontend: React + Vite, JavaScript(.jsx) — `src/`
- Backend: Express — `server/` (독립 `package.json`, product 전용)
- 향후 검토(미설치, 기능 확정 시 설치): 에이전트 오케스트레이션(LangGraph/LangChain 후보), DB(SQLite/Postgres 후보)

## 폴더 구조
- `src/internal/project-intro/` — 소개 페이지(React). 실제 서비스와 별개 산출물.
- `prototype/` — 1주차 정적 HTML/CSS 프로토타입. 더 이상 기능 확장 안 함, 수정만.
- `src/product/` — 실제 서비스 React 코드.
- `server/` — Express 백엔드. product 전용, `src/`와 별개 실행환경.
- `src/shared/` — 2개 이상 기능에서 실제로 재사용할 때만 생성. 미리 만들지 않음.

## 컨벤션
- 커밋: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- 브랜치: `day/YYMMDD` (그날 작업 전체를 담는 브랜치, 설명 접미사 없음. 무엇을 했는지는 커밋/PR 본문에 기록)
- PR: upstream의 `N086_박주현` 브랜치로 PR (main 아님). 타이틀 `[N086_박주현] - 요약`

## Claude 작업 방식 (세션이 바뀌어도 유지)
- 사용자는 웹 개발이 처음이다. 새 파일/폴더 위치를 정할 때 어디에 왜 두는지 짧게 설명한다.
- 터미널·git 명령어는 Claude가 실행하지 않고, 사용자가 직접 실행하도록 순서대로 명령어만 제시한다.
- 파일 생성·수정은 Claude가 직접 한다. 단 삭제·이동·rename은 Claude의 샌드박스 권한상 실행할 수 없으므로, 실행할 명령어를 함께 제시해 사용자가 직접 실행하게 한다.

## 참고
- 기획서: @docs/plan.md
- 설계: @docs/architecture.md
- 디자인 컨셉: @docs/design-concept.md
- 체크리스트: @docs/checklist.md
