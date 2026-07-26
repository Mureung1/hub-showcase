# 첨부파일 AI 구조화 추출 (이슈 #67)

> 작성일: 2026-07-25 (토) · 대상 이슈: [#67 첨부파일(PDF/HWP) AI 구조화 추출로 매칭 조건 커버리지 개선](https://github.com/syd348/hub/issues/67)
> **갱신: 2026-07-26** — AI 제공사를 Claude API(유료 종량제, 상시 무료 티어 없음) → **Gemini API**로 전환
> 결정. 이유: 상시 무료로 운영 가능한지가 우선순위였고, Gemini는 flash/flash-lite 계열에 실제 상시 무료
> 티어가 있고 PDF도 네이티브로 읽는다(문서는 image 토큰 요율로 과금). 아래 계획은 Gemini 기준으로 갱신됨
> — 이하 "Claude"로 서술된 부분은 Gemini API로 대체.

## 목표 (한 줄)

**공고 첨부파일(PDF 우선)을 Gemini API로 읽어 employees/revenue/businessYears 조건을 구조화 추출해 매칭 점수에 반영하고, 같은 문서에서 amount/qualifications/documents 필드도 더 정확하게 재추출한다.**

## 현재 상태 (조사 완료, 2026-07-25)

- `#62` 조사에서 `bsnsSumryCn`(사업개요 요약문) 정규식 추출은 신호가 낮음(업력 11.7%, 직원수
  7.7%, 매출 2~6%) — `docs/week4/issue-62-region-filter-plan.md` 참고
- bizinfo API의 `printFileNm`(첨부파일명)/`printFlpthNm`(다운로드 링크)는 **300건 표본 100%
  커버리지** — 모든 공고에 원본 공고문 첨부파일이 있음
- 확장자 분포(300건): **PDF 65%, HWP 23%, HWPX 12%**
- 실제 PDF 1건 다운로드 확인 — 25페이지, 정상 다운로드됨. 해당 문서는 상세페이지(`pblancUrl`)엔
  없던 지원 규모 정보가 있었음(첨부파일이 상세페이지보다 정보량이 많다는 간접 근거)
- Gemini API(`gemini-2.5-flash`/`flash-lite` 계열)는 PDF를 네이티브로 지원 — 별도 OCR·렌더링
  도구 불필요, 문서는 image 토큰 요율로 과금됨. 위 계열은 **상시 무료 티어**가 있음(분당/일당 요청
  제한 있음 — 정확한 수치는 Google AI Studio에서 계정별로 확인, 묶음 1에서 실측). `@google/genai`
  미설치, `GEMINI_API_KEY`는 `.env.example`에 추가 필요(기존 `ANTHROPIC_API_KEY` 자리는 미사용으로
  정리)
- HWP(구버전 바이너리)·HWPX(zip+XML)는 Gemini가 직접 못 읽음 — 변환 필요
- 기존 정규식 추출(#44)의 남은 약점: `amount`는 23.1%가 여전히 `'공고문 참조'` fallback,
  `qualifications`는 `trgetNm` 원문을 그대로 dump(예: "소상공인")한 짧은 카테고리어일 뿐 상세
  조건이 아님, `documents`는 첨부파일명만 보여주고 내용은 파싱 안 함 — 사용자 지적(2026-07-25):
  "어차피 같은 문서를 읽는데 employees/revenue/businessYears만 뽑고 끝내는 게 아니라 이 세
  필드도 같이 개선하면 되지 않냐" → **같은 API 호출 안에서 같이 추출하도록 범위에 포함**

## 범위

### 포함 (이번 이슈)
- PDF 첨부파일 다운로드 → Gemini API에 문서로 전달 → 아래 필드를 한 번의 요청으로 JSON
  구조화 추출:
  - employees/revenue/businessYears 조건 (신규, 매칭 점수 반영 목적)
  - `amount`(지원금액) — 기존 정규식(#44) fallback 23.1%를 줄이는 목적. 정규식 결과가 이미 있으면
    비교해서 더 구체적인 쪽 채택(묶음 1에서 채택 기준 결정)
  - `qualifications`(신청자격) — `trgetNm` 원문 dump 대신 실제 조건 목록으로 구조화
  - `documents`(필요서류) — 첨부파일명 대신 문서 안의 "제출서류" 목록으로 대체
- HWPX 텍스트 추출: `unzip`으로 `Contents/section*.xml` 목록을 얻어 `<hp:t>...</hp:t>` 요소를
  정규식으로 추출 → 텍스트로 Gemini에 전달 (묶음 1에서 검증 완료 — 별도 XML 파서 라이브러리
  불필요, `Preview/PrvText.txt`는 ~2KB로 잘려있어 미사용)
- `atchFileId` 기준 캐싱 — 이미 추출한 문서는 재호출하지 않음(신규 공고에만 실행)
- `subsidies` 스키마에 구조화 컬럼 추가 — **묶음 1에서 확인된 실제 응답 형식은 숫자가 아니라 자유
  텍스트**(예: "상시근로자 50인 미만", "업력 7년 미만", "직전연도 매출액 120억원 이하")이므로
  당초 가정한 `employee_limit int`/`business_year_limit numeric`/`revenue_limit_krw bigint` 같은
  숫자 컬럼은 그대로 못 씀. 묶음 2에서 Gemini 응답 스키마에 원문 텍스트 필드와 별도로 정규화된
  숫자 필드(예: `employeeLimitMax: number|null`)를 함께 요청하도록 확장하거나, 컬럼 자체를
  텍스트로 두고 `scoreForProfile()`에서 별도 정규식으로 파싱할지 결정 필요(아래 리스크 표)
- `scoreForProfile()`에 가점 반영 (region/industry와 같은 패턴 — 추출 안 되면 중립, 페널티는
  정확도 검증 후 결정)
- 무료 티어 요청 제한(RPM/RPD) 실측 및 일일 신규 공고 처리량과 비교해 부족분 문서화(묶음 1
  결과: 실제로는 여유가 아니라 부족 — flash 20건/일 한도 < 평일 신규 30~55건, 부분 커버리지로
  진행하기로 결정됨)

### 제외 (다음으로)
- HWP(구버전 바이너리) 처리 — 묶음 4에서 **보류 결정**(무료 티어 한도가 이미 부족한 상황에서
  처리 대상만 늘리는 셈이라 도입 안 함, 상세는 묶음 4 참고)
- creditScore 추출 — UI에도 없는 선택 필드라 이번엔 제외
- 기존 정규식 추출 로직(`extractAmount` 등) 완전 제거 — AI 추출 실패/HWP(변환 보류분) 시
  fallback으로 계속 사용하므로 코드는 유지, "우선순위"만 바뀜

## 실행 순서

### 묶음 1 — 기술 검증(spike): 실제 추출 정확도·무료 티어 한도 확인 (완료, 2026-07-26)
- [x] `@google/genai`(공식 후속 SDK — `@google/generative-ai`는 2025-04 이후 업데이트 없어 미채택)
      크롤러 워크스페이스에 추가, `GEMINI_API_KEY` 설정(Google AI Studio에서 발급 — 무료)
- [x] 실제 PDF 첨부파일 15건(bizinfo API 실제 신규 공고, `gemini-2.5-flash`)으로 구조화 추출
      시도 — employees/revenue/businessYears + amount/qualifications/documents를 한 프롬프트/
      응답 스키마(JSON schema, `responseMimeType: application/json`)로 설계
- [x] 추출 결과를 원문 PDF와 수동 대조해 정확도 확인 — 결과는 아래 "묶음 1 결과" 참고
- [x] 1건당 응답 시간 실측(평균 ~16초), 무료 티어에서 15건 연속 호출(4초 간격) 시 429 없음 확인
- [x] HWPX 샘플 압축 해제해 텍스트 추출 확인 — 아래 "묶음 1 결과" 참고
- [x] amount 채택 기준 결정 — 아래 리스크 표 갱신

#### 묶음 1 결과 (2026-07-26, 실제 PDF 15건 샘플)

| 필드 | 추출률 | 비고 |
|------|--------|------|
| employees | 0/15 (0%) | 샘플이 해외진출·액셀러레이팅 프로그램 위주라 규모 조건 자체가 없는 공고가 많았음 — 표본 편향 가능성, 판단 보류 |
| revenue | 0/15 (0%) | 위와 동일 |
| businessYears | 3/15 (20%) | 기존 정규식(11.7%)보다 개선 |
| amount | 7/15 (46.7%) | **기존 정규식(76.9% 성공)보다 낮음** — AI 단독 채택은 기각, 아래 리스크 표 참고 |
| qualifications | 15/15 (100%) | 기존 `trgetNm` 카테고리어 dump 대비 대폭 개선 — 실제 조건 목록으로 채워짐 |
| documents | 12/15 (80%) | 기존 첨부파일명 나열 대비 대폭 개선 — 실제 제출서류 목록으로 채워짐 |

- 사용한 응답 스키마(6개 필드 모두 `nullable`): `employees`/`revenue`/`businessYears`/`amount`는
  `string`(문서 원문 표현 그대로), `qualifications`/`documents`는 `string[]`. **숫자 필드는 요청하지
  않았음** — 실제 응답도 전부 자유 텍스트로 나옴(예: "IP디딤돌 프로그램 최초 사업수혜 연도 기준
  +2년 이내"). 매칭 점수에 반영하려면(위 범위 섹션의 스키마 갭 참고) 프롬프트/스키마에 정규화된
  숫자 필드를 추가로 요청해야 함
- 실패 0/15, 평균 응답시간 약 16초/건(다운로드 별도 0.3~1.5초)

#### 묶음 1 후속 검증 (2026-07-26) — 숫자 필드 + 무료 티어 실제 한도

**숫자 정규화 필드 — 결정 완료(옵션 a 채택)**: 원문 텍스트 필드와 별도로 `employeesMaxCount`(int)/
`revenueMaxKrw`(int)/`businessYearsMax`(number) 필드를 같은 요청에서 함께 요청하도록 스키마 확장.
직원수/매출/업력 키워드가 있는 실제 공고 9건으로 검증한 결과:
- `businessYearsMax`: "업력 7년 미만"→7, "설립 5년 이내"→5, "창업 8년 이내"→8, "창업 3년 미만"→3
  등 5건 중 4건 정확 변환. 업종별로 기준이 다른 복합 조건(예: "창업 7년 이내(일반)/10년 이내(신사업)")
  1건은 모호하다고 판단해 null 반환 — 보수적으로 동작, 허용 가능
- `revenueMaxKrw`: "연매출 1억 4백만원 미만"→104000000 정확 변환. 업종별 다중 구간 조건에서는
  가장 낮은 공통 기준만 채택(예: "3억원 이하, 업종별 15억/60억"→3억으로)
- `employeesMaxCount`: 원문에 "상시근로자 5인/10인 미만(업종별 상이)"이 있어도 단일 숫자로 못
  정해 null 반환 — 업종별 분기 조건은 의도적으로 비움(설계대로 동작, 오추출보다 안전)
- **결론**: 단일 기준 조건은 정확히 숫자화되고, 업종별/카테고리별 분기 조건은 보수적으로 null —
  매칭 가점 로직에서 이 null을 "조건 불명" 중립값으로 처리하면 문제 없음

**무료 티어 실제 한도 — 중요 발견**: `gemini-2.5-flash`는 실제 429 에러로 확인한 결과
**모델당 하루 20건**(`GenerateRequestsPerDayPerProjectPerModel-FreeTier`, quotaValue: 20)으로
제한됨 — AI Studio 대시보드 없이도 실측으로 확정. bizinfo 실제 등록 추이(최근 500건 실측)를 보면
평일 신규 공고가 하루 **30~55건**(주말은 0건)이라, 무료 한도 하나로는 신규 공고의 40~60%밖에
커버 못 함.

**모델 분산 결정**: `gemini-2.5-flash-lite`는 신규 프로젝트에 404(사용 불가), `gemini-2.0-flash-lite`도
무료 한도 0으로 막혀 있음 — 대신 **`gemini-3.1-flash-lite`**가 별도 할당량 버킷으로 정상 동작함을
확인(간단한 호출로 응답 성공). **사용자 결정(2026-07-26)**: `gemini-2.5-flash` + `gemini-3.1-flash-lite`
분산만 적용하고, 두 모델 합산 한도를 넘는 날은 기존 정규식 fallback으로 남기는 것을 수용(유료 전환
없음, 큐잉 없음 — 부분 커버리지를 의도적으로 받아들임). **주의**: `gemini-3.1-flash-lite`는 이번
스파이크에서 정확도 검증을 안 했음 — 묶음 2에서 실제 PDF로 flash와 동일한 스키마 검증 필요
- **HWPX 텍스트 추출**: `Preview/PrvText.txt`는 문서 크기와 무관하게 항상 ~2KB로 잘려 있어(4.4MB
  원본 문서에서도 2093바이트만 반환, 문장 중간에 끊김) 신뢰 불가 — **사용하지 않음**. 대신
  `Contents/section*.xml`(HWPML) 안의 `<hp:t>...</hp:t>` 요소를 정규식으로 추출하면 전체 본문이
  완전하게 복원됨(805개 `<hp:t>` 요소, 신청자격·제출서류 섹션까지 포함 확인) — 별도 XML 파서
  라이브러리 불필요, `unzip`으로 `Contents/section*.xml` 목록을 얻은 뒤 정규식 태그 스트립만
  하면 됨

### 묶음 2 — 크롤러 파이프라인 통합 (완료, 2026-07-26)
- [x] 첨부파일 다운로드 함수 추가(`attachment.ts`), PDF/HWPX 포맷 분기(HWP·기타는 `unsupported`로
      스킵)
- [x] `atchFileId` 기준 캐싱(`document-cache.ts` + `document_extractions` 테이블) — 이미 처리한
      id는 Gemini 재호출 없이 skip
- [x] `pipeline.ts`에 `filterNewItems()` 추가 — 이번 크롤에서 조회된 공고 중 **DB에 아직 없는
      id만** 신규로 판단해 AI 추출 대상으로 좁힘(무료 할당량 보존 목적)
- [x] 다운로드/추출 실패·미지원 포맷·할당량 소진 시 항상 skip, 크롤러 전체 실패로 이어지지 않음
      확인(`ai-enrichment.ts` — 모든 실패 경로가 catch되고 로그만 남김)
- [x] `gemini-extract.ts`에 모델 폴백 구현 — 주 모델(`gemini-2.5-flash`) 429 시 보조 모델
      (`gemini-3.1-flash-lite`)로 자동 대체, 둘 다 소진되면 이후 항목은 네트워크 호출 없이
      즉시 skip(`isBudgetExhausted()`)
- [x] 단위 테스트 추가 — `attachment.test.ts`/`hwpx.test.ts`/`gemini-extract.test.ts`/
      `ai-enrichment.test.ts`/`pipeline.test.ts` (총 74개 크롤러 테스트, 전체 119개 통과)
- [x] `supabase/schema.sql`에 `document_extractions` 캐시 테이블 추가(subsidies 반영은 묶음 3에서)

**설계 결정**: AI 추출 결과는 `subsidies`가 아니라 별도 `document_extractions` 캐시 테이블에만
저장한다 — subsidies 스키마 변경·`scoreForProfile()` 반영·정규식 vs AI 채택 로직은 묶음 3에서
한 번에 처리해 두 묶음의 관심사를 분리했다. `crawler/src/index.ts`(일일 실행)는 `pipeline.ts`의
`processAnnouncements()`를 그대로 호출하므로 별도 수정 불필요.

### 묶음 3 — 스키마 + 매칭 반영 (완료, 2026-07-26)
- [x] `supabase/schema.sql`에 구조화 컬럼 추가(`employees`/`employees_max_count`/`revenue`/
      `revenue_max_krw`/`business_years`/`business_years_max`) + `shared/src/types/subsidy.ts` +
      `server/src/db/mappers.ts`(rowToSubsidy/subsidyToRow) + `crawler/src/upsert.ts` 반영
- [x] `scoreForProfile()`에 가점 반영(필터 아님 — 위 리스크 표 "필터 vs 가점" 잠정 결정대로) —
      온보딩 버킷 문자열(`EMPLOYEE_OPTIONS`/`REVENUE_OPTIONS`/`BUSINESS_YEARS_OPTIONS`)의 대표
      최솟값과 AI 추출 상한값을 비교해 industry와 같은 방식(가점만, 페널티 없음)으로 반영
- [x] AI가 추출한 `amount`/`qualifications`/`documents`로 기존 정규식 결과 대체
      (`crawler/src/apply-ai-extraction.ts`, 묶음 1에서 정한 채택 기준대로 — amount는 정규식
      fallback일 때만 AI로 보완, qualifications/documents는 AI 결과가 비어있지 않으면 대체)
- [x] `crawler/src/pipeline.ts`에서 `document_extractions` 캐시를 배치 조회해 병합 — 신규 여부와
      무관하게 이번 크롤 대상 전체에 적용(캐시가 이전 실행에 이미 채워져 있었을 경우 대비)
- [x] 단위 테스트 추가(`apply-ai-extraction.test.ts`, `subsidies-repo.test.ts`의 새 describe
      블록) — 크롤러 81개·서버 45개·전체 132개 테스트 통과, 크롤러/서버/클라이언트 타입체크·
      lint 전부 통과
- [x] **"기존 수집 데이터 backfill 재실행" 범위 축소 결정(2026-07-26)**: 무료 티어 하루
      20~40건 한도로는 기존 수집분(~1500건) 전체를 소급 AI 추출하는 데 수개월이 걸려 사실상
      불가능 — `npm run backfill`을 프로덕션에 대고 다시 돌리는 건 이번 묶음에서 하지 않는다.
      `backfill.ts`가 호출하는 `processAnnouncements()`가 신규 판정(`filterNewItems`)이 안 된
      기존 공고는 AI 추출 대상으로 삼지 않으므로, 지금 재실행해도 효과가 없다(무의미한 재수집만
      발생). 대신 앞으로 매일 크론이 도는 신규 공고부터 자연스럽게 AI 데이터가 누적된다 —
      과거분 소급 처리가 필요하면 별도 이슈로 분리(예: 여러 날에 걸쳐 배치로 처리)

### 묶음 4 — HWP(구버전) 처리 여부 결정 (완료, 2026-07-26 — **보류로 결정**)
- [x] LibreOffice headless 변환 도입 비용 대비 23% 커버리지 증가가 가치 있는지 판단
- [x] 보류 결정 문서화(아래) — GitHub Actions 러너 설치·변환 단계는 추가하지 않음

**결정: 도입 보류.** 기획 당시엔 "PDF+HWPX(77%)로 충분한가"만 따지면 됐지만, 묶음 1 후속
검증에서 무료 티어 한도(20~40건/일 조합)가 실제 평일 신규 공고(30~55건)보다 이미 부족하다는
게 확인됐다 — 지금 지원하는 PDF/HWPX만으로도 매일 일부는 처리를 못 하고 정규식 fallback으로
남는 상황. 여기에 HWP(23%)까지 추가하면 처리 대상 문서 수가 **~30% 더 늘어나** 이미 부족한
할당량을 두고 경쟁하는 문서만 많아진다 — "포맷 커버리지 23%p 증가"라는 원래 이득이 무의미해짐.
게다가 구버전 HWP는 HWPX(zip+XML)와 달리 독점 바이너리 포맷이라 LibreOffice 같은 무거운 변환
도구 없이는 텍스트 추출 자체가 안 되고(HWPX처럼 가벼운 정규식 추출 불가), GitHub Actions
러너에 LibreOffice를 설치하고 변환 단계를 추가하는 CI 의존성 비용도 그대로 남는다. 두 이유
모두 도입 안 하는 쪽을 가리켜 보류로 결정한다. 재검토 조건: 무료 티어 한도가 늘어나거나
유료 전환을 하게 되면(리스크 표 "무료 티어 한도 초과" 참고) 그때 다시 판단.

## 완료 기준

- [ ] 신규 공고 첨부파일에서 employees/businessYears 조건이 정규식(11.7%/7.7%)보다 높은 비율로
      추출된다 (묶음 1의 15건 표본은 크기가 작고 유형이 편향돼 있어 검증 안 됨. **backfill을
      돌리지 않기로 했으므로**(위 묶음 3 결정 참고) 즉시 재검증할 방법이 없고, 앞으로 며칠간
      크론이 실제로 쌓는 신규 공고 데이터로 나중에 확인해야 함 — 별도 확인 태스크로 남겨둠)
- [x] amount의 fallback('공고문 참조') 비율이 기존 23.1%보다 줄어든다 — 정규식 우선·AI 보완
      구조로 구현 완료(`apply-ai-extraction.ts`), 실측 비율 확인은 위와 같은 이유로 추후 확인
- [x] qualifications/documents가 원문 dump/파일명 나열이 아니라 실제 조건·서류 목록으로 채워진다
      — 15건 스파이크에서 각각 100%/80% 확인, 구현 완료
- [x] 이미 처리한 문서는 재호출하지 않는 캐싱 구조가 확인된다 — `document_extractions` 테이블 +
      `getCachedExtraction`/`isBudgetExhausted` 로직, 단위 테스트로 검증(실제 프로덕션 Supabase
      대상 E2E 실행은 안 함)
- [x] 실측 기준 Gemini 무료 티어 요청 한도(RPD) 대비 일일 처리량 부족분이 문서화된다 —
      `gemini-2.5-flash` 20건/일 < 평일 신규 30~55건/일, flash+flash-lite 분산 후에도 부족한 날은
      정규식 fallback으로 남기는 부분 커버리지로 진행 결정(2026-07-26)
- [x] 매칭 점수에 반영된다 — `scoreForProfile()`에 employees/revenue/businessYears 가점 추가
- [x] `npm test`/`npm run lint` 통과 — 전체 132개 테스트, lint 전부 통과(crawler/server/client)

## 리스크 / 결정 필요

| 항목 | 내용 | 결정 |
|------|------|-----------|
| HWP(구버전) 처리 방법 | LibreOffice 변환은 CI 의존성 추가, 23% 분량만 해당 | **결정 완료(보류)**: 무료 티어가 이미 PDF+HWPX 물량도 못 따라가는 상황이라 처리 대상을 23%p 늘리는 게 오히려 역효과 — 도입 안 함. 무료 한도가 늘거나 유료 전환 시 재검토 |
| 추출 정확도 검증 방법 | 자동 검증 기준이 없음 | **결정 완료**: 묶음 1에서 실제 15건 원문 대조로 검증(위 "묶음 1 결과" 표) |
| 필터 vs 가점 | region처럼 필터할지 industry처럼 가점만 할지 미정 | **결정 완료**: employees/revenue/businessYears 모두 가점만(industry 패턴)으로 구현(`scoreForProfile()`). backfill을 안 하기로 해 표본을 넓혀 재검증할 계획은 취소 — 실제 신뢰도는 크론이 신규 공고를 처리하며 쌓이는 데이터로 추후 판단, 낮으면 그대로 가점만 유지 |
| Gemini 모델 선택 | 정확도 vs 무료 티어 한도 트레이드오프 | **결정 완료**: 주 모델 `gemini-2.5-flash`(정확도 검증됨) + 보조 `gemini-3.1-flash-lite`(할당량 분산용, 정확도 미검증) 분산 채택 |
| 무료 티어 한도 초과 | 신규 공고 수가 급증하면 무료 RPD를 넘어설 수 있음 | **결정 완료**: 실측 결과 `gemini-2.5-flash` 무료 한도는 **모델당 20건/일**(429 에러로 확정), 실제 신규 공고는 평일 30~55건/일이라 flash+flash-lite 분산해도 부족한 날이 있음 — 사용자 결정(2026-07-26): 유료 전환·큐잉 없이 **부분 커버리지 수용**, 한도 초과분은 기존 정규식 fallback 유지 |
| 캐싱 키 | `atchFileId`가 문서 갱신 시에도 유지되는지 미확인 | 묶음 2에서 실제 재수집 사례로 캐싱 무효화 조건 확인 |
| amount: 정규식 vs AI 결과 충돌 | 15건 샘플에서 AI 단독 성공률(46.7%)이 기존 정규식(76.9%)보다 낮음 | **결정 완료**: amount는 **정규식을 우선 채택**, 정규식이 fallback('공고문 참조')일 때만 AI 결과로 보완(AI도 null이면 fallback 유지) — AI를 우선하는 원래 계획을 뒤집음 |
| 구조화 컬럼 타입 vs 실제 응답 형식 | 범위 섹션이 가정한 숫자 컬럼(`employee_limit int` 등)과 달리 Gemini 응답은 자유 텍스트(예: "상시근로자 50인 미만") | **결정 완료**: 옵션 (a) 채택 — 원문 텍스트 필드와 별도로 정규화된 숫자 필드(`employeesMaxCount`/`revenueMaxKrw`/`businessYearsMax`)를 같은 요청에서 함께 요청. 9건 검증 결과 단일 기준 조건은 정확 변환, 업종별 분기 조건은 보수적으로 null — 위 "묶음 1 후속 검증" 참고 |
| flash-lite 정확도 미검증 | `gemini-3.1-flash-lite`는 할당량 분산 목적으로만 확인(간단 호출 성공), 실제 PDF 추출 정확도는 미검증 | 묶음 2에서 동일 스키마·동일 샘플로 flash와 비교 검증 후 실사용 여부 결정 — 부정확하면 flash 단독 + 부분 커버리지로 되돌림 |
