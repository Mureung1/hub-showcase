# 작업 분해 — TideNote (2주차: Tide Check 수직 슬라이스)

`plan.md`의 핵심 기능을 이번 주 목표에 맞춰 작업 단위로 쪼갠 목록.

## DB
- [ ] Supabase 프로젝트에 `tide_checks` 테이블 생성
- [ ] 컬럼: `id`, `valence` (int), `arousal` (int), `created_at` (timestamp)
- [ ] 테스트 row 직접 추가해서 Supabase 대시보드에서 조회 확인

## BE (Express)
- [ ] Express 프로젝트 세팅 (미완료 시)
- [ ] `POST /api/tide-checks` — body로 valence, arousal 받아 Supabase에 저장
- [ ] `GET /api/tide-checks/latest` — 가장 최근 값 반환
- [ ] curl 또는 Postman으로 두 라우트 직접 테스트

## FE (React)
- [ ] Tide Check 슬라이더 컴포넌트 (기존 프로토타입 재사용/이식)
- [ ] mock 데이터로 Submit 시 "제출됨" 상태 전환 확인
- [ ] mock 제거하고 실제 `fetch(POST)` 호출로 교체
- [ ] 저장 성공 시 화면에 완료 메시지 표시
- [ ] 페이지 로드 시 `GET`으로 마지막 값 불러와 화면에 반영

## 검증
- [ ] 전체 사이클(슬라이더 조작 → Submit → 저장 → 새로고침 → 값 유지) 1회 성공
- [ ] 검증 Agent로 요구사항 대비 체크
