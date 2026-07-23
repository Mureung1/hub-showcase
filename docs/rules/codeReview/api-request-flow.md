# 화면 흐름별 API 요청 정리

Home → New/Join → AppointmentPage → Schedule/Result 순서로, API 요청이 발생하는 모든 지점을 정리한다.
화면 진입 시 자동으로 나가는 요청과 사용자 동작으로 나가는 요청을 구분했다.

## HomePage (`/`)

- API 요청 없음 (정적 안내 화면)

## NewAppointmentPage (`/new`)

| 시점 | 요청 | 라우터 | DB 테이블 | 목적 |
|---|---|---|---|---|
| "약속 만들기" 제출 | `POST /api/appointments` | appointments | appointments(insert), participants(insert) | 약속 생성 + 생성자를 관리자로 등록 |

## JoinAppointmentPage (`/join`)

| 시점 | 요청 | 라우터 | DB 테이블 | 목적 |
|---|---|---|---|---|
| "참여하기" 제출 | 
| ″ |  `POST /api/appointments/:id/participants` | participants | appointments(select), participants(select, insert) | 참여자 등록/인증 |

## AppointmentPage (`/a/:id`) — 세션 없을 때

`JoinAppointmentPage`와 동일한 참여 폼을 재사용하므로 요청도 동일하다.

| 시점 | 요청 | 라우터 | DB 테이블 | 목적 |
|---|---|---|---|---|
| "참여하기" 제출 | (세션 있으면 요청 없음) / 없으면 `POST /api/appointments/:id/participants` | participants | appointments(select), participants(select, insert) | 참여자 등록/인증 |

## AppointmentPage — 세션 있음, role=admin (AdminDashboard)

화면 진입 즉시 3개 요청이 병렬로 나간다.

| 시점 | 요청 | 라우터 | DB 테이블 | 목적 |
|---|---|---|---|---|
| 마운트 | `GET /api/appointments/:id` | appointments | appointments(select) | 약속 기본 정보(기간·정원·마감여부) 조회 |
| 마운트 | `GET /api/appointments/:id/response-status` | results | participants(select), responses(select) | 전체 참여자 중 응답 완료 인원 수 조회 |
| 마운트 | `GET /api/appointments/:id/participants` | results | participants(select), responses(select) | 참여자별 응답 완료 여부 목록 조회 |
| "마감할게요" 클릭(Modal 확인) | `PUT /api/appointments/:id/participants/:participantId/close` | results | participants(select), appointments(select, update) | 투표 마감 처리 |

## AppointmentPage — 세션 있음, role=participant (ParticipantDashboard)

마운트 시 3개 요청이 병렬로 나간다.

| 시점 | 요청 | 라우터 | DB 테이블 | 목적 |
|---|---|---|---|---|
| 마운트 | `GET /api/appointments/:id` | appointments | appointments(select) | 약속 기본 정보(기간·정원·마감여부) 조회 |
| 마운트 | `GET /api/appointments/:id/response-status` | results | participants(select), responses(select) | 전체 참여자 중 응답 완료 인원 수 조회 |
| 마운트 | `GET /api/appointments/:id/participants/:participantId/responses` | responses | participants(select), responses(select) | 내 응답 완료 여부/시각 조회 |

## SchedulePage (`/a/:id/schedule`)

마운트 시 2개 요청이 병렬로 나간다.

| 시점 | 요청 | 라우터 | DB 테이블 | 목적 |
|---|---|---|---|---|
| 마운트 | `GET /api/appointments/:id` | appointments | appointments(select) | 후보 슬롯 범위·마감 여부 확인 |
| 마운트 | `GET /api/appointments/:id/participants/:participantId/responses` | responses | participants(select), responses(select) | 기존에 제출한 가능/선호 시간 불러오기(초기값) |
| ScheduleEditor "확정하기" 클릭 | `PUT /api/appointments/:id/participants/:participantId/responses` | responses | participants(select), appointments(select), responses(delete, insert) | 가능/선호 시간 제출(기존 응답 전체 교체) |

## ResultPage (`/a/:id/result`)

마운트 시 2개 요청이 병렬로 나간다.

| 시점 | 요청 | 라우터 | DB 테이블 | 목적 |
|---|---|---|---|---|
| 마운트 | `GET /api/appointments/:id` | appointments | appointments(select) | 약속 기본 정보·마감 여부 확인 |
| 마운트 | `GET /api/appointments/:id/results` | results | appointments(select), participants(select), responses(select) | 슬롯별 집계 결과(가능/선호 인원수) 조회 — 마감 전이면 409 |

## 라우터별 총정리 (누가 몇 번 호출하나)

- **appointments** (`POST /`, `GET /:id`) — 약속 생성 1곳, 상세 조회는 AdminDashboard·ParticipantDashboard·SchedulePage·ResultPage 4곳 모두가 각자 호출
- **participants** (`POST /:id/participants`) — JoinAppointmentPage와 AppointmentPage(세션 없을 때)가 공유하는 참여 폼 1곳
- **responses** (`GET·PUT /:id/participants/:pid/responses`) — GET은 ParticipantDashboard(내 상태 확인)와 SchedulePage(기존 응답 불러오기) 2곳, PUT은 SchedulePage 제출 1곳
- **results** (`GET /:id/results`, `GET /:id/response-status`, `GET /:id/participants`, `PUT /:id/participants/:pid/close`) — AdminDashboard가 3개(response-status·participants·close) 전부, ParticipantDashboard가 1개(response-status), ResultPage가 1개(results)
