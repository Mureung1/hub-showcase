# 결정 기록

마지막 업데이트: 2026-07-27

## 이 문서의 목적

코드로 확인 가능한 설계 결정을 보존하고 새 ADR 작성 틀을 제공한다.

## 빠른 요약

현재 구현은 결정적 템플릿과 AI 생성 경로를 분리하고, 서버에서 AI 입력/출력을 재검증하며, 원문 대신 운영 메타데이터를 기록한다.

## 확인 가능한 결정 사항

### ADR-001: 카드/이메일에 로컬 템플릿 사용

- 상태: 구현됨
- 근거: `templateCandidatesFor`와 `emailTemplateCandidatesFor`가 브라우저 도메인 모듈에 구현되어 있고 `MessageFlow`가 이를 호출한다 (`src/entities/message/situationTemplates.ts`, `emailTemplates.ts`, `src/pages/message-flow/MessageFlow.tsx`).
- 결과: 이 경로는 외부 API 호출 없이 후보 3개를 생성한다.

### ADR-002: AI 요청은 서버에서 신뢰 경계를 재구성

- 상태: 구현됨
- 근거: `parseGenerationRequest` 후 `toAiGenerationRequest`가 `resolveGuidedContext`를 호출한다 (`api/_lib/generation/handler.ts`). `buildPrompt`도 guided context catalog/version/option 정합성을 검사한다 (`api/_lib/prompt/buildPrompt.ts`).
- 결과: 클라이언트가 전달한 임의 prompt fact를 그대로 provider에 넘기지 않는다.

### ADR-003: 관측 데이터 write는 best-effort

- 상태: 구현됨
- 근거: DB sink의 write 오류를 catch하고 `waitUntil`을 scheduler로 주입한다 (`api/_lib/db/generationMetricsSink.ts`, `api/generate.ts`).
- 결과: DB 장애가 생성/이벤트 API 응답을 막지 않는다.

### ADR-004: retrieval runtime 기본값은 static selector

- 상태: 구현됨
- 근거: `createReviewedExampleSelector`의 default `mode`는 `static`이고, 이 경우 `reviewedPromptExamplesFor`를 반환한다 (`api/_lib/retrieval/selector.ts`).
- 결과: retrieval-eval 설정과 provider/repository 주입이 없으면 embedding 검색을 실행하지 않는다.

## ADR 템플릿

```markdown
# ADR-XXX: 제목

- 상태: 제안 | 승인 | 대체됨
- 날짜: YYYY-MM-DD

## 맥락

문제와 코드/운영 제약을 적는다.

## 결정

선택한 방안과 적용 범위를 적는다.

## 근거

관련 파일, 함수, 테스트, 설정 키를 명시한다.

## 결과와 trade-off

긍정/부정 영향과 롤백 방법을 적는다.
```

## 근거

각 ADR의 구현 파일 및 관련 테스트 파일.

## 주의사항/함정

위 결정은 코드에서 관찰한 사실을 요약한 것이며, 조직의 승인 기록이나 변경 이력을 대체하지 않는다.

## TODO/확인 필요

- 기존 공식 ADR 저장소/승인자/상태 전이 규칙은 확인 필요.
