# 기능 검증 체크리스트 — FE-BE-DB 수직 슬라이스 (#4·#6·#7)

`day2-verification-checklist.md`(2주차 월/화 범위)를 확장해, 이후 구현된 매칭 API의
Supabase 전환(#4), 프론트-Express 실연결(#6), 매칭 요청 DB 쓰기 사이클(#7)까지 포함한
전체 사이클을 검증한다. 대상: 온보딩 → `POST /api/match` → Supabase 조회/저장 → 화면 갱신.

## 검증 방식 범례

| 표시 | 방법 |
|------|------|
| `[코드]` | 소스 코드를 직접 읽어 로직 경로를 추적 |
| `[API]` | `curl`로 Express 서버 응답을 실제로 호출해 확인 (`npm run dev` 기동 상태, client `:5175` → proxy → server `:3001`) |
| `[DB]` | Supabase에 직접 쿼리해 row 존재/개수를 확인 (`db:check` 또는 임시 스크립트) |
| `[UI 미검증]` | 브라우저 클릭·렌더링 확인이 필요하지만, 이 세션엔 브라우저 자동화 도구가 없어 코드/API 레벨로만 확인함. #9 수동 검증에서 한 번 더 훑어보는 걸 권장 |

---

## 1. 전체 플로우 (Welcome → 온보딩 → 완료 → 홈 → 상세)

- [x] `[코드]` 라우트 골격 — `/`, `/onboarding/:step`, `/onboarding/complete`, `/home`, `/subsidies/:id` 모두 [src/App.tsx](../../src/App.tsx) L16-21에 정의됨
- [x] `[코드]` 완료 화면에서 `useSubmitProfile` mutation 실제 호출, `onSettled`에서 성공/실패 관계없이 `/home` 이동 ([src/pages/CompleteScreen.tsx](../../src/pages/CompleteScreen.tsx) — #7에서 연결)
- [x] `[API]` `npm run dev`로 client(:5175)+server(:3001) 기동 후 `POST /api/match`를 curl로 직접 호출 → 200, `total: 8` 확인 (버튼 클릭을 curl로 대체 재현)
- [ ] `[UI 미검증]` 완료 화면 버튼 클릭 시 "저장 중..." → `/home` 전환이 실제로 눈에 보이는지

## 2. 매칭 API — Supabase 전환 (#4)

- [x] `[코드]` `GET /api/subsidies`는 `findAll(sort)` → Supabase 조회 후 `applySort` ([server/src/routes/subsidies.ts](../../server/src/routes/subsidies.ts) L11-20, [server/src/db/subsidies-repo.ts](../../server/src/db/subsidies-repo.ts) L41-53)
- [x] `[API]` `curl http://localhost:5175/api/subsidies` → 200, 8건 (Supabase 시드 데이터)
- [x] `[API]` `curl http://localhost:5175/api/subsidies/1` → 200 / `curl .../nope-404` → `{"error":"Not found"}` 404
- [x] `[API]` `POST /api/match` 잘못된 body(`{}`) → 400 `{"error":"Invalid match request"}`
- [x] `[코드 → 버그 확인, 미수정]` **`sort=new` 순서 미보장**: `loadAll()`([subsidies-repo.ts](../../server/src/db/subsidies-repo.ts) L42)에 `.order()` 절이 없어 Supabase가 반환하는 순서가 insert 순서와 다름. `curl ".../api/subsidies?sort=new"`를 3회 반복 호출해도 항상 `['5','6','1','2','3','4','7','8']`로 동일(랜덤은 아님)하지만 id 오름차순이 아님 — **#9에서 `.order('id', { ascending: true })` 추가로 수정 예정** (계획서에 이미 등록됨, 이번 세션에선 코드 변경 없이 재확인만 함)

## 3. FE ↔ Express 실연결 (#6)

- [x] `[코드]` `src/api/client.ts`가 유일한 API 경계 — `getSubsidy`/`submitProfile` 모두 실패 시 mock으로 fallback + `console.warn`
- [x] `[코드]` `useSubsidies`(홈), `useSubsidy`(상세), `useSubmitProfile`(완료 화면 mutation) 모두 `client.ts` 경유
- [ ] `[코드 → 발견, 미수정]` `useSubsidies.ts` JSDoc이 "`POST /api/match`가 준비되기 전까지는 mock fallback을 그대로 사용한다"고 되어 있으나, #4·#6에서 이미 실제 서버 연동이 끝나 **주석이 stale함** — 동작에는 영향 없음(fallback 로직 자체는 여전히 유효), #9 또는 이후 정리 때 주석만 수정 권장
- [x] `[API]` Vite dev 프록시(`/api/*` → `:3001`) 정상 동작 확인 (`curl localhost:5175/api/health` → `localhost:3001`과 동일 응답)

## 4. DB 쓰기 사이클 (#7)

- [x] `[코드]` `supabase/schema.sql`에 `match_requests` 테이블 — `OnboardingProfile` 필드 + `sort` + `created_at`
- [x] `[코드]` `insertMatchRequest`([server/src/db/match-requests-repo.ts](../../server/src/db/match-requests-repo.ts))가 Supabase insert 실패 시 에러를 던지지 않고 로그만 남김 (best-effort)
- [x] `[코드]` `POST /api/match` 핸들러가 `insertMatchRequest`를 별도 try/catch로 감싸 저장 실패가 조회 응답(200)에 영향 주지 않도록 이중 격리 ([match.ts](../../server/src/routes/match.ts) L34-45)
- [x] `[DB]` 저장 전 row 수 0 → `curl POST /api/match` 호출 → row 수 1로 증가 확인 (임시 스크립트로 직접 쿼리, 확인 후 테스트 row 삭제해 0으로 복원)
- [x] `[코드]` 라우트 테스트 — repo mock으로 `insertMatchRequest`가 reject해도 200 유지되는지 검증 ([match.test.ts](../../server/src/routes/match.test.ts), 21건 전체 통과)
- [ ] `[UI 미검증]` 온보딩을 실제로 완주해 완료 화면 버튼을 클릭했을 때도 동일하게 저장되는지 (curl은 버튼 클릭 자체를 대체하지 못함)

## 5. 자동 검사

- [x] `npm run build -w @hub/server` 통과
- [x] `npm run build:client` (`tsc -b && vite build`) 통과
- [x] `npm test` — 3 files, 21 tests 통과
- [x] `npm run lint` (oxlint client + server) 통과

---

## 결정 사항

- **jsdom + Testing Library 컴포넌트 테스트는 이번엔 도입하지 않음.** `[UI 미검증]` 항목은 문서로만 남기고, 실제 확인은 #9의 브라우저 수동 검증 1회에서 처리한다. 이유: 이번 세션은 검증 문서화가 목적이고, 테스트 인프라 도입은 별도 판단이 필요한 범위 확장이라 시간 대비 실익을 #9 이후로 미룸.

## 남은 리스크 / 다음에 볼 것

1. **`sort=new` 순서 미보장** — 위 2번 항목. `.order('id', { ascending: true })` 추가로 #9에서 수정 예정 (계획서에 이미 등록).
2. **`useSubsidies.ts` stale 주석** — 동작엔 영향 없으나 `POST /api/match` 미구현 시절 문구가 남아 있어 혼동 소지. #9 또는 별도 정리 커밋에서 수정 권장.
3. 위 `[UI 미검증]` 항목들은 브라우저 자동화 도구가 없어 이번 세션에선 실제 클릭 확인을 못했음 — #9에서 `npm run dev` 기동 후 온보딩 → 홈 → 정렬 칩 → 상세 → 외부 링크 전체 흐름을 눈으로 한 번 훑는 걸 권장.
