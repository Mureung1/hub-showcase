# 작업 계획: T35 — 검수 예시 retrieval 실험

> 상태: 부분 완료
>
> 작성일: 2026-07-20
>
> 최종 갱신일: 2026-07-20
>
> 현재 단계: 운영 비활성 기반·합성 평가 구현 완료, 외부 gate 대기
>
> 다음 행동: 실제 Voyage·개발 DB guarded smoke와 coverage 충분 corpus의 생성 A/B
>
> CHECKLIST 항목: T35

## 1. 목표와 완료조건

- 해결할 사용자/제품 문제: 고정 관계별 few-shot 두 세트는 직접 설명·guided 맥락과 유사한 검수 예시를 선택하지 못한다. 반대로 작은 corpus에 RAG를 바로 운영하면 최신 기술을 장식처럼 붙이고 사실 전이·지연·비용을 늘릴 수 있다.
- 목표 결과: 검수 예시 원문은 Git 정본으로 유지하고 Neon pgvector에는 버전형 embedding·metadata만 저장한다. static selector와 retrieval selector를 동일 holdout에서 비교해 이득이 증명될 때만 feature flag로 운영 승격한다.

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | `retrieval_examples`는 example/catalog/model/checksum/review/관계·목적·모드·vector 메타데이터만 저장하고 사용자 원문·예시 본문·생성문구·query vector 필드가 없다 | schema/migration 테스트 | 필수 |
| AC-2 | embedding provider interface와 Voyage adapter는 `document/query` 입력을 구분하고 deadline·오류 정규화·출력 차원/유한값 검증을 수행한다 | fake fetch·adapter 테스트 | 필수 |
| AC-3 | 검수 corpus manifest를 checksum과 embedding model/version으로 idempotent하게 적재하고 draft/retired 예시는 검색 대상에서 제외한다 | ingestion·repository 테스트 | 필수 |
| AC-4 | 관계·목적 metadata를 먼저 제한한 뒤 pgvector cosine exact top-k를 수행한다. HNSW/IVFFlat은 데이터 규모·지연 근거 전 추가하지 않는다 | SQL 생성·실 DB smoke | 필수 |
| AC-5 | 사용자 입력으로 만든 query embedding은 요청 수명 안에서만 사용하고 DB·로그·metrics에 전달되지 않는다 | sink/repository 직렬화 테스트 | 필수 |
| AC-6 | retrieval 실패·후보 부족·provider 미설정·feature flag off에서는 현재 검수 static pair로 결정적으로 폴백한다 | selector 테스트 | 필수 |
| AC-7 | 현재 24개 corpus는 기술 검증용이며 관계×목적 coverage가 부족하면 운영 selector로 활성화하지 않는다 | coverage report·activation guard | 필수 |
| AC-8 | static 대비 Recall@k·MRR과 생성 사실 위반·톤·전송 가능성·지연·비용을 같은 holdout에서 기록한다 | offline evaluation report | 필수 |
| AC-9 | migration 최초/재실행과 임시 embedding 적재·exact 검색·자체 행 정리가 개발 DB에서 통과한다 | guarded smoke | 필수 |
| AC-10 | `any` 없이 전체 테스트·API 타입검사·lint·build·Drizzle check·diff가 통과한다 | 최종 게이트 | 필수 |

## 2. 의존성·정본 확인

- 의존: T16·T18·T19·T30 완료, T34 guided context 계약. 실 생성 품질 승격은 T20~T21과 retrieval 평가를 함께 통과해야 한다.
- CHECKLIST 직접 참조: T16·T19·T20·T21·T30·T34, SPEC 2~5장, AI_DESIGN, SEEDS/SEEDS_REVIEW.
- 추가 정본: Neon/pgvector exact search와 Voyage embedding `input_type` 공식 계약. 작은 corpus에서는 exact search를 기본으로 한다.
- 변경하지 않는 계약: corpus 원문 Git 정본, 사용자 원문 비저장, 단일 생성 provider call·결정적 validator, 자율 agent/RAG loop 없음, retrieval은 예시 선택 단계 1회뿐.

## 3. 작업트리 기준선

- 시작 상태: T30은 네 운영 metadata table과 실제 Neon smoke까지 완료했고, `templateVersionRegistration` draft 승인 차단 변경이 미커밋 상태다.
- 반드시 보존: 사용자 소유 untracked 3종과 로컬 `.github/workflows/`.
- PM 소유: SPEC·AI_DESIGN·MVP·CHECKLIST·공유 selector 계약·하네스·LOG·최종 통합.
- 백엔드/AI DB 역할: migration/schema/repository/ingestion/smoke.
- 백엔드/AI retrieval 역할: embedding provider, selector, prompt 연결, offline 평가와 테스트.
- 프론트엔드: retrieval 구현 세부를 알지 않으며 기존 응답 계약만 소비한다.

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | 최신 기술 도입 자체가 아니라 유사한 검수 예시 선택이 static few-shot보다 품질을 높이는지 재현 가능한 실험으로 증명한다. |
| 구체성 | pgvector extension/migration, metadata-only embedding table, provider adapter, exact selector, corpus ingestion, feature flag, offline eval을 추가한다. |
| 역할·예시 | `professor/question` 요청은 그 metadata 안에서 query와 가까운 approved example ID를 찾고 Git catalog의 원문을 prompt에 주입한다. 검색 결과가 2세트 미만이면 static pair를 사용한다. |
| 단계화 | ① schema·provider 타입 → ② ingestion·exact query → ③ selector/fallback → ④ prompt 연결 → ⑤ 실 DB smoke·offline 비교 순으로 진행한다. |
| 검증 | 금지 열, vector 차원/NaN, idempotency, metadata filter, top-k 순서, query 비저장, feature flag/fallback, retrieval 지표와 생성 품질·비용·지연을 확인한다. |

## 5. 변경 경계와 위험

- 허용: `retrieval_examples` 1테이블, pgvector extension, embedding provider 1개, exact retrieval, static fallback, 비프로덕션 합성 offline 평가 gate.
- 제외: HNSW/IVFFlat, LangChain/LlamaIndex, 사용자 대화·피드백 corpus 자동 편입, query embedding 저장, 실시간 reranker 2차 호출, 자율 retrieval agent, 운영 자동 활성화.
- 구조 변경: 기존 T30의 핵심 네 테이블은 유지하고 독립적인 retrieval metadata table 하나를 additive migration으로 추가한다.
- 위험: 24개 corpus는 목적 coverage가 부족하다. infrastructure 통과와 제품 품질 통과를 분리하고 activation guard로 과장된 RAG 운영을 막는다.

## 6. 승인·범위 변경 기록

| 날짜 | 상태 | 승인 또는 변경 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-20 | 승인됨 | 직접 설명/guided AI에 검수 예시 retrieval을 실험하고 static 대비 평가 통과 시에만 승격, 템플릿은 fallback 유지 | 사용자 `진행합니다` |

## 7. 진행·인계

- 마지막으로 끝낸 단계: T30 Neon/Drizzle metadata layer와 T19 static reviewed few-shot catalog.
- 현재 작업 중인 단계: 코드·fake·합성 ranking gate까지 완료하고 실제 외부 연동을 보류.
- 다음 행동: Voyage key와 비프로덕션 DB 확보 후 migration 최초/재실행, 무호출 idempotency, exact query smoke를 실행한다. 이후 48 cell×2 coverage와 non-overlap holdout으로 static 대비 생성 품질·지연·비용을 비교한다.
- 보류 사유와 재개 조건: 실제 Voyage key·개발 DB와 coverage 충분 corpus가 없다. 현재 corpus는 activation-ready 0/48이므로 운영 selector 활성화가 불가능하다.

| 날짜 | 진행·결정 | 근거·영향 |
| --- | --- | --- |
| 2026-07-20 | T35 착수 | RAG를 운영 주장 전에 비교 평가하는 구조로 사용자 승인 |
| 2026-07-20 | 운영 비활성 기반 구현 | 1024차원 metadata-only schema, exact top-2, Voyage adapter, idempotent ingestion, static fallback, 합성 evaluator 자동 검증 통과. 실 provider/DB·생성 A/B는 미실행 |
