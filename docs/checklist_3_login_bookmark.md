# 스펙핏(SpecFit) 확장 기능 체크리스트 — 로그인/회원가입 & 북마크

> 우선순위: **여유 시 착수**. `개발_Task.md`의 2~4주차 핵심 로드맵(DB/폼/시각화/배포)이 끝난 뒤 여유가 있을 때 진행하는 확장 기능이며, 핵심 갭 분석 시나리오의 필수 조건이 아니다.

## 확정 사항 (제안 — ★표시 항목은 사용자 확인 필요)

- **게스트 플로우 100% 유지**: 로그인은 선택 기능. 필터→스펙 입력→갭 분석→결과 화면은 비로그인 상태에서도 지금과 동일하게 동작해야 한다. 로그인이 필요한 것은 "북마크 저장"뿐.
- **북마크는 로그인 사용자 전용**. 비로그인 사용자가 북마크 버튼을 누르면 로그인 페이지로 유도한다.
- **`analysis_results`를 계정에 연결하는 것은 이번 스코프 아웃**. "분석 기록을 계정에 저장/조회"는 북마크와 별개 기능이라 필요해지면 별도 이슈로 분리한다.
- **인증 방식: 세션 기반(자체 구현) → Supabase Auth + Supabase Postgres로 변경 확정 (2026-07-21)**. 원래 계획이던 `bcrypt` + 자체 `sessions` 테이블 + httpOnly 쿠키 방식은 폐기한다.
  - **변경 이유 1 (배포 시 쿠키 cross-origin 문제)**: 프론트(Vercel)와 백엔드(Render 등)가 다른 origin에 배포되면 세션 쿠키에 `sameSite=None; Secure` + CORS `credentials:true`가 필요한데, 로컬 개발 환경(Vite 프록시로 같은 origin처럼 동작)에서는 이 문제가 재현되지 않아 배포 시점에야 처음 발견될 위험이 있었다.
  - **변경 이유 2 (데이터 유실 위험)**: 계정/북마크처럼 유실되면 안 되는 데이터를 로컬 `better-sqlite3` 파일에 두면, 배포 플랫폼이 재배포 시 파일시스템을 초기화하는 경우 통째로 날아갈 위험이 있었다.
  - **적용 범위**: 인증(회원가입/로그인/로그아웃/세션)은 프론트에서 `@supabase/supabase-js`로 Supabase Auth를 직접 호출 — Express에 별도 인증 라우트(`/api/auth/*`)를 만들지 않는다. `bookmarks` 테이블은 Supabase가 호스팅하는 별도 Postgres에 신규 생성 — 기존 `better-sqlite3`(로컬 파일)와는 물리적으로 다른 DB다. `jobs`/`analysis_results`는 이미 완성·검증된 P0 슬라이스라 **그대로 유지, 손대지 않는다**.
  - **DB 분리로 인한 제약**: `bookmarks.user_id`(Supabase Auth의 UUID)와 `bookmarks.job_id`(로컬 SQLite `jobs.job_id`)는 서로 다른 DB에 있어 진짜 외래키(FK) 제약을 걸 수 없다 — 애플리케이션 코드에서만 참조 무결성을 보장한다(예: 북마크 생성 시 `job_id`가 실제 존재하는지 로컬 SQLite에서 먼저 조회 확인).
  - **북마크 API 보호 방식**: 프론트가 Supabase 세션의 액세스 토큰(JWT)을 `Authorization: Bearer <token>` 헤더로 실어 보내고, Express 쪽에 이를 검증하는 미들웨어(`requireSupabaseAuth`)를 새로 추가한다 — 쿠키가 아니라 헤더 기반이라 cross-origin 쿠키 설정 자체가 필요 없어진다.

---

## 사용자 시나리오

| 상황 | 동작 |
|---|---|
| **게스트가 북마크 클릭** | 공고 카드/상세 모달의 북마크 버튼(☆) 클릭 → 로그인 세션 없음 감지 → `/login?redirect=/result`(현재 경로 기억)로 이동, "북마크하려면 로그인이 필요해요" 안내 |
| **로그인 페이지에서 계정이 없는 경우** | "계정이 없으신가요? 회원가입" 링크가 `redirect` 파라미터를 그대로 넘겨 `/signup?redirect=/result`로 이동 |
| **회원가입 성공** | 가입 직후 자동 로그인 처리 후 `redirect` 경로(`/result`)로 이동 — 가입 따로, 로그인 따로 시키지 않음 |
| **로그인 성공 후** | 기억해둔 경로(`/result`)로 복귀. **원래 누르려던 북마크는 자동 저장하지 않음** — 같은 분석 결과 화면으로 돌아가서 사용자가 북마크 버튼을 한 번 더 누르면 됨 |
| **로그인 상태에서 북마크 클릭** | 즉시 `POST/DELETE /api/bookmarks` 호출, 버튼이 ☆↔★ 토글. 페이지 이동 없음 |
| **세션 만료 상태에서 클릭** (엣지 케이스) | API가 401 반환 → 게스트 최초 시도와 동일하게 `/login?redirect=...`로 유도 ("로그인이 만료됐어요") |
| **마이페이지 진입** | 헤더 사용자 메뉴 → "북마크" 클릭 → `/bookmarks` → `GET /api/bookmarks` → 북마크한 공고를 기존 `JobCard`로 렌더. 없으면 "아직 북마크한 공고가 없어요" 빈 상태 + 결과 화면 이동 버튼 |
| **마이페이지에서 북마크 해제** | 카드 클릭 시 기존 `JobDetailModal` 재사용, 여기서도 북마크 토글 가능 (목록에서 즉시 사라짐) |
| **로그아웃** | 헤더 사용자 메뉴 → 로그아웃 → `POST /api/auth/logout` → 세션 쿠키 무효화. 보고 있던 화면(결과 화면 등)은 그대로 유지 — 갭 분석 자체는 게스트도 가능하니까. 다만 북마크 버튼들은 전부 ☆(미확인) 상태로 리셋 |

**의도적으로 단순화한 지점**: 로그인/가입 후 "원래 누르려던 북마크"를 자동 실행하지 않는다. 로그인 전 의도(어떤 job을 북마크하려 했는지)를 임시 저장해뒀다가 재실행하는 방식은 복잡도만 늘고, 같은 화면으로 돌아가서 한 번 더 누르게 하는 쪽이 사용자 입장에서도 더 명확하다.

## 1 — Supabase 프로젝트 & DB 기반

- [ ] Supabase 프로젝트 생성 (사용자가 직접 — Claude가 대신 할 수 없는 외부 계정 작업)
- [ ] Supabase 대시보드에서 `bookmarks` 테이블 생성 (`id` uuid/bigint PK, `user_id` uuid — `auth.users.id` 참조하되 다른 DB의 `jobs`와 달리 이건 같은 Supabase 프로젝트 안이라 진짜 FK 가능, `job_id` text — 로컬 SQLite `jobs.job_id` 참조지만 DB가 다르므로 FK 불가·애플리케이션 레벨 검증만, `created_at`, `UNIQUE(user_id, job_id)`)
- [ ] Supabase Row Level Security(RLS) 정책 설정 — 본인 소유 북마크만 select/insert/delete 가능하도록 (Supabase Postgres에 직접 뚫리는 경로가 생기는 만큼 RLS는 선택이 아니라 필수)
- [ ] 프론트: `@supabase/supabase-js` 패키지 추가, Supabase 클라이언트 초기화 모듈
- [ ] 백엔드: Supabase 발급 JWT를 검증하는 `requireSupabaseAuth` 미들웨어 (401 처리 포함) — `bcrypt`/자체 `sessions` 테이블/`users` 테이블은 전부 불필요해짐(Supabase Auth가 대신 관리)

## 2 — 인증 (프론트에서 Supabase Auth 직접 호출, Express 라우트 불필요)

- [ ] 회원가입 — `supabase.auth.signUp({ email, password })`
- [ ] 로그인 — `supabase.auth.signInWithPassword({ email, password })`
- [ ] 로그아웃 — `supabase.auth.signOut()`
- [ ] 현재 로그인 상태 확인 — `supabase.auth.getSession()`/`onAuthStateChange` 구독
- [ ] ~~`POST /api/auth/signup`~~ / ~~`POST /api/auth/login`~~ / ~~`POST /api/auth/logout`~~ / ~~`GET /api/auth/me`~~ — Supabase Auth가 대체하므로 Express에 만들지 않는다
- [ ] (참고) 이메일 형식/중복, 비밀번호 최소 길이 등 검증은 Supabase Auth가 기본 제공 — 별도 서버 검증 로직 불필요

## 3 — 북마크 API (Express, Supabase Postgres 사용)

- [ ] `POST /api/bookmarks` (`job_id`, `requireSupabaseAuth` 필요) — `job_id`가 로컬 SQLite `jobs`에 실제 존재하는지 먼저 확인 후 Supabase `bookmarks`에 insert
- [ ] `DELETE /api/bookmarks/:job_id`
- [ ] `GET /api/bookmarks` — Supabase `bookmarks`에서 로그인 사용자의 `job_id` 목록 조회 → 로컬 SQLite `jobs` 테이블에서 해당 `job_id`들을 조회해 조합(두 DB를 애플리케이션 레벨에서 join)
- [ ] 북마크 API 테스트 — Supabase 호출 부분은 실제 프로젝트 없이 단위 테스트하기 어려우므로 모킹 방식 결정 필요

## 4 — FE 인증 화면

- [ ] `/login` 페이지 — `?redirect=` 쿼리 파라미터를 읽어 로그인 성공 시 해당 경로로 이동, 없으면 기본 경로(랜딩)
- [ ] `/login` 페이지 — "계정이 없으신가요? 회원가입" 링크, `redirect` 파라미터를 그대로 `/signup`에 전달
- [ ] `/signup` 페이지 — 가입 성공 시 자동 로그인 처리 후 `redirect` 파라미터 경로로 이동 (Supabase는 이메일 확인을 요구할 수도 있음 — 프로젝트 설정에서 "이메일 확인 없이 즉시 로그인" 여부 결정 필요, ★확인 필요)
- [ ] 로그인 상태 전역 관리 — `AppStateContext`와 통합하지 않고 별도 `AuthContext`(또는 커스텀 훅)로 분리 — 관심사가 다르고(로그인 세션 vs 갭 분석 진행 상태), `#22`의 `useTheme` 훅처럼 독립된 작은 모듈로 두는 편이 기존 패턴과 일관됨
- [ ] 헤더: 로그인/회원가입 진입점 ↔ 로그인 시 사용자 메뉴(로그아웃)로 전환 — `#21`에서 만든 `Header.jsx`에 추가
- [ ] 북마크처럼 로그인 필요한 액션을 비로그인 상태에서 클릭 시 `/login?redirect=<현재 경로>`로 유도
- [ ] Supabase 세션 만료/토큰 무효화 감지 시 동일하게 `/login?redirect=...`로 유도하는 공통 처리 — `src/api/gapAnalysis.js`처럼 북마크 전용 fetch 래퍼(`src/api/bookmarks.js`)에서 401 처리

## 5 — FE 북마크

- [ ] `JobCard` / `JobDetailModal`에 북마크 토글 버튼
- [ ] 마이페이지(`/bookmarks`) — 북마크한 공고 목록 화면
- [ ] 북마크 상태 갱신 방식 결정 (낙관적 업데이트 vs 토글 후 재조회)

## 6 — 배포 고려사항

- [ ] ~~쿠키 cross-origin 설정~~ — Supabase Auth는 토큰(JWT)을 `Authorization` 헤더로 실어 보내므로 세션 쿠키의 `sameSite=None; Secure` + CORS `credentials:true` 문제 자체가 사라짐. Express `cors()`가 커스텀 헤더를 막지 않는지만 확인
- [ ] 프로덕션 환경변수 추가 — 프론트(Vercel): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` / 백엔드(Render 등): `SUPABASE_URL`, `SUPABASE_JWT_SECRET`(또는 검증 방식에 따라 `SUPABASE_ANON_KEY`) — `server/.env.example`, 루트 `.env.example`(신규) 갱신
- [ ] `bookmarks`는 Supabase가 관리형으로 호스팅하므로 로컬 SQLite처럼 "재배포 시 파일시스템 초기화로 유실" 위험이 없음 — `checklist_2.md`/`checklist_4`의 SQLite 파일 영속성 점검 항목은 `jobs`/`analysis_results`에만 해당
