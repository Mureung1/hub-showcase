# 답냥이 검수 예시 Retrieval 설계·운영 설명서

> 문서 기준일: 2026-07-22
>
> 관련 기능: CHECKLIST T35
>
> 현재 상태: **비프로덕션 실험 기반만 구현됨. 운영 `/api/generate`에는 연결하지 않음**

## 1. 한 문장 설명

Voyage AI는 답냥이의 메시지를 대신 작성하는 AI가 아니라, 문장의 의미를 1024개 숫자로 바꿔 **현재 상황과 의미가 가까운 검수 예시를 찾게 해주는 embedding provider**다.

최종 메시지 세 톤을 작성하는 역할은 Gemini가 담당하고, 검색된 숫자 벡터와 metadata는 Neon PostgreSQL의 pgvector가 비교한다.

## 2. 30초 설명

답냥이에는 사람이 검수한 메시지 예시가 있다. 현재 운영 코드는 관계별로 고정된 예시 두 세트를 Gemini prompt에 넣는다. T35는 고정 예시 대신 사용자의 관계·목적·발신 방식과 의미가 가까운 검수 예시 두 세트를 고르면 품질이 좋아지는지 확인하는 offline 실험이다.

Voyage AI는 검수 예시와 합성 query를 숫자 벡터로 변환하고, Neon pgvector는 같은 관계·목적·방식 안에서 cosine distance가 가까운 두 예시를 찾는다. 검색 실패, 후보 부족, checksum 불일치가 있으면 기존 static 예시로 돌아간다. 아직 품질 우위와 충분한 corpus coverage가 증명되지 않았으므로 실제 사용자 요청에는 이 경로를 사용하지 않는다.

## 3. 구성 요소별 역할

| 구성 요소 | 하는 일 | 하지 않는 일 |
| --- | --- | --- |
| 답냥이 구조화 UI | 관계·상황 카드·핵심 답변으로 생성 맥락을 만든다 | 자유로운 agent 계획을 수행하지 않는다 |
| Git 검수 예시 | 사람이 검수한 상황과 세 톤 후보의 정본을 보관한다 | DB에서 본문을 편집하지 않는다 |
| Voyage AI | 문장을 의미 비교용 embedding vector로 변환한다 | 최종 보낼 말을 생성하거나 검수하지 않는다 |
| Neon PostgreSQL + pgvector | document vector와 허용 metadata를 저장하고 exact cosine top-2를 찾는다 | 사용자 원문·생성문구·query vector를 영구 저장하지 않는다 |
| Gemini | 규칙과 검수 예시를 참고해 최종 세 톤 후보를 생성한다 | 현재 운영에서 Voyage retrieval을 호출하지 않는다 |
| 결정적 validator | Gemini 결과의 구조·톤 수·길이·금지 조건을 검사한다 | 모델처럼 새 문장을 작성하지 않는다 |

### 용어

- **Embedding**: 문장의 의미적 특성을 숫자 배열로 표현한 값이다. 이 프로젝트는 1024차원 float vector를 사용한다.
- **Vector search**: query vector와 document vector 사이의 거리를 계산해 가까운 문서를 찾는 검색이다.
- **Cosine distance**: 두 vector의 방향 차이를 이용한 거리다. 작을수록 의미가 가깝다고 본다.
- **Retrieval**: 생성 전에 관련 검수 예시를 찾는 단계다.
- **Example set**: 하나의 상황과 그 상황에 대한 세 tone 후보를 묶은 단위다.
- **Static selector**: 관계별로 고정된 두 example set을 사용하는 현재 운영 방식이다.
- **Retrieval selector**: 관계·목적·방식 hard filter와 의미 유사도를 함께 사용해 두 example set을 고르는 실험 방식이다.

Embedding은 원문 대신 의미 비교에 쓰는 표현이지만, 그 자체를 익명 데이터라고 간주해서는 안 된다. 원문과 마찬가지로 접근 권한과 보존 범위를 제한한다.

## 4. 왜 이 실험을 하는가

현재 static selector는 관계별로 검수 예시 두 세트를 고정 사용한다. 안정적이고 비용이 없지만, 사용자의 목적과 다른 예시가 들어갈 수 있다.

예를 들어 사용자가 `groupwork + ask + reply` 상황인데 static pair가 `groupwork + initiate + suggest` 예시까지 포함할 수 있다. Retrieval은 먼저 관계·목적·방식을 정확히 제한하고, 그 안에서 의미가 가까운 두 예시를 찾으려 한다.

기대하는 효과는 다음과 같다.

- prompt 예시가 현재 상황과 더 가까워질 가능성
- 사실을 임의로 옮겨오는 오류 감소 가능성
- 관계별 말투와 목적 화행의 일치율 개선 가능성

하지만 이는 아직 가설이다. 실제 생성 A/B가 없으므로 현재 문서와 제품에서 품질 향상이나 우위를 주장하지 않는다.

## 5. 현재 운영과 실험 경로

### 5.1 현재 운영 경로

```text
브라우저의 guided/manual 요청
→ /api/generate
→ 관계별 static 검수 예시 2세트
→ Gemini 1회 생성
→ 구조·사실·안전 validator
→ 세 톤 결과
```

현재 이 경로에는 Voyage AI와 retrieval repository가 연결되어 있지 않다. [`runtimeBoundary.test.ts`](../api/_lib/retrieval/runtimeBoundary.test.ts)가 운영 생성 파일에서 retrieval import와 `retrieval-eval` mode가 없음을 검사한다.

따라서 현재 상태에서 발생하는 효과는 다음과 같다.

- 실제 사용자 요청에 추가 embedding 비용 없음
- 실제 사용자 요청에 추가 retrieval 지연 없음
- 실제 사용자 입력이 Voyage로 전송되지 않음
- Voyage 장애가 운영 메시지 생성에 영향을 주지 않음

### 5.2 Offline document ingestion

```text
Git의 검수 example set
→ stable example ID + catalog version + checksum
→ 관계·목적·방식·상황을 document text로 구성
→ Voyage input_type=document
→ 1024차원 float embedding
→ retrieval_examples에 vector + metadata 저장
```

[`catalog.ts`](../api/_lib/retrieval/catalog.ts)는 검수 예시에서 다음 정보를 만든다.

- `exampleId`
- `catalogVersion`
- `scenarioId`
- `purposeId`
- `mode`
- `reviewStatus`와 `reviewedAt`
- 원본 전체의 SHA-256 `checksum`
- Voyage에 보낼 관계·목적·방식·상황·검수된 받은 메시지의 `documentText`

세 톤 후보 문구는 `documentText`에 넣지 않는다. 다만 후보가 변경되면 stale vector를 그대로 재사용하지 않도록 checksum 계산에는 세 후보도 포함한다.

[`ingestion.ts`](../api/_lib/retrieval/ingestion.ts)는 동일한 `exampleId + catalogVersion + embeddingModel`이 이미 있고 checksum도 같으면 Voyage를 다시 호출하지 않는다. 동일 버전인데 checksum이 다르면 임의 덮어쓰기를 하지 않고 새 catalog version을 요구한다.

### 5.3 Offline query retrieval

```text
합성 query text
→ Voyage input_type=query
→ 요청 수명 동안만 존재하는 1024차원 query vector
→ catalog/model/approved/관계/목적/방식 hard filter
→ pgvector cosine distance exact top-2
→ example ID + checksum 반환
→ Git 정본에서 두 example set 복원
```

[`repository.ts`](../api/_lib/retrieval/repository.ts)는 다음 조건을 모두 만족하는 행만 검색한다.

- 같은 catalog version
- 같은 embedding model
- `approved` 상태
- 같은 관계 `scenarioId`
- 같은 목적 `purposeId`
- 같은 발신 방식 `mode`

그 뒤 cosine distance 오름차순과 `exampleId` 오름차순으로 결정적 정렬하고 정확히 최대 2개를 가져온다.

[`selector.ts`](../api/_lib/retrieval/selector.ts)는 결과가 서로 다른 두 개이고 Git checksum과 모두 일치할 때만 retrieval 예시를 사용한다. 다음 상황에서는 static pair로 돌아간다.

- selector mode가 `static`
- provider나 repository 미설정
- Voyage 또는 DB 오류
- 후보가 두 개 미만
- 같은 example이 중복 반환됨
- Git에 없는 example ID
- DB와 Git checksum 불일치

## 6. 실제 코드 지도

| 파일 | 책임 |
| --- | --- |
| [`seedExamples.ts`](../api/_lib/prompt/seedExamples.ts) | 검수 example set의 Git 정본과 현재 static pair |
| [`catalog.ts`](../api/_lib/retrieval/catalog.ts) | stable ID·version·checksum·document text 구성 |
| [`embedding.ts`](../api/_lib/retrieval/embedding.ts) | provider interface, 1024차원·finite·nonzero 검증 |
| [`voyageEmbeddingProvider.ts`](../api/_lib/retrieval/voyageEmbeddingProvider.ts) | Voyage REST 호출, query/document 구분, 5초 timeout과 오류 정규화 |
| [`schema.ts`](../api/_lib/db/schema.ts) | metadata-only `retrieval_examples` Drizzle schema |
| [`repository.ts`](../api/_lib/retrieval/repository.ts) | idempotent upsert와 exact cosine top-2 SQL |
| [`ingestion.ts`](../api/_lib/retrieval/ingestion.ts) | approved catalog의 document embedding 적재 |
| [`selector.ts`](../api/_lib/retrieval/selector.ts) | retrieval 성공 조건과 모든 실패의 static fallback |
| [`coverage.ts`](../api/_lib/retrieval/coverage.ts) | 48 cell×최소 2세트 activation guard |
| [`evaluation.ts`](../api/_lib/retrieval/evaluation.ts) | 현재 합성 ranking fixture의 Recall@2·MRR·지연·비용 계산 |
| [`retrieval-ingest.ts`](../scripts/retrieval-ingest.ts) | 비프로덕션 검수 catalog 적재 명령 |
| [`retrieval-smoke.ts`](../scripts/retrieval-smoke.ts) | 합성 document 2개→query→exact top-2→자체 행 삭제 smoke |
| [`retrieval-eval.ts`](../scripts/retrieval-eval.ts) | 합성 offline report 출력 |
| [`runtimeBoundary.test.ts`](../api/_lib/retrieval/runtimeBoundary.test.ts) | 운영 생성 경로에 retrieval이 연결되지 않았음을 검사 |

## 7. 데이터·개인정보 경계

### 7.1 저장·전송 위치별 데이터

| 위치 | 허용 | 금지 또는 현재 미사용 |
| --- | --- | --- |
| Git | 검수 상황, 검수 받은 메시지, 세 톤 후보, stable ID/version | 실제 사용자별 기록 |
| Voyage document 호출 | 검수 예시의 관계·목적·방식·상황·검수 받은 메시지 | 세 톤 후보, 실제 운영 사용자 입력 |
| Voyage query 호출 | 현재 smoke와 offline 평가용 합성 query | 실제 운영 사용자 입력 |
| Neon `retrieval_examples` | example/catalog/model ID, 관계·목적·방식, checksum, review metadata, document vector | 예시 본문, 사용자 원문, 생성문구, query vector, 임의 JSON |
| 운영 generation metric | 기존 allowlist metadata | Voyage query/vector, 사용자 원문, 생성문구 |

### 7.2 중요한 원칙

- 실제 사용자 원문은 현재 Gemini 생성 호출에만 사용하며 Voyage에 보내지 않는다.
- query vector는 selector 요청 수명 안에서만 사용하고 DB·로그·metric에 전달하지 않는다.
- DB에서 반환하는 것은 example ID·checksum·distance이고, 전체 예시는 Git에서 복원한다.
- API key는 `.env.local` 또는 비프로덕션 secret store에만 둔다.
- `.env.local`은 `.gitignore`의 `*.local`과 `.env.*` 규칙으로 Git에서 제외된다.
- API key를 브라우저 번들이나 `VITE_` 환경변수에 넣지 않는다.

Voyage의 현재 공식 FAQ는 조직 관리자가 결제 수단을 등록한 경우 dashboard에서 데이터 저장·향후 학습 사용을 opt-out하여 zero-day retention을 선택할 수 있다고 설명한다. 이 설정은 자동 적용된 것으로 간주하지 않으며, 실제 사용자 입력을 Voyage에 보내는 설계로 바꾸려면 별도 승인·고지·보존 정책 확인이 먼저 필요하다.

## 8. 비용

### 8.1 어떤 비용이 생기는가

비용은 세 종류를 분리해서 봐야 한다.

1. **Voyage embedding 비용**: Voyage에 보낸 document/query token 수에 따라 발생한다.
2. **Neon 저장·query 비용**: vector와 metadata 저장 및 SQL 실행이 기존 Neon 사용량에 포함된다.
3. **Gemini 생성 비용**: 실제 A/B에서 두 방식으로 메시지를 생성할 때 별도로 발생한다.

Voyage를 사용한다고 Gemini 비용이 대체되는 것은 아니다. Retrieval은 생성 전에 예시를 고르는 추가 단계다.

### 8.2 현재 선택 모델

이 프로젝트의 권장 실험 모델은 `voyage-4-lite`다.

- 일반·다국어 retrieval 지원
- 1024차원 float 출력 지원
- Voyage 4 계열 중 latency·cost 중심 모델
- 현재 schema의 `vector(1024)`와 일치

공식 가격 문서의 2026-07-22 확인값은 다음과 같다. 가격과 무료 한도는 바뀔 수 있으므로 실제 실행 전 공식 문서를 다시 확인한다.

| 항목 | 현재 공식 값 |
| --- | --- |
| 무료 범위 | 계정당 최초 200,000,000 tokens |
| 무료 범위 이후 | `$0.02 / 1,000,000 tokens` |
| 10,000 tokens 예시 | `$0.0002` |
| 100,000 tokens 예시 | `$0.002` |
| 1,000,000 tokens 예시 | `$0.02` |

계산식은 `처리 token 수 ÷ 1,000,000 × $0.02`다. 무료 범위 안에서는 Voyage 청구액이 0일 수 있지만, 계정 정책과 현재 가격 페이지를 기준으로 확인해야 한다.

### 8.3 이 프로젝트에서 발생하는 Voyage 호출

| 작업 | 호출 특성 |
| --- | --- |
| 현재 8 example set 최초 ingestion | document 8개를 한 배열로 보내는 embedding 요청 1회 |
| 같은 catalog/model 재ingestion | checksum이 같으면 embedding 0회 |
| `retrieval:smoke` | 합성 document batch 1회 + 합성 query 1회 |
| offline retrieval case | case마다 query embedding 1회 |
| 현재 운영 사용자 요청 | 0회 |

실제 비용은 문장별 token 수와 실행 횟수에 따라 달라진다. 현재 corpus는 작고 운영 호출도 없으므로 실험 비용은 매우 작을 가능성이 높지만, 아직 실제 Voyage usage report로 확인하지 않았으므로 정확한 청구액으로 표현하지 않는다.

### 8.4 DB 저장 크기

pgvector 공식 설명에 따르면 float vector는 대략 `4 × dimensions + 8 bytes`를 사용한다.

- 1024차원 1개: 약 4,104 bytes
- 현재 8 example set의 vector 본체: 약 32 KiB
- activation 최소 96 example set의 vector 본체: 약 385 KiB

이는 vector 본체만의 계산이다. PostgreSQL row, metadata, primary key와 filter index overhead는 별도이며 Neon 요금은 사용 중인 계정 plan을 확인해야 한다. 현재 규모에서는 ANN index를 추가할 저장·관리상의 이유가 없다.

## 9. 성능

### 9.1 현재 운영 성능 영향

현재 retrieval은 운영 생성 경로에 연결되지 않았으므로 실제 사용자 요청의 latency·throughput·availability에 영향이 없다.

### 9.2 실험 경로의 latency 구성

```text
query text
→ Voyage 네트워크 왕복 1회
→ Neon exact cosine SQL 1회
→ Git in-memory lookup
```

Voyage adapter의 timeout은 요청당 5초다. timeout·429·5xx·invalid vector는 정규화된 실패로 처리되며 selector는 static pair로 돌아간다.

현재 합성 evaluator의 `45ms`는 고정 fixture 값이며 실측값이 아니다. 실 Voyage와 Neon smoke를 통과하기 전에는 실제 평균·p95 latency라고 설명하면 안 된다.

### 9.3 Exact search를 선택한 이유

- 현재 8 set, activation 최소도 96 set으로 매우 작다.
- pgvector는 ANN index가 없으면 exact nearest-neighbor search를 수행한다.
- exact search는 작은 corpus에서 recall 손실이 없고 운영 복잡성이 낮다.
- metadata hard filter를 먼저 적용하므로 실제 거리 비교 대상은 전체 corpus보다 작다.

HNSW·IVFFlat은 데이터 규모와 latency 근거가 생기기 전에는 추가하지 않는다. 현재 migration에도 ANN index가 없도록 테스트한다.

### 9.4 현재 batch 설계와 성능 한계

- Voyage 공식 API의 배열 입력을 사용해 변경된 document를 한 요청에 최대 1,000개까지 보낸다. 현재 8개는 1회 요청이다.
- API가 반환한 `index`를 검증해 입력 순서대로 embedding을 복원한다.
- 같은 catalog/model/checksum 재실행은 batch 요청 자체를 만들지 않는다.
- DB upsert는 example별로 순차 실행하므로 중간 DB 실패 시 일부 행이 들어갈 수 있지만, 재실행은 저장된 동일 checksum 행을 건너뛰고 남은 행만 처리한다.
- corpus의 전체 token 한도가 provider 제한을 넘는 규모가 되면 chunked batch가 필요하지만 현재 MVP 규모에서는 해당하지 않는다.
- 향후 운영 연결 시에는 Voyage 왕복과 DB query가 사용자 latency에 추가되므로 실제 p50·p95와 timeout 비율을 먼저 측정해야 한다.

## 10. 품질·Coverage·승격 기준

### 10.1 Coverage 단위

현재 activation guard는 다음 조합을 cell로 정의한다.

```text
4 relations × 6 purposes × 2 modes = 48 cells
```

각 cell에는 최소 2개의 approved example set이 필요하므로 activation 최소치는 96 example set, 즉 세 톤 후보 288개다.

48개 cell별 두 상황은 [`coverage-corpus-review-draft.md`](../harness/tasks/T35-retrieval-experiment/coverage-corpus-review-draft.md)에서 사용자 승인을 받았다. 기존 8세트를 제외한 88세트·264개 신규 후보도 `draft`로 작성했으며, [라벨을 가린 검수지](../harness/tasks/T35-retrieval-experiment/coverage-corpus-blind-review.md)로 블라인드 정렬·전송 가능성 검수를 기다린다. 사람 검수 전에는 approved catalog나 DB ingestion에 포함하지 않는다.

현재 상태는 다음과 같다.

| 항목 | 현재 값 |
| --- | --- |
| approved example set | 8 |
| approved tone candidate | 24 |
| 검수 대기 draft | 88세트·264후보 |
| 하나 이상 존재하는 cell | 8/48 |
| 2세트 이상인 activation-ready cell | 0/48 |
| production eligible | `false` |

현재 예시가 잘못됐다는 뜻이 아니라, hard filter 뒤 두 예시를 안정적으로 반환할 만큼 조합 coverage가 없다는 뜻이다.

### 10.2 Offline 비교 항목

같은 non-overlap holdout에서 static과 retrieval을 비교해야 한다.

- Recall@2
- MRR
- 사실 위반율
- tone 순서 통과율
- 그대로 전송 가능 비율
- 평균·p95 latency
- Voyage embedding 비용
- Gemini input/output token과 생성 비용

현재 `retrieval:eval`은 4개의 고정 합성 ranking fixture로 계산 로직만 검증한다.

- static Recall@2: 10000 basis points
- retrieval Recall@2: 10000 basis points
- static MRR: 5000 basis points
- retrieval MRR: 10000 basis points
- generation quality: `null`
- production eligible: `false`

이 숫자는 실제 품질 우위의 증거가 아니다.

### 10.3 운영 승격 전에 모두 필요한 것

- 48 cell 각각 approved example set 2개 이상
- Voyage document ingestion 최초·재실행 idempotency 실증
- 실제 개발 DB exact query smoke
- checksum 복원과 fallback 실증
- static/retrieval 동일 holdout 생성 A/B
- 사실·tone·전송 가능성 기준 통과
- latency·비용 허용 범위 결정
- 실제 사용자 query를 Voyage로 보낼 경우 별도 개인정보·provider 고지 승인
- Preview에서만 제한 활성화한 뒤 장애 fallback 확인

이 조건 전에는 운영 `/api/generate`에 retrieval을 연결하지 않는다.

## 11. 안전·실패 설계

| 위험 | 현재 대응 |
| --- | --- |
| API key 노출 | `.env.local`/server-only, 브라우저 미노출, Git 제외 |
| Production 오적재 | `VERCEL_ENV=production`이면 ingestion/smoke 차단 |
| 잘못된 DB 대상 | 명시적 `RETRIEVAL_INGEST_CONFIRM=t35-development-write` 요구 |
| Stale embedding | example/catalog/model identity와 checksum 충돌 차단 |
| 잘못된 예시 복원 | Git example ID 존재와 checksum 일치 재검증 |
| 후보 부족 | 정확히 두 개가 아니면 static fallback |
| Provider·DB 장애 | selector 전체를 static fallback으로 처리 |
| NaN·무한대·0 vector | 1024차원 finite nonzero validator |
| Query 유출 | DB·로그·metric 타입에서 query text/vector 제외 |
| 과장된 운영 활성화 | 48 cell coverage guard와 runtime boundary test |

`VERCEL_ENV=production` guard는 환경변수가 정확히 설정된 경우에만 production을 식별한다. 로컬에서 production `DATABASE_URL`을 잘못 넣는 상황까지 판별하지 못하므로 `.env.local`에는 반드시 개발 DB URL만 사용해야 한다.

## 12. 로컬 실행 방법

### 12.1 API key 발급

1. [Voyage dashboard](https://dashboard.voyageai.com/)에 가입·로그인한다.
2. API Keys에서 `Create new secret key`를 선택한다.
3. 키를 `.env.local`에 저장한다.
4. 키 원문은 채팅·문서·GitHub에 붙여넣지 않는다.

### 12.2 환경변수

```env
DATABASE_URL=개발_Neon_URL
VOYAGE_API_KEY=발급받은_키
VOYAGE_EMBEDDING_MODEL=voyage-4-lite
RETRIEVAL_INGEST_CONFIRM=t35-development-write
```

Production 환경에는 T35 ingestion 확인값을 설정하지 않는다.

### 12.3 권장 실행 순서

```bash
npm run db:migrate
npm run retrieval:smoke
npm run retrieval:ingest
npm run retrieval:ingest
npm run retrieval:eval
npm run retrieval:coverage:review:check
```

- `db:migrate`: additive migration을 적용한다.
- `retrieval:smoke`: 합성 document 2개를 넣고 합성 query로 exact top-2를 확인한 뒤 고유 catalog version 행을 삭제한다.
- 첫 `retrieval:ingest`: 현재 approved Git catalog를 embedding하고 metadata를 저장한다.
- 두 번째 `retrieval:ingest`: 같은 catalog/model/checksum이면 Voyage를 다시 호출하지 않는지 확인한다.
- `retrieval:eval`: 합성 ranking report와 coverage를 출력한다.
- `retrieval:coverage:review:check`: 96세트·288후보의 라벨 제거 검수지와 별도 정답표가 draft 정본과 일치하는지 확인한다.

빈 개발 DB라면 첫 ingestion은 `insertedCount: 8`, 두 번째는 `insertedCount: 0`, `unchangedCount: 8`이 예상된다. 같은 model/catalog가 이미 적재된 DB라면 첫 실행부터 unchanged로 나올 수 있다.

### 12.4 완료 후 확인

```bash
npm test
npm run typecheck:api
npm run db:check
npm run lint
npm run build
git diff --check
```

API key가 유출되었다면 즉시 Voyage dashboard에서 폐기하고 새 키를 발급한다.

### 12.5 2026-07-22 실 검증 결과

- 모델: `voyage-4-lite`, 1024차원 float
- Smoke: 합성 document 2개 batch→합성 query→Neon exact top-2, `resultCount: 2`
- Cleanup: smoke용 `t35-smoke-*` 행 0개
- 최초 catalog ingestion: `insertedCount: 8`, `unchangedCount: 0`
- 동일 catalog/model 재실행: `insertedCount: 0`, `unchangedCount: 8`
- 최종 DB: `reviewed-seeds-v1 + voyage-4-lite` 8행

초기 단건 document 호출 구현은 smoke 직후 네 번째 Voyage 요청에서 429를 만났다. 공식 API가 문자열 배열 입력을 지원하므로 document 8개를 한 요청으로 바꿨고 실 ingestion이 통과했다. 이 변경은 요청 수와 latency를 줄이지만 처리 token 수 자체를 줄이지는 않는다. 실제 usage token·청구액과 p50·p95 latency는 아직 별도 계측하지 않았다.

## 13. 설계 선택과 대안

### 왜 Gemini가 아니라 Voyage인가

Gemini는 이 프로젝트에서 최종 메시지 생성 provider다. Voyage는 문장 의미 검색에 특화된 별도 embedding provider다. 역할을 분리하면 생성 품질과 retrieval 품질·비용을 독립적으로 측정할 수 있다.

다만 Voyage가 제품의 필수 의존성은 아니다. 실험 결과가 나쁘거나 별도 provider 운영 부담이 크면 static selector를 계속 사용할 수 있다.

### 왜 전문 RAG framework를 쓰지 않는가

현재 필요한 것은 한 번의 embedding, metadata hard filter, exact top-2뿐이다. LangChain·LlamaIndex를 추가하면 기능보다 추상화와 의존성이 커진다. 현재 코드는 작은 typed module로 필요한 경계만 구현한다.

### 왜 reranker가 없는가

후보 corpus가 매우 작고 hard filter 뒤 top-2만 필요하다. reranker는 추가 비용·지연·실패 지점을 만들며 현재 품질 근거가 없다.

### 왜 agent가 아닌가

관계·목적·방식은 UI와 서버 정본이 이미 결정한다. 모델이 검색 계획이나 도구를 반복 선택할 이유가 없다. Retrieval은 단 한 번의 제한된 lookup이다.

### 왜 vector만 DB에 저장하는가

검수 본문 정본과 변경 이력을 Git에 유지하고 DB에는 검색과 provenance에 필요한 값만 둔다. 이 방식은 본문 이중 정본과 DB에서의 임의 편집을 피한다.

## 14. 다른 사람에게 설명하는 문장

### 포트폴리오용 짧은 설명

> 답냥이는 검수된 few-shot 예시를 무조건 고정 사용하지 않고, 관계·목적·발신 방식을 먼저 hard filter한 뒤 Voyage embedding과 pgvector exact cosine search로 의미가 가까운 두 예시를 고르는 offline 실험 기반을 갖췄습니다. 다만 48개 coverage cell과 실제 생성 A/B가 아직 부족해 운영에서는 static selector를 유지하며, 사용자 원문과 query vector는 저장하지 않습니다.

### 기술 면접용 설명

> Retrieval을 최신 기술 장식으로 붙이지 않고 activation gate를 둔 것이 핵심입니다. Git 검수 예시를 stable ID·catalog version·checksum으로 관리하고, Neon에는 1024차원 document vector와 metadata만 저장합니다. Query는 요청 수명 안에서만 vector화하고 관계·목적·mode hard filter 후 exact top-2를 조회합니다. 두 결과의 Git checksum이 모두 맞을 때만 사용하며, 어떤 실패에서도 static pair로 결정적으로 fallback합니다. 현재 운영 생성 경로와는 테스트로 분리되어 있습니다.

### “이게 RAG인가요?”에 대한 답

넓은 의미에서는 retrieval-augmented few-shot 실험이다. 외부 지식을 찾아 답하는 일반적인 지식형 RAG가 아니라, 내부의 검수 메시지 예시 두 세트를 선택하는 제한된 retrieval이다. 운영 활성화 전이므로 현재 제품을 “RAG 서비스”라고 소개하는 것은 과장이다.

### “왜 아직 운영하지 않나요?”에 대한 답

현재 48개 관계×목적×방식 cell 중 두 예시가 모두 있는 cell이 하나도 없고, 실제 생성 품질·지연·비용 A/B도 없다. 기술적으로 검색할 수 있다는 것과 제품 품질이 좋아진다는 것은 다른 문제이므로 static 기준선을 유지한다.

## 15. 현재 상태와 다음 단계

### 완료된 것

- metadata-only pgvector schema와 additive migration
- Voyage query/document adapter와 1024차원 검증
- idempotent ingestion
- 배열 입력 기반 document batch embedding
- hard filter + exact cosine top-2
- checksum 기반 Git 복원
- 모든 실패의 static fallback
- coverage activation guard
- synthetic ranking evaluator
- production runtime 미연결 test
- 개발 DB migration 재실행과 core table smoke
- 실 provider용 `retrieval:smoke` 명령
- 48 cell 상황 목록 사용자 승인
- 신규 88세트·264후보 draft와 자동 자체 스크리닝
- 96세트·288후보 블라인드 검수지와 별도 정답표

### 아직 완료되지 않은 것

- [96세트 블라인드 정렬·전송 가능성 검수](../harness/tasks/T35-retrieval-experiment/coverage-corpus-blind-review.md)
- 검수 불일치 세트 재작성과 48 cell×2 approved corpus 승격
- non-overlap holdout의 실제 static/retrieval 생성 A/B
- 실제 latency·usage·청구액 측정
- 개인정보·provider 고지를 포함한 운영 활성화 승인

따라서 CHECKLIST T35는 미완료이며 운영 selector는 static이다.

## 16. 공식 참고자료

- [Voyage API key 발급](https://docs.voyageai.com/docs/api-key-and-installation)
- [Voyage text embedding model·dimension·query/document](https://docs.voyageai.com/docs/embeddings)
- [Voyage embedding API reference](https://docs.voyageai.com/reference/embeddings-api)
- [Voyage 가격](https://docs.voyageai.com/docs/pricing)
- [Voyage FAQ·데이터 opt-out 설명](https://docs.voyageai.com/docs/faq)
- [pgvector exact/approximate search·cosine operator·vector 저장 크기](https://github.com/pgvector/pgvector)
- [답냥이 구현 계약](SPEC.md)
- [T35 계획](../harness/tasks/T35-retrieval-experiment/plan.md)
- [T35 검증 보고서](../harness/tasks/T35-retrieval-experiment/verification.md)
