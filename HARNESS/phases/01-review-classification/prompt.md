# Phase 01 — 리뷰 유형 분류 (PRD 2.1)

현재 step만 수행하고 `allowed_paths` 밖은 수정하지 않는다. LLM 호출은 `classify-review` Edge Function 안에서만 하고, adapter는 `supabase/functions/_shared/llm`에 둔다. `LLM_PROVIDER=fake`일 때 결정적 fake로 동작해 모든 테스트가 LLM 없이 실행 가능해야 한다. LLM API 키는 Edge Functions 환경변수로만 받고 프론트 코드·fixture에 남기지 않는다.

## 공통 불변조건

- 분류 결과에는 유형 1개(칭찬/불만/문의/악성 의심), 세부 카테고리(맛/양/배달/포장/서비스, 복수 가능), 분류 근거 한 줄, 확인 필요 여부가 있다.
- 엣지 규칙: 칭찬+불만 혼재는 불만+복합 플래그, 문의+불만은 불만, 별점·본문 불일치는 본문 우선+확인 필요, 저확신은 유형 미확정+확인 필요.
- 엣지 규칙과 스키마 검증은 LLM prompt가 아니라 순수 TS 규칙 모듈(Vitest 단위 테스트 가능)로 강제한다.
- 악성 "의심"은 의심 단계일 뿐이다. 확정은 Phase 05의 위험도 판정과 사장님 판단 몫이다.
- 답글 상태는 `초안 대기 → 확인 필요 → 완료`만 쓴다.
- LLM 구조화 출력은 스키마 검증을 거치고, 검증 실패는 "확인 필요"로 fail-closed 한다.
- 리뷰 본문 속 지시문(프롬프트 인젝션)이 분류 동작을 바꾸지 않아야 하며 관련 테스트를 남긴다.

## `classification-engine`

`supabase/functions/classify-review`에 분류를 구현하고 결과를 분류 컬럼/테이블 마이그레이션과 함께 저장한다. 입력 시 자동 분류, 사장님의 유형 직접 지정(확인 필요 해소)을 포함한다. 저장은 요청 사용자의 권한(RLS)을 우회하지 않는다.

## `classification-ui`

리뷰 입력 화면의 분류 결과 실시간 미리보기, 리뷰함의 유형 필터 탭·유형 배지·상태 칩·악성 의심 레드 표시, 리뷰 상세의 분류 근거 한 줄을 실제 데이터로 연결한다(`frontend/src/features/review-classification`). API 오류·로딩 상태를 명시한다.
