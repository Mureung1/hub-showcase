# 문서

[기획](https://github.com/Ladea1224/hub/wiki/%EA%B8%B0%ED%9A%8D_%EC%B5%9C%EC%A2%85)

[개발 테스크](https://fish-quark-a38.notion.site/81045f08993647048109a5d222ae4e25?v=8c8e2fea06f04edb8508e3d632f3b8c3&source=copy_link)

# FlowChart

## FE-BE-DB
```mermaid
flowchart TD
    SHARE(["🔗 공유 링크 클릭<br/>/a/:id"]):::note

    subgraph HOME["📄 HomePage /"]
        H0["API 요청 없음"]:::note
    end
    subgraph NEWPAGE["📄 NewAppointmentPage /new"]
        N1["POST /api/appointments<br/><br/>appointments · insert<br/>participants · insert"]:::write
    end
    subgraph JOINPAGE["📄 JoinAppointmentPage /join"]
        JP0["JoinAppointmentForm 렌더<br/>(페이지 자체 요청 없음)"]:::note
    end
    subgraph APPPAGE["📄 AppointmentPage /a/:id"]
        AP0{"세션 · role 에 따라<br/>컴포넌트 렌더"}:::note
    end
    subgraph SCHEDPAGE["📄 SchedulePage /a/:id/schedule · 마운트 2개 병렬"]
        S1["GET :id<br/><br/>appointments · select"]:::read
        S2["GET :id/participants/:pid/responses<br/><br/>participants · select<br/>responses · select"]:::read
        S3["PUT :id/participants/:pid/responses<br/><br/>appointments · select<br/>participants · select<br/>responses · delete, insert"]:::write
    end
    subgraph RESULTPAGE["📄 ResultPage /a/:id/result · 마운트 2개 병렬"]
        R1["GET :id<br/><br/>appointments · select"]:::read
        R2["GET :id/results (마감 전 409)<br/><br/>appointments · select<br/>participants · select<br/>responses · select"]:::read
    end

    subgraph JAF["🧩 JoinAppointmentForm · 컴포넌트"]
        J1["POST :id/participants<br/><br/>appointments · select<br/>participants · select, insert"]:::write
    end
    subgraph ADMIN["🧩 AdminDashboard · 컴포넌트 (role=admin) · 마운트 3개 병렬"]
        A1["GET :id<br/><br/>appointments · select"]:::read
        A2["GET :id/response-status<br/><br/>participants · select<br/>responses · select"]:::read
        A3["GET :id/participants<br/><br/>participants · select<br/>responses · select"]:::read
        A4["PUT :id/participants/:pid/close<br/><br/>appointments · select, update<br/>participants · select"]:::write
    end
    subgraph PART["🧩 ParticipantDashboard · 컴포넌트 (role=participant) · 마운트 3개 병렬"]
        P1["GET :id<br/><br/>appointments · select"]:::read
        P2["GET :id/response-status<br/><br/>participants · select<br/>responses · select"]:::read
        P3["GET :id/participants/:pid/responses<br/><br/>participants · select<br/>responses · select"]:::read
    end

    %% 페이지 이동 / 전환 (실선)
    SHARE --> AP0
    HOME --> NEWPAGE
    HOME --> JOINPAGE
    N1 -->|"생성 완료"| APPPAGE
    J1 -->|"참여 완료 · 세션 생성"| APPPAGE
    ADMIN --> SCHEDPAGE
    ADMIN --> RESULTPAGE
    PART --> SCHEDPAGE
    PART --> RESULTPAGE

    %% 컴포넌트 렌더 (점선)
    JP0 -. "렌더" .-> JAF
    AP0 -. "세션 없음" .-> JAF
    AP0 -. "role=admin" .-> ADMIN
    AP0 -. "role=participant" .-> PART

    classDef read stroke:#3B8BD4,stroke-width:1px;
    classDef write stroke:#D08A2C,stroke-width:2px;
    classDef note stroke:#8A8F98,stroke-dasharray:3 3,color:#8A8F98;

    style HOME stroke:#2E8B57,stroke-width:3px,fill:transparent
    style NEWPAGE stroke:#2E8B57,stroke-width:3px,fill:transparent
    style JOINPAGE stroke:#2E8B57,stroke-width:3px,fill:transparent
    style APPPAGE stroke:#2E8B57,stroke-width:3px,fill:transparent
    style SCHEDPAGE stroke:#2E8B57,stroke-width:3px,fill:transparent
    style RESULTPAGE stroke:#2E8B57,stroke-width:3px,fill:transparent
    style JAF stroke:#9B59B6,stroke-width:2px,stroke-dasharray:6 4,fill:transparent
    style ADMIN stroke:#9B59B6,stroke-width:2px,stroke-dasharray:6 4,fill:transparent
    style PART stroke:#9B59B6,stroke-width:2px,stroke-dasharray:6 4,fill:transparent
```
## Routers
```mermaid
flowchart LR
    EXP["Express app<br/>/api/appointments"]:::app

    AR{{"&emsp;&emsp;&emsp;&emsp;appointmentsRouter&emsp;&emsp;&emsp;&emsp;"}}:::router
    PR{{"&emsp;&emsp;&emsp;&emsp;participantsRouter&emsp;&emsp;&emsp;&emsp;"}}:::router
    RR{{"&emsp;&emsp;&emsp;&emsp;responsesRouter&emsp;&emsp;&emsp;&emsp;"}}:::router
    RSR{{"&emsp;&emsp;&emsp;&emsp;resultsRouter&emsp;&emsp;&emsp;&emsp;"}}:::router

    AC["POST /api/appointments"]:::api
    AG["GET /api/appointments/:id"]:::api

    PJ["POST /api/appointments/:id/participants"]:::api

    RGET["GET /api/appointments/:id/<br/>participants/:pid/responses"]:::api
    RPUT["PUT /api/appointments/:id/<br/>participants/:pid/responses"]:::api

    STATUS["GET /api/appointments/:id/<br/>response-status"]:::api
    PEOPLE["GET /api/appointments/:id/<br/>participants"]:::api
    CLOSE["PUT /api/appointments/:id/<br/>participants/:pid/close"]:::api
    RESULTS["GET /api/appointments/:id/<br/>results"]:::api

    HEALTH["GET /api/health<br/>Express app 직접 처리"]:::api

    EXP --> AR
    EXP --> PR
    EXP --> RR
    EXP --> RSR
    EXP --> HEALTH

    AR --> AC
    AR --> AG

    PR --> PJ

    RR --> RGET
    RR --> RPUT

    RSR --> STATUS
    RSR --> PEOPLE
    RSR --> CLOSE
    RSR --> RESULTS

    classDef app font-size:16px,font-weight:500,stroke-width:2px;
    classDef router font-size:19px,font-weight:500,stroke-width:3px;
    classDef api font-size:13px,stroke-width:1px;
```
## API별 DB 접근 매트릭스
DB는 서버의 Supabase 클라이언트를 통해 PostgreSQL에 접근한다.

### `appointmentsRouter`

| API | `appointments` | `participants` | `responses` |
|---|---|---|---|
| `POST /api/appointments` | INSERT<br>관리자 생성 실패 시 DELETE | INSERT (`role=admin`) | — |
| `GET /api/appointments/:id` | SELECT | — | — |

### `participantsRouter`

| API | `appointments` | `participants` | `responses` |
|---|---|---|---|
| `POST /api/appointments/:id/participants` | SELECT<br>약속 존재 및 정원 확인 | SELECT<br>기존 참여자 확인<br>신규이면 INSERT | — |

### `responsesRouter`

| API | `appointments` | `participants` | `responses` |
|---|---|---|---|
| `GET /api/appointments/:id/participants/:pid/responses` | — | SELECT<br>소속 참여자 확인 | SELECT<br>기존 응답 조회 |
| `PUT /api/appointments/:id/participants/:pid/responses` | SELECT<br>시간 범위 및 마감 확인 | SELECT<br>소속 참여자 확인 | DELETE<br>새 응답 INSERT |

### `resultsRouter`

| API | `appointments` | `participants` | `responses` |
|---|---|---|---|
| `GET /api/appointments/:id/response-status` | — | SELECT<br>약속 참여자 ID 조회 | SELECT<br>응답 완료 인원 집계 |
| `GET /api/appointments/:id/participants` | — | SELECT<br>참여자 ID 및 이름 조회 | SELECT<br>참여자별 응답 여부 확인 |
| `PUT /api/appointments/:id/participants/:pid/close` | SELECT<br>미마감이면 `closed_at` UPDATE | SELECT<br>관리자 역할 확인 | — |
| `GET /api/appointments/:id/results` | SELECT<br>마감 여부 확인 | 마감된 경우 SELECT | 마감된 경우 SELECT<br>슬롯별 결과 집계 |

### DB 테이블 관계

```text
appointments
  └── participants
        └── responses