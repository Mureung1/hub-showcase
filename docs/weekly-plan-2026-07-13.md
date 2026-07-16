# 2주차 계획: 2026-07-13 ~ 2026-07-17

## 목표

2주차 목표는 Agent를 활용해 계획과 검증 과정을 관리하면서, 핵심 기능 하나를 FE-BE-DB 수직 슬라이스로 끝까지 완성하는 것이다.

이번 주 수직 슬라이스는 `Quest Event 저장·조회`다. 화면에서 퀘스트 완료/실패/복구를 실행하면 React가 요청을 보내고, Hono API가 처리해 server-side mock store 또는 Supabase `quest_logs` 테이블에 저장한 뒤, 응답을 받아 기록 노트와 Lumi 상태가 갱신되어야 한다.

## 이번 주 완료 기준

- 계획 수립 Agent, 기능 검증 Agent, 문서 관리 Agent가 문서로 존재한다.
- 핵심 시나리오가 GitHub Issue 등록 단위로 쪼개져 있다.
- React 핵심 화면이 컴포넌트와 state로 동작한다.
- mock 데이터로 화면 흐름을 먼저 확인할 수 있다.
- Hono API 라우트가 존재한다.
- Supabase 한 테이블에 퀘스트 기록을 저장하고 조회한다.
- 프론트엔드가 백엔드 API와 실제로 연결된다.
- 기능 검증 Agent 기준으로 수동 시나리오를 점검한다.

## 월요일: 계획·Agent·백로그 확정

- [x] `planning-agent.md` 작성
- [x] `verification-agent.md` 작성
- [x] `document-management-agent.md` 작성
- [x] `agent-usage-guide.md` 작성
- [x] `master-plan.md` 작성
- [x] `today-plan-2026-07-13.md` 작성
- [x] `notion-dashboard-guide.md` 작성
- [x] `tasks.md`를 Notion/GitHub Issue 단위로 재정렬
- [x] README와 docs 허브 링크 갱신
- [ ] GitHub Issue 등록
- [ ] Notion 대시보드에 Task 등록

## 화요일: React 핵심 화면과 mock 흐름

- [ ] 정적 HTML 화면을 React 파일 단위 컴포넌트로 추가 분리
- [x] 기존 React에서 재사용할 상태 전이 로직 선별
- [x] 미사용 확장 UI 흔적 제거 또는 보관
- [x] `ruleBasedAgent.ts` 깨진 한글 정리
- [x] 기록 노트가 mock quest log 배열을 표시하도록 정리
- [x] 완료/실패/복구 이벤트가 mock 기록을 갱신하도록 연결

## 수요일: Hono API와 Supabase 테이블

- [x] Hono 서버 구조 생성
- [x] Supabase REST 연결 방식 작성
- [x] `quest_logs` 테이블 필드 확정
- [x] `POST /api/quest-events` 구현
- [x] `GET /api/quest-events` 구현
- [x] `GET /api/manager-context` 구현
- [x] API 실패 응답 형식 정리
- [x] API Key와 Supabase Key가 커밋되지 않도록 `.env` 기준 정리

## 목요일: FE-BE-DB 실제 연결

- [x] React 완료 이벤트에서 `POST /api/quest-events` 호출
- [x] React 실패 이벤트에서 `POST /api/quest-events` 호출
- [x] React 복구 완료 이벤트에서 `POST /api/quest-events` 호출
- [x] 기록 노트가 `GET /api/quest-events` 결과를 렌더링
- [x] 저장 성공 시 서버 응답 기반으로 화면 기록이 갱신됨
- [x] API 실패 시 안내 상태 표시
- [ ] Supabase 실제 프로젝트 연결 후 새로고침 조회 검증

## 금요일: 검증·Issue·문서 정리

- [x] 기능 검증 Agent로 수직 슬라이스 점검
- [x] 첫 접속 -> 퀘스트 수락 -> 완료 -> 기록 저장 시나리오 확인
- [x] 실패 -> 실패 이유 -> 복구 퀘스트 -> 기록 저장 시나리오 확인
- [ ] Supabase 연결 후 새로고침 서버 기록 조회 확인
- [x] `npm.cmd run typecheck`, `npm.cmd run typecheck:server`, `npm.cmd run build` 확인
- [x] `status.md` 갱신
- [x] `tasks.md` 상태 갱신
- [ ] PR 본문에 2주차 결과 반영

## 2주차 이후로 넘기는 항목

아래 항목은 2주차 수직 슬라이스가 끝난 뒤 3~4주차 구현 계획으로 승격한다.

- React UI를 정적 HTML 수준으로 세부 개선
- 매니저 스프라이트와 XP 아이콘 에셋 교체
- 캐릭터 애니메이션, hover/reaction icon 상태 적용
- 외적 성장, 데스크톱 배경 테마, 창 테마, 기억 조각, 사운드 보상 prototype
- 시간대별 web theme 적용
- 주간 리포트
- 개인 LLM 매니저가 읽을 manager context 설계
- 공개 퀘스트 탐색 설계
- 현실 픽셀화 TV 기술 검토
- 웹캠 손 제스처 탐색 기술 검토

## 이번 주 확장 고려사항

- 확장 기능은 데이터와 에셋 구조부터 구현하고, 실제 UI는 동작 가능한 범위만 노출한다.
- 수정 전/후 퀘스트 데이터는 추후 Agent 개인화 후보 데이터로 저장할 수 있게 설계한다.
- 테마 보상은 P3 백로그로 유지한다.
- LLM, 음성, 웹캠, 소셜 기능은 visible UI에 넣지 않는다.
