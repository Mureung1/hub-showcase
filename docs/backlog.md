# Bridge 백로그

> 기획서(`docs/plan.md`)에서 확정된 방향 기준으로 남은 일을 정리한 문서.
> 우선순위: P0 필수(배포 데모 필수) · P1 필요(완성도) · P2 여유(시간 남으면).
> 이번 사이클 목표: 배포까지(동작하는 E2E 데모). 인원: 1인. 기간: 2~4주차(7/13~7/31).
> 기준 변경: 주별 작업 마감이 금요일로 확정(기존 일요일 → 금요일). 아래 주차별 범위·요일 계획 모두 월~금 기준으로 수정됨.
> 기준 변경 2: 2주차 월요일(7/13)은 백로그 검토 + `/feature-slice` 계획 명령 구성에 쓰여, 2주차 실제 작업일은 화~금(4일)로 조정됨. Task 분할도 레이어(DB/BE/FE) 단위에서 화면→API→DB→화면이 닫히는 수직 슬라이스 단위로 재구성(2026-07-13, `/feature-slice` 검토). 각 Task는 GitHub 이슈로 추적(내 포크 `bovoZhang/hub`).

## 완료 (참고 — 백로그에서 제외)
- React 프로젝트 · Express 스캐폴드 · 모노레포 폴더 구조
- 프로토타입 6화면 React 이식 + 편지 상태머신 + 목데이터
- (7/13) 백로그 검토 + `/feature-slice` 계획 명령 구성

## 백로그

### A. 백엔드 토대 & DB
- [P0] A1 Supabase 프로젝트 생성 + Prisma 연결(DB는 Supabase로 확정, 로컬/배포 동일 인스턴스), .env → **T0**([#2](https://github.com/bovoZhang/hub/issues/2))로 병합
- [P0] A2 스키마 설계: User, Letter(초안/상태), Match(이음), Reply → **T0**([#2](https://github.com/bovoZhang/hub/issues/2))로 병합
- [P0] A3 서버 구조: routes/controllers/services + zod 검증 + 에러 핸들러 → **T1**([#3](https://github.com/bovoZhang/hub/issues/3))

### B. 인증/사용자(최소)
- [P1] B1 최소 신원: Supabase Auth(이메일/비밀번호) 로그인, 세션은 Supabase가 발급하는 JWT 사용 — **2주차→3주차 이월**(2주차엔 정식 구현 없이 하드코딩/익명 유저로 시작, 화요일 여유 확보 목적)
- [P2] B2 선호 카테고리 저장(매칭용)·프로필

### C. 편지 API
- [P0] C1 편지 작성 API(하루 1통 제한) → 모음소 등록 → **T2**([#4](https://github.com/bovoZhang/hub/issues/4))로 병합
- [P0] C2 초안 자동저장 API(임시저장/이어쓰기) — **2주차→3주차 이월**(T4 예정)
- [P0] C3 저장소 조회 API(내가 쓴/받은/이어진) → **T3**([#5](https://github.com/bovoZhang/hub/issues/5))로 병합(2주차엔 우선 '내가 쓴 편지'만, 받은/이어진은 4주차 F4 나머지)
- [P0] C4 답장 작성 API(8시간 후 전달 예약)

### D. AI 매칭(핵심 가치)
- [P0] D1 Claude SDK 연동: 편지 카테고리 분류
- [P0] D2 매칭 로직: 모음소에서 수신자 선정(선호 기반)
- [P0] D3 추천 이유 생성(Claude)
- [P1] D4 프롬프트/매칭 품질 튜닝

### E. 시간 규칙 & 스케줄링
- [P0] E3 하루 1통 제한(C1 연계)
- [P0] E1 24시간 후 추천 도착(on-read or node-cron)
- [P0] E2 8시간 후 답장 전달
- [P1] E4 데모용 시간 단축 토글

### F. 프론트–백엔드 연동
- [P0] F1 API 클라이언트 + react-query, 토큰 처리 — 최소 fetch 부분은 **T2**([#4](https://github.com/bovoZhang/hub/issues/4))에 흡수, react-query 도입 자체는 **2주차→3주차 이월**(T5 예정)
- [P0] F2 작성/발송 흐름 연동(mock→API) → **T2**([#4](https://github.com/bovoZhang/hub/issues/4))로 병합
- [P0] F3 추천/답장 흐름 연동
- [P0] F4 저장소 실데이터 연동, mock.js 제거 → 부분(내가 쓴 편지)은 **T3**([#5](https://github.com/bovoZhang/hub/issues/5)), 나머지(받은/이어진)는 4주차 유지
- [P1] F5 로딩/에러 상태 UI

### G. UX 폴리싱
- [P0] G1 붙여넣기 차단(직접 타이핑 강제) → **G1 이슈**([#6](https://github.com/bovoZhang/hub/issues/6))로 별도 추적, 의존성 없어 화~금 아무 때나
- [P0] G2 초안 자동저장 UX(글자수/저장 표시)
- [P2] G3 편지 개봉 애니메이션(motion)
- [P1] G4 카운트다운 실시간 정합(dayjs)
- [P2] G5 저장함 상세 죽은 `from` prop 제거(`LetterDetailPage.jsx` — `Letter` 모델에 필드 없어 항상 undefined) — T3 검증(2026-07-16)에서 발견
- [P2] G6 저장함 목록 요약 말줄임표 조건화(40자 초과일 때만 `…`, `StoragePage.jsx`) — T3 검증(2026-07-16)에서 발견
- [P2] G7 저장함 '내가 쓴 편지' 빈 목록 안내 문구 추가(`StoragePage.jsx` — 현재 에러일 때만 메시지) — T3 검증(2026-07-16)에서 발견
- [P2] G8 저장함 목록 항목 키보드 접근성(a11y: `button`/role·tabIndex·onKeyDown, `StoragePage.jsx` — 받은/이어진 탭과 동일 패턴이라 일괄) — T3 검증(2026-07-16)에서 발견

### H. 배포(이번 사이클 목표)
- [P0] H1 백엔드 호스팅 스택 확정(DB는 A1에서 Supabase로 이미 통일 — 별도 프로비저닝 불필요)
- [P0] H2 백엔드 배포 + 환경변수/시크릿(ANTHROPIC_API_KEY 등)
- [P0] H3 프론트 배포 + API base URL 연결 + CORS
- [P1] H4 자동배포 파이프라인/도메인
- [P1] H5 시드 데이터(모음소 예시 편지) — 데모용

### I. 테스트/검증
- [P1] I1 백엔드 API 테스트(Supertest) 핵심 경로
- [P1] I3 배포 환경 E2E 수동 체크리스트

### J. 운영/프로세스(상시)
- [P1] J1 기능 단위 PR + 코드리뷰(PR은 직접 생성), 촘촘한 커밋 — 상시 프로세스라 GitHub 이슈로는 추적하지 않음

## 이번 주 Task (2주차: 7/13–7/17, 금요일 마감)

> 이번 주 목표: "FE·BE·DB를 실제로 연결해, 데이터가 저장·조회되는 기능 하나를 끝까지 완성한다."
> 월요일(7/13)은 백로그 검토 + `/feature-slice` 계획 명령 구성에 쓰여, 실제 작업일은 화~금(4일)로 조정됨.
> Task 분할을 레이어(DB/BE/FE) 단위에서 **화면→API→DB→화면이 닫히는 수직 슬라이스 단위**로 재구성함(`/feature-slice` 검토, 2026-07-13). 각 Task는 GitHub 이슈로 추적(내 포크 `bovoZhang/hub`).

| Task | 우선순위 | 원본 매핑 | 이슈 | 비고 |
|---|---|---|---|---|
| T0 Supabase + Prisma 환경/스키마 준비 | P0 | A1+A2 병합 | [#2](https://github.com/bovoZhang/hub/issues/2) | 화요일에 T1과 압축 진행(원래 이틀치 작업) |
| T1 서버 구조(routes/controllers/services + zod + 에러 핸들러) | P0 | A3 | [#3](https://github.com/bovoZhang/hub/issues/3) | T0과 같은 날 |
| T2 편지 쓰기 슬라이스(작성 화면 → 저장 API → DB → 화면 전환) | P0 | C1+F2+F1(최소 fetch) 병합 | [#4](https://github.com/bovoZhang/hub/issues/4) | react-query 도입은 3주차(T5)로 분리 |
| T3 저장소 조회 슬라이스(저장소 화면 → 조회 API → DB → 목록) | P0 | C3+F4(부분: 내가 쓴 편지) 병합 | [#5](https://github.com/bovoZhang/hub/issues/5) | 받은/이어진 편지 mock 제거는 4주차(F4 나머지) |
| G1 붙여넣기 차단(직접 타이핑 강제) | P0 | G1 | [#6](https://github.com/bovoZhang/hub/issues/6) | 의존성 없음 — 화~금 여유 시점에 아무 때나 |

**이번 주에서 3주차로 이월(2주차엔 이슈화 보류):**
- C2 초안 자동저장 API — T4로 예정, 3주차 착수
- F1 react-query 도입 — T5로 예정, 3주차 착수(fetch 래퍼가 먼저 있어야 의미 있음)
- B1 최소 신원 — 정식 구현 없이 하드코딩/익명 유저로 시작(화요일 여유 확보 목적)
- J1 기능 단위 PR·코드리뷰 — 상시 프로세스, 이슈화하지 않음

### 요일별 계획 (화~금, 7/14–7/17)

| 요일 | 날짜 | Task |
|---|---|---|
| 월 | 7/13 (완료) | 백로그 검토 + `/feature-slice` 계획 명령 구성 |
| 화 | 7/14 | T0([#2](https://github.com/bovoZhang/hub/issues/2)) + T1([#3](https://github.com/bovoZhang/hub/issues/3)) — 원래 이틀치를 하루로 압축 |
| 수 | 7/15 | T2([#4](https://github.com/bovoZhang/hub/issues/4)) 편지 쓰기 슬라이스 |
| 목 | 7/16 | T3([#5](https://github.com/bovoZhang/hub/issues/5)) 저장소 조회 슬라이스 |
| 금 | 7/17 | 통합 점검/버퍼 + 여유 있으면 G1([#6](https://github.com/bovoZhang/hub/issues/6)) |

리스크: 화요일 T0+T1 압축이 가장 빡빡한 지점 — 여기서 밀리면 이후 전부 하루씩 밀림. 밀릴 경우 잘라낼 후보: 목요일 T3를 최소 버전(에러 처리 없이 단순 목록만)으로 축소하거나, G1을 다음 주로 완전히 이월. (우선은 압축안대로 진행하고, 실제로 밀리는 시점에 다시 결정하기로 함.)

## 3주 일정 (2~4주차)

### 2주차 (7/13–7/17, 금요일 마감) — 백엔드 토대 & 핵심 사이클 완성
월요일은 계획 명령 구성에 사용, 실 작업일 화~금(4일). T0+T1(A1+A2+A3) → T2(C1+F2, 쓰기 슬라이스) → T3(C3+F4 부분, 조회 슬라이스) · G1
DoD: 편지 작성(화면) → API 저장 → 저장소 화면에서 실데이터 조회, 이 한 사이클이 mock 없이 끝까지 동작(이번 주 목표).

### 3주차 (7/20–7/24, 금요일 마감) — AI 매칭 & 시간 규칙 (+ 2주차 이월분)
D1·D2·D3(핵심) → C4·E1·E2 → F3 → B1 마무리
2주차에서 이월: C2 초안 자동저장(T4) · F1 react-query 도입(T5)
DoD: 편지→모음소→AI 추천+이유→답장 루프 로컬 동작 + 초안 자동저장/이어쓰기 동작.

### 4주차 (7/27–7/31, 금요일 마감) — 통합·폴리싱·배포
F4(나머지: 추천/답장 mock 제거) → G2(+여유 시 G3) → H1·H2·H3 → H5·I1·I3
DoD: 배포 URL에서 전체 흐름 시연, E4 토글로 데모.
