# GameForge Agent

Unity 게임 개발을 지원하는 Multi-Agent 기반 AI 개발 지원 도구. 프로젝트 전체 Context를 Markdown으로 유지하며, 9단계 워터폴 워크플로우(요구사항 분석 → 게임 기획 → 게임 시스템 설계 → 클래스 설계 → 프로젝트 구조 설계 → ScriptableObject 설계 → 코드 생성 → 리팩토링 및 코드 리뷰 → 문서화)를 순서대로 진행한다.

## 기술 스택

- **Client**: React + Vite + TypeScript (`client/`)
- **Server**: Node.js + Express + TypeScript (`server/`)
- **데이터 저장**: 별도 DB 없이 `server/data/*.json` 파일 직접 읽기/쓰기
- **인증**: GitHub OAuth App (Authorization Code Flow) — PAT 방식 아님
- **AI**: Google Gen AI SDK (`@google/genai`, Gemini) — 2주차 Day7에 Claude에서 전환됨
- **코드 분석**: `tools/analyzer/` 의 .NET 콘솔 앱 (Roslyn, `Microsoft.CodeAnalysis.CSharp`, Syntax 전용 파싱). server가 `child_process.spawn`으로 실행
- **중복 코드 탐지**: `jscpd`

## 디렉토리 구조

```
client/          React 앱
server/
  routes/        /api/auth, /api/repo, /api/analysis, /api/steps, /api/chat, /api/documents
  data/           프로젝트/스텝/문서/메시지 JSON 저장소
tools/analyzer/  Roslyn 기반 .NET 콘솔 앱
docs/            기획서, UI 설계, 제작계획, 주차별 작업 목록 (아래 "문서" 참고)
.claude/skills/gameforge-ui-style/  디자인 시스템 스킬 (토큰/컴포넌트 규칙 + 참고 프로토타입)
```

## 명령어

- Client 실행: `cd client && npm run dev`
- Server 실행: `cd server && npm run dev`
- 분석기 빌드/실행: `cd tools/analyzer && dotnet build` / `dotnet run`
- .NET SDK 설치 여부: `dotnet --version` (없으면 분석 관련 작업 진행 불가 — 사용자에게 먼저 안내)

## 문서 (필요할 때 열어서 참고, 항상 로드하지 않음)

- `docs/GameForge_Agent.md` — 전체 기획서, Agent 역할, 승인 프로세스
- `docs/GameForge_Agent_UI_Spec.md` — 화면별 UI/인터랙션 설계
- `docs/GameForge_Agent_Dev_Plan.md` — 기술 스택 상세, 데이터 모델, 4주 마일스톤, 리스크
- `docs/GameForge_Agent_Week1_Tasks.md` — 이번 주 Day 단위 작업 목록 (이 문서는 자주 바뀜 — 작업 시작 전 항상 최신본 확인)

## 작업 규칙

- **범위를 벗어나지 않기**: 지시받은 Day/작업 범위 밖의 결정(DB 스키마 변경, 인증 방식 변경 등)이 필요해지면 진행하지 말고 먼저 물어볼 것
- **커밋 단위**: 코드 생성/리팩토링 산출물은 파일 단위 원자적 커밋으로 분리 (`docs/GameForge_Agent.md` 9절 참고) — 한 커밋에 무관한 변경을 섞지 않는다
- **디자인**: UI 컴포넌트 작업 시 `.claude/skills/gameforge-ui-style` 스킬의 토큰/컴포넌트 규칙을 따른다 (임의로 새 색상·폰트 추가하지 않음)
- **GitHub 인증**: PAT 입력 방식으로 되돌리지 않는다 — OAuth 로그인 플로우 유지
- **워크플로우 순서**: 9단계 순서를 건너뛰는 UI/API를 만들지 않는다 (완료/진행중 단계만 접근 가능, pending은 잠금)
- **분석 정확도**: Roslyn 분석은 Syntax 전용(컴파일 없음)이라는 한계를 리포트 문구에서 과장하지 않는다

## 완료 확인

작업이 끝나면 해당 Day/작업 항목에 적힌 "완료 기준"을 기준으로 스스로 점검하고, 결과를 요약해서 보고할 것.
