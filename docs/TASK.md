# 개발 일정 (2026-07-13 ~ 2026-07-24, 테스트 시작 2026-07-25)

목표: 2주간 MVP 핵심 기능 개발 완료 → **7/25(토) 테스트 시작**

우선순위 기준은 `backlog.md`의 P0~P3 분류를 따른다. 아래 일정은 P0(기반) → P1(MVP 핵심) → P2(MVP 보강) 순으로, 백엔드 의존성이 프론트보다 먼저 끝나도록 배치했다. 현재 상태: 백엔드는 서버 골격(`app.ts`/`server.ts`/`errorHandler`)만 존재하고 Prisma 스키마·공공데이터 연동·라우트/컨트롤러/서비스는 전무. 프론트는 페이지 파일이 전부 3줄짜리 빈 스텁이고 라우팅도 아직 없음.

Week 1 초반(Day 1~2)은 학습 가이드라인의 취지를 반영해, 가장 단순한 기능(품목 검색) 하나를 **mock 데이터 → 실 데이터** 순서로 완전히 연결하는 vertical slice(화면 요청 → Express → Supabase 단일 테이블 조회 → 응답 → 화면 갱신)를 먼저 완성한다. Day 3부터 나머지 스키마(`DisposalRule`/`RegionRule`)와 기능을 필요해질 때마다 점진적으로 확장한다.

범례: `[ ]` 미완료 · `[x]` 완료(백로그 기준) · **FE**/**BE** 담당 축

---

## Week 1 (7/13 월 ~ 7/19 일) — 품목 검색 vertical slice 완성 → 핵심 플로우 확장

### Day 1 (7/13 월) — P0: vertical slice 착수 (mock FE + Supabase/DB 세팅)
- [ ] **FE** `SearchPage`를 mock 데이터(하드코딩 배열)로 먼저 구현 — 검색창 state + 결과 리스트 렌더링까지 화면 흐름만 우선 확인 (아직 API 연결 없음)
- [ ] **FE** `react-router-dom` 라우팅 스켈레톤: `/`, `/search`, `/result`, `/rules`, `/bulky`, `/confirm`, `/points` — `/search` 외 나머지는 여전히 빈 스텁
- [ ] **FE** 공통 레이아웃/네비게이션 컴포넌트 (`skill.md` 디자인 시스템 토큰 사용)
- [ ] **BE** Supabase 프로젝트 생성 (무료 티어) → Postgres 연결 문자열 발급
- [ ] **BE** Prisma 초기화 (`prisma init`), `backend/.env`의 `DATABASE_URL`을 Supabase Postgres 연결 문자열로 설정 후 연결 확인 (ORM은 Prisma 유지, DB 호스팅만 Supabase — `@prisma/client`를 dependencies에 추가 필요)
- [ ] **BE** `schema.prisma`에 `Item`(표준 품목) 모델 하나만 우선 정의 — vertical slice 범위를 한 테이블로 제한, `DisposalRule`/`RegionRule`은 각 기능이 필요해질 때 추가
- [ ] **BE** 최초 migration 실행 + `Item` 테이블에 시드 데이터 2~3개 입력

### Day 2 (7/14 화) — P0/P1: vertical slice 완성 (실 연동) — 품목 검색 완료
- [ ] **BE** `GET /api/items/search?q=` 라우트/컨트롤러/서비스 — Prisma로 Supabase `Item` 테이블 조회
- [ ] **FE** `SearchPage`를 `apiClient.ts` 기반 TanStack Query 훅으로 전환, mock 데이터를 제거하고 실제 API 응답으로 교체
- [ ] **FE/BE** 통합 확인: 검색어 입력 → 요청 → Supabase 조회 → 응답 → 화면 갱신까지 한 사이클 수동 테스트 (vertical slice 완료 기준)
- [ ] **BE** 에러 핸들링 점검 — 빈 검색어/결과 없음 시 `errorHandler`로 위임되는지 확인

### Day 3 (7/15 수) — P0: 외부 연동 준비 + 스키마 확장
- [x] **BE** 공공데이터포털 분리배출 정보 API 조사 + API 키 발급 신청 — 두 API 신청/승인 완료:
  - `기후에너지환경부_분리배출 정보조회 서비스` (15156866, `getItem`/`getSpot`) — `getItem`은 품목명→대표 배출방법 조회로 `DisposalRule`에 사용, 데이터 공간범위는 서울시 기준이지만 분리배출 "방법"은 지역과 무관하게 전국 공통 기준(환경부 고시)이라 판단해 전국 기본값으로 채택(`sourceRegion` 필드로 출처만 명시). `getSpot`(분리배출 장소 좌표 조회)은 Day 10 주변 수거 장소 기능에 재사용 예정.
  - `행정안전부_생활쓰레기배출정보 조회서비스` (15155080) — 지역별 배출요일/배출기준 데이터라 Day 6 `RegionRule`에서 사용 예정, Day 3 범위 아님.
- [x] **BE** 공공데이터 API 클라이언트 `services/` 작성 — `services/govDisposalApiClient.ts`(실 API, `WasteRecyclingService/getItem` 호출·검증 완료), `services/mockGovDisposalApiClient.ts`(mock), `services/disposalApiClient.ts`(`PUBLIC_DATA_SERVICE_KEY` 존재 여부로 real/mock 선택하는 팩토리), 타입은 `types/govDisposalApi.ts`
- [x] **BE** Object Normalizer 매핑 테이블 설계 — `services/objectNormalizer.ts`, Vision AI 라벨 → `Item.name`(정부 API `itemNm` 검색어와 동일 값) 매핑. ~~정적 ~12개 영어 사전~~ → **동기화된 731개 카탈로그 기반 매칭으로 교체(7/20)**, 리스크&메모 참고
- [x] **BE** `schema.prisma`에 `DisposalRule` 모델 추가 + migration (`20260715090127_add_disposal_rule`) — 실제 API 응답이 `itemNm`/`dschgMthd` 단일 텍스트만 제공하므로 README의 단계별/부품별/실수/이유 세부 필드는 만들지 않음(원본 정부 데이터를 가공 없이 캐시); 단계별 가공은 Day 5 LLM 설명 생성 단계에서 수행

### Day 4 (7/16 목) — P1: 사진 인식 플로우 (BE)
- [x] **BE** 사진 업로드 라우트 — `routes/index.ts`, multer(`memoryStorage`, 5MB 제한) + `fileFilter`로 jpeg/png/webp만 허용 (계획한 zod 검증 대신 multer `fileFilter`로 구현)
- [x] **BE** Vision AI 연동 서비스 — 이미지 → Top Prediction, Confidence Score 미사용. ~~OpenAI Vision API~~ → **Gemini로 변경** (7/19, 무료 티어 사용 목적, 리스크&메모 참고) — `services/geminiVisionApiClient.ts` (+ mock fallback)
- [x] **BE** 인식 플로우 연결: 업로드 → Vision AI → Object Normalizer(현재는 카탈로그 매칭) → 공공데이터 API 조회 → (Day 5) LLM 설명까지 연결 완료. Confidence 임계값 분기 없음, 매칭 실패(404) 시 FE에서 Search로 폴백
- [x] **FE** HomePage 촬영/업로드 UI (`prototype/home.html` 매칭) — 카메라/갤러리 버튼 시트, `capture="environment"` input

### Day 5 (7/17 금) — P1: LLM 설명 + 결과 화면
- [x] **BE** LLM 설명 생성 서비스 — 공식 데이터(`method`)를 단계별 안내/부품별 분리/자주 하는 실수/이유로 가공, `DisposalRule`에 `steps`/`parts`/`commonMistakes`/`reason`/`explainedAt` 컬럼 추가해 최초 조회 시 lazy 생성 후 캐시 (기존 `DisposalRule` 캐싱과 동일 패턴). ~~OpenAI~~ → **Gemini** (`services/geminiExplanationClient.ts`, + mock fallback). 새 규정을 만들지 않고 원본 텍스트만 가공하도록 프롬프트로 강제 — CLAUDE.md 원칙 준수, 실제 Gemini 응답으로 검증 완료(건전지/음료 페트병)
- [x] **BE** `POST /api/recognize` 엔드포인트 end-to-end 연결 (사진 → 결과 JSON) — 실제 이미지로 curl 테스트 완료 (200/404 정상 동작)
- [x] **FE** ResultPage 구현 — `prototype/result.html` 매칭 구조(단계/부품별 분리/자주 하는 실수/이유 카드)로 실 데이터 렌더링. `ConfirmPage`(기존 3줄 스텁)도 이번에 실제로 구현 — 사진 state 수신 → `/recognize` 호출 → 단일 결과 확인 → `/result/:itemId` 이동, 매칭 실패 시 `/search` 폴백. **단, `prototype/confirm.html`의 다중 후보(%) UI는 구현 안 함** — 백엔드가 Top Prediction 1개만 반환하는 정책과 맞지 않아 가짜 신뢰도 수치를 만들지 않기로 결정 (필요 시 별도 논의)
- [x] **FE/BE** 통합 테스트 — **백엔드는 실제 이미지 curl 요청으로 end-to-end 검증 완료** (recognize 200/404, disposal-rule 신규 설명 생성 모두 실 Gemini 응답으로 확인). **브라우저에서 직접 클릭해보는 수동 확인은 아직 안 함** — 브라우저 자동화 도구가 없어 대신 dev 서버만 띄워둔 상태, 팀에서 직접 클릭 확인 필요

### Day 6 (7/18 토) — P1/P2: 지역별 규정 + 오늘/일주일 배출 일정
- [ ] **BE** 지역(시/도, 구/군) 데이터 모델(`RegionRule`) + migration + `GET /api/regions/:region/rules` (배출 요일/규정)
- [ ] **FE** RulesPage — 지역 선택 UI 및 규정 표시 (`prototype/rules.html`)
- [ ] **FE** HomePage에 "오늘의 배출 일정" 섹션 — 저장된 지역 기준 오늘 배출 가능 품목 표시
- [ ] **BE** `GET /api/regions/:region/rules` 응답에 요일 범위 파라미터 추가 (오늘 하루 → 이번 주 전체로 확장, 같은 지역 규정 데이터 재사용)
- [ ] **FE** HomePage에 "일주일 배출 일정" 섹션 추가 — README MVP 범위에 새로 추가된 항목, 오늘의 일정과 같은 컴포넌트/데이터를 주간 뷰로 확장

### Day 7 (7/19 일) — 버퍼 + Week 1 정리
- [ ] Week 1 산출물 통합 점검 (검색 → 사진 인식 → 지역 규정까지 end-to-end 수동 QA)
- [ ] 밀린 항목 정리, backlog.md 업데이트
- [ ] (선택) 휴식 또는 다국어 설계 사전 조사

---

## Week 2 (7/20 월 ~ 7/24 금) — 다국어 + 보강 기능 + 테스트 준비

### Day 8 (7/20 월) — P1: 다국어 지원 (한/영, Translate 토글) — 7/23 실제 구현
- [x] **BE** LLM 번역 파이프라인 — `geminiExplanationClient`가 steps/parts/commonMistakes/reason을 ko/en 한 번의 호출로 함께 생성, `DisposalRule`에 `stepsEn`/`partsEn`/`commonMistakesEn`/`reasonEn`/`explainedAtEn` 컬럼 추가해 캐시(토글 클릭 시 재요청 없음)
- [x] **FE** ResultPage에 "Translate" 버튼 추가 — 클릭 시 한국어 ↔ 영어 전환. **SearchPage는 제외** — 품목명(`Item.name`)만 보여줄 뿐 번역할 설명 텍스트가 없어 토글이 적용될 대상이 없음(영어 검색 자체는 `backlog.md`의 별개 항목 `nameEn`)
- [x] **FE/BE** 토글 동작 검증: 실제 Gemini로 이미 캐시돼 있던 기존 품목("건전지", 한국어만 캐시된 상태)에 대해 curl로 재조회 → `en` 필드가 정상 백필되고 `explainedAt`은 그대로 유지됨을 확인. 두 번째 조회에서 `explainedAtEn` 타임스탬프가 그대로임을 확인해 재생성 없이 캐시되는 것도 검증. 백엔드 유닛 테스트(`itemService.test.ts`) 3건 추가(신규 생성/기존 항목 백필/이미 캐시된 경우 재생성 안 함). **브라우저에서 버튼 클릭 확인은 브라우저 자동화 도구가 없어 아직 못 함**

### Day 9 (7/21 화) — P2: 대형폐기물 신고 가이드 — 7/24 실제 구현 (Issue #10)
- [x] **BE** 품목 → 지역 → 수수료 조회 API, 공식 신고 사이트 링크 데이터 — 처음엔 전국 통합 API가 없다고 보고 손으로 시드할 계획이었으나, 스코핑 중 실제 공공데이터(환경부_전국대형폐기물수거수수료정보표준데이터, `tn_pubr_public_lar_was_fee_api`, 143개 지자체)를 찾아 `BulkyWasteFee`에 전량(22,831건) 배치 동기화(`syncBulkyWasteFees.ts`)로 전환. 신고 사이트 URL은 API에 없어 실제로 확인한 2개 지자체만 `BulkyWasteReportSite`에 시드(`seedBulkyWasteReportSites.ts`)
- [x] **FE** BulkyPage 구현 (`prototype/bulky.html`) — 지역바(전역 선택 재사용) → 품목 선택(지역별 실제 데이터로 채워짐) → 수수료 카드(같은 품목명이 규격 구분 없이 여러 fee로 존재해 전부 나열) → 공식 신고 사이트 이동(없으면 "아직 없음" 안내)
- [ ] **FE** ConfirmPage 연결 — 스코프 제외: `ConfirmPage`는 이미 사진 인식 확인 화면으로 쓰이고 있고(Day 5), `prototype/bulky.html` 자체도 별도 확인 화면 없이 수수료 카드에서 바로 신고 버튼으로 이어짐 — 애초에 안 맞는 요구사항이었음

### Day 10 (7/22 수) — P2: 주변 수거 장소(리스트) + 마무리 기능 — 7/25 실제 구현 (Issue #11)
- [x] **BE** 주변 수거 장소 데이터 모델(`CollectionPoint`: category/name/address/hours, 좌표 제외) + migration + 시드 데이터(`scripts/seedCollectionPoints.ts`) — `getSpot`(getItem과 동일 서비스키, 15156866) 실제 호출 시도했으나 파라미터 조합(itemNm/type/dataType) 모두 `INVALID_REQUEST_PARAMETER_ERROR` — 좌표 기반 검색만 지원하는 것으로 추정되고 이번 이슈 범위(좌표 제외)와도 안 맞아 채택 안 함. 실 지자체 데이터 소스 확보 전까지는 데모용 예시 데이터(`prototype/points.html` 목업 명칭 재사용)로 시드 — 실제 공공데이터 아님을 명시.
- [x] **BE** `GET /api/collection-points?category=` — zod `z.enum(['건전지','형광등','소형가전','종이팩'])`, 잘못되거나 없는 category는 `errorHandler`로 위임(400) 확인 완료
- [x] **FE** 수거 장소 리스트 화면 — 지도 없이 카테고리 탭 + 목록/주소/운영시간 텍스트 표시, 브라우저에서 카테고리 전환·영어 토글까지 실제 확인 완료(headless Chrome + playwright-core로 스크린샷 검증)
- [x] **FE** PointsPage 범위 확정 — README MVP 범위(`docs/ABOUT_PROJECT.md` §6)에 핵심 기능으로 명시돼 있어 범위 밖이 아님을 확인, `backlog.md` 갱신 반영
- [x] 전체 화면 디자인 시스템(`skill.md`) 일관성 점검 — PointsPage는 기존 카드/구분선/필 버튼 패턴과 일치. 기존 화면 중 `HomePage.tsx`가 `rounded-[20px]`(토큰 스케일 16/10/12/22 밖)와 `text-[#cfe8db]`(토큰 외 임의 색상)를 쓰는 것을 발견했으나, 이번 이슈 범위 밖이라 수정하지 않고 여기에만 기록(별도 이슈로 분리 필요)

### Day 11 (7/23 목) — 통합 + 버그 픽스
- [ ] 전체 기능 end-to-end 리허설: 검색 → 사진 인식 → 결과 → 지역 규정 → 오늘/일주일 일정 → 대형폐기물 신고
- [ ] `npm run lint` (oxlint FE + BE), `tsc -b` 타입 에러 제로화
- [ ] 알려진 버그 목록화 및 우선순위별 수정

### Day 12 (7/24 금) — 테스트 준비 마감
- [ ] 남은 버그 픽스 / 코드 정리
- [ ] PR 정리: 브랜치별로 `[루카스아이디_실명] - 작업 요약` 형식 PR 생성, 템플릿 4개 섹션 작성
- [ ] 테스트 시나리오 문서 작성 (골든 패스 + 엣지케이스: 인식 실패, 지역 미설정, 네트워크 오류 등)
- [ ] 배포/테스트 환경 점검 (`.env` 값, DB 마이그레이션 최신 상태 확인)

---

## 7/25 (토) — 테스트 시작

---

## Week 3 (7/27 월 ~ 7/29 수, 스트레치 — 테스트와 병행) — 주변 수거 장소 지도 시각화

Day 10에서 만든 수거 장소 리스트 데이터에 지도를 얹는 후속 스프린트. 테스트 시작(7/25) 이후 진행하며 MVP 완성 기준에는 포함하지 않는다.

- [ ] **BE** 지도 API(카카오맵/네이버 지도 등) 조사 + 키 발급
- [ ] **BE** 수거 장소 데이터에 좌표(위경도) 필드 추가 — 주소→좌표 변환 또는 공공데이터 좌표 소스 확보
- [ ] **FE** 지도 컴포넌트 구현 — Day 10 리스트 데이터를 지도 마커로 표시
- [ ] **FE/BE** (선택) 현재 위치 기반 반경 필터링
- [ ] 테스트 기간 피드백과 병행하여 우선순위 재조정

---

## 리스크 & 메모
- **DB 호스팅은 Supabase(무료 티어) + Prisma ORM** 조합으로 확정. Prisma는 완전 무료 오픈소스 라이브러리이고, 무료 티어 제약(장기 미사용 시 프로젝트 일시정지 등)은 Prisma가 아닌 Supabase 쪽 제한이므로 개발 중 DB 연결이 끊기면 Supabase 대시보드에서 프로젝트 재개(resume) 여부부터 확인할 것.
- **공공데이터포털 API 키 발급**은 승인까지 시간이 걸릴 수 있으므로 Day 2에 최우선으로 신청하고, 승인 전까지는 mock 데이터로 병행 개발할 것.
- **주변 수거 장소 안내**는 README MVP 범위에 명시된 기능이라 리스트/데이터 부분은 Day 10에 2주 일정 안으로 끌어왔다. 지도 시각화만 Week 3 스트레치로 분리 (`backlog.md` P3 참고).
- **PWA 오프라인 강화**, **인증/계정**은 README에 없는 항목으로 이번 2주 및 Week 3 범위에서도 제외. 필요 시 별도 논의.
- **PointsPage**는 README MVP 범위에 없어 스코프 확인 전까지 최소 스텁 유지 (`backlog.md` P2 항목 참고).
- **다국어 UI는 상시 병기 → Translate 토글 방식으로 변경됨** (README 갱신 반영, Day 8). `docs/plan-agent.md`의 [제약 조건 4]가 아직 옛 "한국어 항상 병기" 기준으로 남아있어 이 부분과 어긋남 — plan-agent.md는 별도 논의 후 갱신 필요.
- **자주 헷갈리는 품목**은 README에서 기능 설명이 빠져 2주 일정에서 제외(P3로 이동).
- **일주일 배출 일정**은 README MVP 범위에 새로 추가된 항목이라 Day 6에 "오늘의 배출 일정"과 함께 묶어 넣었다.
- 백엔드 P0(Supabase/Prisma/검색 vertical slice/공공데이터/Normalizer)가 지연되면 이후 모든 P1 항목이 연쇄적으로 밀리므로, Week 1 전반부(Day 1~3)를 최우선으로 사수할 것.
- **Day 1~2는 품목 검색 하나만으로 vertical slice(화면→서버→DB→응답→화면)를 완성**하는 데 집중한다 — 학습 가이드라인의 "mock 데이터로 화면 흐름 먼저 확인 → 실 연동" 순서를 반영. 나머지 스키마(`DisposalRule`은 Day 3, `RegionRule`은 Day 6)는 해당 기능이 필요해질 때 추가한다.
- **Vision AI/LLM 제공자를 OpenAI → Gemini로 변경(7/19)**. 사유: OpenAI API는 상시 무료 티어가 없고(계정에 결제 등록 필요, `insufficient_quota` 확인함) Gemini는 무료 티어 한도가 있어 데모 목적에 더 적합. `services/geminiClient.ts`에서 `gemini-2.5-flash` 사용 후 일일 한도(429) 도달 시 `gemini-2.5-flash-lite`로 자동 폴백하도록 구현. README `기술 스택` 절 갱신 필요.
- **Day 4~5 실제 완료 상태 재확인(7/19~20)**: TASK.md 체크박스가 실제 코드 상태와 안 맞아 있었음(Day 4/5 항목이 모두 미체크였지만 코드는 부분적으로 이미 존재) — Vision AI는 API 키 미설정으로 mock만 동작 중이었고, `ConfirmPage`는 3줄 스텁이라 사진 업로드 후 결과까지 이어지는 경로 자체가 끊겨 있었으며, Day 5의 핵심인 LLM 설명 생성 서비스는 아예 없었음. 오늘 세 가지 모두 실제로 구현하고 실 API로 검증 완료. **앞으로는 코드 작업 완료 시 TASK.md 체크박스를 그때그때 갱신할 것** — 밀린 상태로 두면 실제 진행 상황을 파악하기 어려워짐.
- **사진 인식 로딩 무한 대기 버그(7/20)**: 실제 사진 업로드 테스트 중 응답은 정상 도착(200)하는데도 `ConfirmPage`가 "분석 중" 상태에 멈추는 버그 발견. 원인은 `useMutation`을 `useEffect`에서 호출하는 패턴이 React StrictMode의 effect 이중 호출과 충돌해 완료 알림을 놓치는 것 — `useQuery(enabled)`로 전환해 수정. [[feedback_strictmode_mutation_in_effect]] 메모 참고, 향후 "데이터 준비되면 한 번 실행" 패턴은 이 방식을 따를 것.
- **Object Normalizer를 정적 사전 → 카탈로그 매칭으로 교체(7/20)**: 실제 사진(바나나 껍질) 테스트 중 인식 실패 발견 — 원인은 `objectNormalizer.ts`의 하드코딩 사전이 병/건전지/종이팩류 ~12개만 커버했기 때문(정작 "바나나 껍질"은 동기화된 카탈로그에 이미 있어서 검색으로는 찾아짐). Vision AI 프롬프트를 영어 라벨 대신 한국어 품목명 추측으로 바꾸고, 731개 전체 카탈로그에 대해 `contains` 매칭(`itemService.findBestMatchingItem`)하도록 변경 — 새 품목 추가할 때마다 사전에 손으로 추가할 필요 없어짐.
- **Day 8 다국어 지원(7/23, Issue #9) 구현 범위 조정**: 이슈 설명은 "ResultPage/SearchPage에 Translate 버튼 추가"였지만, SearchPage는 품목명(`Item.name`)만 표시할 뿐 LLM이 가공한 설명 텍스트가 없어 번역할 대상 자체가 없었음 — SearchPage 토글은 스코프에서 제외하고 ResultPage에만 구현. 또한 Gemini 호출을 한/영 두 번이 아니라 한 번의 JSON 응답으로 묶어 `{ko: {...}, en: {...}}` 구조로 받도록 설계 — 토큰/호출 비용을 줄이고 "재요청 없이 즉시 전환"을 자연스럽게 만족시킴. `DisposalRule.explainedAt`(한국어 생성 시각)과 `explainedAtEn`(영어 생성 시각)을 분리해 이 기능 이전에 캐시된 기존 항목(한국어만 있음)도 다음 조회 시 영어만 자동 백필되도록 함 — 실제로 기존에 캐시돼 있던 "건전지" 데이터로 검증 완료.
- **다국어 지원을 앱 전체로 확장(7/23)**: 사용자가 "한국어를 전혀 모르는 사람도 앱을 쓸 수 있게" 해달라고 요청 — Plan 서브에이전트로 아키텍처를 먼저 설계한 뒤(정적 UI 문구는 LLM이 아니라 타입 안전한 사전으로, 정부 원본 데이터는 모델별로 다른 캐싱 전략으로, 영어 검색은 nameEn 사전 매칭 우선 + LLM 폴백은 후순위) 사용자 확인을 받고 Phase 0만 이번에 구현:
  - `frontend/src/i18n/{ko,en}.ts` + `LanguageContext`(localStorage에 저장돼 페이지 이동해도 유지됨 — 기존 ResultPage 로컬 `useState`는 이동 시 초기화되던 버그였음) + `PageHeader`에 토글 내장(Home/Search/Result/Confirm/Rules 전 페이지 자동 적용) + `RegionSelectSheet` 번역
  - `Item.nameEn` 컬럼 + `backend/scripts/syncItemNamesEn.ts`(731개 전체 배치 번역, `DisposalRule.method`를 모호한 품목명 구분용 힌트로 함께 전달) 실행 완료 + `searchItems`가 `name OR nameEn`으로 매칭하도록 변경 — "battery"→건전지류, "Plastic"→비닐/플라스틱류 등 실제 영어 검색으로 검증 완료
  - **이번에 안 한 것(다음으로 미룸, 사용자 승인됨)**: `RegionRule.categories[category].method`(지역별 배출방법 원문) 영어 번역 — RulesPage/HomePage에서 영어 모드에도 이 부분만 한국어로 남음. 영어 검색 0건 시 LLM이 한국어 후보를 추론해 재검색하는 폴백도 다음으로 미룸. `BulkyPage`/`PointsPage`(아직 빈 스텁)도 범위 밖. (시/도·구/군·동 지명 번역은 다음 날 7/24에 별도로 구현 — 아래 참고.)
  - 부수적으로 발견/수정: `RegionSelectSheet.test.tsx`가 `LanguageProvider` 없이 렌더링해 새로 실패했던 것을 프로바이더로 감싸 수정(회귀).
- **지역 선택기(시/도·구/군·동) 영어 표기 추가(7/24)**: `Item.nameEn`과 같은 방식(배치 동기화)을 지명에도 그대로 쓸 수 있는지 문의받아, 규칙 기반 로마자 변환 라이브러리(`@romanize/korean`)를 실제로 설치해 실제 지명으로 검증한 뒤 채택 여부를 결정했음 — "강릉시"를 "Gangreung-si"로 잘못 표기(올바른 표기는 "Gangneung-si"; ㄹ이 앞 음절 받침 ㅇ 뒤에서 ㄴ으로 비음화되는 규칙을 그 라이브러리가 구현하지 않음)하는 실제 오류를 발견해 기각. 대신 이미 검증된 Gemini 기반 패턴을 재사용(`geminiRegionNameClient.ts`) — 실제로 존재하는 지명이라 LLM이 실제 사용례를 통해 정확한 표기를 알고 있을 가능성이 높다는 판단. 데이터 소스 구조가 서로 달라 캐싱 방식도 이원화: `RegionDistrict.ctpvNmEn`/`sggNmEn`(이미 전량 동기화된 테이블이라 `Item.nameEn`처럼 배치 스크립트로 일괄 채움, `npm run sync:region-names-en`) vs `RegionZoneName`(신규 모델, 동/읍/면은 전량 동기화 목록이 없어 실제로 조회된 이름만 지연 캐시, 지역과 무관하게 텍스트 자체로 캐시). 배치 스크립트 실행 중 Gemini 503(일시적 과부하)로 중단됐다가 재실행 시 이미 채워진 행을 건너뛰고 정상적으로 이어서 완료되는 것도 확인. 1차 결과 검수 중 시/도 단위에서 "서울특별시"→"Seoul-teukbyeolsi"처럼 접미사까지 그대로 로마자 표기하는 부자연스러운 결과를 발견 — 프롬프트에 "특별시/광역시/특별자치시는 접미사를 생략", "도/시/군/구는 -do/-si/-gun/-gu 유지" 예시를 명시해 재실행 후 "Seoul", "Busan", "Gyeonggi-do" 등 자연스러운 형태로 수정. 대구 북구 33개 동(괄호 병기 변형 포함, 예: "관문동(매천제외)"→"Gwanmun-dong (excluding Maecheon)")으로 실제 검증 완료.
- **테스트 환경 참고**: `frontend/src/features/region/weeklySchedule.test.ts`에 dow가 "매일"인 경우를 다루는 실패 테스트가 있음(2026-07-23 확인, 이번 다국어 작업과는 무관) — `buildWeeklySchedule`이 "매일"을 요일 목록(`DAY_ORDER`)의 일부로 인식하지 못해서 발생하는 기존 버그로 추정, 별도 픽스 필요.
- **대형폐기물 수수료 데이터 소스 발견(7/24, Issue #10)**: 처음엔 전국 통합 API가 없다고 판단해 수동 시드(웹 조사로 지자체 2곳만 확인)로 진행하려 했으나, 실제로 웹 스크레이핑 방식(구청 사이트를 하나씩 확인)으로 가려던 걸 사용자가 지적해 멈춤 — 사용자가 직접 data.go.kr에서 `전국대형폐기물수거수수료정보표준데이터`(15114146, `tn_pubr_public_lar_was_fee_api`, 143개 지자체, 자동승인)를 찾아줘서 전체 설계를 실 API 기반으로 전환. 실제 호출로 확인한 것: `items`가 `household_waste_info`처럼 `{item: [...]}`이 아니라 배열 그대로 내려오고, `totalCount`/`fee` 등 숫자도 문자열로 내려옴. 필터 없이 호출했을 때 "SERVICE KEY IS NOT REGISTERED ERROR"가 떴다가 바로 재시도하니 정상 응답하는 플레이키한 현상도 실측으로 확인해 페이지별 재시도 로직을 추가함 — 실제로 22,831건 전체 동기화는 재시도 없이 한 번에 성공.
- **larWasSpcfct(규격) 표본 오류 정정(7/24)**: 처음엔 해운대구·대구 북구 2개 지자체만 테스트해보고 `larWasSpcfct`/`mngInstNm`이 "항상 `null` 문자열"이라고 결론 내려 스키마에서 아예 뺐음. 사용자가 "규격 데이터를 꼭 보여줘야 하지 않냐"고 재차 질문해서 전국 데이터를 다시 전수 확인했더니 틀렸음이 드러남 — 실제로는 22,831건 중 11,882건(52%)이 실제 규격값을, 11,127건(49%)이 실제 관리기관명을 갖고 있었음(하필 처음 테스트한 두 지자체만 둘 다 비어있었던 것). `BulkyWasteFee`에 `spec`/`mngInstNm` 컬럼을 추가하고 재동기화, 프론트에는 규격이 있으면 카테고리 아래 보조 텍스트로 표시하고 공식 신고 사이트가 없을 때 관리기관명을 문의처로 안내하도록 반영. **교훈**: "실측 확인"이라고 할 때 표본이 2개뿐이면 실측이 아니라 추측에 가깝다 — 전국/전체 단위 데이터에 대한 결론은 전체(혹은 충분히 큰 무작위 표본)를 돌려보고 내릴 것.
- **주변 수거 장소 데이터 소스 미확정(7/25, Issue #11)**: Day 3에 재사용 예정이라 적어뒀던 `getSpot`(15156866, getItem과 같은 서비스)을 실제로 호출해봤으나 pageNo/numOfRows/itemNm/type/dataType 등 여러 파라미터 조합 모두 `INVALID_REQUEST_PARAMETER_ERROR`만 반환 — 좌표 기반 검색 전용으로 추정되고, 마침 이번 이슈 자체가 "좌표 제외" 범위라 애초에 안 맞음. 확정된 전국 API가 없어 우선 데모용 예시 데이터(`prototype/points.html` 목업에 이미 있던 명칭 재사용)로 시드하고 진행 — 대형폐기물 수수료 때처럼 나중에 실제 전국 데이터셋이 발견되면 교체 필요(CLAUDE.md 원칙상 이 시드 데이터가 실제 공공데이터인 것처럼 보이지 않도록 주석에 명시해둠).
