# API 문서

SpecFit 백엔드(`server/`)가 제공하는 REST API 정리. Base URL은 배포 환경에서 `https://specfit-62w2.onrender.com`, 로컬 개발에서는 Vite 프록시를 통한 `/api/...` 상대 경로(→ `http://localhost:4000`)입니다.

로그인/회원가입 자체는 이 서버를 거치지 않습니다 — 프론트엔드가 `@supabase/supabase-js`로 Supabase Auth를 직접 호출합니다(회원가입 `signUp`/로그인 `signInWithPassword`/로그아웃 `signOut`). 필요한 프론트 환경변수는 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`이며, 자세한 값은 각 `.env.example` 참고. `/api/bookmarks/*`만 그 결과로 발급된 Supabase 세션의 access token을 `Authorization: Bearer <token>` 헤더로 실어 보내는 방식으로 인증합니다.

---

## GET /api/health

서버·DB 연결 확인용.

**응답 200**
```json
{ "status": "ok", "db": true }
```

---

## POST /api/gap-analysis

필터+스펙을 받아 862건(또는 필터링된) 공고 전체를 판정하고 통계를 계산한다. 인증 불필요(게스트 이용 가능).

**요청 본문**
```json
{
  "filters": { "job_category": "IT전산", "is_intern": false },
  "spec": {
    "education": "학사",
    "major": "컴퓨터공학과",
    "minor_major": "경영학과",
    "career_months": 6,
    "certificates": ["정보처리기사"],
    "foreign_languages": [{ "test": "TOEIC", "score": 800 }, { "test": "OPIc", "score": "IM2" }],
    "has_computer_skill": true
  }
}
```
- `filters`는 선택(생략/`null` 가능) — 두 필드 모두 선택.
- `spec.education`은 `학력무관`/`고졸`/`전문학사`/`학사`/`석사`/`박사` 중 하나(필수). `major`는 빈 문자열이 아닌 문자열(필수). 나머지 필드는 선택이며, 값을 보낼 경우 타입이 맞아야 함(`career_months`는 0 이상 숫자, `certificates`는 문자열 배열, `has_computer_skill`은 boolean).
- `spec.foreign_languages`는 여러 시험 성적을 동시에 보유할 수 있어 `{ test, score }` 객체 배열이다. `test`가 `OPIc`이면 `score`는 등급 문자열(`NL`~`AL`), 그 외 시험이면 0 이상의 숫자여야 함. 공고는 하나의 요구 시험만 가지므로, 배열 안에 그 시험과 일치하는 항목이 있고 점수가 충족되면 통과로 판정된다.
- `spec.minor_major`는 복수전공(부전공) 보유자를 위한 선택 필드(문자열, 없으면 빈 문자열 또는 생략). 공고가 요구하는 전공이 `major`/`minor_major` 둘 중 하나와만 일치해도 전공 항목은 충족으로 판정된다.
- 검증 실패 시 **400** `{ "error": "spec.education 값이 올바르지 않습니다: ..." }` 형태.

**응답 201**
```json
{
  "id": 42,
  "created_at": "2026-07-27T04:00:00.000Z",
  "filters": { "job_category": "IT전산", "is_intern": false },
  "spec": { "education": "학사", "...": "..." },
  "stats": {
    "total": 107,
    "matched": 13,
    "ratio": 0.1214,
    "improvementRanking": [
      { "category": "education", "count": 20 },
      { "category": "career", "count": 8 }
    ]
  },
  "jobList": [
    {
      "job": { "job_id": 1, "company": "...", "title": "...", "education": "학사", "...": "..." },
      "checks": {
        "education": true,
        "career": true,
        "certificates": false,
        "major": true,
        "foreignLanguage": true
      },
      "overallMatch": false
    }
  ]
}
```
- `stats.improvementRanking`은 5개 항목(`education`/`career`/`certificates`/`major`/`foreignLanguage`) 각각 "그 항목 1개만 보완하면 지원 가능해지는 공고 수"를 내림차순 정렬한 배열 — 2개 이상 동시에 미충족인 공고는 어느 항목에도 카운트되지 않음(가중치 없는 단순 개수 기반).
- `jobList[].job`은 로컬 SQLite `jobs` 테이블 컬럼을 그대로 담은 객체(snake_case). `computer_skill`(우대 참고 항목)은 판정(`checks`)에 반영되지 않음 — 사용자가 입력한 `spec.has_computer_skill`이 참고용으로만 별도 노출됨.

---

## GET /api/gap-analysis/:id

`POST /api/gap-analysis`가 저장한 분석 결과를 id로 복원(새로고침 대응). 인증 불필요.

**응답 200**: `POST`와 동일한 형태.

**응답 404**
```json
{ "error": "분석 결과를 찾을 수 없습니다." }
```

---

## POST /api/bookmarks

공고를 북마크에 추가. **인증 필요.**

**요청 본문**
```json
{ "job_id": 1 }
```

**응답 201**: 북마크된 공고의 원본 row(로컬 SQLite `jobs` 컬럼 그대로).
**응답 400**: `job_id`가 정수가 아님. **응답 404**: 해당 `job_id`가 로컬 `jobs`에 존재하지 않음. **응답 401**: 토큰 없음/무효.

---

## DELETE /api/bookmarks/:job_id

북마크 해제. **인증 필요.**

**응답 204**: 본문 없음.

---

## GET /api/bookmarks

로그인한 사용자의 북마크 공고 목록(원본 row 배열, 판정 정보 없음). **인증 필요.**

**응답 200**
```json
[{ "job_id": 1, "company": "...", "title": "...", "...": "..." }]
```

---

## POST /api/bookmarks/evaluate

북마크한 공고들을 **지금 전달한 spec** 기준으로 재평가 — 북마크 시점의 스펙이 아니라 항상 최신 스펙으로 비교(마이페이지 상세 비교용). **인증 필요.**

**요청 본문**
```json
{ "spec": { "education": "학사", "...": "..." } }
```
- `spec` 검증 규칙은 `POST /api/gap-analysis`와 동일(`validateGapAnalysisRequest`). 검증 실패 시 400.

**응답 200**
```json
{
  "jobList": [
    { "job": { "...": "..." }, "checks": { "...": "..." }, "overallMatch": true }
  ]
}
```
- `jobList` 원소 모양은 `POST /api/gap-analysis`의 `jobList` 원소와 동일 — 프론트가 같은 표시 로직(`buildJobDisplay`)을 그대로 재사용할 수 있음.

---

## 인증 (참고)

- `requireSupabaseAuth` 미들웨어가 `/api/bookmarks/*`의 모든 라우트 앞단에서 `Authorization: Bearer <token>`을 `supabase.auth.getUser(token)`으로 매 요청마다 Supabase에 검증 위임한다(JWT를 서버가 직접 디코딩/검증하지 않음). 토큰이 없거나 무효하면 401.
- 백엔드 환경변수: `SUPABASE_URL`/`SUPABASE_ANON_KEY`(토큰 검증용)/`SUPABASE_SERVICE_ROLE_KEY`(북마크 CRUD, RLS 우회). 값의 위치는 `server/.env.example` 참고.
