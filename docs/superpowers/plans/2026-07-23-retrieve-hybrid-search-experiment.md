# 꺼내보기 비용 최소화 검색 탐색 실험 Implementation Plan

> **For Codex:** Task 0부터 순서대로 실행한다. Gemini 등 유료 외부 API 호출, 개인 데이터 사용, 외부로 텍스트를 전송하는 작업은 사용자의 명시적 승인을 받은 뒤에만 실행한다.

**Goal:** 현행 결정적 검색, 의미 검색, RRF 하이브리드 검색을 작은 꺼내보기 전용 평가셋에서 비교해 실패 유형을 찾고, 실제 개인 데이터 파일럿을 진행할 가치가 있는 후보만 남긴다.

**Architecture:** 제품 데이터베이스와 화면은 바꾸지 않는다. `scripts/retrieve_experiment` 안에서 현행 검색을 기준선으로 재사용한다. 문서와 query는 공급자별로 한 번만 임베딩해 로컬 cache에 저장한다. Threshold와 RRF 비교는 cache된 벡터와 순위를 재사용한다. 합성 평가는 제품 우월성을 증명하지 않으며, 최종 도입 판단은 실제 개인 데이터 파일럿에서만 내린다.

**Tech Stack:** TypeScript 6, Vitest 4, tsx, 현행 `searchInsights`, Gemini Embedding REST API(승인 후), `@huggingface/transformers`, `Xenova/multilingual-e5-small`, Reciprocal Rank Fusion

---

## 0. 이번 개정의 핵심

### 하지 않을 것

- 다른 서비스에서 쓰는 하이퍼파라미터를 유료 API로 재검증하지 않는다.
- MIRACL 등 공개 벤치마크를 Gemini로 실행하지 않는다.
- 합성 query 120개와 부트스트랩 신뢰구간으로 제품 성능을 증명하려 하지 않는다.
- `k=60`이 최적이라고 증명하지 않는다.
- Node 성능을 브라우저 성능이라고 해석하지 않는다.
- 실제 사용자 데이터 없이 운영 도입을 승인하지 않는다.

### 확인하려는 것

1. 현행 어휘 검색이 정확한 단어 단서에서 무엇을 잘하는가?
2. 의미 검색이 표현이 다른 복합 상황에서 어떤 자료를 새로 찾는가?
3. 의미 검색이 관련 자료가 없을 때 어떤 오탐을 만드는가?
4. RRF 결합 결과가 기본값에 지나치게 민감한가?
5. 후보가 실제 개인 데이터 파일럿으로 갈 만큼 유용해 보이는가?

### 비용 원칙

```text
계약·지표·RRF·threshold·보고서
  -> 로컬 계산, 외부 API 토큰 0

로컬 E5
  -> 모델 다운로드는 필요하지만 외부로 개인 텍스트를 보내지 않음

Gemini embedding
  -> 유료 입력 토큰 사용
  -> 실행 전 사용자 승인 필수

개인 데이터 파일럿
  -> 민감 데이터 사용
  -> 공급자와 관계없이 실행 전 사용자 승인 필수
```

Gemini 실행 전에는 다음을 사용자에게 먼저 제시한다.

- 보낼 필드
- 문서 수와 query 수
- 예상 입력 token 범위
- 예상 비용 범위
- cache 재사용 여부
- 결과 저장 위치

승인 전에는 API key를 요청하거나 Gemini runner를 실행하지 않는다.

---

## 1. 실험의 위치

이 기능은 아직 행동 로그를 이용하는 추천 시스템이 아니다. 사용자가 상황을 입력하고 저장된 자료를 다시 찾으므로 핵심 문제는 **개인 자료 재검색**이다.

따라서 이번 실험은 다음 순서를 따른다.

```text
Phase 0: 평가 계약과 승인 경계 고정
             |
             v
Stage 1: 소규모 합성 탐색 평가
  - 실패 유형 발견
  - 제품 우월성 주장 금지
             |
             v
Stage 1.5: 조건부 브라우저 확인
  - 로컬 E5가 후보일 때만
             |
             v
Stage 2: 실제 개인 데이터 파일럿
  - 별도 승인 필수
             |
             v
운영 통합 설계 또는 현행 유지
```

---

## 2. What already exists

| 기존 자산                                              | 현재 역할                                        | 이번 계획에서의 사용          |
| ------------------------------------------------------ | ------------------------------------------------ | ----------------------------- |
| `src/entities/insight/model/search_insights.ts`        | 메모·제목·카테고리·도메인·URL의 결정적 어휘 점수 | 제품 기준선으로 그대로 재사용 |
| `src/entities/insight/model/retrieve_insights.ts`      | 상위 6개 반환                                    | 결과 개수 계약으로 재사용     |
| `src/entities/insight/model/retrieve_insights.test.ts` | 현행 꺼내보기 사례 검증                          | 기존 동작 회귀 테스트로 유지  |
| `src/app/authenticated_workspace.tsx`                  | 제출된 상황으로 검색 실행                        | 실험에서는 수정하지 않음      |
| 기존 인증·RLS 패턴                                     | 사용자별 데이터 격리                             | 운영 통합 계획에서만 재사용   |
| `docs/retrieve.md`                                     | 기능 목적과 품질 원칙                            | 실험 결과 해석의 제품 문맥    |

현행 검색은 점수 동률 때 `createdAt`, `id` 순으로 결정적으로 정렬한다. 실험 후보도 같은 입력에 항상 같은 결과를 반환해야 한다.

---

## 3. NOT in scope

- 제품 UI, 검색 입력 흐름, 결과 카드 변경
- 운영 데이터베이스 vector 컬럼·인덱스 추가
- 운영 API나 Edge Function 추가
- 행동 로그 기반 개인화, 협업 필터링, 학습 순위화
- 원문 페이지 전체 수집, OCR, 자동 요약
- cross-encoder 재순위화
- 자체 임베딩 서버 운영
- MIRACL·MTEB 유료 재실행
- 합성 평가 결과만으로 운영 도입 결정
- 승인 전 Gemini 호출과 개인 데이터 사용

공개 벤치마크는 구현 오류가 의심되거나 두 모델의 차이를 제품 평가만으로 설명할 수 없을 때 별도 선택지로 제안한다. 실행이 필요하면 범위와 비용을 먼저 승인받는다.

---

## 4. 비교 후보

| ID                  | 방식                     | 비용               |
| ------------------- | ------------------------ | ------------------ |
| `lexical-current`   | 현행 `searchInsights`    | 없음               |
| `semantic-local-e5` | 다국어 E5 cosine ranking | 외부 API 토큰 없음 |
| `hybrid-local-e5`   | 현행 어휘 + E5 RRF       | 외부 API 토큰 없음 |
| `semantic-gemini`   | Gemini cosine ranking    | 승인 후 유료 token |
| `hybrid-gemini`     | 현행 어휘 + Gemini RRF   | 승인 후 유료 token |

실행 순서는 로컬 후보가 먼저다. 로컬 결과만으로 실험 목적을 달성하거나 후보가 명백히 부적합하면 Gemini를 호출하지 않을 수 있다.

---

## 5. 평가셋 계약

### 합성 corpus

60~90개의 synthetic insight를 만든다. 초기 목표는 72개다.

- 개발·디자인
- 과제·학습
- 공모전·프로젝트
- 여행·취미
- 영상·읽을거리
- 계정·브라우저·저장 복구

각 주제에 다음 자료를 함께 둔다.

- 바로 꺼내볼 핵심 자료
- 보조적으로 유용한 자료
- 단어는 겹치지만 의도는 다른 자료
- 의도는 같지만 단어가 거의 겹치지 않는 자료

### 합성 query

총 45개를 고정한다.

| slice    | calibration | check | 합계 | 목적                              |
| -------- | ----------: | ----: | ---: | --------------------------------- |
| lexical  |          10 |     5 |   15 | 현행 어휘 검색의 강점 보존        |
| semantic |          10 |     5 |   15 | 표현이 다른 복합 상황의 개선 탐색 |
| negative |          10 |     5 |   15 | 답이 없을 때 오탐 탐색            |

`check` 15개는 통계적 holdout이 아니다. Calibration에서 관찰한 실패 유형이 다른 query에서도 반복되는지 확인하는 소규모 점검 세트다. 5개 query의 백분율을 제품 성능 지표처럼 사용하지 않는다.

### 관련도 label

- `2`: 이 상황에서 바로 꺼내볼 핵심 자료
- `1`: 보조적으로 유용한 자료
- `0`: 관련 없음

모델 결과를 보기 전에 label을 고정한다. Corpus, query, label 파일의 SHA-256을 manifest에 기록한다.

---

## 6. 지표와 해석

다음 지표를 계산하되 통계적 우월성을 주장하지 않는다.

- `Recall@5`
- `MRR@6`
- graded `nDCG@6`
- negative query의 반환 결과 수
- query별 wins / ties / losses
- critical miss

`critical miss`는 관련도 2인 자료를 현행은 찾았지만 후보가 상위 6개에서 놓친 경우다.

### 파일럿 후보 판정

고정 백분율 게이트 대신 다음 질문으로 판정한다.

1. Semantic query에서 후보의 승수가 패수보다 많은가?
2. Lexical query에서 현행이 잘 찾던 핵심 자료를 반복적으로 놓치지 않는가?
3. Negative query에서 그럴듯한 오탐이 현행보다 심해지지 않는가?
4. 개선이 특정 주제나 표현에만 몰려 있지 않은가?
5. 오류 사례가 threshold 조절로 해결될 문제인가, 모델 자체의 한계인가?

결론은 다음 중 하나다.

- 개인 데이터 파일럿 후보
- threshold 또는 결합 방식 재검토
- 로컬 후보 탈락 후 Gemini 비교 승인 요청
- 두 의미 검색 후보 모두 보류
- 현행 검색 유지

---

## 7. Cache와 비용 제어

### 한 번만 임베딩

공급자별로 다음 key를 사용해 문서와 query 벡터를 cache한다.

```text
sha256(
  provider
  + modelId
  + modelRevision
  + taskType
  + normalizedInput
)
```

같은 모델과 입력이면 다시 외부 API를 호출하지 않는다.

### Cache 이후 무료로 할 수 있는 것

- cosine similarity 재계산
- semantic threshold 비교
- RRF rank constant 비교
- 상위 결과 개수 변경
- query별 오류 분석
- Markdown 보고서 재생성

### RRF

주 비교는 널리 쓰이는 기본값과의 재현성을 위해 `k=60`으로 실행한다.

추가로 cache된 lexical·semantic 순위에 `k=10`만 적용해 결론의 민감도를 확인한다.

```text
rrfScore(document) =
  lexical에 있으면 1 / (k + lexicalRank)
  + semantic에 있으면 1 / (k + semanticRank)
```

목적은 최적의 `k`를 찾는 것이 아니다. `10`과 `60`에서 후보 판단이 뒤집히면 “RRF 설정에 민감하므로 결론 불안정”으로 기록한다.

### Threshold

Calibration의 negative query와 positive query를 함께 보고 소수의 threshold 후보만 비교한다.

- provider 권장 방식이 있으면 그 값을 기준으로 사용
- 필요할 때만 3개 이하의 threshold 후보 비교
- check 결과를 본 뒤 threshold를 다시 고르지 않음

Threshold 비교도 cache된 벡터를 사용하므로 추가 API token이 들지 않는다.

---

## 8. 개인정보와 승인 계약

### Gemini에 보낼 수 있는 projection

```text
title: {title}
memo: {memo}
category: {category}
domain: {domain}
```

금지 필드:

- `userId`
- `id`
- `originalUrl`
- `normalizedUrl`
- `createdAt`
- `updatedAt`
- 인증 토큰
- 검색·클릭·열람 이력

### 실행 승인

외부 API runner는 다음 조건을 모두 만족하지 않으면 실행을 거부한다.

1. `GEMINI_API_KEY`가 환경 변수로 존재한다.
2. CLI에 명시적 외부 실행 확인값이 있다.
3. manifest에 승인 범위와 projection hash가 기록돼 있다.
4. 예상 문서·query 수가 승인 범위를 넘지 않는다.

승인은 실행마다 요청한다. 이전 실행의 승인을 새로운 데이터나 더 큰 범위에 재사용하지 않는다.

### 로그

- API key와 원문 텍스트를 기록하지 않는다.
- 오류에는 공급자, 상태 코드, 익명 입력 hash만 기록한다.
- 실제 개인 데이터 결과는 `private/` 아래에만 저장하고 git에 추가하지 않는다.

---

## 9. 조건부 실제 브라우저 확인

로컬 E5가 합성 탐색에서 후보가 됐을 때만 진행한다.

Node 결과를 브라우저 결과로 해석하지 않고 다음을 따로 측정한다.

- 모델·tokenizer 다운로드 크기
- cold load와 cache load
- 첫 query 시간
- warm query p50·p95
- peak 메모리
- WebGPU 또는 WebAssembly 사용 여부
- 취소와 탭 이동 후 복구

데스크톱 Chrome과 Android Chrome에서 각각 기록한다. 로컬 후보가 탈락하면 이 단계는 생략한다.

---

## 10. 실제 개인 데이터 파일럿

별도 승인 후에만 진행한다.

최소 조건:

- 개인 insight 50개 이상
- 사용자가 직접 작성한 실제 상황 query 30개 이상
- 모델명을 숨긴 상위 6개 결과 판정

현행과 후보를 무작위 A/B 순서로 보여주고 다음을 기록한다.

- A가 낫다
- 비슷하다
- B가 낫다
- 둘 다 실패
- 절대 나오면 안 되는 결과

Gemini를 개인 데이터에 사용하려면 합성 데이터 Gemini 승인과 별개로 다시 승인받는다.

Stage 2를 완료하지 못하면 운영 도입을 승인하지 않는다.

---

## 11. 파일 구조

```text
scripts/retrieve_experiment/
  README.md
  contracts.ts
  experiment_manifest.ts
  metrics.ts
  ranking.ts
  privacy_projection.ts
  embedding_provider.ts
  local_e5_embedding_provider.ts
  gemini_embedding_provider.ts
  run_exploration.ts
  run_private_pilot.ts
  report.ts
  fixtures/
    exploratory_corpus.ts
    exploratory_queries.ts
  browser_benchmark/
    index.html
    main.ts
  tests/
    contracts.test.ts
    experiment_manifest.test.ts
    metrics.test.ts
    ranking.test.ts
    privacy_projection.test.ts
    embedding_provider.test.ts
    report.test.ts
```

생성 데이터:

```text
scripts/retrieve_experiment/.cache/    # 임베딩 cache, git 제외
scripts/retrieve_experiment/results/   # 익명 합성 결과
scripts/retrieve_experiment/private/   # 개인 데이터, 항상 git 제외
```

---

## 12. 구현 순서

### Task 0: 평가 계약과 승인 경계

**Files:**

- Create: `scripts/retrieve_experiment/README.md`
- Create: `scripts/retrieve_experiment/contracts.ts`
- Create: `scripts/retrieve_experiment/experiment_manifest.ts`
- Create: `scripts/retrieve_experiment/tests/contracts.test.ts`
- Create: `scripts/retrieve_experiment/tests/experiment_manifest.test.ts`
- Update: `.gitignore`
- Update: `tsconfig.node.json`

**RED: 먼저 실패 테스트 작성**

- [x] corpus, query, relevance label 타입의 기대 사용법을 테스트한다.
- [x] calibration과 check query ID가 겹치면 실패한다.
- [x] slice별 query 수가 계약과 다르면 실패한다.
- [x] 필수 모델·cache·랭킹 정보가 빠진 manifest를 거부한다.
- [x] 같은 manifest가 항상 같은 SHA-256을 만드는지 테스트한다.
- [x] key 입력 순서가 달라도 같은 SHA-256을 만드는지 테스트한다.
- [x] 평가 계약이 바뀌면 hash도 바뀌는지 테스트한다.
- [x] 외부 API manifest가 승인되지 않았으면 실행 검증을 거부한다.
- [x] 승인된 문서·query 수보다 실행 범위가 크면 거부한다.

**GREEN: 최소 구현**

- [x] query slice와 phase를 명시적인 union type으로 정의한다.
- [x] 관련도 0·1·2만 허용한다.
- [x] manifest validation을 순수 함수로 구현한다.
- [x] stable JSON 직렬화와 SHA-256을 구현한다.
- [x] 외부 실행 승인 범위를 manifest 계약에 포함한다.
- [x] `.cache/`와 `private/`를 `.gitignore`에 추가한다.
- [x] `scripts/retrieve_experiment`를 `tsconfig.node.json` 검사 범위에 추가한다.

**검증:**

```powershell
npx vitest run scripts/retrieve_experiment/tests/contracts.test.ts scripts/retrieve_experiment/tests/experiment_manifest.test.ts
npx tsc --noEmit -p tsconfig.node.json
```

**이 Task에서는 하지 않음:**

- 모델 패키지 설치
- 모델 다운로드
- Gemini API key 요청
- 외부 API 호출
- 실제 개인 데이터 사용

### Task 1: 지표와 랭킹

**Files:**

- Create: `scripts/retrieve_experiment/metrics.ts`
- Create: `scripts/retrieve_experiment/ranking.ts`
- Create: `scripts/retrieve_experiment/tests/metrics.test.ts`
- Create: `scripts/retrieve_experiment/tests/ranking.test.ts`
- Reuse: `src/entities/insight/model/search_insights.ts`

**Steps:**

- [x] 지표의 손계산 fixture를 실패 테스트로 작성한다.
- [x] 현행 검색과 lexical adapter의 golden parity를 테스트한다.
- [x] cosine의 zero vector, `NaN`, 차원 불일치를 테스트한다.
- [x] RRF `k=60`과 `k=10`을 cache된 순위로 비교한다.
- [x] 결정적 동률 정렬을 보존한다.

**외부 API token:** 없음

### Task 2: 로컬 E5 탐색

**Files:**

- Create: `scripts/retrieve_experiment/embedding_provider.ts`
- Create: `scripts/retrieve_experiment/local_e5_embedding_provider.ts`
- Create: `scripts/retrieve_experiment/tests/embedding_provider.test.ts`
- Update: `package.json`
- Update: `package-lock.json`

**Steps:**

- [x] extractor 주입 방식의 실패 테스트를 작성한다.
- [x] `query:`와 `passage:` prefix를 구분한다.
- [x] 벡터 차원과 finite number를 검증한다.
- [x] cache key와 cache hit를 테스트한다.
- [x] 정확한 `@huggingface/transformers` 버전을 고정한다.
- [x] q8 모델을 다운로드해 합성 평가 벡터를 한 번 생성한다.

**외부 API token:** 없음

**외부 네트워크:** 모델 다운로드 있음, 개인 데이터 전송 없음

### Task 3: 합성 탐색 평가

**Files:**

- Create: `scripts/retrieve_experiment/fixtures/exploratory_corpus.ts`
- Create: `scripts/retrieve_experiment/fixtures/exploratory_queries.ts`
- Create: `scripts/retrieve_experiment/run_exploration.ts`
- Create: `scripts/retrieve_experiment/report.ts`
- Create: `scripts/retrieve_experiment/tests/report.test.ts`

**Steps:**

- [x] insight 72개와 query 45개를 모델 실행 전에 고정한다.
- [x] calibration/check, lexical/semantic/negative 분포를 검증한다.
- [x] 관련도 label과 fixture hash를 고정한다.
- [x] 현행·local semantic·local hybrid를 실행한다.
- [x] `k=60`과 `k=10`에서 결론이 뒤집히는지 확인한다.
- [x] 수치와 query별 오류 사례를 함께 보고한다.
- [x] “통계적 우월성을 증명하지 않음”을 보고서에 명시한다.

**외부 API token:** 없음

### Task 4: Gemini 비교 승인 게이트

로컬 탐색 결과를 먼저 사용자에게 보여준다. 다음 중 하나일 때만 Gemini 실행을 제안한다.

- 로컬 E5가 의미 query에서 개선을 보이지만 오류가 많아 관리형 모델 비교 가치가 있음
- 로컬 E5가 실패해 관리형 모델이 대안인지 확인할 필요가 있음
- 사용자가 학습 목적으로 두 모델 비교를 명시적으로 원함

승인 요청에 포함할 것:

- 합성 문서·query 개수
- projection 예시
- 예상 token과 비용
- cache 정책
- 실행 후 추가 threshold/RRF 비교에는 token이 들지 않는다는 설명

승인받은 뒤에만 Gemini adapter와 runner를 구현·실행한다.

**진행 상태:**

- [x] 로컬 E5 결과와 Gemini 비교 가치를 검토한다.
- [x] 최신 안정 모델·종료 일정·공식 가격을 다시 확인한다.
- [x] 문서 72개·query 45개의 projection과 SHA-256을 고정한다.
- [x] 예상 token·비용·cache 정책을 승인 요청서에 기록한다.
- [x] Paid Tier, Free Tier 또는 비교 보류 중 사용자 결정을 받는다.
- [x] 승인받은 projection과 실행 범위를 강제하는 Gemini adapter를 구현한다.
- [x] API key와 명시적 CLI 확인값이 없으면 네트워크 전에 중단한다.
- [x] `GEMINI_API_KEY`를 준비하고 승인받은 합성 범위만 실행한다.
- [x] Gemini 수치·query별 오류·실제 token 영수증을 보고한다.

승인 요청서는
`scripts/retrieve_experiment/gemini_approval_request.md`에 보존한다.

### Task 5: 조건부 브라우저 benchmark

로컬 E5가 파일럿 후보일 때만 수행한다. 후보가 아니면 생략 이유를 보고서에 남긴다.

2026-07-23 후속 실측에서 Desktop Chrome 150.0.7871.181과 Android Chrome 148.0.7778.215 모두 측정에 성공했다. Worker 생성 직전부터 pipeline ready까지 재측정한 cold/cache load는 Desktop 34,108.635/2,294.865ms, Android 79,932.855/5,984.910ms다. 두 플랫폼의 고정 revision 필수 Cache Storage 항목과 cache 단계 CDP 원격 모델 요청 0건을 확인해 `cacheHitVerified: true`로 기록했다. cache 준비 뒤 첫 progress callback에서 Worker를 취소한 후 새 Worker의 ready, 첫 query, warm 20회, 384차원 복구도 모두 성공했다.

메모리 API는 원래 `performance` receiver로 호출했다. cache 단계 첫 query 경계에서 Desktop 1,118,233 bytes, Android 1,088,856 bytes를 관측했고 다른 경계는 10초 제한에서 `null`로 기록했다. 단계 경계 관측치는 연속 peak가 아니다.

### Task 6: 개인 데이터 파일럿

별도 사용자 승인을 받은 뒤에만 도구를 준비하고 실행한다. 개인 데이터의 외부 전송 여부는 공급자별로 다시 승인받는다.

### Task 7: 운영 통합 결정

개인 데이터 파일럿 전에는 운영 스키마나 UI 구현 계획을 만들지 않는다.

파일럿 뒤 가능한 결론:

- 현행 검색 유지
- 로컬 하이브리드 운영 설계
- Gemini 하이브리드 운영 설계
- 데이터가 더 쌓일 때까지 보류

---

## 13. Task 0 테스트 지도

```text
[contracts]
  ├─ 유효한 lexical/calibration query            [unit]
  ├─ 유효한 semantic/check query                 [unit]
  ├─ relevance 0·1·2                             [unit]
  ├─ 잘못된 relevance                            [unit]
  ├─ calibration/check ID 중복                   [unit]
  └─ slice별 개수 불일치                         [unit]

[manifest]
  ├─ 유효한 local manifest                       [unit]
  ├─ 필수 모델 정보 누락                         [unit]
  ├─ 같은 입력 -> 같은 hash                      [unit]
  ├─ key 순서 변경 -> 같은 hash                  [unit]
  ├─ 계약 변경 -> 다른 hash                      [unit]
  ├─ external + 미승인                           [unit]
  ├─ external + 승인 범위 초과                   [unit]
  └─ external + 승인 범위 이내                   [unit]
```

---

## 14. 오류 및 복구 원칙

| codepath      | 실패                   | 처리                               |
| ------------- | ---------------------- | ---------------------------------- |
| query 계약    | phase·slice·label 오류 | 실행 전 중단                       |
| 분할 계약     | calibration/check 중복 | 실행 전 중단                       |
| manifest      | 필수 필드 누락         | 누락 필드와 함께 중단              |
| manifest hash | 지원하지 않는 값       | 직렬화 오류로 중단                 |
| 외부 실행     | 승인 없음              | API 호출 전에 중단                 |
| 외부 실행     | 승인 범위 초과         | API 호출 전에 중단                 |
| cache         | model revision 불일치  | cache miss로 처리                  |
| provider      | timeout·429·5xx        | Task 4 승인 후 오류 정책 별도 구현 |
| report        | 개인 원문 포함         | 보고서 생성 거부                   |

catch-all로 오류를 삼키고 다음 입력으로 넘어가지 않는다.

---

## 15. 완료 조건

### Task 0 완료

- [x] 계약 테스트가 먼저 실패한 기록이 있다.
- [x] calibration/check 중복과 slice 개수 오류를 거부한다.
- [x] manifest SHA-256이 결정적이다.
- [x] 외부 API 미승인과 승인 범위 초과를 거부한다.
- [x] `.cache/`와 `private/`가 git에서 제외된다.
- [x] Node TypeScript 검사가 통과한다.
- [x] 모델·API·개인 데이터 작업이 발생하지 않았다.

### 전체 실험 완료

- [x] 합성 탐색 결과를 제품 성능 증명으로 표현하지 않았다.
- [x] 모든 threshold와 RRF 비교가 cache를 재사용한다.
- [ ] Gemini 실행 전 별도 승인을 받았다.
- [ ] 개인 데이터 사용 전 별도 승인을 받았다.
- [ ] 실제 개인 데이터 파일럿 없이 운영 도입을 승인하지 않았다.
- [ ] 현행 유지도 정상적인 결론으로 기록했다.

---

## 16. 참고 자료

- [Supabase Hybrid Search](https://supabase.com/docs/guides/ai/hybrid-search)
- [Elasticsearch RRF](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion)
- [OpenSearch Hybrid Search Optimization](https://docs.opensearch.org/latest/search-plugins/search-relevance/optimize-hybrid-search/)
- [Gemini Embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small)
- [Transformers.js](https://huggingface.co/docs/transformers.js/en/index)

---

## 17. 결정 기록

| 날짜       | 결정                                                                      |
| ---------- | ------------------------------------------------------------------------- |
| 2026-07-23 | 관리형 Gemini와 로컬 E5를 비교하는 방향 승인                              |
| 2026-07-23 | 공개 벤치마크 → 120개 합성 평가 → 개인 파일럿의 3단계 계획 작성           |
| 2026-07-23 | 공개 벤치마크 유료 실행, 120개 합성 평가, 부트스트랩을 필수 범위에서 제거 |
| 2026-07-23 | 모든 유료 외부 API와 민감 데이터 작업은 사용자 명시 승인 후 실행          |
| 2026-07-23 | 합성 탐색 뒤 로컬 E5 하이브리드를 개인 데이터 파일럿 후보로 유지          |
| 2026-07-23 | Gemini Free Tier로 승인된 합성 문서 72개·query 45개 실행 완료             |

**현재 상태:** Task 0부터 Task 5까지 완료했다. 승인된 합성 문서 72개와 query 45개만 Gemini Free Tier로 실행했으며 117회 요청에서 실제 prompt token은 4,365개, 비용은 0달러였다. Semantic check에서 Gemini 의미 검색 단독은 Recall@5 1.000000, nDCG@6 0.942903으로 현행과 로컬 E5 하이브리드보다 높았지만, Gemini RRF 하이브리드는 nDCG@6 0.763331(`k=60`), 0.770573(`k=10`)으로 의미 검색 단독보다 낮았다. Negative check의 query당 평균 반환 수는 Gemini 의미 검색 0.6, 하이브리드 0.8로 현행과 로컬 E5 하이브리드의 0.2보다 많았다. 따라서 관리형 의미 모델은 후속 검토 가치가 있지만 단순 RRF 추가는 지지되지 않는다. 합성 결과는 운영 도입 근거가 아니며 개인 데이터 사용은 아직 발생하지 않았다.

Task 5에서는 실제 Desktop Chrome 150.0.7871.181과 Android Chrome 148.0.7778.215를 각각 CDP와 ADB reverse를 통해 같은 localhost COOP/COEP origin에서 측정했다. `Xenova/multilingual-e5-small`의 고정 revision q8을 Worker의 실제 WASM backend로 실행했으며, desktop cold/cache load는 34,108.635/2,294.865ms, Android cold/cache load는 79,932.855/5,984.910ms였다. 두 플랫폼에서 고정 revision 필수 Cache Storage 항목과 cache 단계 CDP 원격 모델 요청 0건을 확인해 `cacheHitVerified: true`를 기록했다. cache 준비 뒤 첫 progress callback에서 Worker를 취소한 뒤 새 Worker의 ready, 첫 query, warm 20회와 `hidden → visible` 뒤 384차원 query 성공을 확인했다. `navigator.gpu` 지원과 실제 backend는 구분해 기록했다. 메모리 API는 원래 `performance` receiver로 호출했으며 cache 단계 첫 query 경계에서 Desktop 1,118,233 bytes, Android 1,088,856 bytes를 관측했다. 다른 경계는 10초 제한에서 `null`로 기록했고, 단계 경계 관측치를 연속 peak로 해석하지 않는다. WASM 크기는 Cache Storage `content-length` 단일 관측으로 4,732,131 bytes를 기록했다. 결과는 `scripts/retrieve_experiment/results/browser_benchmark_result.json`과 `scripts/retrieve_experiment/results/browser_benchmark_report.md`에 보존한다.
