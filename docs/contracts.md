# 계약 정본

이 문서는 구현된 계약과 계획된 계약을 명시적으로 구분한다. `planned` 항목은
동작한다고 가정하거나 테스트 대상으로 사용하지 않는다.

## HTTP API

| 상태 | 메서드·경로 | 계약 |
| --- | --- | --- |
| implemented | `GET /actuator/health` | 프로세스와 의존성 상태 확인 |
| implemented | `GET /actuator/prometheus` | Prometheus text exposition |
| planned | `POST /api/v1/recommendations` | `202 Accepted`와 유효한 `jobId` 반환 |
| planned | 추천 진행 SSE | Job 상태와 진행률 전달 |
| planned | 공유방·투표 API | 제품 설계 확정 후 추가 |

추천 생성 API를 구현할 때 `200 OK`를 성공 대체값으로 허용하지 않는다. 비동기 Job
수락 의미를 유지하도록 `202 Accepted`를 계약·통합·k6 테스트에서 함께 고정한다.

## 이벤트

| 상태 | 이름 | 생산자 | 소비자 | 최소 의미 |
| --- | --- | --- | --- | --- |
| planned | `recommendation.requested` | 추천 application service | 추천 Worker | 저장된 Job 처리 요청 |

이벤트 payload, version, 멱등 키, 재시도와 DLQ 정책은 구현 ADR에서 확정한다.
현재 환경 단계는 임의 wire shape를 만들지 않는다.

## LLM과 외부 검색

| 상태 | 계약 | 현재 기준 |
| --- | --- | --- |
| implemented | 개발·테스트 외부 모드 | `PLACEPICK_EXTERNAL_MODE=mock`만 허용 |
| implemented | Mock Naver·LLM | 정상·오류·timeout fixture 제공 |
| planned | 조건 추출 출력 | versioned schema와 Eval로 확정 |
| planned | 추천 이유 | 검색 근거 기반, 단정·허위 확정 표현 금지 |

실제 Naver·LLM endpoint, API key, 운영 데이터는 테스트·Eval·부하 시나리오에서
사용하지 않는다. 전체 프롬프트를 포트폴리오 문서에 저장하지 않고 계약의 목적,
입출력 schema, 정책과 검증 결과만 기록한다.
