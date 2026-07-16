# 스펙핏(SpecFit) 확장 기능 체크리스트 — 로그인/회원가입 & 북마크

> 우선순위: **여유 시 착수**. `개발_Task.md`의 2~4주차 핵심 로드맵(DB/폼/시각화/배포)이 끝난 뒤 여유가 있을 때 진행하는 확장 기능이며, 핵심 갭 분석 시나리오의 필수 조건이 아니다.

## 확정 사항 (제안 — ★표시 항목은 사용자 확인 필요)

- **게스트 플로우 100% 유지**: 로그인은 선택 기능. 필터→스펙 입력→갭 분석→결과 화면은 비로그인 상태에서도 지금과 동일하게 동작해야 한다. 로그인이 필요한 것은 "북마크 저장"뿐.
- **북마크는 로그인 사용자 전용**. 비로그인 사용자가 북마크 버튼을 누르면 로그인 페이지로 유도한다.
- **`analysis_results`를 계정에 연결하는 것은 이번 스코프 아웃**. "분석 기록을 계정에 저장/조회"는 북마크와 별개 기능이라 필요해지면 별도 이슈로 분리한다.
- **인증 방식: 세션 기반으로 확정 (2026-07-16)** — `bcrypt`로 비밀번호 해싱 + 자체 `sessions` 테이블 + httpOnly 쿠키. 기존 컨벤션(ORM 없이 raw SQL, 불필요한 의존성 추가 지양 — CLAUDE.md의 `better-sqlite3` 선택 이유와 동일 기조)에 맞춰 `express-session`이나 JWT 라이브러리 없이 직접 구현한다.

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

## 1 — DB & 인증 기반

- [ ] `users` 테이블 (`id`, `email` UNIQUE NOT NULL, `password_hash`, `created_at`)
- [ ] `sessions` 테이블 (`id`, `user_id` FK, `expires_at`, `created_at`) — JWT로 결정되면 이 테이블은 불필요, 대체 방식으로 스킵
- [ ] `bookmarks` 테이블 (`id`, `user_id` FK, `job_id` FK, `created_at`, `UNIQUE(user_id, job_id)`)
- [ ] `bcrypt` 패키지 추가 (`server/package.json`)
- [ ] 비밀번호 해싱 유틸 (`hashPassword`/`verifyPassword`)
- [ ] 세션 발급/검증 유틸 (쿠키 set/verify, 만료 처리)
- [ ] `requireAuth` 미들웨어 (미인증 시 401)

## 2 — 인증 API

- [ ] `POST /api/auth/signup` — 이메일 형식/중복, 비밀번호 최소 길이 등 서버 검증 (`gapAnalysisValidation.js` 패턴 재사용 검토)
- [ ] `POST /api/auth/login` — 실패 시 "이메일 또는 비밀번호 불일치"처럼 계정 존재 여부를 노출하지 않는 동일 메시지
- [ ] `POST /api/auth/logout` — 세션 무효화
- [ ] `GET /api/auth/me` — 로그인 상태 확인용 (비로그인 시 401 대신 `null` 응답할지 결정)
- [ ] 인증 API 테스트 (supertest, 기존 `gapAnalysis.routes.test.js` 패턴)

## 3 — 북마크 API

- [ ] `POST /api/bookmarks` (`job_id`, `requireAuth` 필요)
- [ ] `DELETE /api/bookmarks/:job_id`
- [ ] `GET /api/bookmarks` — 로그인 사용자의 북마크한 공고 목록 (jobs 테이블과 join)
- [ ] 북마크 API 테스트

## 4 — FE 인증 화면

- [ ] `/login` 페이지 — `?redirect=` 쿼리 파라미터를 읽어 로그인 성공 시 해당 경로로 이동, 없으면 기본 경로(랜딩)
- [ ] `/login` 페이지 — "계정이 없으신가요? 회원가입" 링크, `redirect` 파라미터를 그대로 `/signup`에 전달
- [ ] `/signup` 페이지 — 가입 성공 시 자동 로그인 처리 후 `redirect` 파라미터 경로로 이동 (가입/로그인 분리하지 않음)
- [ ] 로그인 상태 전역 관리 — 3주차 예정인 `AppStateContext`(CLAUDE.md "Planned: cross-route state sharing") 작업과 통합할지, 별도 `AuthContext`로 분리할지 결정 필요
- [ ] 헤더: 로그인/회원가입 진입점 ↔ 로그인 시 사용자 메뉴(로그아웃)로 전환
- [ ] 북마크처럼 로그인 필요한 액션을 비로그인 상태에서 클릭 시 `/login?redirect=<현재 경로>`로 유도
- [ ] 로그인 세션 만료(API 401 응답) 감지 시 동일하게 `/login?redirect=...`로 유도하는 공통 처리 (fetch 래퍼 레벨에서 처리할지 각 컴포넌트에서 처리할지 결정 필요)

## 5 — FE 북마크

- [ ] `JobCard` / `JobDetailModal`에 북마크 토글 버튼
- [ ] 마이페이지(`/bookmarks`) — 북마크한 공고 목록 화면
- [ ] 북마크 상태 갱신 방식 결정 (낙관적 업데이트 vs 토글 후 재조회)

## 6 — 배포 고려사항

- [ ] 쿠키 cross-origin 설정 (FE/BE가 다른 origin에 배포되므로 `sameSite=None; Secure` + CORS `credentials: true`) — `checklist_2.md` 4단계의 "CORS 설정 점검" 항목과 함께 처리
- [ ] 프로덕션 환경변수 추가 (세션 시크릿 등) — `server/.env.example` 갱신
