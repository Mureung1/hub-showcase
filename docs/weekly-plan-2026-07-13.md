# 2주차 계획: 2026-07-13 ~ 2026-07-17

## 목표

2주차 목표는 Agent를 활용해 계획과 검증 과정을 관리하면서, 핵심 기능 하나를 FE-BE-DB 수직 슬라이스로 끝까지 완성하는 것이다.

이번 주 수직 슬라이스는 `퀘스트 기록 저장·조회`다. 화면에서 퀘스트 완료/실패/복구를 실행하면 React가 요청을 보내고, Express API가 처리해 Supabase `quest_logs` 테이블에 저장한 뒤, 응답을 받아 기록 노트 화면이 갱신되어야 한다.

## 이번 주 완료 기준

- 계획 수립 Agent, 기능 검증 Agent, 문서 관리 Agent가 문서로 존재한다.
- 핵심 시나리오가 GitHub Issue 등록 단위로 쪼개져 있다.
- React 핵심 화면이 컴포넌트와 state로 동작한다.
- mock 데이터로 화면 흐름을 먼저 확인할 수 있다.
- Express API 라우트가 존재한다.
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

- [ ] 정적 HTML 화면을 React 컴포넌트 단위로 분해
- [ ] 기존 React에서 재사용할 상태 전이 로직 선별
- [ ] 미사용 확장 UI 흔적 제거 또는 보관
- [ ] `ruleBasedAgent.ts` 깨진 한글 정리
- [ ] 기록 노트가 mock quest log 배열을 표시하도록 정리
- [ ] 완료/실패/복구 이벤트가 mock 기록을 갱신하도록 연결

## 수요일: Express API와 Supabase 테이블

- [ ] Express 서버 구조 생성
- [ ] Supabase 클라이언트 연결 방식 작성
- [ ] `quest_logs` 테이블 필드 확정
- [ ] `POST /api/quest-logs` 구현
- [ ] `GET /api/quest-logs` 구현
- [ ] API 실패 응답 형식 정리
- [ ] API Key와 Supabase Key가 커밋되지 않도록 `.env` 기준 정리

## 목요일: FE-BE-DB 실제 연결

- [ ] React 완료 이벤트에서 `POST /api/quest-logs` 호출
- [ ] React 실패 이벤트에서 `POST /api/quest-logs` 호출
- [ ] React 복구 완료 이벤트에서 `POST /api/quest-logs` 호출
- [ ] 기록 노트가 `GET /api/quest-logs` 결과를 렌더링
- [ ] 저장 성공 시 화면 기록이 갱신됨
- [ ] API 실패 시 재시도 또는 안내 상태 표시

## 금요일: 검증·Issue·문서 정리

- [ ] 기능 검증 Agent로 수직 슬라이스 점검
- [ ] 첫 접속 -> 퀘스트 수락 -> 완료 -> 기록 저장 시나리오 확인
- [ ] 실패 -> 실패 이유 -> 복구 퀘스트 -> 기록 저장 시나리오 확인
- [ ] 새로고침 후 서버 기록 조회 확인
- [ ] `npm.cmd run build` 확인
- [ ] `status.md` 갱신
- [ ] `tasks.md` 상태 갱신
- [ ] PR 본문에 2주차 결과 반영

## 2주차 이후로 넘기는 항목

아래 항목은 2주차 수직 슬라이스가 끝난 뒤 3~4주차에 여유가 있으면 가져온다.

- React UI를 정적 HTML 수준으로 세부 개선
- 매니저 스프라이트와 XP 아이콘 에셋 교체
- 배경/창 테마 보상 기초 설계
- 주간 리포트
- 개인 LLM 문장화 실험
- 음성 입력 실험
- 공개 퀘스트 탐색 설계

## 이번 주 확장 고려사항

- 확장 기능은 구현하지 않지만 데이터 구조가 막히지 않게 둔다.
- 수정 전/후 퀘스트 데이터는 추후 Agent 개인화 후보 데이터로 저장할 수 있게 설계한다.
- 테마 보상은 P3 백로그로 유지한다.
- LLM, 음성, 웹캠, 소셜 기능은 visible UI에 넣지 않는다.