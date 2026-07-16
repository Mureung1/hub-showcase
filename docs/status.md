# 현재 진행 상황

마지막 갱신: 2026-07-16

## 완료

- 문서형 Agent를 Codex skill로 변환: project-planning-agent, project-verification-agent, project-document-manager
- 학습 정리용 repo-side Codex skill 추가: project-learning-agent
- Codex 하네스 Recommended안 구축: `.codex/agents`, `.agents/skills`, `docs/wiki`, `scripts/verify-harness.ps1`, 완료 계획 문서 추가
- Superpowers와 프로젝트 workflow skills를 `C:\Users\sun99\.codex\skills`에 설치하여 다음 턴/새 세션에서 자동 발견 가능하도록 구성
- Codex 하네스 감사 후 최소 수정: TOML/config 정책 검사 강화, Wiki `source_paths` 검증 범위 수정, 운영 workflow와 5개 eval 시나리오를 Wiki synthesis로 정착

- React + Vite + TypeScript 프로젝트 구성
- XP 데스크톱형 정적 프로토타입 구현
- Profile Setup Wizard, QuestRunner.exe, 실패 이유, 복구 퀘스트, 매니저, 기록 노트 정적 시연 흐름 구성
- React 버전의 프로필, 퀘스트, 완료/실패/복구, 창 열기/닫기/드래그 기본 로직 구현
- React flow/state를 정적 HTML 기준에 맞게 정리: 첫 접속 Profile Setup Wizard, 기본 열린 창, 완료 후 기록 노트 자동 열림 방지, 완료 퀘스트 재실행 방지, 실패/복구 흐름 유지
- React 기록 흐름 연결: 완료/실패/복구 이벤트가 기록 목록과 매니저 상태를 갱신하고, 기록 노트는 사용자가 열 때만 렌더링
- Hono 기반 `/api/quest-events`, `/api/manager-context` 추가: 완료/실패/복구 Quest Event를 server-side mock store 또는 Supabase store에 저장하고 manager context를 React 기록 노트/Lumi 상태에 반영
- Vite local middleware로 `/api/*` 요청을 Hono app에 연결
- Supabase 준비 문서와 migration 추가: `.env.example`, `docs/environment-setup.md`, `docs/supabase-setup.md`, `supabase/migrations/001_create_quest_logs.sql`
- 2주차 발표 자료 생성 및 핵심 작업 1 슬라이드 정정: `outputs/week2-progress-report.pptx`, `outputs/week2-progress-report-core1-revised.pptx`
- 2026-07-14 React 핵심 화면과 mock 기록 흐름 정리: Profile Setup Wizard, XP 데스크톱, QuestRunner.exe, 실패/복구, 기록 노트의 `useState` 기반 흐름을 읽기 쉬운 한글 상태로 정리
- `src/data/quests.ts`, `src/layers/agent/ruleBasedAgent.ts`의 깨진 한글 mock/Agent 문구 정리
- 문서를 역할별 `docs/` 구조로 분리
- MVP 이후 확장 계획 문서화
- 저장소 작업 규칙 `AGENTS.md` 작성
- `concept.png` 기반 XP 디자인 시스템과 CSS 토큰 문서 작성
- 에셋 생성 프롬프트 구조화
- 문서 관계를 설명하는 `docs/project-knowledge-map.md` 추가
- 계획 수립 Agent 문서 작성
- 기능 검증 Agent 문서 작성
- 문서 관리 Agent 문서 작성
- Agent 사용 가이드 작성
- 7월 30일 최종 로드맵 작성
- 2주차 계획과 오늘 계획 작성
- GitHub Project 운영 가이드 작성
- 개발 Task 백로그를 GitHub Issues/Projects 등록 단위로 재정렬

## 검증

- 정적 미리보기 URL: http://localhost:5173/prototype-static.html
- 파일 직접 열기 경로: file:///D:/2026.1/AIAgentChallenge/hub/public/prototype-static.html
- 초기 문서 작업 당시에는 빌드 검증을 수행하지 않았고, 이후 React/Hono 작업에서는 별도 검증을 수행함
- 하네스 구조 검증 통과: `powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- TOML 파싱 검증 통과: `.codex/config.toml`, `.codex/agents/*.toml`
- TypeScript 검증 통과: `npm.cmd run typecheck`
- 프로덕션 빌드 통과: `npm.cmd run build`
- 2026-07-14 하네스 감사 재검증 통과: `powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- 2026-07-14 TypeScript 재검증 통과: `npm.cmd run typecheck`
- 2026-07-14 프로덕션 빌드 재검증 통과: `npm.cmd run build`
- 2026-07-14 React 핵심 화면/mock 기록 흐름 TypeScript 검증 통과: `npm.cmd run typecheck`
- 2026-07-16 Hono Quest Event 수직 슬라이스 검증 통과: `npm.cmd run typecheck`, `npm.cmd run typecheck:server`, Vite dev middleware HTTP smoke test
- 2026-07-16 프로덕션 빌드 검증 통과: `npm.cmd run build`
- 2026-07-16 로컬 dev 서버 확인: `npm.cmd run dev -- --host 127.0.0.1 --port 4175`, `/api/health` 응답 `{"ok":true}`
- 2026-07-16 발표 자료 overflow 검증 통과: `slides_test.py`
- 2026-07-16 수직 슬라이스 검증 보강 통과: `npm.cmd run typecheck`, `npm.cmd run typecheck:server`, `npm.cmd run build`, `powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- 2026-07-16 `/api/health`가 Hono API storage mode를 반환하도록 보강: Supabase env가 없으면 `memory`, 실제 env가 있으면 `supabase`로 확인 가능
- 로컬 skill 설치 확인: Superpowers, 하네스 workflow skills, `project-learning-agent`
- React 화면은 정적 HTML 기준으로 큰 flow/state 차이는 줄였고, 남은 시각 차이는 사용자가 직접 화면을 보며 추가 점검 예정

## 다음 작업

- Supabase 프로젝트에서 `quest_logs` 테이블을 Quest Event 스키마로 생성
- 로컬 `.env`에 실제 Supabase 값을 넣고 `/api/quest-events`, `/api/manager-context` 실 DB 저장/조회 검증
- React 화면을 `WindowFrame`, `ProfileWizard`, `DesktopShell`, `QuestWindow`, `ManagerWindow`, `JournalWindow` 파일 단위로 추가 분리
- React 핵심 상태 전이 로직을 학습용 컴포넌트 분리 단위로 재정리
- 기록 노트 API 로딩/빈 상태/실패 상태 polish
- 정적 HTML 기준으로 남은 UI 시각 차이 수동 점검 및 우선순위화
- 승격된 확장 기능의 asset/data manifest 설계: 개인화 AI 매니저, 하루 흐름 web theme, 현실 픽셀화 TV, 공개 퀘스트 탐색, 웹캠 손 제스처, 캐릭터 애니메이션, 외적 성장, 배경/창 테마, 기억 조각, 사운드
- 다음 에셋 제작 세션에서 `docs/dynamic-asset-requirements.md` 기준으로 sprite, icon, theme, reward, sound asset을 생성
- GitHub Project에 Issue 등록
- GitHub Issue 등록
- `docs/notion-dashboard-guide.md`는 오래된 문서이므로 공식 흐름에서 제외 상태 유지
- 오래된 계획 문서에 남아 있는 Notion 기준 표현은 역사 문맥인지 현재 기준인지 정리 필요

## 차단 요소

- GitHub Issue 실제 생성은 사용자가 직접 하거나 별도 승인 필요
- Supabase Key와 API Key는 저장소에 넣지 않아야 하며, `.env`에는 로컬 실제 값만 둬야 함
- 현재 Supabase env가 없으면 서버는 memory store를 사용하므로 서버 재시작 시 기록이 사라짐
- 실제 DB 영속성 완료 판단은 Supabase 프로젝트 생성과 migration 실행 후 가능
- 현재 PowerShell 환경에 `Path`/`PATH` 중복이 있어 `Start-Process` 기반 자동 dev-server smoke test는 실패할 수 있음. 수동 브라우저 검증 또는 깨끗한 shell에서 `npm.cmd run dev`로 확인 필요
- GitHub Wiki는 코드 PR에 포함되지 않아 별도 동기화 필요
- 현재 하네스 파일 다수가 아직 untracked/modified 상태이므로, 승인 후 의도한 파일만 stage/commit 필요
