# 용어집

마지막 업데이트: 2026-07-27

## 이 문서의 목적

코드에서 반복되는 도메인·기술 약어를 통일해 설명한다.

## 빠른 요약

답냥이는 관계와 상황을 구조화해 세 톤의 메시지 후보를 만드는 UI다.

|용어|의미|근거|
|---|---|---|
|scenario|관계 범주: groupwork/professor/senior/friend|`src/entities/message/message.ts`|
|mode|`reply` 또는 `initiate`|`src/entities/message/message.ts`|
|situation|scenario 하위의 상황 카드 식별자|`src/entities/message/message.ts`|
|guided context|상황 카드 후 선택하는 한 개의 질문/옵션에서 만든 신뢰 맥락|`src/entities/message/guidedContext.ts`|
|template fallback|로컬 템플릿 후보를 반환하는 route|`src/shared/generation/contracts.ts`|
|guided_ai|검증된 guided context 기반 서버 AI route|동일 파일, `api/_lib/generation/handler.ts`|
|manual_ai|사용자 원문/상황 기반 서버 AI route|`src/shared/generation/contracts.ts`|
|tone level|1 기본, 2 더 부드럽게, 3 더 분명하게인 후보 수준|`src/shared/generation/contracts.ts`, `message.ts`|
|Drizzle|PostgreSQL schema/migration/ORM 도구|`drizzle.config.ts`, `api/_lib/db/`|
|Neon|서버리스 PostgreSQL driver dependency|`package.json`, `api/_lib/db/database.ts`|
|best-effort|기록 실패가 사용자 요청 결과를 바꾸지 않는 방식|`generationMetricsSink.ts`, `interactionMetricsSink.ts`|

## 근거

위 표에 명시한 타입/모듈 선언.

## 주의사항/함정

`template_fallback`은 generation request 계약에는 존재하지만 `/api/generate`가 받는 AI 요청은 아니다.

## TODO/확인 필요

- 조직 전반의 표준 용어집이나 다국어 용어 정책은 확인 필요.
