# 체크리스트

주차별로 작업 단위를 쪼개서 관리합니다. 프론트엔드 / 백엔드를 구분해서 기입합니다.

## 진행 방식 (Contract-First 병렬)
- **W1에 API 명세 3개를 먼저 확정** → FE는 mock JSON으로, BE는 실제 구현으로 병렬 진행
- **W2 끝까지 FE·BE 각자 완성** (FE 전 화면 mock 동작 / BE API Postman 실제 응답)
- **W3은 연동·배포·QA 전용 버퍼** (mock→실제 API 교체, E2E, 테스트/디버깅, 배포)
- 화면 흐름(프로토타입 기준): 랜딩 → ID입력 → 분석중 → 프로필결과 → 조건선택 → 추천목록 → 상세
- 각 태스크: `[FE]/[BE]` + 설명 + **DoD**(완료조건) + 참고([plan](plan.md) 화면 / prototype / [decisions](decisions.md))

### API 명세 3개 (W1 확정, [architecture.md](architecture.md)에 JSON 예시 기록)
1. `POST /api/analysis` — GitHub ID → 프로필 분석(languages, skillLevel, activitySummary)
2. `POST /api/recommendations` — 분석결과+선호조건 → 레포/이슈 추천 리스트 생성
3. `GET /api/recommendations/:id` — 추천 상세

---

## Week 1 — 프론트 뼈대 + 백 스캐폴딩 + 명세 확정
### Frontend
- [x] **프로젝트 라우팅 셋업** — `react-router-dom` 도입, 7개 화면 경로 + 스텝퍼 공통 레이아웃
      - DoD: URL로 각 화면 이동 가능, 스텝퍼가 현재 단계 표시
      - 참고: prototype `stepper`, [decisions](decisions.md) 라이브러리 스택
- [x] **랜딩 화면** — 기존 `App.jsx`/`ProjectIntro`/`HeroIllustration` 정리해 라우트에 배치
      - DoD: "지금 시작하기" → ID 입력 화면 이동
      - 참고: plan 화면 1, prototype `screen--landing`
- [x] **GitHub ID 입력 화면** — `useState` 폼 + 유효성(빈값/공백)
      - DoD: ID 입력 후 "내 활동 분석하기" → 분석중 화면 이동
      - 참고: plan 화면 2, prototype `screen--input`
- [x] **mock 데이터 파일 구성** — 확정된 API 명세대로 `src/mocks/*.json`
      - DoD: analysis/recommendations/detail 응답 예시 JSON 존재
      - 참고: 상단 API 명세 3개

### Backend
- [x] **API 명세 3개 확정** — 요청/응답 JSON 예시를 [architecture.md](architecture.md) API 섹션에 기록
      - DoD: 3개 엔드포인트의 필드·타입·에러형식 문서화 (FE mock의 원본이 됨)
      - 참고: [decisions](decisions.md) DB 컬렉션 설계
- [x] **Express 스캐폴딩** — `routes→controllers→services→models` 레이어, `cors`/`helmet`/`dotenv`
      - DoD: 서버 부팅 + `/health` 200 응답
      - 참고: [CLAUDE.md](../CLAUDE.md) 백엔드 규칙, [conventions](conventions.md)
- [x] **Supabase 연결 + Prisma 스키마 뼈대** — analyses/repo_cache/issue_cache/recommendations(+recommendation_items)/api_usage
      - DoD: `prisma migrate dev` 성공, Supabase 대시보드에서 테이블 확인
      - 참고: [decisions](decisions.md) DB 전환(2026-07-13)

## Week 2 — 화면 완성(mock) + API 구현
### Frontend
- [x] **분석중(로딩) 화면** — 진행 상태 표시, mock 지연 후 자동 전환
      - DoD: 로딩 애니메이션 표시 → 프로필 결과 화면 이동
      - 참고: plan 화면 4, prototype `screen--analyze`
- [x] **프로필 분석 결과 화면** — mock analysis로 언어/실력/활동요약 렌더
      - DoD: mock 데이터가 화면에 정확히 표시
      - 참고: prototype `screen--profile`
- [x] **선호 조건 선택 화면** — 언어/난이도/주제 선택(useState)
      - DoD: 조건 선택 후 "이 조건으로 이슈 찾기" → 추천목록 이동 ✅ 2026-07-22 (프로필 화면 내 칩 인터랙션으로 구현, #9)
      - 참고: plan 화면 3, prototype `screen--search`
- [x] **추천 결과 목록 화면** — mock recommendations 리스트 카드 렌더
      - DoD: 카드 클릭 → 상세 화면 이동
      - 참고: plan 화면 5, prototype `screen--result`
- [x] **추천 상세 화면** — 상세 정보 + GitHub 외부 링크
      - DoD: 상세 렌더 + "목록으로"/"다른 이슈 보기" 동작
      - 참고: plan 화면 6, prototype `screen--detail`
- [x] **프로토타입 스타일 → design.md 토큰 이식** — 색/여백/카드 하드코딩 제거
      - DoD: 화면이 `docs/design.md` CSS 변수만 사용 ✅ 2026-07-22 (AppFlow.css 하드코딩 hex를 `--demo-*`/`--color-surface-sunken-hover` 토큰으로 이식. 랜딩(App.css)의 장식용 그라데이션은 별도 브랜드 톤이라 범위 밖으로 유지)
      - 참고: [design.md](design.md), `firstpr-ui` 스킬

### Backend
- [x] **GitHub 프로필 분석 API** (`POST /api/analysis`) — `@octokit/graphql`로 레포/언어/이력 집계 + Analysis 캐시
      - DoD: 실제 GitHub ID로 분석 결과 반환, 재요청 시 캐시 사용 ✅ 2026-07-16 (24h 캐시 + 7일 경과 재분석 + GET 조회 + ApiUsage 집계)
      - 참고: [decisions](decisions.md) GitHub API 클라이언트/Analysis
- [x] **이슈/레포 추천 API** (`POST /api/recommendations`) — `@octokit/rest` search + 규칙 기반 매칭(언어·라벨·난이도)
      - DoD: 분석결과+선호조건 → 추천 리스트 반환 ✅ 2026-07-21
      - 참고: plan §6 추천 품질(규칙 기반), IssueCache/RepoCache
- [x] **추천 결과 저장/조회** (`GET /api/recommendations/:id`) — Recommendation 저장 후 상세 조회
      - DoD: 저장된 추천 재조회 가능 ✅ 2026-07-21 (200/404/400 케이스 실서버 검증)
      - 참고: [decisions](decisions.md) Recommendation
- [x] **에러 처리·유효성** — 정규식 검증 + 공통 에러 미들웨어 (express-validator 없이 충분해 미도입)
      - DoD: 잘못된 입력/존재하지 않는 ID에 명세된 에러 형식 반환 ✅ 2026-07-16 (400/404/429 명세 형식 확인)
      - 참고: [conventions](conventions.md) 에러 처리

## Week 3 — 연동 · 배포 · 테스트/디버깅 (공통)
- [x] **[FE] mock → 실제 API 교체** — `axios` + `@tanstack/react-query`, 로딩/에러 상태 연결
      - DoD: 전 화면이 실제 백엔드 응답으로 동작 ✅ 2026-07-22 (추천 API mock 제거, Analyze/IssueSearch를 useMutation으로 전환, #9)
      - 참고: [decisions](decisions.md) TanStack Query
- [x] **[FE/BE] E2E 통합 테스트** — 랜딩→상세 7화면 흐름 전체 검증
      - DoD: 실제 GitHub ID로 끝까지 흐름 성공 ✅ 2026-07-27 (Playwright 도입, `frontend/e2e/full-flow.spec.js`, mock 없이 실제 GitHub/LLM API로 kimsunho2000 계정 통과 확인. 참고: [testing.md](testing.md) §5)
- [ ] **[BE] rate limit / 엣지케이스 대응** — 비인증 60회 제한, 캐시 만료, 빈 결과 처리
      - DoD: rate limit 초과·빈 추천 상황에서 정상 폴백/안내
      - 참고: plan §6 GitHub API 제약, ApiUsage
- [ ] **[FE/BE] 버그 디버깅 + 필터/재조회 마감** — 조건 변경 재추천
      - DoD: 조건 바꿔 재추천 동작, 알려진 버그 정리
      - 참고: plan §7 재조회/필터링
- [x] **[FE] 프론트 배포** (github.io 등) — 프로토타입 데모 포함
      - DoD: 공개 URL 접속 가능 ✅ `kimsunho2000.github.io/hub/` (`npm run deploy`)
- [x] **[BE] 백엔드 배포** — API 서버 + 환경변수(GitHub 토큰) 설정
      - DoD: 배포된 API로 프론트 연동 성공 ✅ 2026-07-27 Render(`https://firstpr-backend.onrender.com`) 배포, `VITE_API_BASE_URL`로 프론트 연결 후 재배포 완료. `render.yaml` buildCommand에 `npm test` 게이트 추가
- [x] **[공통] architecture.md 최종 확정** — 폴더구조/API/DB/배포/데이터흐름 기록
      - DoD: [architecture.md](architecture.md) 6개 섹션 채움 ✅ 2026-07-24 (프론트엔드/백엔드 섹션 채움, 인프라/배포는 다음 주로 미뤄 스텁만 남김)

## Week 4
- [x] **[FE/BE] 재추천 다양화** — 같은 조건으로 다시 요청 시 새 이슈 위주로(중복 방지), 주기당 2~3회 상한
      - DoD: ✅ 2026-07-27 매칭 점수 1순위 + 동점 시 안 본 이슈 우선(`compareForDiversification`), 하루(UTC) 동일 조건 3회 상한 도달 시 에러 대신 캐시된 결과 반환
      - 참고: 2026-07-23 논의, [decisions](decisions.md)
- [x] **[FE/BE] 즐겨찾기 + 전체 검색 이력** — 로드맵 항목 조기 착수
      - DoD: ✅ 2026-07-27 `Favorite` 모델, `/history` 화면(언어 필터·정렬·페이지네이션), `GET /api/recommendations` 이력 조회
      - 참고: [architecture.md](architecture.md)
