# 검증 보고서: T35 — 검수 예시 retrieval 실험

> 상태: 부분 완료
>
> 검증일: 2026-07-20
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

실 Voyage 호출, 실제 개발 DB migration·ingestion·query smoke, 실제 생성 품질 A/B는 실행하지 않았다.

## 완료조건별 결과

| 완료조건 | 결과 | 근거 |
| --- | --- | --- |
| AC-1 metadata-only schema | 통과 | `retrieval_examples`에 stable provenance·1024차원 document vector만 존재. 본문·사용자 원문·생성문·query vector 열 없음. natural key PK·nonzero check |
| AC-2 embedding provider | 자동 통과 | document/query, timeout·abort·오류 정규화, float·nontruncate 요청, 1024 finite nonzero 검증 fake 테스트 |
| AC-3 idempotent ingestion | 자동 통과 | natural key+checksum 선조회. unchanged는 embedding 0회, 같은 version checksum 충돌은 전체 embedding 전 중단 |
| AC-4 exact top-2 | 자동 통과 / 실 DB 대기 | 관계·목적·모드·catalog·model·approved hard filter, distance·exampleId 정렬, ANN index 없음. 실제 query smoke 미실행 |
| AC-5 query 비저장 | 자동 통과 | query는 selector→embedding→repository 호출 수명에만 존재하고 schema·metric 타입에 없음 |
| AC-6 static fallback | 통과 | off/provider/후보 부족/unknown/checksum mismatch를 static pair로 폴백 |
| AC-7 activation guard | 통과 | 48 cell×최소 2개 기준. 현재 8 example set은 activation-ready 0/48, `productionEligible=false` |
| AC-8 offline 평가 | 부분 통과 | 합성 Recall@2·MRR·지연·비용 보고만 실행. generation quality는 `null`, 실제 우위 근거 아님 |
| AC-9 guarded smoke | 대기 | production 차단·확인값 guard 구현. 실제 Voyage key·개발 DB가 없어 미실행 |
| AC-10 전체 품질 gate | 자동 통과 | T35 52개와 통합 전체 35파일 289개 테스트, API typecheck, lint, build, `db:check`, diff check, AGENTS/CLAUDE 동기화 통과. `api src scripts` 명시적 `any` 0건 |

## 합성 evaluator 결과

- evidence: `synthetic-only`
- sample: 4
- Recall@2: static 10000 / retrieval 10000 basis points
- MRR: static 5000 / retrieval 10000 basis points
- retrieval 가정 평균 지연 45ms, 비용 3 microUSD
- generation quality: `null`
- production eligible: `false`

이 값은 고정 fixture로 evaluator 계산을 검증한 결과이며 실제 검색·생성 품질이나 비용 우위를 뜻하지 않는다.

## 현재 판정

- T35 CHECKLIST: 미완료 유지
- 운영 `/api/generate`: static selector 유지
- 다음 gate: 실제 비프로덕션 migration·재실행 → ingestion 최초/unchanged → exact query smoke → coverage 충분 corpus → static/retrieval 동일 holdout 생성 A/B
