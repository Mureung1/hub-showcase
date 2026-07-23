# 꺼내보기 검색 탐색 실험

이 디렉터리는 제품 검색 코드를 바로 바꾸지 않고 현행 어휘 검색, 의미 검색과
RRF 하이브리드 검색의 실패 유형을 비교하기 위한 로컬 실험 경계다.

합성 평가의 목적은 특정 모델이나 하이퍼파라미터의 우월성을 증명하는 것이
아니다. 작은 고정 데이터에서 현행 검색이 잘하는 조건, 의미 검색이 추가로 찾는
조건, 답이 없는 query의 오탐을 확인하고 실제 개인 데이터 파일럿을 진행할
후보만 남긴다.

## 현재 구현 범위

Task 0부터 Task 3까지 다음 계약과 탐색 결과를 제공한다.

- `contracts.ts`: corpus·query·관련도 타입과 45개 query 분할 검증
- `experiment_manifest.ts`: 데이터·모델·cache·랭킹 설정 검증
- 결정적인 JSON 직렬화와 manifest SHA-256
- 외부 API의 사용자 승인, projection과 최대 실행 개수 검증
- `metrics.ts`: Recall@5, MRR@6, graded nDCG@6와 wins/ties/losses
- `ranking.ts`: 현행 어휘 검색 adapter, cosine ranking과 RRF
- `embedding_provider.ts`: 입력 정규화, 결정적 cache key, 파일 cache와 벡터 검증
- `local_e5_embedding_provider.ts`: 고정 리비전의 로컬 multilingual-e5 추출기
- `fixtures/`: 모델 실행 전에 고정한 합성 insight 72개와 query 45개
- `run_exploration.ts`: threshold calibration과 네 후보의 재현 가능한 실행
- `report.ts`: 집계·query별 순위·critical miss·negative 반환 보고서

Gemini 등 외부 API 호출과 개인 데이터 사용은 아직 포함되지 않는다.

## 로컬 E5 계약

로컬 공급자는 다음 설정을 코드에 고정한다.

| 항목             | 값                                           |
| ---------------- | -------------------------------------------- |
| 공급자           | `transformers-js@4.2.0:cpu:q8`               |
| 모델             | `Xenova/multilingual-e5-small`               |
| 모델 리비전      | `761b726dd34fb83930e26aab4e9ac3899aa1fa78` |
| 가중치 형식      | q8                                           |
| 벡터 차원        | 384                                          |
| Node 실행 장치   | CPU                                          |
| query 입력       | `query: {정규화된 입력}`                     |
| passage 입력     | `passage: {정규화된 입력}`                   |

Node용 Transformers.js 4.2.0은 `wasm` 실행 장치를 지원하지 않아 CPU ONNX
런타임을 사용한다. 이 결과는 브라우저 WebAssembly·WebGPU 성능을 의미하지
않으며, 브라우저 검증은 합성 평가에서 후보가 남을 때만 별도로 진행한다.

모델과 tokenizer는 `.cache/models/`에 저장하고, 공급자·모델·리비전·task
type·정규화 입력으로 만든 SHA-256을 파일명으로 사용해 결과 벡터를
`.cache/embeddings/`에 저장한다. cache에서 읽은 벡터도 차원과 유한한 숫자
여부를 다시 검증한다.

2026-07-23 로컬 확인에서는 고정 q8 가중치 118,308,185바이트와 tokenizer
17,082,730바이트를 받아 합성 문장 1건을 384차원 단위 벡터로 생성했다. 최초
실행 약 17초와 cache 적중 약 13ms는 현재 개발 환경의 안전 점검 값일 뿐
benchmark나 제품 성능 수치로 사용하지 않는다.

`@huggingface/transformers`는 실험 전용 `devDependency`다. 설치 시 전이
의존성의 보안 권고를 피하기 위해 `sharp@0.35.3`과 `adm-zip@0.6.0`을
override하며, 고정 모델 리비전 외의 임의 원격 모델은 이 실험에서 실행하지
않는다.

## 평가 query 계약

| slice    | calibration | check | 합계 |
| -------- | ----------: | ----: | ---: |
| lexical  |          10 |     5 |   15 |
| semantic |          10 |     5 |   15 |
| negative |          10 |     5 |   15 |

`check`는 통계적 holdout이 아니라 calibration에서 관찰한 실패가 다른 query에서도
반복되는지 확인하는 소규모 점검 세트다. 5개 결과의 백분율을 제품 성능처럼
해석하지 않는다.

관련도는 다음 세 값만 허용한다.

- `2`: 바로 꺼내볼 핵심 자료
- `1`: 보조적으로 유용한 자료
- `0`: 관련 없음

## Task 3 로컬 E5 탐색 결과

2026-07-23에 fixture를 먼저 커밋한 뒤 고정 리비전의 로컬 E5를 실행했다.
모델 실행에는 외부 API, 유료 token과 개인 데이터를 사용하지 않았다.

| 항목 | 값 |
| --- | --- |
| corpus | 합성 insight 72개 |
| query | lexical·semantic·negative 각 15개, 합계 45개 |
| corpus SHA-256 | `91eb31bf622438b4a8319c7dd389761edaf006928c7ccca8c0da03f74c958c41` |
| query SHA-256 | `3384643d0d6eef83330720be5c76dcc2a7f29378b6f7afc4207ee956a2bbd183` |
| manifest SHA-256 | `4d08ca6eaee0e678460d902cc77076e2d0348e385eeb7e75453f4aa1642b12b5` |
| 선택 semantic threshold | `0.8276954665016152` |

선택 threshold는 외부의 임의 기본값이 아니다. Negative calibration 질의의
상위 cosine 점수에서 50·90·100 분위 후보만 만들고, 그중 최대값을 선택해 같은
점수도 반환하지 않게 했다. 이 선택은 calibration negative 평균 반환 수를
0으로 만들었지만 positive Recall@5를 `0.9`에서 `0.8`로 낮춘 보수적인
절충이다.

| 점검 영역 | 현행 어휘 검색 | 로컬 E5 의미 검색 | 로컬 E5 하이브리드 k=60 |
| --- | ---: | ---: | ---: |
| semantic check Recall@5 | 0.600000 | 0.600000 | 0.800000 |
| semantic check MRR@6 | 0.300000 | 0.600000 | 0.566667 |
| semantic check nDCG@6 | 0.334704 | 0.511144 | 0.555389 |
| negative check 평균 반환 수 | 0.200000 | 0.000000 | 0.200000 |

판정 질문에 대한 관찰은 다음과 같다.

1. 하이브리드는 semantic 전체에서 현행 대비 8승·5무·2패이고, 별도로 남겨 둔
   semantic check에서는 3승·2무·0패다.
2. Lexical check는 모두 동률이었다. 하이브리드에는 현행이 찾은 관련도 2
   자료를 놓친 critical miss가 없었다.
3. 하이브리드의 negative 반환 수는 현행과 같았다. 의미 검색의 새 오탐은
   차단했지만 현행 어휘 검색의 오탐까지 해결하지는 않는다.
4. 개선 query의 핵심 자료는 개발·계정·프로젝트·학습·미디어에 걸쳐 있어 한
   주제에만 몰리지 않았다. 여행 표현 두 건은 여전히 취약했다.
5. 로컬 E5 단독의 critical miss 두 건은 보수적 threshold의 영향이 있지만,
   하이브리드가 현행 결과를 보존해 완화했다. 반면 negative 오탐은 어휘 검색
   결합 방식의 후속 과제다.

따라서 Task 3의 결론은 **로컬 E5 하이브리드를 개인 데이터 파일럿 후보로
남긴다**이다. 합성 평가만으로 운영 도입을 승인하지 않으며, Gemini 비교도
자동으로 실행하지 않는다. `k=60`과 `k=10`의 승·무·패 및 query별 결과가 같아
이번 데이터에서 결론 방향은 뒤집히지 않았다.

전체 수치와 45개 query별 상위 결과는
`results/exploration_report.md`, 기계 판독 결과는
`results/exploration_result.json`에 있다.

## 지표와 랭킹 계약

`Recall@5`는 이 실험의 기존 제품 계약에 맞춰 상위 5개 안에 관련도 1 이상인
자료가 하나라도 있으면 query 점수 1, 없으면 0으로 계산한다. `MRR@6`은 첫 관련
자료의 역순위, `nDCG@6`은 `2^관련도 - 1` gain을 사용하는 graded 점수다.
Negative query는 세 품질 점수와 반환 결과 수를 분리해 기록한다.

어휘 검색 adapter는 제품의 `searchInsights`를 그대로 호출하며 점수와 순서를
바꾸지 않는다. Cosine ranking과 RRF는 점수가 같을 때 insight ID 오름차순으로
결정한다. RRF는 cache된 lexical·semantic 순위만 받아 `k=60`과 `k=10`을 비교할
수 있고 원래 점수를 직접 섞지 않는다.

## 외부 실행 승인

외부 공급자 runner는 API 요청 전에 다음 조건을 모두 확인해야 한다.

1. manifest의 `externalApproval.approved`가 `true`다.
2. 실행 projection의 SHA-256이 승인된 값과 같다.
3. 문서 수와 query 수가 각각 승인된 최대값을 넘지 않는다.
4. 실제 runner 단계에서 환경 변수와 명시적 CLI 확인값도 검증한다.

승인은 새로운 데이터나 더 큰 실행 범위에 재사용하지 않는다. API key, 인증
토큰과 원문 텍스트는 로그나 결과 파일에 기록하지 않는다.

## 로컬 산출물

- `.cache/`: 공급자·모델·revision·task type·입력별 임베딩 cache
- `private/`: 별도 승인 뒤 사용하는 개인 데이터와 결과
- `results/`: 합성 데이터의 익명 결과

`.cache/`와 `private/`는 Git에서 제외한다. `results/`는 합성 데이터만 포함하는
Task 3의 재현 가능한 익명 결과만 Git에 포함한다.

## 검증

```powershell
npx vitest run scripts/retrieve_experiment/tests
npx tsc --noEmit -p tsconfig.node.json
npx tsx scripts/retrieve_experiment/run_exploration.ts
```

전체 실험 계획은
`docs/superpowers/plans/2026-07-23-retrieve-hybrid-search-experiment.md`를
따른다.
