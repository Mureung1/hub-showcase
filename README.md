# GameForge Agent

Unity 게임 개발을 지원하는 Multi-Agent 기반 AI 개발 지원 도구. 자세한 기획/설계는 [`docs/`](docs/) 참고.

## 실행

```
cd server && npm run dev   # http://localhost:4000
cd client && npm run dev   # http://localhost:5173
cd tools/analyzer && dotnet build && dotnet run -- <folder-path>
```

`server/.env.example`을 `server/.env`로 복사하고 값을 채운 뒤 실행합니다.

## 디렉토리 구조

```
client/                  React + Vite + TypeScript
  src/
    pages/               화면 단위 (RepoConnectPage, AnalysisReportPage, WorkspacePage, CommitReviewPage)
    components/          GithubLoginButton, RepoSelect, BranchSelect, AnalysisPresetPicker 등
    styles/              tokens.css(디자인 토큰) + base.css(공용 컴포넌트 스타일)
    lib/                 API_BASE_URL, 공유 타입(RepoSummary 등)

server/                  Express + TypeScript
  src/
    routes/              /api/auth, /api/repo, /api/analysis, /api/steps, /api/chat, /api/documents
    utils/                jsonStore(파일 mutex), paths, session, analyzer(dotnet spawn 래퍼)

tools/analyzer/          .NET 콘솔 앱 (Roslyn, Syntax 전용 파싱) — server가 child_process.spawn으로 실행

data/                    JSON 파일 저장소 (session.json은 git에서 제외됨 — access token 보관)
  project.json
  steps.json
  documents/ messages/ checklist/

docs/                    기획서, UI 설계, 제작계획, 주차별 작업 목록
.claude/skills/gameforge-ui-style/   디자인 시스템 스킬 (프로토타입에서 추출한 토큰/컴포넌트 규칙)
presentation/            발표 자료
```

## 1주차 진행 상황 (Day 1~5)

로그인(GitHub OAuth) → 저장소 선택 → Branch 선택 → 분석 프리셋 선택 → 분석 시작(더미 분석기 spawn 확인)까지 끊김 없이 동작. 실제 Roslyn 파싱/jscpd 연동은 2주차([`docs/GameForge_Agent_Week2_Tasks_Day6-10.md`](docs/GameForge_Agent_Week2_Tasks_Day6-10.md)) 작업.
