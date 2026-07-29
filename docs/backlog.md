# 개발 Task & 백로그 (`docs/backlog.md`)

기획서(`docs/plan.md`)에 명시된 화면·기능·시나리오에서만 Task를 도출했습니다. 제품 범위 확장(다국어, 소셜기능 등)은 기획서에 근거가 없어 포함하지 않았습니다.

## 백로그란?

앞으로 해야 할 일을 우선순위와 함께 모아둔 목록. 완료된 일이 아니라 **아직 안 한 일들의 저장소**로,
매주 우선순위 높은 것부터 꺼내 쓰는 방식으로 관리한다.

## 우선순위 기준

기획서 5번 항목에서 기능①이 "최우선순위"로 명시되어 있어, 이를 기준으로 삼았습니다.

- **최우선**: 기획서에서 명시적으로 최우선순위로 지정한 기능 (①)
- **P0**: 없으면 서비스가 굴러가지 않는 필수 기능 (②, ③) 및 그 기반이 되는 뼈대 작업
- **P1**: 필수 기능을 완성하기 위한 후속/보조 작업

---

## 4주 로드맵

| 주차 | 목표 | 상태 |
|---|---|---|
| 1주차 | 기획서 확정, 프로토타입(HTML/CSS) 3화면 제작, 디자인 Skill 정의, 개발 환경(React+Express) 구성 | ✅ 완료 |
| 2주차 | 화면 뼈대(대시보드/리더뷰/인사이트 노트) 및 백엔드 API 뼈대 제작 | ✅ 완료 |
| 3주차 | 기능①·②·③ 실제 로직 구현 (+ DB 전환 선착수) | ✅ 완료 |
| 4주차 | 통합 테스트, 버그 수정, 배포, 발표 준비 | 🔵 진행 중 |

> 주차 배분은 기획서에 명시된 내용이 아니라, 이번 미션("4주간 언제 어떤 작업을 할지 정한다")에 따라 저희가 자체적으로 수립한 일정입니다.

---

## Task 목록

### 2주차 — 화면 뼈대 + 백엔드 뼈대

| Task | 설명 | 우선순위 | 요일 | 상태 |
|---|---|---|---|---|
| 외신 URL 파싱 로직 (articleParser.js) | UA 헤더 + fallback, 신 기획과 무관하게 유지 | 최우선 | - | ✅ |
| parse/analyze 분리 구조 (article.js) | 스크래핑/AI 추론 라우트 분리 유지 | 최우선 | - | ✅ |
| 공용 fetch 래퍼 (client.js) | 응답 형식 공통 파싱 | P0 | - | ✅ |
| 대시보드 화면·API | 3개 카드 UI+API, 피벗 대상 아님 | P0 | - | ✅ |
| AI 요약 UI (AiSummary.jsx) | 3줄 불릿 요약 유지 | P0 | - | ✅ |
| 매수/관망/매도 버튼 골격 | UI 골격 유지 (marketSentiment 연동은 별도) | 최우선 | - | ✅ |
| 투자 판단 저장소 동기 처리 (decisionStore.js) | 동기 fs 패턴 유지 | P0 | - | ✅ |
| 서버 뼈대 구성 | API 서버 기본 구조 | P0 | - | ✅ |
| API 스펙(JSON) 정의 | `docs/api-spec.md` 정리 완료 | P0 | - | ✅ |
| LLM Mock 모드 구성 | MOCK_LLM/FAIL_TEST, 스키마 확장은 [화]로 이어감 | P1 | - | 🔵 |
| 용어 팝업(TermTooltip) 제거 + Reader.jsx 정리 | 하이라이트+팝업 로직 삭제 | 최우선 | 화 | ⬜ |
| 문장 단위 아코디언 컴포넌트 신규 | SentenceAccordion.jsx | 최우선 | 화 | ⬜ |
| llmService.js mock 응답 스키마 전환 | metaphor 제거, sentences+marketSentiment 추가 | 최우선 | 화 | ⬜ |
| 단어장 백엔드 신규 | routes/vocabulary.js, vocabularyStore.js, data 파일 | 최우선 | 수 | ⬜ |
| analyzeArticle 단어장 자동 적재 연동 | terms 자동 저장 | 최우선 | 수 | ⬜ |
| 투자 판단 API에 marketSentiment 배선 | decisions.js/decisionStore.js/api client | P0 | 수 | ⬜ |
| Reader.jsx sentences/marketSentiment 연동 | 아코디언 렌더링(점선 힌트, reason 미노출) + handleDecide 수정 + AI 인사이트 패널 marketSentiment 뱃지(buy/hold/sell 톤 재사용) | 최우선 | 수 | ✅ |
| 단어장 화면 신규 | Vocabulary.jsx, api/vocabulary.js, App.jsx 라우트 | 최우선 | 목 | ⬜ |
| 글로벌 내비게이션 (사이드바, 신규) | 상단 [+ 오늘의 핵심 기사] Primary 버튼 + 'Menu'(대시보드/단어장) · 'History'(인사이트 노트) 그룹. 카운트 뱃지(실제 API 기반, useEffect 마운트 1회 fetch). 리더뷰 진입 시 App.jsx에서 Sidebar 조건부 숨김 + Reader.jsx 자체 `< 뒤로가기`로 대체. (舊 "기본 네비게이션" 최소 링크 계획을 이 스펙으로 대체) | P0 | 목 | ✅ |
| AI 인사이트 블라인드 처리 전환 (신규) | 리더뷰에서 항상 보이던 marketSentiment 뱃지·insight 텍스트를 판단 전까지 렌더링하지 않도록 변경. `decided` state + 조건부 렌더링(`{decided && <AiInsight/>}`)으로 DOM에서 완전히 제외, analysis 데이터 자체는 보관해 다음 작업(바텀시트)에서 재사용 | 최우선 | 목 | ✅ |
| 바텀시트 컴포넌트 신규 | BottomSheet.jsx — 판단 버튼 클릭 시 오픈(pendingDecision state), 나의 판단 vs marketSentiment 비교 + insight 공개. AiInsight.jsx는 대체되어 삭제, marketSentiment 매핑은 sentiment.js로 공용 분리. 기존 인라인 완료 토스트는 바텀시트와 중복되어 제거(저장+토스트는 다음 Task에서 재연결) | 최우선 | 목 | ✅ |
| 투자 판단 버튼 정적 배치 전환 | position: sticky, z-index, 스크롤 보정용 배경색 전부 제거하고 margin-top만 남겨 문서 흐름에 자연스럽게 배치. Playwright로 스크롤 전/후 실제 좌표 측정해 검증 | P1 | 목 | ✅ |
| decisions API에 insight 필드 배선 | decisions.js/decisionStore.js/api client 전 구간에 insight 필드 추가. 저장 시점을 판단버튼 클릭이 아닌 "바텀시트 닫기(handleCloseSheet)"로 확정, pendingDecision/marketSentiment/insight를 그때 함께 전달. GET /api/decisions로 실제 저장까지 검증 | P0 | 목 | ✅ |
| 인사이트 노트 명칭 변경 + 카드형 아코디언 재설계 | MyPage.jsx → InsightNote.jsx 파일 리네임, 화면 타이틀 "인사이트 노트"로 변경 (라우트 경로 /mypage는 사이드바 링크 안정성을 위해 유지 — 추후 정리 가능). 카드 기본 상태는 나의판단+marketSentiment 배지만, "AI 관점 해설 보기" 아코디언(details/summary, 문장 아코디언과 동일 패턴)으로 요약/insight/원문버튼 펼침. 기존 상세뷰(모달) 코드는 애초에 존재하지 않았음을 grep으로 확인 | P0 | 목 | ✅ |
| 전체 흐름 통합 테스트 | 대시보드~단어장 전체 시나리오 확인 (사이드바 이동, 블라인드→바텀시트 공개, 인사이트 노트 아코디언까지 포함). Playwright로 25개 항목 검증, 3개 실패(토스트 미구현·단어장 mock 잔존·출처 이동 미구현) 및 2개 참고 관찰(로딩 중 네비게이션 공백, --watch 서버 재시작) 발견 | P0 | 금 | ✅ |
| 단어장 실제 API 연동 (긴급 발견) | Vocabulary.jsx가 여전히 mock/vocabularyMock.js를 렌더링 중 — api/vocabulary.js의 getVocabulary()로 교체해 실제 GET /api/vocabulary 데이터를 쓰도록 배선. 통합 테스트에서 반쪽짜리 배선으로 발견됨 | P0 | 금 | ✅ |
| 단어장 출처 클릭 네비게이션 구현 | handleSourceClick의 console.log 스텁을 실제 /reader?url=... 이동으로 교체 | P0 | 금 | ✅ |
| 문서/이슈 정리 | 스펙 반영 재확인, 남은 이슈 정리 → CLAUDE.md 전면 갱신(2026-07-17)으로 완료 처리 | P1 | 금 | ✅ |
| Supabase 데이터 모델 설계 + 마이그레이션 작성 (일정 외 선착수) | `docs/data-model.md` 설계 문서 + `supabase/migrations/20260717000000_init_schema.sql`(articles/vocabulary/decisions/article_reads + RLS) 작성. 원래 2주차 표에 없던 작업이나 단어장 멀티유저 전환의 전제 조건이라 선행 | 최우선 | (07-17) | ✅ |
| 단어장 Supabase 전환 + Auth 연동 — 첫 수직슬라이스 (일정 외 선착수) | `vocabularyStore.js`를 fs JSON에서 Supabase(articles/vocabulary 테이블) 호출로 전환, Supabase Auth 이메일/비밀번호 로그인(`Login.jsx`/`AuthContext.jsx`) 신규 연결, `requireAuth`/`attachUser` 미들웨어로 라우트 보호. 리더뷰 분석→단어장 저장→조회까지 실제 DB 왕복 검증 완료 | 최우선 | (07-17) | ✅ |

> 참고(낮은 우선순위, 미등록): 리더뷰 로딩 중 사이드바/뒤로가기 버튼이 모두 없는 짧은 공백 구간 존재. `server`의 `node --watch`가 `data/*.json` 쓰기에도 반응해 개발 중 서버가 재시작됨(`--watch-path=src`로 좁히면 해결, 운영 영향 없음).

> 2026-07-15 갱신 (1): `feature-slice` agent 감사 결과, "완료(✅)"로 표시됐던 항목 상당수가 실제로는 구 기획(용어 팝업)이 코드에 그대로 남은 상태였음이 확인됨. 이미 유효하지 않던 구 스켈레톤 Task(리더뷰 화면 뼈대, 문단 요약 UI 등 단순 UI뼈대 항목)는 표에서 제거하고 실제 로직/교체 작업으로 대체했다.
>
> 2026-07-15 갱신 (2): 오늘 완료했던 "Reader.jsx sentences/marketSentiment 연동"(✅) 중 marketSentiment 뱃지 상시 표시 부분을, "판단 전 블라인드 → 바텀시트에서 공개" 방식으로 재설계하기로 함(목요일 Task로 반영). "기본 네비게이션" 계획은 Primary 버튼+Menu/History 그룹을 갖춘 정식 사이드바 스펙으로 확대. "마이페이지"는 "인사이트 노트"로 전면 명칭 변경.
>
> **2026-07-19 갱신 (금~주말 점검)**: 2주차 표의 마지막 미완료 항목("문서/이슈 정리")을 완료 처리하며 2주차 전체를 ✅로 종료. 동시에 계획에 없던 Supabase 마이그레이션/단어장 DB 전환/Auth 연동이 금요일(07-17)에 선행 완료됨을 반영. `data-model.md`가 "스코프 밖"으로 명시하고 별도 Task로 미루기만 했던 `decisionStore.js`의 Supabase 전환은 아직 Task로 등록된 적이 없었음을 확인 — 아래 3주차 표에 신규 등록하고 다음 주(월요일~) 최우선 순위로 넘긴다. `server/data/decisions.json`에는 로컬 수동 테스트로 쌓인 커밋 전 데이터가 남아있어(git status상 미커밋 변경) 전환 작업 시 정리 필요.
>
> **2026-07-20 갱신 (월, 3주차 착수)**: `feature-slice` 에이전트로 3주차 남은 작업을 재검토한 결과, `analyzeArticle`이 `sentences`/`terms`/`summaryBullets`/`insight`/`marketSentiment` 5개 필드를 한 번의 Claude 호출로 반환하는 통합 함수라는 게 코드로 확인돼, 기존에 분리돼 있던 "문단 3줄 요약 생성"과 "종목 영향 해설+marketSentiment 생성" 두 Task를 하나로 병합했다(호출을 쪼개면 지연·비용만 늘어남 — parse/analyze 분리 이유와 같은 논리). 이 과정에서 기능①(최우선)의 핵심인 "문장번역/용어선별 실제 연결"이 계획에서 누락돼 있던 것도 발견해 병합된 Task 범위에 포함시켰다. GitHub 3주차 마일스톤에 이슈 5개(#12 decisionStore 전환, #13 프롬프트 설계, #14 analyzeArticle 연결, #15 저장 토스트, #16 판단 없는 이탈 처리)를 등록하고 아래 표를 그 상태와 동기화했다.
>
> **2026-07-20 갱신 (월, 3주차 순서 조정)**: `feature-verify` 에이전트로 수직슬라이스 완성도를 점검한 결과, MVP 최우선 기능인 리더뷰의 `analyzeArticle`이 여전히 고정 응답만 반환한다는 게 재확인됨 — `#12`(decisionStore Supabase 전환)는 인프라 작업으로 화면 동작에 영향이 없는 반면, `#13`(프롬프트 설계)·`#14`(analyzeArticle 연결)는 제품의 핵심 가치가 실제로 동작하는지를 가르는 항목이라 우선순위를 조정. `#13`→`#14`→`#12` 순서로 표를 재배치. `#13`은 반복 튜닝이 필요해 일정 리스크가 크므로 착수를 최대한 앞당김. `#12`가 늦어져도 의존 항목인 `#16`은 이미 "이번 주 내 미완료 시 4주차로 이월 가능"으로 여지가 있어 영향 적음.
>
> **2026-07-21 갱신 (화)**: `#7`(리더뷰 로딩 스켈레톤 UI)이 표에는 ⬜로 남아있었지만 실제로는 전날(07-20) 커밋 `0797d3f`로 이미 구현이 끝나 있었음을 뒤늦게 확인 — 상태를 ✅로 정정. `#13`(AI 프롬프트 설계)은 통합 프롬프트 자체는 완성해 unwired 상태로 커밋(`d340947`)했으나, 실제 Claude 호출로 여러 샘플 기사를 반복 검증하려던 중 Anthropic 계정 크레딧 부족으로 중단됨 — 크레딧 충전 후 재개 예정이라 이 사이 `#12`(decisionStore Supabase 전환)를 먼저 착수.
>
> **2026-07-21 갱신 (화, 추가)**: `#12`가 완료돼 `decision_id`(uuid) FK 연결 전제조건이 갖춰지면서 `#16`(판단 없는 이탈 처리) 착수. 완독 판정 기준(판단버튼 영역 도달)과 이탈 감지 범위(SPA 내 이동만)를 확정하고 `articleReadStore.js`/`POST /api/article-reads`/`Reader.jsx` IntersectionObserver+unmount 로깅까지 구현 완료 — 4주차 이월 없이 이번 주 내 완료.

### 3주차 — 기능 로직 구현

> 파싱 API, 문장 단위 아코디언, 단어장, marketSentiment 배선은 2주차로 앞당겨졌습니다(위 표 참고). 3주차는 그 위에 실제 LLM 로직(프롬프트 튜닝)과 마무리 작업만 남습니다.

| Task | 설명 | 우선순위 | 상태 |
|---|---|---|---|
| AI 프롬프트 설계 및 반복 테스트 (GitHub #13) | 문장 번역·문단요약·인사이트·marketSentiment 해설이 원하는 형식으로 나오도록, `sentences`/`terms`/`summaryBullets`/`insight`/`marketSentiment` 5개 필드를 한 번의 JSON 응답으로 받는 통합 프롬프트를 별도로 설계·반복 테스트(로직 구현과 분리해 일정 리스크로 관리). 아래 "analyzeArticle 실제 Claude 연결"(#14)의 선행 조건 | 최우선 | ✅ |
| analyzeArticle 실제 Claude 연결 (GitHub #14, 舊 "문단 3줄 요약 생성"+"종목 영향 해설+marketSentiment 생성" 병합) | `analyzeArticle`이 5개 필드를 한 번의 Claude 호출로 반환하는 통합 함수임을 확인해 기존 2개 Task를 하나로 병합. 확정된 프롬프트(#13)로 `callClaude` 실호출+JSON 파싱 연결, `MOCK_LLM`/`FAIL_TEST` 분기 유지, 단어장 자동 적재 부수효과(`saveTermsToVocabulary`)는 기존 로직 재사용. 문장번역/용어선별 실제 연결(기존 계획에서 누락돼 있던 항목)도 이 범위에 포함 | 최우선 | ✅ |
| decisionStore.js → Supabase 전환 (2번째 수직슬라이스) (GitHub #12) | `docs/data-model.md`가 "스코프 밖"으로 명시만 하고 Task로 등록되지 않았던 항목. 단어장과 동일한 패턴(`vocabularyStore.js` 전환 참고)으로 `decisions` 테이블 연동, `decisions.js` 라우트에 `requireAuth` 배선, `server/data/decisions.json`의 fs 동기 처리 제거(파일도 삭제, 기존 내용은 빈 배열이라 마이그레이션할 데이터 없었음). `articles` upsert 로직은 `articleStore.js`로 공용화해 vocabularyStore와 공유. 비로그인 사용자가 판단 저장 시 401로 리더뷰 전체가 에러 화면이 되는 회귀를 막기 위해 `Reader.jsx`/`InsightNote.jsx`/`Sidebar.jsx`에 로그인 가드 추가(`Vocabulary.jsx` 패턴 재사용) | 최우선 | ✅ |
| 대시보드 RSS 자동 수집·선별 파이프라인 (신규) | `rssFeedService.js`(CNBC Business/Markets·MarketWatch·Yahoo Finance 4개 무료 RSS 폴링, 48h 필터+중복제거, 개별 피드 실패 시 스킵) + `llmService.js`의 `selectTopArticles`(핵심 3건 선별+한글 번역+티커 추정, MOCK_LLM/FAIL_TEST 재사용) + `dashboardCurationService.js`(KST 날짜 기준 메모리 캐시, 실패 시 기존 하드코딩 3건 폴백)로 `GET /api/dashboard`의 고정 픽스처를 실제 수집 로직으로 교체. MOCK_LLM=true로 실동작(캐시 히트, RSS 전멸 폴백, FAIL_TEST 훅) 검증 완료(2026-07-19) | 최우선 | ✅ |
| 대시보드 CNBC 3단계 선별 기준 반영 (신규, GitHub 이슈 미등록) | 사용자 제공 선별 기준으로 파이프라인 교체(2026-07-20). `rssFeedService.js`: CNBC 단일 소스로 축소, URL 형태 필터(`/video/`·`/podcasts/`·`/live-blog/`·`/select/`·`/cnbc-pro/` 제외)+제목 화이트/블랙리스트 키워드 필터 추가(1단계). 신규 `articleQualityFilter.js`: `.ArticleBody-articleBody` 셀렉터로 본문 스크래핑, 300~1,200단어 범위 밖이거나 추출 실패 시 탈락(2단계). `llmService.js`: `selectTopArticles`를 `evaluateAndSelectArticles`로 교체 — investmentScore(≥4)·readabilityScore(≥3) 모두 통과한 후보만 남기고, 점수 내림차순+섹터 다양화로 최종 3건 선정(3단계). LLM은 프로젝트 컨벤션대로 Claude(claude-haiku-4-5) 유지, Gemini 미도입. 실 CNBC RSS·페이지로 1~3단계 라이브 검증 완료, `/api/dashboard` 통합 확인 완료 | 최우선 | ✅ |
| 대시보드 파이프라인 실행 시점 최적화 (신규, GitHub 이슈 미등록) | 미국 정규장 마감+애프터마켓 실적 발표 직후(KST 06:30~07:30) 기사가 가장 신선하다는 피드백 반영(2026-07-20). `rssFeedService.js`의 `windowHours` 기본값을 6h→24h로 확대(하루 1회 실행 구조에서 좁은 창이 나머지 18시간 기사를 누락시키는 문제 해결). `dashboardCurationService.js`의 캐시 경계를 자정 KST에서 06:30 KST로 이동(`curationDateKST`) — 06:30 이전 요청은 전날 큐레이션 결과를 재사용하고, 06:30을 넘긴 첫 요청이 그날 파이프라인을 새로 돈다. 실제 cron/스케줄러는 아직 없음(지연 캐싱 방식 유지, 서버가 항상 떠 있지 않아도 동작) — 향후 상시 배포 환경에서 사전 예열이 필요해지면 node-cron 등 실제 스케줄러 도입 검토 | 최우선 | ✅ |
| 리더뷰 로딩 스켈레톤 UI (GitHub #7) | 원문 파싱/분석 대기 중 `Reader.jsx`가 `"불러오는 중..."` 텍스트만 노출 — 실제 스켈레톤 UI 미구현 상태를 코드로 재확인(2026-07-19). 파싱 API 응답 대기 중 스켈레톤 표시, 응답 도착 시 실 콘텐츠로 전환. 로딩 중 사이드바/뒤로가기 버튼이 모두 없는 공백 구간(위 참고 항목)도 이 작업에서 함께 해소. `ReaderSkeleton.jsx` 신규 컴포넌트로 구현 완료(2026-07-20, 커밋 `0797d3f`) | P1 | ✅ |
| 인사이트 노트 저장 완료 토스트 연동 (GitHub #15) | 바텀시트에서 "닫기/완료" 액션을 취했을 때, 데이터가 안전하게 보관되었음을 알리는 "✅ 인사이트 노트에 저장되었습니다." 토스트 노출. 중복 피드백 방지를 위해 반드시 바텀시트가 닫힌 직후에 노출 (舊 "완료 토스트 연동"). 신규 `Toast.jsx` 컴포넌트를 만들어 `handleCloseSheet`에서 `saveDecision(...).then()`으로 저장 성공 후에만 노출(실패 시 미노출), 3초 후 자동 소멸. `BottomSheet`는 닫힘 애니메이션 없이 즉시 언마운트되므로 겹침 문제 자체가 없었으나, 토스트를 화면 하단에 두면 정적 배치된 투자 판단 버튼과 겹치는 문제를 Playwright 실측으로 발견해 화면 상단 고정으로 변경. 구 프로토타입 잔재였던 미사용 `.decision-toast` CSS 삭제 | P1 | ✅ |
| 판단 없는 이탈 처리 (GitHub #16) | 매수/관망/매도 없이 뒤로가기/이탈 시 "읽기 완료"로만 처리되고 판단은 저장되지 않는지 확인. 완독(Primary)·판단수행률(Secondary) 지표를 분리 집계하는 로깅 포인트 확보. `article_reads` 테이블(완독 시 insert, 판단으로 이어지면 `decision_id` 연결) 사용, `articleReadStore.js`/`POST /api/article-reads` 신설. **완독 판정 기준**: 판단버튼(`DecisionButtons`) 영역이 뷰포트에 들어오면(IntersectionObserver) 완독으로 간주(스크롤 비율 계산 대신 채택). **이탈 감지 범위**: SPA 내 라우트 이동/unmount만 처리, 브라우저 탭 닫기·새로고침은 스코프 밖(알려진 한계). 판단을 마친 경우는 `handleCloseSheet`에서 `decisionId`를 채워 즉시 기록, 판단 없이 이탈한 경우는 `Reader` unmount 시 `decisionId: null`로 기록 | P1 | ✅ |

> **2026-07-24 갱신 (금, 3주차 마감 점검)**: 3주차 표 5개 Task 전부 ✅, 연동된
> GitHub 이슈 `#12`~`#16`도 전부 CLOSED로 확인돼 위 로드맵 요약표의 3주차
> 상태를 "진행 중"→"완료"로 정정. 계획에 없던 CI 테스트/린트 게이트
> (`.github/workflows/test.yml`, `server/package.json`에 `test` 스크립트
> 추가, 커밋 `5a06b0a`, 07-23)가 3주차 안에 선행 완료됨을 확인. GitHub의
> "3주차" 마일스톤(마감 07-24)은 문서 정리와 함께 close 처리. 같은 날 커밋된
> 쇼케이스 스크린샷(`99c00b6`)·발표 슬라이드 자료(`8947e31`)는 아래 4주차
> "발표 자료 준비" Task와는 별개 산출물이라 4주차 표 상태는 변경하지 않는다.

### 4주차 — 마무리

> 11개로 늘어난 뒤 우선순위별로 다시 정렬했다(P0→P1→P2, 표 내 순서=착수 순서
> 권장). 기존에 매겨둔 우선순위 값 자체는 바꾸지 않았고, 정렬만 다시 했다.
>
> **진행 상태 관리**: 다른 주차 표의 ⬜/✅ 2단계 대신, 4주차부터는 항목당
> 착수 여부까지 구분하도록 **Todo(시작 전) / Doing(진행 중) / Done(완료)**
> 3단계로 관리한다. 매일 작업 시작 시 해당 행을 Doing으로, 끝나면 Done으로
> 직접 갱신할 것.

| Task | 설명 | 우선순위 | 상태 |
|---|---|---|---|
| 전체 시나리오 통합 테스트 (심화) | 2주차 금요일 통합 테스트 이후, 3주차 실제 LLM 로직까지 반영된 상태로 전체 재검증 | P0 | Todo |
| 버그 수정 | 통합 테스트 발견 이슈 처리 | P0 | Todo |
| 리더뷰 analyze fast/slow lane 분리 (로딩 지연 개선) | 사용자 피드백("LLM이 기사를 가져오고 분석해 번역+3줄요약이 뜨기까지 로딩이 오래 걸림") 반영. `POST /api/article/analyze` 하나가 5개 필드(sentences/terms/summaryBullets/insight/marketSentiment)를 한 번의 비스트리밍 Claude 호출로 받던 구조를, fast lane(`sentences`+`summaryBullets`, 기존 `/analyze`)과 slow lane(`terms`+`insight`+`marketSentiment`, 신규 `POST /api/article/analyze/details`)으로 분리. `insight`/`marketSentiment`는 원래도 판단 전까지 블라인드 처리되는 값이고 `terms`는 단어장 자동저장 부수효과일 뿐이라 늦게 도착해도 무방하다는 점에 착안. `Reader.jsx`가 parse 성공 직후 두 lane을 병렬 호출해, fast lane 도착 즉시 리더뷰 전체(원문+아코디언+요약+판단버튼)를 렌더링하고 slow lane은 백그라운드에서 준비되다 바텀시트가 열릴 때 채워짐(로딩 중이면 "AI가 비교 결과를 분석하고 있습니다..." 문구 표시). 조사 중 `ReaderSkeleton.jsx`가 이미 `article` prop만으로 원문을 먼저 보여주고 있던 것을 발견해, 별도로 계획했던 "점진적 렌더링" Task는 이 작업에 흡수됨. 브라우저(Playwright)로 fast lane 선렌더링·slow lane 로딩 상태 전환까지 실측 검증 완료(2026-07-27 완료, 커밋 `b3a45e0`) | P0 | Done |
| UI 폴리싱 (사이드바 비주얼 디테일) | 2주차 목요일에 구조(Primary 버튼+Menu/History 그룹)까지 완성된 사이드바에, 아이콘·브랜딩 컬러 등 비주얼 디테일만 추가. Pinterest 레퍼런스의 3단 분할 레이아웃과 신호등(macOS 창 장식)은 우리 몰입형 리더뷰 구조와 안 맞아 제외. **2026-07-29: 아래 "리더뷰 마스터-디테일(3분할) 재설계"로 리더뷰 자체가 마스터-디테일 구조로 전환돼, "몰입형 리더뷰라 3분할 제외"라는 당시 배제 사유는 더 이상 유효하지 않음(신호등 장식 배제는 별개로 여전히 유효)** | P1 | Todo |
| 배포 | 데모용 배포 | P1 | Todo |
| 발표 자료 준비 | 기획·개발 결과 정리 | P1 | Todo |
| 핵심 문장 선별 개수 확대 | 사용자 피드백("LLM이 문장을 고를 때 개수가 너무 적어 기사 번역이 어려움") 반영. 원인 2가지: ①`buildFastAnalysisPrompt`(舊 `buildAnalysisPrompt`)가 "2~4개"로 절대 개수를 고정 요청해 기사 길이(문단 수)와 무관하게 커버리지가 낮음, ②`parseFastAnalysisResponse`가 원문 완전일치 검증(`findVerbatimMatch`)에 실패한 sentence를 조용히 필터링하는데 손실률을 재는 로그가 없어 "모델이 애초에 적게 냈는지" vs "검증 단계에서 깎였는지" 구분 불가. 계측(로그 추가)을 먼저 선행해 실제 원인을 확인한 뒤, 절대 개수 대신 문단 수에 비례한 상대 기준으로 프롬프트를 수정하는 순서로 진행할 것 — 원인 파악 없이 개수만 올리면 손실이 검증 단계에서 나는 경우 효과가 없을 수 있음. 문장 수를 늘리면 fast lane의 verbatim 에코 비용도 늘어 위 "리더뷰 analyze fast/slow lane 분리" Task로 줄인 로딩 시간을 일부 까먹을 수 있어, 재시도 로직(지연 증가)은 채택하지 않음 | P1 | Todo |
| 인사이트 노트 마스터-디테일(3분할) 재설계 (신규) | 에버노트류 노트 앱 UI 참고. 기존 전역 사이드바(유지)+중앙 마스터 리스트(화면의 약 30%, 상단 sticky 검색바+날짜 필터+리스트/캘린더 뷰 토글, 카드는 제목·insight 한줄 미리보기·날짜만 콤팩트 노출)+우측 상세(약 70%, 제목+원문 링크 아이콘 헤더 → AI 3줄요약+insight 볼드 하이라이트 콜아웃 박스 → "시장의 해석" vs "나의 판단" 비교 + 판단 근거 한줄 메모)로 `InsightNote.jsx` 전면 재설계. 기존 "뒤로가기" 링크와 "판단 적중률 트렌드"(`AccuracyTrend.jsx`) 둘 다 제거 — 월별 그룹 리스트 대신 플랫 리스트로 바뀌며 `AccuracyTrend.jsx`/`constants/decisionStats.js`(+각 테스트)를 삭제. 나의판단/시장해석 비교+메모 편집 UI는 `HistoryCard.jsx`에서 로직만 이식해 신규 `InsightDetail.jsx`로 대체(`HistoryCard.jsx`는 삭제). 태그 필터는 `decisions` 데이터 모델에 `tags` 필드가 없어 이번 범위에서 제외(사용자 확인, 2026-07-27). 캘린더 뷰는 별도 라이브러리 없이 현재 달 날짜 그리드만 보여주는 Placeholder로 구현(이전/다음 달 이동·데이터 매핑 없음). 날짜 필터는 서버 API 변경 없이 클라이언트에서 `createdAt` 기준으로 필터링. "판단 적중률 트렌드"와 "인사이트 노트 날짜별 타임라인" 두 항목을 대체(2026-07-28 완료, 계획 `bubbly-spinning-snowglobe.md`) | P1 | Done |
| 판단 적중률 트렌드 (인사이트 노트) | 최근 10건 적중률 텍스트 + 색상 블록 스파크라인(`AccuracyTrend.jsx`), 월간 그룹 헤더("N월 — 적중률 X%")와 결합. "적중"은 실제 주가 결과가 아니라 나의 판단(`decision`)과 AI의 `marketSentiment` 일치 여부로 정의(`constants/decisionStats.js`)하고, 기존 `GET /api/decisions` 응답만으로 클라이언트에서 집계해 스키마/API 변경 없음. 스파크라인 색상은 새 토큰 없이 기존 `--difficulty-easy/hard` 재사용. 월별 `<section>` 구조까지만 구현하고 스티키 헤더·히트맵은 아래 "인사이트 노트 날짜별 타임라인" Task로 남겨 재사용 가능하게 함(2026-07-26 완료). **2026-07-27: 위 "인사이트 노트 마스터-디테일(3분할) 재설계"에서 UI 제거 대상으로 지정됨. 2026-07-28: 재설계 완료로 `AccuracyTrend.jsx`/`decisionStats.js` 삭제됨 — 이 행은 과거 완료 기록으로만 유지** | P1 | Done |
| 기사 난이도 뱃지 노출 | `readabilityScore`를 대시보드 카드 응답 필드로 노출, 파스텔톤 칩 UI로 표시 | P1 | Done |
| 단어장 플래시카드 복습 모드 | 탭하면 뒤집히는 카드 UI, 앞면 단어+뜻/뒷면 원문 발췌 문장 노출, 출처 이동 링크 제거. `vocabulary` 테이블에 `excerpt` 컬럼 추가 + `llmService.js` 확장(2026-07-26 완료). 기간 필터 칩 연동은 이번 범위에서 제외, 별도 Task로 분리 | P2 | Done |
| 판단 근거 한 줄 메모 (투자 저널링) | 바텀시트에 "내 생각 남기기" 트리거로 펼쳐지는 선택적 메모 입력(`BottomSheet.jsx`). `decisions` 테이블에 `memo` nullable 컬럼 추가. 저장 후 인사이트 노트에서 인라인 수정 가능하며, 수정은 재판단(insert)과 분리된 `PATCH /api/decisions/:id` 전용 경로로만 이뤄져 카드 중복 생성을 방지(2026-07-26 완료, 커밋 `7071917`). **2026-07-27: 위 "인사이트 노트 마스터-디테일(3분할) 재설계"에서 이 메모 편집 UI 로직이 신규 `InsightDetail.jsx`로 이식됨. 2026-07-28: 이식 완료, `HistoryCard.jsx` 삭제됨** | P2 | Done |
| 인사이트 노트 날짜별 타임라인 | 월간 스티키 헤더 + 최근 1~4주 활동 히트맵 미니 달력(클릭 시 해당 날짜로 앵커 스크롤). **2026-07-27: 위 "인사이트 노트 마스터-디테일(3분할) 재설계"의 마스터 리스트 날짜 필터 UI로 대체됨 — 별도 구현하지 않음. 2026-07-28: 해당 재설계가 완료돼 이 항목도 대체 완료 처리** | P2 | Done |
| 단어장 마스터-디테일(3분할) 재설계 (신규) | 인사이트 노트와 동일한 사이드바+마스터(30%)+상세(70%) 레이아웃을 단어장에 적용. 단, 판단 1건=카드 1개인 인사이트 노트와 달리 하루에 여러 단어가 자동 적재되는 구조라 마스터는 날짜별 그룹 카드(날짜 라벨+용어 미리보기+개수)로, 상세는 선택된 날짜의 단어 전체를 `VocabularyCard` 그리드로 노출. `VocabularyCard.jsx` 자체(플립 인터랙션, 뒷면 excerpt/번역)는 무변경 재사용, 검색/기간 필터는 이번 범위에서 제외. 아래 "단어장 날짜별 청킹 + 기간 필터"의 날짜별 그룹핑 부분을 흡수(2026-07-29 완료) | P1 | Done |
| 단어장 날짜별 청킹 + 기간 필터 | 오늘/어제/이번 주/지난달 아코디언(오늘·어제만 기본 펼침) + [오늘]/[최근 7일]/[최근 30일] 필터 칩. **2026-07-29: 날짜별 그룹핑 부분은 위 "단어장 마스터-디테일(3분할) 재설계"(마스터 리스트가 날짜별 카드)로 대체 완료. [오늘]/[최근 7일]/[최근 30일] 기간 필터 칩만 남은 범위로 축소** | P2 | Todo |
| 리더뷰 마스터-디테일(3분할) 재설계 (신규) | 인사이트 노트/단어장과 동일한 마스터(30%)+상세(70%) 레이아웃을 리더뷰에도 적용. 마스터는 대시보드와 같은 소스(`GET /api/dashboard`)로 오늘의 핵심 외신 3개를 압축 카드(출처+난이도 뱃지+헤드라인+번역 미리보기)로 보여주고, 클릭 시 상세(70%)에 기존 리더뷰 본문(문장 아코디언 번역+AI 요약+판단 버튼+바텀시트)이 그대로 렌더링됨. 기존 단일-기사 로직은 `pages/Reader.jsx`에서 신규 `components/ReaderDetail.jsx`로 옮기고, `Reader.jsx`는 마스터 리스트+`selectedUrl` state만 갖는 셸로 재작성(`key={selectedUrl}`로 기사 전환 시 `ReaderDetail` 리마운트 → 이전 기사 state 자동 초기화, 인사이트 노트의 `key={selected.id}` 패턴과 동일). 라우팅은 `/reader`(별도 경로 유지)와 `/`(Dashboard, 풀사이즈 카드 탐색용) 둘 다 유지하기로 사용자와 확정 — Dashboard 카드 클릭 시 넘어오는 `?url=` 쿼리 파라미터는 그대로 두되, 리더뷰가 오늘의 3개를 불러온 뒤 그 url과 일치하는 항목을 자동 선택(불일치/파라미터 없음 시 1번째 기사 기본 선택)하도록 의미를 재정의. 뒤로가기 링크(`< 뒤로가기`, `.back-link`/`.reader-back-nav`) 완전 삭제, 이에 따라 `/reader`에서만 사이드바를 숨기던 `App.jsx`의 `showSidebar` 특례도 제거(인사이트 노트/단어장처럼 사이드바 상시 노출). 사이드바 Menu 그룹에 "Reader" 항목 신규 추가(파라미터 없이 `/reader`, 카운트 뱃지 없음 — 고정 3개라 뱃지 의미 없음). lint + client 30개/server 69개 테스트 전체 통과, `GET /api/dashboard`·`POST /api/article/parse` 실제 응답으로 마스터 카드 데이터 필드·딥링크 매칭 로직 검증 완료(2026-07-29 완료) | P1 | Done |

> 위 표에 없는 추가 후보(다크 모드, TTS 오디오 모드, 가상 수익률 트래킹,
> 관심 섹터 개인화 피드 등)는 `docs/plan.md` 부록 "추가 기능 후보(Phase 2)"
> Tier 1/2 표를 참고.

> **2026-07-24 갱신 (금)**: 별도 "5주차(제안)" 백로그로 대기 중이던 UX 개선
> 항목 6개(2026-07-23 사용자 피드백 반영분)를 팀 논의 결과 4주차 표로
> 편입했다. 우선순위(P1/P2)는 기존 잠정 배정을 그대로 유지. 편입 직후 11개
> 항목이 우선순위 순서 없이 섞여 있어 P0→P1→P2 순으로 재정렬(위 참고).
> P2로 남은 4개(단어장 플래시카드/판단 근거 메모/인사이트 노트 타임라인/
> 단어장 청킹+필터)는 스키마 변경이 선행돼야 해 4주차 내 시간이 부족하면
> 5주차로 이월할 1순위 후보다. 동시에 상태 표기를 ⬜/✅ 2단계에서
> Todo/Doing/Done 3단계로 전환(다른 주차 표는 기존 방식 유지, 마감된
> 회고 항목이라 바꿀 실익이 없음).

> **2026-07-26 갱신 (일)**: 4주차 표 11개 중 3개(기사 난이도 뱃지/단어장
> 플래시카드 복습 모드/판단 적중률 트렌드) 완료돼 위 "4주 로드맵" 표의
> 4주차 상태를 "⬜ 예정"→"🔵 진행 중"으로 정정. "판단 적중률 트렌드"는
> P0/P1 통합 테스트·버그 수정보다 먼저 착수됐는데, 스키마/API 변경이
> 필요 없어 다른 4주차 항목과 의존관계가 없었기 때문(순서상 문제 없음).
> 남은 P0 2개(통합 테스트, 버그 수정)를 최우선으로 다시 당길 것.
>
> **2026-07-27 갱신 (커밋 이력 대조)**: 같은 날(07-26) 커밋된 "판단 근거
> 한 줄 메모" (`7071917`)가 표에는 여전히 `Todo`로 남아있던 것을 발견 —
> 구현 커밋이 `docs/backlog.md`를 갱신하지 않아 누락됨(같은 날 다른 두
> 커밋은 자체적으로 표를 갱신했던 것과 대조적). `Done`으로 정정해 4주차
> 완료 항목은 4개로 늘어남. 앞으로 기능 커밋 시 `docs/backlog.md` 상태도
> 함께 갱신할 것.
>
> **2026-07-27 갱신 (사용자 피드백 2건 반영)**: 사용자가 제기한 두 가지
> 문제("LLM 분석 로딩이 오래 걸림", "핵심 문장 선별 개수가 너무 적음")를
> 표에 신규 등록해 4주차 표가 11개→13개로 늘어났다. "리더뷰 analyze
> fast/slow lane 분리"는 원인 분석→해결 방향 논의→구현→테스트(server
> 56개/client 48개 통과)→브라우저 실측 검증까지 마치고 같은 날 `Done`
> 처리(커밋 `b3a45e0`). "핵심 문장 선별 개수 확대"는 원인 분석만 마치고
> 실제 개수/계측 로직 변경은 아직 착수하지 않아 `Todo`로 등록 — 두 문제
> 모두 fast lane(`sentences`)에 걸려 있어, 문장 개수를 늘리는 후속
> 작업이 방금 줄인 로딩 시간에 다시 영향을 줄 수 있다는 점을 위 설명에
> 남겨둔다. 이번 갱신 결과 4주차 표는 13개 중 5개 완료(Done)/8개 Todo.
>
> **2026-07-27 갱신 (인사이트 노트 재설계 계획 등록)**: 사용자가 인사이트
> 노트를 에버노트류 마스터-디테일 3분할 레이아웃으로 바꾸고 싶다는 요구를
> 전달, plan mode로 구현 계획(`bubbly-spinning-snowglobe.md`)까지 수립했으나
> 코드 구현은 다음으로 미루고 우선 Task만 등록해달라고 요청해 4주차 표에
> "인사이트 노트 마스터-디테일(3분할) 재설계"(P1/Todo)로 추가했다. 이 작업은
> 기존 "판단 적중률 트렌드"(P1/Done)와 "인사이트 노트 날짜별 타임라인"
> (P2/Todo) 두 항목을 대체하므로 두 행에 대체 예정 note를 남겼다. 태그
> 필터는 `decisions` 데이터 모델에 `tags` 필드가 없어 사용자 확인 하에
> 이번 재설계 범위에서 제외하기로 결정. 이번 갱신 결과 4주차 표는
> 14개 중 5개 완료(Done)/9개 Todo.
>
> **2026-07-28 갱신 (인사이트 노트 마스터-디테일 재설계 구현 완료)**: 위
> 계획(`bubbly-spinning-snowglobe.md`)대로 `InsightNote.jsx`를 마스터-디테일
> 2단 레이아웃으로 전면 재작성하고, `HistoryCard.jsx`/`AccuracyTrend.jsx`/
> `constants/decisionStats.js`(+각 테스트)를 삭제, 신규 `InsightDetail.jsx`
> (+테스트)로 대체했다. 날짜 필터(`dateFrom`/`dateTo`)는 서버 API 변경 없이
> 클라이언트 사이드로 구현. 이 작업으로 "인사이트 노트 마스터-디테일(3분할)
> 재설계"·"판단 적중률 트렌드"·"인사이트 노트 날짜별 타임라인" 세 항목이
> 모두 Done 처리됐다. 이번 갱신 결과 4주차 표는 14개 중 7개 완료(Done)/7개
> Todo.
>
> **2026-07-29 갱신 (단어장 마스터-디테일 재설계 구현 완료)**: 인사이트 노트와
> 동일한 마스터-디테일 레이아웃을 단어장에도 적용해달라는 요청에, plan
> mode로 구현 계획(`enchanted-snacking-parasol.md`)을 수립하고 바로 구현까지
> 완료했다. 단어장은 "판단 1건=카드 1개" 구조가 아니라 하루에 여러 단어가
> 자동 적재되는 구조라, 마스터는 날짜별 그룹 카드(날짜+용어 미리보기+개수)로
> 만들고 상세에서 그 날의 `VocabularyCard`를 그리드로 보여주도록
> `Vocabulary.jsx`를 전면 재작성했다(`VocabularyCard.jsx` 자체는 무변경
> 재사용). "단어장 날짜별 청킹 + 기간 필터" 중 날짜별 그룹핑 부분을 이
> 작업이 흡수했고, 기간 필터 칩만 별도 Task로 축소해 남겼다. lint +
> `VocabularyCard.test.jsx` 포함 client 테스트 30개 전체 통과 확인. 사용자가
> 직접 로그인해 브라우저로 확인 후 상세 패널의 단어 카드를 그리드가 아닌
> 세로 1열로 배치해달라는 피드백을 줘 `.vocabulary-detail-list`(옛
> `.vocabulary-detail-grid`)를 flex column으로 수정. 이번 갱신 결과 4주차
> 표는 15개 중 8개 완료(Done)/7개 Todo.
>
> **2026-07-29 갱신 (리더뷰 마스터-디테일 재설계 구현 완료)**: 인사이트
> 노트/단어장에 이어 리더뷰도 같은 마스터-디테일 레이아웃으로 바꿔달라는
> 요청에, plan mode로 구현 계획(`compressed-sparking-pizza.md`)을 수립하고
> 바로 구현까지 완료했다. 논의 과정에서 라우팅 구조(`/reader` 유지 vs `/`
> 통합), 딥링크(`?url=` 유지 vs 제거), 사이드바 "리더뷰" 메뉴 신설 여부를
> 사용자와 확인했고, `/reader` 별도 유지+딥링크 유지(오늘의 3개 중 일치
> 항목 자동선택)+사이드바 메뉴 신설로 확정했다. 기존 단일-기사 로직을
> `Reader.jsx`에서 신규 `ReaderDetail.jsx`로 옮기고 `Reader.jsx`는 마스터
> 리스트 셸로 재작성, 뒤로가기 링크 삭제에 따라 `/reader`에서만 사이드바를
> 숨기던 `App.jsx` 특례도 함께 제거했다. 위 "UI 폴리싱(사이드바 비주얼
> 디테일)" 행의 "몰입형 리더뷰라 3분할 제외" 배제 사유도 이번 변경으로
> 무효화됨을 함께 기록. lint + client 30개/server 69개 테스트 전체 통과,
> 이 환경엔 브라우저 자동화 도구가 없어 화면 스크린샷 확인 대신
> `GET /api/dashboard`/`POST /api/article/parse` 실제 API 응답으로 마스터
> 카드 데이터·딥링크 매칭 로직만 검증했다(브라우저 수동 확인은 사용자
> 몫으로 남음). 이번 갱신 결과 4주차 표는 16개 중 9개 완료(Done)/7개 Todo.

---

## 스코프 제외 (기획서 4번 "제품 스코프" 기준)

- 실제 증권사 API와 연동된 매매 시스템 — 기획서에서 "모의 투자 판단 훈련 도구"로 명확히 스코프를 한정함
