# 검증 보고서: T35 — 검수 예시 retrieval 실험

> 상태: 진행 중
>
> 검증일: 2026-07-22
>
> 관련 계획: [`plan.md`](plan.md)
>
> 판정: 코드·합성 gate 통과 / 운영 활성화 불가

## 검증 범위

- Git 검수 예시 정본의 stable ID·catalog version·mode
- pgvector metadata-only schema와 additive migration
- Voyage document/query adapter fake 검증
- exact cosine top-2 repository, idempotent ingestion, static fallback selector
- coverage activation guard와 synthetic ranking evaluator
- 운영 `/api/generate`·prompt builder 미연결 경계

개발 DB migration·core smoke와 실 Voyage document/query·Neon exact query·ingestion idempotency는 통과했다. coverage 충분 corpus의 실제 생성 품질 A/B는 실행하지 않았다.

## 완료조건별 결과

| 완료조건 | 결과 | 근거 |
| --- | --- | --- |
| AC-1 metadata-only schema | 통과 | `retrieval_examples`에 stable provenance·1024차원 document vector만 존재. 본문·사용자 원문·생성문·query vector 열 없음. natural key PK·nonzero check |
| AC-2 embedding provider | 통과 | document/query, timeout·abort·오류 정규화, float·nontruncate 요청, 1024 finite nonzero 검증. 실 `voyage-4-lite`와 document batch 응답 index 복원 통과 |
| AC-3 idempotent ingestion | 통과 | natural key+checksum 선조회. 개발 DB 최초 `8 inserted/0 unchanged`, 재실행 `0 inserted/8 unchanged`로 embedding 무호출 재실행 확인 |
| AC-4 exact top-2 | 통과 | 관계·목적·모드·catalog·model·approved hard filter, distance·exampleId 정렬, ANN index 없음. 실 document batch+query에서 result 2개 반환 |
| AC-5 query 비저장 | 자동 통과 | query는 selector→embedding→repository 호출 수명에만 존재하고 schema·metric 타입에 없음 |
| AC-6 static fallback | 통과 | off/provider/후보 부족/unknown/checksum mismatch를 static pair로 폴백 |
| AC-7 activation guard | 통과 | 48 cell×최소 2개 기준. 현재 8 example set은 activation-ready 0/48, `productionEligible=false` |
| AC-8 offline 평가 | 부분 통과 | 합성 Recall@2·MRR·지연·비용 보고만 실행. generation quality는 `null`, 실제 우위 근거 아님 |
| AC-9 guarded smoke | 통과 | 개발 DB migration 재실행·여섯 테이블 core smoke와 실 Voyage 합성 document 2개→query→exact top-2 통과. 종료 후 DB에는 정본 8행만 남고 smoke 행 0개 확인 |
| AC-10 전체 품질 gate | 통과 | retrieval 디렉터리 9파일 35개·전체 44파일 375개 테스트, 프론트/API typecheck, lint, build, `templates:check`, `db:check`, 검수지 drift check 통과. 대상 `any` 0건 |

## 합성 evaluator 결과

- evidence: `synthetic-only`
- sample: 4
- Recall@2: static 10000 / retrieval 10000 basis points
- MRR: static 5000 / retrieval 10000 basis points
- retrieval 가정 평균 지연 45ms, 비용 3 microUSD
- generation quality: `null`
- production eligible: `false`

이 값은 고정 fixture로 evaluator 계산을 검증한 결과이며 실제 검색·생성 품질이나 비용 우위를 뜻하지 않는다.

## 2026-07-22 재개 검증

- 공식 Voyage 계약: 검색 입력은 `query`·`document`를 구분하고 1024차원 float 출력을 요청한다. 현재 adapter의 `input_type`·`output_dimension`·`output_dtype`·`truncation=false`와 일치한다.
- 공식 pgvector 계약: ANN index가 없으면 exact nearest-neighbor이며 cosine distance는 `<=>`를 사용한다. migration에 HNSW/IVFFlat이 없고 repository SQL은 hard filter 뒤 `<=>` 오름차순·limit 2다.
- 개발 DB: `npm run db:migrate` 재실행과 명시적 확인값을 사용한 `npm run db:smoke`가 통과해 `retrieval_examples` 포함 여섯 테이블을 확인했다.
- 재현 명령: `.env.example`에 Voyage·쓰기 확인값을 문서화하고 `npm run retrieval:smoke`를 추가했다. 이 명령은 고유 catalog version의 합성 행만 쓰고 성공·실패 모두 자체 행을 삭제한다.
- 실 provider: `voyage-4-lite` document batch 1회와 query 1회, Neon exact cosine top-2가 `resultCount: 2`로 통과했다.
- 실 ingestion: 기존 단건 호출은 smoke 직후 429를 만나 document 8개를 공식 배열 입력 1회로 전환했다. 이후 최초 8행 적재와 0/8 idempotent 재실행이 통과했다.
- 정리 확인: `reviewed-seeds-v1 + voyage-4-lite` 8행만 존재하고 `t35-smoke-*` 임시 행은 없다.
- coverage: 8 example set·24후보, covered 8/48, activation-ready 0/48, `eligibleForProduction=false`다.
- coverage draft: 사용자 승인 상황을 바탕으로 신규 88세트·264후보를 작성했다. 기존 8세트와 합치면 96세트·288후보, 모든 48 cell에 정확히 2세트지만 신규 항목은 사람 검수 전 `draft`라 activation 계산에 넣지 않는다.
- 자체 스크리닝: `coverageCandidateDraft.test.ts`가 수량·48×2·고유 ID/문구·reply/ initiate·tone 1/2/3·길이·금지 항목·정중함 하한선을 전수 통과했다. `retrieval:coverage:review:check`도 96세트·288후보 검수지 동기화를 통과했다.
- 전체 회귀: 44파일 375개 테스트, 프론트/API 타입검사, `templates:check`, `db:check`, lint, production build, `git diff --check`, AGENTS/CLAUDE mirror와 대상 `any` 검사가 통과했다. 기존 jsdom `scrollTo` 로그와 CatCanvas 500 kB 초과 경고만 비차단으로 남았다.

## 현재 판정

- T35 CHECKLIST: 미완료 유지
- 운영 `/api/generate`: static selector 유지
- 다음 gate: [96세트 블라인드 정렬·288후보 전송 가능성 검수](coverage-corpus-blind-review.md) → 불일치 재작성·approved 승격 → static/retrieval 동일 holdout 생성 A/B
