# Bridge — Claude 작업 지시서

## 프로젝트 개요
편지 기반 익명 연결 플랫폼. 글을 통해 사람과 연결되는 웹 서비스.

## 기술 스택 (설치 기준)
- Frontend (`frontend/`): React 19 + Vite 8, react-router-dom 7, ESLint 10. CSS Modules, ESM.
- Backend (`backend/`): Express 5, dotenv, cors, morgan. ESM.
- 루트 package.json 없음 — frontend·backend 각각 독립 설치.
- Prisma·Supabase·zod·@anthropic-ai/sdk 등은 계획 단계(미설치). 도입 시 승인 필요.

## 자주 쓰는 명령어
- Frontend: `cd frontend && npm run dev` · `npm run lint` · `npm run build`
- Backend: `cd backend && npm run dev`

## 폴더 구조
- `frontend/src/pages` — 화면 / `components` — 공용 UI / `state` — 상태 / `lib` — 유틸 / `data` — 목데이터 / `styles` — 토큰·전역 CSS / `assets`
- `backend/src/index.js` — Express 서버 진입점 (현재 `/api/health`만)
- `docs/` — `plan.md`(계획), `backlog.md`(백로그)
- `.claude/skills/bridge-design` — 디자인 시스템 규칙 / `.claude/commands/feature-slice.md` — 슬래시 명령
- `.github/workflows/` — 위키 자동 동기화

## 코딩 컨벤션
- ESM(`import`/`export`)만 사용.
- 컴포넌트 스타일은 CSS Modules(`*.module.css`).
- 코드 주석·UI 문구는 한국어.
- 새 코드는 주변 파일의 네이밍·스타일을 따른다.

## Git & GitHub 규칙
- 주최측 레포를 포크한 `bovoZhang/hub`에서 작업. 항상 `work` 브랜치에서 작업하며, `main`에 직접 커밋하지 않는다.
- 커밋 메시지 형식: `type: 한글 요약` (feat/fix/docs/chore/refactor/ci).
- 커밋: Claude가 메시지 초안을 제안 → 내가 확정 → 확정된 메시지로 commit만 실행한다.
- push는 별도 지시가 있을 때만 실행한다. 커밋을 확정했다고 자동으로 push하지 않는다.
- PR은 내가 직접 만든다. Claude는 `gh pr create`를 실행하지 않는다.
- 이슈는 반드시 `bovoZhang/hub`에만 등록한다. upstream에는 절대 등록하지 않는다.
  - `gh issue` 명령은 항상 `--repo bovoZhang/hub`를 명시할 것.
- `.github/` 폴더 관련 변경은 어떤 경우에도 커밋하지 않는다. PR 제출 시 문제가 생기기 때문. 수정·삭제가 필요해도 작업 트리에만 반영하고 git add/commit 대상에서 제외한다.

## Secret 관리 규칙
- `.env`, API 키, 토큰, 비밀번호 등 secret은 어떤 경우에도 채팅·커밋·코드·로그에 노출하지 않는다.
- `.env` 값을 읽어서 출력하거나 요약하지 않는다. 키 이름(예: `DATABASE_URL`)만 언급한다.
- secret은 항상 `.env`에 두고, 코드에서는 `process.env.KEY_NAME`으로만 참조한다. 하드코딩 금지.
- `.env`가 `.gitignore`에 포함되어 있는지 커밋 전에 확인한다. 없으면 커밋을 멈추고 알린다.
- 새 환경변수가 필요하면 `.env.example`에 키 이름과 설명만 추가하고, 실제 값은 내가 직접 넣는다.
- 커밋 전 `git status`와 `git diff --staged`로 스테이징된 파일을 확인하고 나에게 보여준다. `git add .` 대신 변경 파일을 명시적으로 지정한다.

## 작업 방식 규칙
- 파일·폴더를 새로 만들기 전에 (1) 왜 필요한지 (2) 각 파일의 역할을 항목당 1~2문장으로 설명하고 승인을 받는다. 처음 나오는 전문 용어는 괄호로 한 번 풀어준다.
- 새 라이브러리·패키지 설치 전에도 같은 방식으로 이유를 설명하고 승인을 받는다.
- 사용자는 학습 중인 학생이다. 혼자 다 처리하지 말고, 무엇을 왜 하는지 따라올 수 있게 진행한다.
- 요청하지 않은 기능을 임의로 추가하지 않는다.
- 요청한 작업과 무관한 파일은 수정하지 않는다. 개선점이 보이면 고치지 말고 말로만 알린다.

## 하지 말아야 할 것
- `main` 직접 커밋 / 지시 없는 push / `gh pr create` / upstream 이슈 등록.
- `.env` 값 노출 / `git add .` / secret 하드코딩.
- 요청하지 않은 기능·파일·라이브러리 추가.
- `.github/` 관련 변경 커밋.

## /clear 타이밍 가이드
컨텍스트만 삭제되고 코드·CLAUDE.md·메모리는 유지된다. 아래 시점에 대화 말미에서 `/clear`를 제안:
- 마일스톤(기능 하나) 완료·동작 확인 후
- 대화가 길어져 앞 내용 참조가 어려울 때
- 작업 맥락 전환 시 (기획↔구현, 프론트↔백엔드)
- 같은 오류로 3회 이상 반복 수정 시
