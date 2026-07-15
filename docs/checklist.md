# 작업 분해 — TideNote (2주차: Tide Check 수직 슬라이스)

[TideNote 기획서](https://github.com/snael0510-coder/hub/wiki/TideNote-%EA%B8%B0%ED%9A%8D%EC%84%9C)의 핵심 기능을 이번 주 목표에 맞춰 작업 단위로 쪼갠 목록.

## DB
- [x] 데이터 모델 설계 → [docs/data-model.md](data-model.md)
- [x] 테이블 스키마 SQL 작성 → `server/tide_checks.sql` (컬럼: `id`, `valence` int, `arousal` int, `created_at` timestamp)
- [ ] Supabase 프로젝트에 `tide_checks` 테이블 실제 생성 — **목요일**
- [ ] 테스트 row 직접 추가해서 Supabase 대시보드에서 조회 확인 — **목요일**

## FE 화면 흐름 (mock)
- [x] Episodes 화면(History/Recent 탭) → `src/Episodes.jsx`
- [x] episode 클릭 시 Chat 화면으로 이동, submerged episode는 블러+View original → `src/ChatView.jsx`
- [x] state(화면 전환, 선택된 episode) / props(자식 컴포넌트에 데이터·콜백 전달) 구분 적용

## BE (Express)
- [x] Express 프로젝트 세팅 → `server/index.js`
- [x] `POST /api/tide-checks` — body로 valence, arousal 받아 Supabase에 저장 → `server/routes/tideChecks.js` (코드만, Supabase 연결 전이라 미검증)
- [x] `GET /api/tide-checks/latest` — 가장 최근 값 반환 → 동일 파일 (코드만, 미검증)
- [ ] curl 또는 Postman으로 두 라우트 직접 테스트 — **목요일**: Supabase 프로젝트 생성 + `.env` 연결 후 진행

## FE (React)
- [x] Tide Check 슬라이더 컴포넌트 — `prototype/index.html`의 `#screen-tidecheck` 마크업/스타일을 React 컴포넌트로 이식 (언라벨 Valence/Arousal 슬라이더, `.claude/skills/tidenote-visual-language` 토큰 그대로 사용) → `src/TideCheck.jsx`
- [x] mock 데이터로 Submit 시 "제출됨" 상태 전환 확인
- [ ] mock 제거하고 실제 `fetch(POST)` 호출로 교체
- [ ] 저장 성공 시 화면에 완료 메시지 표시
- [ ] 페이지 로드 시 `GET`으로 마지막 값 불러와 화면에 반영

## 검증
- [ ] 전체 사이클(슬라이더 조작 → Submit → 저장 → 새로고침 → 값 유지) 1회 성공
- [ ] 검증 Agent로 요구사항 대비 체크
