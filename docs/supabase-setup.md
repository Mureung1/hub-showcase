# supabase-setup.md — Supabase 연동 절차 (에이전트 c)

> 코드는 이미 준비됨(어댑터·env 스위치). 아래 3단계만 하면 in-memory → Supabase로 전환된다. **키가 없으면 자동으로 in-memory 폴백**이라 앱은 안 깨진다. 시크릿 규칙은 `docs/security-secrets.md`.

## 준비된 것 (코드)

- `backend/src/store.supabase.js` — Supabase 어댑터(in-memory와 동일 인터페이스).
- `backend/src/store.js` — `SUPABASE_URL`+`SUPABASE_SERVICE_ROLE_KEY` 있으면 Supabase, 없으면 in-memory 선택.
- `backend/db/schema.sql` — 테이블 DDL.
- `backend/src/index.js` — 저장소 호출을 async/await로 처리(두 어댑터 공통).

## 1. 테이블 생성

Supabase 프로젝트 → **SQL Editor** → `backend/db/schema.sql` 내용을 붙여넣고 실행.
- `research_results` 테이블 + `anon_id` 인덱스 + RLS(서버 전용) 생성.

## 2. 키 넣기 (커밋 금지)

`backend/.env` 파일(없으면 생성, `.env.example` 참고)에:
```
SUPABASE_URL=https://<프로젝트ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role 키>
# SUPABASE_TABLE=research_results   # 기본값과 다르면만
```
- **service_role 키**를 쓴다(RLS 우회, 서버 전용). Settings → API 에서 확인.
- `.env`는 `.gitignore`로 무시되고 pre-commit 훅이 키를 차단한다. **절대 커밋·PR 금지.**
- 프론트(`VITE_`)에는 어떤 Supabase 키도 넣지 않는다.

## 3. 의존성 설치 + 재시작

```bash
npm --prefix backend install        # @supabase/supabase-js 설치(package.json에 이미 추가됨)
npm --prefix backend run dev
```
- 부팅 로그에 `[store] 저장소 어댑터: supabase` 가 뜨면 성공.
- 확인: `curl -s localhost:3001/api/health` → `"backend":"supabase"`.

## 4. 검증 (재사용 가능한 스크립트 — 누구나, 몇 번이든)

일회성 curl이 아니라 **재사용 스크립트**로 검증한다. 다른 컴퓨터·다른 사람도 동일하게 쓸 수 있다.

```bash
npm run verify:backend
```

- 백엔드가 먼저 떠 있어야 한다(`npm --prefix backend run dev`, 다른 터미널).
- 헬스체크 → consent 없는 요청 거부 확인 → 저장 → 조회(값 일치 확인) → 삭제 → 재조회(빈 배열) 순으로 자동 검사하고, 마지막에 `✅ 전체 통과` 또는 실패 단계를 출력한다.
- **`backend`가 `"in-memory"`로 나오면** API 계약만 검증된 것 — 실제 Supabase까지 확인하려면 `.env`에 키를 넣고 서버를 재시작한 뒤 다시 실행한다(스크립트가 이 경우 경고를 출력한다).
- 다른 주소(예: 배포 서버) 검증: `API_BASE=https://내주소 npm run verify:backend`
- 스크립트: `backend/scripts/verify-store.mjs` (수동 curl 대신 이것을 쓴다).

또는 앱 화면에서: 결과 화면 → 동의 → "서버에 익명 저장" → Supabase Table Editor의 `research_results`에 행이 생기는지 눈으로 확인.

## 폴백·롤백

- 키를 지우거나 `.env`를 비우면 자동으로 in-memory로 돌아간다(무중단).
- Supabase 연결 실패 시에도 `store.js`가 in-memory로 폴백하고 경고만 남긴다(앱 유지).
