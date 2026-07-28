2주차 주간계획 https://github.com/users/pkyungho/projects/1/views/1****
## 문제 정의 한 문장  

여러 과목을 동시에 준비해야 하는 대학생이 시험기간에 과목별 우선순위를 판단하기 어려워 제한된 공부 시간을 비효율적으로 쓰게 된다.

---

## 사용자 시나리오

시험기간이 다가온 대학생은 여러 과목을 동시에 준비해야 하지만, 어떤 과목부터 공부해야 할지 쉽게 결정하지 못한다.  
학생은 웹사이트에 접속해 과목명, 시험 날짜, 시험 범위량, 현재 이해도, 과목 중요도 등을 입력한다.  
서비스는 입력된 정보를 바탕으로 각 과목의 우선순위 점수를 계산한다.  
학생은 점수가 높은 과목부터 정렬된 결과를 확인하고, 오늘 집중해야 할 과목을 추천받는다.  
이를 통해 학생은 막연한 불안감 대신 구체적인 기준에 따라 공부 순서를 정할 수 있다.

---

## 사용자 흐름

```mermaid
flowchart TD
    A[시험기간에 공부 우선순위를 고민하는 대학생] --> B[웹사이트 접속]
    B --> C[과목별 정보 입력]
    C --> D[과목명 입력]
    C --> E[시험 날짜 입력]
    C --> F[시험 범위량 입력]
    C --> G[현재 이해도 입력]
    C --> H[과목 중요도 입력]
    D --> I[입력값 확인]
    E --> I
    F --> I
    G --> I
    H --> I
    I --> J[우선순위 점수 계산]
    J --> K[과목별 점수 정렬]
    K --> L[오늘 집중할 과목 추천]
    L --> M[사용자는 추천 순서에 따라 공부 계획 수립]
```

## 핵심 기능 2개
  1. 과목별 정보 입력 기능
  2. 공부 우선순위 계산 및 추천 기능

---

## 시스템 구조 (데이터 흐름)

화면(React), 계산 API(Express), 데이터 저장소(SQLite)가 어떻게 연결되고 데이터가 어디로 흐르는지를 나타낸다.
실선은 정상 흐름, 점선은 서버가 없을 때의 폴백 경로다. 초록색으로 표시한 곳(`localStorage`, `SQLite`)이 데이터가 저장되는 지점이다.

```mermaid
flowchart TB
  User(["사용자"])

  subgraph BROWSER["브라우저 · React (Vite)"]
    direction TB
    Pages["SubjectInputPage · ResultScreen<br/>과목 입력 · 우선순위 결과 화면"]
    App["App.jsx<br/>과목 · 성향 상태 관리"]
    SubjApi["subjectsApi.js"]
    PrioApi["priorityApi.js"]
    Calc["priorityCalculator.js<br/>로컬 점수 계산 · 폴백"]
    LS[("localStorage<br/>폴백 캐시 · 성향")]
  end

  subgraph SERVER["Express API 서버 · localhost:3001"]
    direction TB
    SubR["routes/subjects<br/>→ controller → service"]
    PriR["routes/priority → controller → service<br/>우선순위 점수 계산"]
  end

  DB[("SQLite · server/data/app.db<br/>subjects 테이블")]

  User --> Pages
  Pages --> App
  App --> Pages
  App <-->|"과목 캐시 · 성향"| LS
  App -->|"과목 추가 · 수정 · 삭제"| SubjApi
  App -->|"점수 계산 요청"| PrioApi

  SubjApi -->|"/api/subjects<br/>GET · POST · PUT · DELETE"| SubR
  PrioApi -->|"POST /api/priority"| PriR
  SubR <-->|"저장 · 조회"| DB

  SubjApi -.->|"서버 없으면"| LS
  PrioApi -.->|"서버 없으면"| Calc
  Calc -.-> App

  classDef store fill:#ecfdf5,stroke:#10b981,color:#065f46;
  class LS,DB store;
```

> Vite dev/preview가 `/api` 요청을 `localhost:3001`로 프록시한다.

### 데이터 흐름 요약

| 흐름 | 경로 | 비고 |
|---|---|---|
| 과목 저장·조회 | App → `subjectsApi` → `/api/subjects` → controller·service → **SQLite** | 재시작·새로고침에도 유지 |
| 우선순위 계산 | App → `priorityApi` → `POST /api/priority` → `priorityService` | 6개 요인 가중 합산, DB 미접근 |
| 폴백 | 서버 없으면 과목은 `localStorage`, 점수는 `priorityCalculator` | 서버 없는 정적 배포에서도 동작 |

---

## 배포

프론트엔드는 **Vercel**, API 서버는 **Render** 에 올린다. 로컬과 달리 두 주소가 서로 달라서
Vite 프록시가 없고, 아래 환경변수로 연결한다.

| 환경변수 | 어디에 | 값 |
|---|---|---|
| `VITE_API_BASE_URL` | Vercel | Render API 서버 주소 |
| `CORS_ORIGIN` | Render | Vercel 화면 주소 |

설정 순서, 확인 방법, 안 될 때 보는 표는 [docs/deployment.md](docs/deployment.md) 에 있다.
