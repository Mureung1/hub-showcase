# 4주 개발 계획

## Summary

이 문서는 2026년 7월 10일부터 7월 30일까지의 일정표다. 전체 작업 목록은 `tasks.md`에서 관리하고, 이 문서는 주차별 목표와 대표 산출물만 관리한다.

## 1주차: 7월 10일까지

목표: 기획과 시각 프로토타입을 완성하고 문서 구조를 만든다.

- [x] 프로젝트 기획서 정리
- [x] 사용자 흐름과 와이어프레임 정리
- [x] HTML/CSS/JS 정적 동작 프로토타입 제작
- [x] XP 디자인 시스템 작성
- [x] 에셋 프롬프트 구조화
- [x] 문서 허브와 프로젝트 지식 지도 작성
- [x] Codex skill 문서화 버전 추가

대표 산출물:

- `public/prototype-static.html`
- `docs/design-system.md`
- `docs/project-knowledge-map.md`
- `docs/codex-skills/`

## 2주차: 7월 17일까지

목표: 계획 수립/검증 Agent와 백로그 체계를 만들고 FE/BE/DB 수직 슬라이스를 설계·구현한다.

- [x] 계획 수립 Agent 문서 작성
- [x] 기능 검증 Agent 문서 작성
- [x] 7월 30일 최종 로드맵 작성
- [x] 2주차 계획과 오늘 계획 작성
- [x] Notion 대시보드 가이드 작성
- [x] GitHub Issue 등록용 Task 백로그 재정렬
- [x] `quest_logs` 데이터 속성 확정
- [x] `POST /api/quest-events` 계약 작성
- [x] `GET /api/quest-events` 계약 작성
- [x] `GET /api/manager-context` 계약 작성
- [ ] React 개선 범위와 컴포넌트 분해안 확정
- [x] Hono + Supabase 연결 준비

대표 산출물:

- `docs/planning-agent.md`
- `docs/verification-agent.md`
- `docs/master-plan.md`
- `docs/weekly-plan-2026-07-13.md`
- `docs/today-plan-2026-07-13.md`
- `docs/notion-dashboard-guide.md`

## 3주차: 7월 24일까지

목표: Supabase 실제 DB 연결을 완료하고, 퀘스트 기록 저장·조회 수직 슬라이스를 영속 저장까지 검증한다.

- [x] Hono 서버 골격 구현
- [ ] Supabase `quest_logs` 테이블 실제 생성
- [x] 완료 기록 저장 API 구현
- [x] 실패 기록 저장 API 구현
- [x] 복구 완료 기록 저장 API 구현
- [x] 기록 조회 API 구현
- [x] React 기록 노트와 API 연결
- [x] API 실패 시 재시도/안내 UI 구현
- [ ] Supabase env 연결 후 새로고침 조회 검증
- [ ] 기능 검증 Agent로 핵심 시나리오 점검

대표 산출물:

- Hono API
- Supabase 연결 설정 문서
- React 기록 노트 서버 조회 흐름
- 수동 QA 결과

## 4주차: 7월 30일까지

목표: React MVP의 시각 품질과 문서/발표/PR 상태를 마감 수준으로 정리한다.

- [ ] React UI를 정적 HTML 기준으로 개선
- [ ] XP 창, 작업표시줄, 데스크톱 아이콘 스타일 통일
- [ ] 매니저 창과 QuestRunner.exe 스타일 보강
- [ ] 주요 에셋 적용
- [ ] 캐릭터 애니메이션과 hover/reaction asset 적용
- [ ] 외적 성장, 데스크톱 배경 테마, 창 테마, 기억 조각, 사운드 prototype 구현
- [ ] 시간대별 web theme 상태 적용
- [ ] 개인화 AI 매니저 adapter와 rule fallback prototype 구현
- [ ] 현실 픽셀화 TV local canvas prototype 구현
- [ ] 공개 퀘스트 탐색 read-only prototype 구현
- [ ] 웹캠 손 제스처 탐색 adapter prototype 구현
- [ ] 모바일 화면 겹침 점검
- [ ] `npm.cmd run build` 통과 확인
- [ ] 첫 접속부터 복구 퀘스트까지 수동 테스트
- [ ] README와 Wiki 링크 최종 확인
- [ ] GitHub Issue/Notion 상태 정리
- [ ] PR 본문 업데이트
- [ ] 발표 자료와 스크린샷 정리

대표 산출물:

- React MVP
- 정적 프로토타입
- 최종 README/docs/Wiki/PR
- 검증 기록

## 운영 원칙

- 큰 기능은 `tasks.md`에서 작은 Task로 쪼갠 뒤 진행한다.
- 날짜 계획은 이 문서에, 전체 백로그는 `tasks.md`에 둔다.
- 완료 여부는 `status.md`에 검증 근거와 함께 기록한다.
