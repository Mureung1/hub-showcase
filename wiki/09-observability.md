# 관측성

마지막 업데이트: 2026-07-27

## 이 문서의 목적

코드에 구현된 로그, 메트릭, 추적 수단과 누락된 운영 관측성을 구분한다.

## 빠른 요약

운영 데이터는 DB의 generation metric과 interaction event이며 모두 best-effort 비동기 기록이다. 구조화 애플리케이션 로그, 분산 tracing, 메트릭 대시보드 SDK는 코드에서 발견되지 않았다.

## 구현된 신호

|신호|기록 시점|데이터|저장|
|---|---|---|---|
|generation metric|`createGenerateHandler`의 모든 종료 경로|상태, latency, attempts, route, scenario/mode/purpose, guided context catalog version|`generation_runs` (DB URL 있을 때)|
|interaction event|결과 표시/복사/재생성 등 UI 동작|event, route, scenario, mode, 선택 situation/tone|`interaction_events` (DB URL 있을 때)|
|스크립트 출력|smoke/eval/harness 실행|콘솔 결과|표준 출력|

## 기록 방식

`waitUntil()`이 background task를 연장하고, sink는 repository write 실패를 삼킨다. `DATABASE_URL`이 없거나 DB 생성이 실패하면 no-op sink를 사용한다. 따라서 이 데이터는 요청 성공의 보장이 아니라 관측 보조 수단이다.

## 로그/코릴레이션 키

- 서비스 request ID, trace ID, 사용자/세션 ID를 전달하거나 저장하는 구현은 발견되지 않았다.
- rate limit 식별에는 forwarded IP의 첫 값 또는 `unknown-client`가 쓰이지만 DB metric row로 매핑되지 않는다.

## 근거

- metric 정의: `api/_lib/generation/metrics.ts`
- DB sinks: `api/_lib/db/generationMetricsSink.ts`, `api/_lib/db/interactionMetricsSink.ts`
- event schema: `api/_lib/db/schema.ts`
- browser reporter: `src/shared/interaction/reporter.ts`

## 주의사항/함정

best-effort write 실패는 의도적으로 사용자 흐름을 막지 않는다. 따라서 DB count를 완전한 감사 로그로 해석하면 안 된다.

## TODO/확인 필요

- 알림, retention, dashboard query, error tracking(Sentry 등), metrics exporter 및 sampling 정책은 확인 필요.
