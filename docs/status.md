# 현재 진행 상황

마지막 갱신: 2026-07-14

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
- 최신 작업은 문서 변경 중심이라 빌드 검증은 수행하지 않음
- 하네스 구조 검증 통과: `powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- TOML 파싱 검증 통과: `.codex/config.toml`, `.codex/agents/*.toml`
- TypeScript 검증 통과: `npm.cmd run typecheck`
- 프로덕션 빌드 통과: `npm.cmd run build`
- 2026-07-14 하네스 감사 재검증 통과: `powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1`
- 2026-07-14 TypeScript 재검증 통과: `npm.cmd run typecheck`
- 2026-07-14 프로덕션 빌드 재검증 통과: `npm.cmd run build`
- 2026-07-14 React 핵심 화면/mock 기록 흐름 TypeScript 검증 통과: `npm.cmd run typecheck`
- 로컬 skill 설치 확인: Superpowers, 하네스 workflow skills, `project-learning-agent`
- React 화면은 정적 HTML과 시각 차이가 있어 개선 필요

## 다음 작업

- `quest_logs` 데이터 속성 확정
- `POST /api/quest-logs`, `GET /api/quest-logs` API 계약 작성
- Express + Supabase 연결 구조 설계
- 정적 HTML 화면을 React 컴포넌트 단위로 추가 분해
- React 핵심 상태 전이 로직을 학습용 컴포넌트 분리 단위로 재정리
- GitHub Project에 Issue 등록
- GitHub Issue 등록
- `docs/notion-dashboard-guide.md`는 오래된 문서이므로 공식 흐름에서 제외 상태 유지
- 오래된 계획 문서에 남아 있는 Notion 기준 표현은 역사 문맥인지 현재 기준인지 정리 필요

## 차단 요소

- GitHub Issue 실제 생성은 사용자가 직접 하거나 별도 승인 필요
- Supabase Key와 API Key는 저장소에 넣지 않아야 함
- GitHub Wiki는 코드 PR에 포함되지 않아 별도 동기화 필요
- 현재 하네스 파일 다수가 아직 untracked/modified 상태이므로, 승인 후 의도한 파일만 stage/commit 필요
