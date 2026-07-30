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

## 2026-07-30 2차 점검 — 재배포 필요 확인

- **대상**: FE `https://articles-client-nine.vercel.app` (Vercel), BE
  `https://articles-server-lc3l.onrender.com` (Render)
- **배경**: 로컬 `work` 브랜치에 인사이트 노트 카드 삭제(`d4a2ac8`), 단어장
  삭제(`2b84deb`), 기사 분석 캐싱(`f00b931`), 인사이트 노트 상세 AI 3줄
  요약/인사이트 레이블(`cd68be2`) 등 최근 커밋을 반영해 재배포하기 전 사전
  점검.
- **소스 상태**: 로컬 `work`는 `origin/work`와 완전히 동기화(`cd68be2`,
  working tree clean) — push는 이미 끝난 상태. 저장소에 `vercel.json`/
  `render.yaml` 등 IaC 배포 설정이 없어 두 플랫폼 모두 대시보드 기반
  배포이고, 로컬에 `vercel`/`render` CLI나 `.vercel` 연결도 없음 — 배포
  트리거 자체는 대시보드에서 수동 확인/실행 필요.

### 1. BE 생존 확인
- `GET /api/health` → `{"success":true,"data":{"status":"ok"}}` (200).
- `GET /api/dashboard` → 200, CNBC 기사 3건 정상 반환(기사 날짜
  2026-07-29 — RSS 큐레이션 파이프라인이 최근에도 정상 동작 중임을 시사).
- 기사 분석 캐싱(`f00b931`)이 실제 배포된 BE에 반영됐는지는 실제 Claude
  호출 비용 때문에 이번엔 API로 직접 검증하지 않음 — Render 대시보드
  "Events"에서 배포된 커밋 해시가 `cd68be2`(또는 그 이후)인지로 대신
  확인할 것.

### 2. FE 배포 최신성 — **stale 확인됨, 재배포 필요**
- FE 루트(`/`) 200, 번들 `/assets/index-CXduaqo8.js`에
  `articles-server-lc3l.onrender.com`이 박혀 있고 `localhost:4000`은 없음 —
  올바른 백엔드를 가리키는 점은 정상.
- **다만 아래 최근 3개 커밋에서 새로 추가된 한국어 문자열이 배포된 번들에
  전혀 없음(각 0건) — 즉 현재 라이브 FE는 이 커밋들 이전 빌드로, 재배포가
  실제로 필요한 상태:**
  - `2b84deb`(단어장 삭제): `"...에 저장된 단어 N개를 모두
    삭제하시겠습니까?"`, `"이 단어를 삭제하시겠습니까?"`
    (`Vocabulary.jsx`) — 번들에 0건
  - `d4a2ac8`(인사이트 노트 카드 삭제): `"이 노트를 삭제하시겠습니까?"`
    (`InsightNote.jsx`) — 번들에 0건
  - `cd68be2`(AI 3줄 요약/인사이트 레이블): `"AI 3줄 요약"`
    (`InsightDetail.jsx`) — 번들에 0건 (단, 더 오래된
    `BottomSheet.jsx`의 `"AI 인사이트"` aria-label은 존재 — 이건 최근
    커밋과 무관한 기존 문자열이라 최신성 근거가 되지 못함)

### 결론 / 다음 액션
- BE는 생존·핵심 API 정상, 최신 커밋 반영 여부는 Render 대시보드에서
  배포된 커밋 해시로 재확인 필요.
- **FE는 명확히 재배포가 필요.** Vercel 대시보드 → Deployments에서
  `cd68be2` 커밋이 최신 배포로 올라가 있는지 확인하고, 없다면 수동
  Redeploy(또는 자동 배포 훅 자체가 걸려 있는지) 확인할 것. 재배포 후
  환경변수(`VITE_API_BASE_URL`/Supabase 2종)도 값이 비어있지 않은지 함께
  점검.
- 재배포 완료 후에는 위 3개 문자열이 번들에 나타나는지로 재확인 가능하고,
  브라우저로 실제 삭제 동작(단어장 개별/날짜 카드, 인사이트 노트 카드)과
  캐싱 동작(같은 URL 재분석 시 단어장 중복 미적재)을 직접 클릭해 확인해야
  함(API 호출만으로는 렌더링/클릭 동작까지 검증 불가).
