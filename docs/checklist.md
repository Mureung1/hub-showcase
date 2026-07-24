# 작업 분해 — TideNote (3주차: 기능 강화 + 테스트 + 아키텍처 문서)

[TideNote 기획서](https://github.com/snael0510-coder/hub/wiki/TideNote-%EA%B8%B0%ED%9A%8D%EC%84%9C)의 핵심 기능을 이번 주 목표에 맞춰 작업 단위로 쪼갠 목록.
2주차 작업 분해는 git 이력 참고 (`docs/backlog.md` 0번 항목에 요약).

## 테스트 인프라
- [x] Vitest 설치·설정 (`vite.config.js`에 test 옵션 추가)
- [x] React 컴포넌트 테스트용 `@testing-library/react` 설치
- [x] `npm test` 스크립트 추가

## TDD — "오늘 체크인 여부" 로직
- [x] 테스트 먼저 작성: `hasCheckedInToday(lastCheck)` — 오늘 날짜의 기록이면 true, 아니면 false → `src/hasCheckedInToday.test.js` (7개 케이스)
- [x] 테스트 실패 확인(RED) — 스텁이 항상 false를 반환해 "true여야 하는" 케이스 3개 실패 확인
- [x] 최소 구현으로 테스트 통과(GREEN) — 7/7 통과
- [x] `TideCheck.jsx`에 연결 — 이미 체크인했으면 슬라이더 폼 대신 완료 화면부터 보여주기
- [x] 리팩터링 — 함수가 단순해 추가 정리 없음

## 에러 처리 강화
- [x] GET `/api/tide-checks/latest` 실패 시 화면에 안내 문구 표시 (404는 정상 케이스로 제외)
- [x] POST 실패 시 재시도 버튼 제공 (Submit 버튼이 에러 상태에서 "다시 시도"로 전환)
- [x] 서버 자체가 안 떠 있을 때(네트워크 에러)와 API가 4xx/5xx를 준 경우를 구분해서 메시지 다르게 — 서버 끄고 직접 재현해서 검증

## 아키텍처 다이어그램
- [x] mermaid로 화면(React) → 서버(Express) → DB(Supabase) 흐름 그리기
- [x] README에 삽입
- [x] 설명하며 발견한 gap 기록 (Episodes/ChatView는 아직 mock, TideCheck만 실제 DB 연결) — 오늘 그룹 세션에서 이 그림으로 직접 설명

## Agent 산출물
- [x] 테스트코드 생성 Skill 문서 작성 → `.claude/skills/tidenote-test-writer/SKILL.md`
- [x] 코드 검증 Agent 문서 작성 → `docs/agents/code-verification-agent.md` — 기능 검증 Agent와 역할 구분 표 포함
- [x] 코드 검증 Agent로 이번 주 작업 실제 점검, 로그 기록 (🔴 없음, 🟡 1건 기록)
- [x] 나만의 개발 워크플로우 문서화 → [docs/workflow.md](workflow.md)

## 검증
- [x] TDD로 만든 기능 테스트 통과 확인 (`npm test`) — 7/7 pass
- [x] 코드 검증 Agent로 전체 점검
