# 답냥이 아키텍처 개요

> 현재 정본은 `docs/SPEC.md`이며 완료 상태는 `docs/CHECKLIST.md`를 따른다. 이 문서는 T34 guided context, T35 검수 예시 retrieval 승인 구조와 T36 결과 다듬기·비식별 흐름 계측을 한눈에 설명한다.

## 1. 제품 런타임

답냥이는 자유 대화형 챗봇이 아니다. 사용자가 방식·관계·상황을 고르고 카드별 질문 정확히 1개에 답하면, 서버가 검수 카탈로그의 ID를 해석해 세 톤을 생성한다.

```text
S0 답장/먼저 보내기
→ S1 관계 4종
→ S2 상황 카드 6장
→ S2 context 카드별 질문 1개·option 3개
→ guided AI 세 톤
→ S3 같은 선택 재생성·답 변경·로컬 직접 수정
→ 복사
```

두 보조 경로를 같은 S2에 유지한다.

```text
질문 없이 바로 초안 보기
→ 로컬 template_fallback
→ API 호출 0회

내 상황을 직접 설명하기
→ 목적 + 개인 말투 + 모드별 원문
→ manual AI 세 톤
```

교수·조교 이메일은 별도 로컬 템플릿 경로이며 AI·retrieval을 호출하지 않는다.

## 2. 명시적 생성 route

필드 유무로 경로를 추론하지 않는다.

| route | 입력 | 실행 위치 | 실패 |
|---|---|---|---|
| `template_fallback` | mode·관계·카드·말투 | 클라이언트 로컬 | 템플릿 누락은 invariant 오류 |
| `guided_ai` | mode·관계·카드·말투·question/option ID 1쌍 | `/api/generate` | 같은 카드 기본 초안, 세부 답 미반영 명시 |
| `manual_ai` | mode·관계·목적·말투·모드별 원문 | `/api/generate` | 입력 보존·재시도 |

서버는 `template_fallback`을 거절한다. guided 요청에서 purpose·label·UI transcript·원문을 받지 않고 배포된 질문 카탈로그로 파생한다. manual reply는 받은 메시지가 필수이고, initiate는 상황 설명이 필수다.

## 3. 프론트엔드 계층

```text
entities/message
  관계·카드·말투·guided question catalog·정적 템플릿
        ↓
shared/generation
  discriminated request parser·응답 validator·mock
        ↓
features
  mode/scenario/situation/guided-context/manual/result/email UI
        ↓
pages/message-flow
  단계·세션·생성·fallback 오케스트레이션
```

- `entities`와 `shared`가 브라우저·서버 공용 계약이다.
- sessionStorage는 현재 탭에서만 30분 보존하며 원문을 서버 저장소로 보내지 않는다.
- 카드 guided 경로는 저장된 말투 또는 관계 안전 기본값을 사용해 카드 앞의 필수 선택을 줄인다.
- 결과 반영 요약은 provider 출력이 아니라 UI 카탈로그 label로 구성한다.
- S3 후보 교체는 성공한 응답에서만 일어나며, 직전 한 세트만 탭 메모리에 보관해 현재/이전 비교와 복원을 제공한다. 로딩·실패·오래된 요청은 현재 후보를 덮지 않는다.
- 후보 직접 수정문은 현재 탭의 복사용 UI state이며 생성 요청·상호작용 event·DB에 넣지 않는다.

## 4. 서버 생성 경계

```text
POST /api/generate
→ strict request parser
→ guided ID server resolver 또는 manual 입력 정규화
→ 관계·목적·말투·mode 규칙
→ reviewed few-shot 2세트
→ provider structured output 1회
→ stop reason·후보 3개·tone 1/2/3·길이·안전 검증
→ 제한적 재시도
→ GenerationResponse(source=ai)
→ 원문 없는 best-effort metric
```

자율 계획, 도구 선택, 메모리, 작성자→검수자 모델 chain은 없다. 오류와 구조 불일치 일부만 전체 18초 deadline 안에서 최대 1회 재시도한다.

## 5. 검수 예시 retrieval-augmented few-shot

T35는 외부 지식 문서를 답하는 일반 RAG가 아니라, **현재 입력과 유사한 검수 예시를 prompt에 고르는 실험**이다.

```text
Git reviewed example catalog (본문 정본)
→ document embedding만 Neon 적재
→ 합성 ContextSpec query embedding
→ 관계·목적·모드 hard filter
→ pgvector exact cosine top-2
→ example ID로 Git 본문 복원·checksum 확인
→ 기존 prompt builder
```

운영 `/api/generate`는 현재 static pair를 사용한다. `retrieval-eval`은 비프로덕션 합성 evaluator에서만 허용한다. 현재 24개 corpus는 목적 coverage가 부족해 운영 활성화 근거가 아니다.

적용 경계:

- Git: 예시 본문, stable ID, catalog version, review 상태의 정본
- Neon: example/catalog/model ID, 관계·목적·모드, checksum, review metadata, 1024차원 document vector
- 요청 수명: query text와 query vector
- 금지: DB·로그·metric의 사용자 원문, 생성문구, query vector, UI transcript
- 검색: exact top-2만 사용, HNSW/IVFFlat·runtime reranker 없음
- 실패: key/DB/provider/coverage/checksum/hit 부족 모두 static pair로 폴백

## 6. 데이터 계층

T30 핵심 네 테이블은 그대로 유지하고 T35 테이블 하나를 additive migration으로 둔다.

| 테이블 | 역할 |
|---|---|
| `prompt_versions` | prompt 배포 버전·checksum·model·검수 상태 |
| `template_versions` | 정적 템플릿 묶음 버전·checksum·검수 상태 |
| `generation_runs` | 원문 없는 route·관계·모드·목적·지연·status |
| `evaluation_runs` | 합성 case의 품질·지연·비용 집계 |
| `retrieval_examples` | Git 예시 provenance와 document vector metadata |
| `interaction_events` | 원문 없는 결과·다듬기·복사·상황 변경 event 집계 |

DB는 사용자 계정·히스토리·대화 메모리가 아니다. 받은 메시지·상황 설명·생성 후보·직접 수정문·IP·사용자/세션/device ID를 저장하지 않는다. `interaction_events`는 event name·route·관계·모드·optional 상황/톤 ID와 시각만 허용하므로 개인별 funnel이나 재방문율을 계산하지 않는다.

## 7. 신뢰와 fallback

- 질문·option은 AI가 만들지 않고 24조합을 전수 테스트한다.
- option은 선택한 화행만 제공하고 날짜·이유·상대 감정·약속·동의를 만들지 않는다.
- guided 실패 기본 초안은 `방금 고른 세부 답은 반영되지 않았어요`라고 알린다.
- 질문 없이 본 기본 초안은 같은 카드 context 질문으로, guided 실패 초안은 같은 answer 재시도로 AI에 다시 연결한다. 관계·카드를 처음부터 다시 고르게 하지 않는다.
- T25 사람 검수 전 정적 문구를 `검수된 초안`이라고 부르지 않는다.
- T21 실 provider 평가 전 mock 결과를 운영 AI 품질로 표현하지 않는다.
- T35 실제 embedding 적재·A/B 전 retrieval 우위를 주장하지 않는다.

## 8. 포트폴리오 기술 포인트

기술적 발전은 “AI API를 호출했다”가 아니라 다음 경계로 설명한다.

- UX 선택을 stable ID 기반 ContextSpec으로 바꾸고 서버가 의미를 재해석하는 zero-trust 계약
- `template_fallback | guided_ai | manual_ai` discriminated union과 route별 금지 필드 검증
- structured output 이후에도 유지하는 결정적 런타임 validator·deadline·오류 격리
- Git 본문 정본과 Neon vector metadata를 분리한 재현 가능한 corpus provenance
- 작은 corpus에 맞춘 exact search, idempotent ingestion, checksum 검증, static fallback
- retrieval의 운영 도입을 coverage와 offline A/B 결과로 차단하는 activation gate
- 사용자 원문·query vector를 저장하지 않는 schema·repository allowlist
- 성공 응답에만 후보를 교체하고 직전 한 세트만 복원하는 결과 상태 machine
- strict event parser·DB CHECK·best-effort `waitUntil()`로 UX와 분석 장애를 분리한 비식별 계측

이 구조는 최신 기술의 존재보다 왜 그 기술을 제한적으로 썼고 실패할 때 어떻게 안전하게 되돌아가는지를 보여준다.
