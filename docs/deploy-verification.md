# 배포 환경 점검 기록 (`docs/deploy-verification.md`)

배포된 환경에서 핵심 기능·에러 처리·새로고침 후 데이터 유지를 점검한 기록.
`docs/backlog.md`는 Task 상태(Todo/Doing/Done)만 관리하고 점검 근거(호출한
API, 응답, 코드 위치)는 남기지 않으므로, 재현 가능한 점검 결과는 이 문서에
누적한다.

## 2026-07-29 1차 점검

- **대상**: FE `https://articles-client-nine.vercel.app` (Vercel), BE
  `https://articles-server-lc3l.onrender.com` (Render)
- **방법**: 브라우저 조작 도구(Playwright 등) 없이, 배포된 서버 API를 직접
  호출하고 프론트 번들·소스 코드를 대조하는 방식으로 점검(실제 클릭/렌더링
  확인 아님 — 한계로 명시)
- **문서 불일치**: `docs/backlog.md` 4주차 표에는 "배포 | 데모용 배포 | P1 |
  Todo"로 남아있으나, `showcase/showcase.json`의 `demoUrl`과 실제 서버
  응답을 볼 때 배포 자체는 이미 완료된 상태. backlog 상태 갱신 필요.

### 1. 핵심 흐름

- FE 번들(`/assets/index-*.js`)에 `https://articles-server-lc3l.onrender.com`이
  박혀 있고 `localhost:4000`은 없음 — 프로덕션 빌드가 올바른 백엔드를 가리킴.
- `GET /api/dashboard` → 오늘의 핵심 외신 3건(CNBC) 정상 반환.
- `POST /api/article/analyze`를 실제 기사 문단으로 호출 → 고정 더미가 아닌
  문맥에 맞는 응답(문장 번역/3줄 요약) — `MOCK_LLM=false`로 실제 Claude가
  연결되어 있음을 확인.

### 2. 빈 데이터 / 잘못된 입력

- `url` 누락 → `{"success":false,"error":"url is required"}`, 다만
  HTTP 500(400이 더 적절하나 바디 포맷 자체는 스펙 준수).
- **잘못된 URL(`not-a-valid-url`)을 넣으면 에러 없이 200과 함께 하드코딩된
  fallback 기사가 조용히 반환됨** (`articleParser.js`의 의도된 동작, CLAUDE.md
  "데모 중단 방지"로 문서화되어 있음). 사용자가 잘못된 URL을 넣었다는 사실을
  알 방법이 없음 — 의도된 설계지만 UX 관점에서 재검토 여지 있음.
- 비로그인 상태로 `GET/POST /api/decisions`, `GET /api/vocabulary` 호출 →
  전부 `401 로그인이 필요합니다` 정상 동작.

### 3. 서버 오류 화면 노출 방식

- `ReaderDetail.jsx`: parse/fast-lane 실패 시 `error` state로 잡아 화면에
  에러 메시지를 그대로 렌더링(`if (error) return <div>{error}</div>`,
  L177) — 스타일링은 없지만 최소한 사용자에게 보임.
- **`Dashboard.jsx`(L9), `Reader.jsx`(L13), `Vocabulary.jsx`(L23),
  `InsightNote.jsx`(L51) — 4곳 모두 `.then()`만 있고 `.catch()`가 없음.**
  API 실패 시 unhandled rejection이 나며 화면은 조용히 빈 상태로 멈춤:
  - Dashboard: 빈 상태 메시지조차 없이 카드 없는 빈 화면
  - Reader 마스터 리스트: "오늘의 기사를 불러오는 중..."이 영구 노출(로딩과
    에러를 구분 불가)
  - Vocabulary/InsightNote: "아직 적재된 단어가 없습니다" /
    "아직 기록된 투자 판단이 없습니다"가 뜨는데, 진짜 빈 상태인지 API 에러인지
    구분 불가

### 4. 새로고침 후 데이터 유지

- 로그인 세션: Supabase 기본 설정(localStorage)이라 새로고침해도 유지됨.
- 단어장/인사이트 노트 데이터: Supabase DB에서 매번 새로 fetch하므로 실제
  데이터는 새로고침해도 유지됨.
- **`Reader.jsx`가 마스터 리스트 클릭 시 `selectedUrl` state만 바꾸고 URL
  쿼리스트링(`?url=`)은 갱신하지 않음** — 딥링크로 들어와 다른 기사를 읽다가
  새로고침하면 최초 진입 시점 기사(또는 목록 첫 기사)로 조용히 되돌아감.

### 개선 후보 (우선순위 미정)

1. Dashboard/Reader 마스터리스트/Vocabulary/InsightNote 4곳에 `.catch()`
   추가해 에러 상태를 빈 상태와 구분해서 보여주기
2. 잘못된 URL 입력 시 fallback 대신(혹은 fallback과 함께) 사용자에게 알림
3. `Reader.jsx`가 기사 선택 시 `setSearchParams`로 URL 동기화
4. `docs/backlog.md` "배포" Task 상태를 Todo → Done으로 갱신
