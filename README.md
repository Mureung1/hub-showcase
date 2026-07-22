# 관계형 AI

관계형 AI는 사용자가 자신의 상황과 감정을 입력하면 AI가 공감형 반응이나 후속 질문을 제공하는 웹서비스입니다.

## 해결하려는 문제

사용자는 감정을 표현할 때 공감과 다음 단계를 원하는데, 기존 시스템은 단순한 자동 응답이나 챗봇형 인터페이스로 감정적 연결을 제공하지 못합니다.

## 핵심 사용자 시나리오

1. 사용자가 상황을 입력한다.
2. 사용자가 현재 감정을 선택한다.
3. React 앱이 Express API에 요청을 보낸다.
4. Express 서버가 입력값을 검증한다.
5. 규칙 기반 Mock AI가 공감형 응답과 후속 질문을 생성한다.
6. Supabase에 사용자 입력과 AI 응답을 저장한다.
7. 저장된 결과가 React 대화 화면에 표시된다.

## 핵심 수직 슬라이스

* 사용자 상황 입력
* 감정 선택
* React에서 Express API 호출
* Express에서 입력값 검증
* 규칙 기반 Mock AI 응답 생성
* Supabase에 사용자 입력과 AI 응답 저장
* 저장 결과 반환
* React 대화 화면 갱신

## 기술 스택

* Frontend: React
* Backend: Express
* Database: Supabase
* Supabase SDK: @supabase/supabase-js
* HTTP 요청: fetch
* React 상태 관리: useState
* 초기 AI 응답: 규칙 기반 Mock 응답

## 프로젝트 폴더 구조

```
App
├─ analysisStatus
├─ emotionResult
│
├─ ServiceHeader
├─ EmotionInputForm
│  ├─ situationText
│  ├─ faceSignal
│  ├─ voiceSignal
│  ├─ validationError
│  │
│  ├─ SituationInput
│  ├─ memo(FaceSignalSelector)
│  └─ memo(VoiceSignalSelector)
│
├─ AnalysisStatus
└─ EmotionResult
   ├─ EmotionScoreBar
   ├─ EvidenceList
   └─ AnalysisDisclaimer
```

## 문서 링크
* [Mock 데이터 사용 및 화면 표시 현황](https://github.com/studentnoname/hub/wiki/Mock-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%82%AC%EC%9A%A9-%EB%B0%8F-%ED%99%94%EB%A9%B4-%ED%91%9C%EC%8B%9C-%ED%98%84%ED%99%A9)

## 현재 개발 상태
* [개발일지 - 1] (https://github.com/studentnoname/hub/wiki/%5B%EA%B0%9C%EB%B0%9C%EC%9D%BC%EC%A7%80-%E2%80%90-1-%5D-%E2%80%90-2026%EB%85%84-7%EC%9B%94-21%EC%9D%BC-(%ED%98%84%EC%9E%AC-%EC%83%81%ED%99%A9-%EC%9A%94%EC%95%BD))

## 전체 데이터의 흐름
```mermaid
flowchart LR
  subgraph FE["화면 · React"]
    direction TB

    FORM["EmotionInputForm<br/>상황·얼굴·음성 입력"]
    HOOK["useEmotionSession<br/>화면 흐름과 상태 관리"]
    SESSION["localStorage<br/>browser sessionId"]
    MOCK_ANALYSIS["analyzeMockContext<br/>규칙 기반 Mock 감정 분석"]
    MOCK_RESPONSE["generateMockResponse<br/>규칙 기반 Mock AI 답변"]
    API_CLIENT["emotionAnalysisApi<br/>fetch API 호출"]
    UI_STATE["React 상태<br/>messages · emotionResult · status"]
    RESULT_UI["ConversationPanel<br/>EmotionResult"]
    AGAIN["다시 분석하기"]

    FORM -->|"handleAnalyze(input)"| HOOK
    HOOK -->|"UUID 조회·생성"| SESSION
    HOOK --> MOCK_ANALYSIS
    MOCK_ANALYSIS -->|"analysisResult"| HOOK
    HOOK --> MOCK_RESPONSE
    MOCK_RESPONSE -->|"aiResponse"| HOOK
    HOOK -->|"저장 payload"| API_CLIENT
    HOOK --> UI_STATE
    UI_STATE --> RESULT_UI

    AGAIN -->|"로컬 재분석"| MOCK_ANALYSIS
  end

  subgraph BE["서버 · Express"]
    direction TB

    CORS["CORS 검사<br/>허용 Origin 확인"]
    POST_ROUTE["POST /api/emotion-analyses"]
    GET_ROUTE["GET /api/emotion-analyses"]
    POST_VALIDATION["POST 입력 검증<br/>UUID·공백·허용 신호"]
    GET_VALIDATION["GET 입력 검증<br/>sessionId·limit"]
    INSERT_REPO["createEmotionAnalysis"]
    LIST_REPO["listEmotionAnalysesBySession"]
    MAPPER["snake_case ↔ camelCase 변환"]
    ERROR["오류 응답<br/>400 · 403 · 502"]

    CORS --> POST_ROUTE
    CORS --> GET_ROUTE

    POST_ROUTE --> POST_VALIDATION
    POST_VALIDATION -->|"정상"| INSERT_REPO
    POST_VALIDATION -->|"실패"| ERROR

    GET_ROUTE --> GET_VALIDATION
    GET_VALIDATION -->|"정상"| LIST_REPO
    GET_VALIDATION -->|"실패"| ERROR

    INSERT_REPO --> MAPPER
    LIST_REPO --> MAPPER
  end

  subgraph DB["DB · Supabase"]
    TABLE[("public.emotion_analyses")]

    SECRET["서버 전용 환경변수<br/>SUPABASE_URL<br/>SUPABASE_SECRET_KEY"]
    RLS["RLS 활성화<br/>service_role만 SELECT·INSERT"]

    SECRET --> INSERT_REPO
    SECRET --> LIST_REPO
    RLS --> TABLE
  end

  API_CLIENT -->|"POST JSON<br/>camelCase"| CORS
  MAPPER -->|"HTTP 201<br/>저장된 레코드"| API_CLIENT

  INSERT_REPO -->|"INSERT<br/>snake_case"| TABLE
  TABLE -->|"생성된 행"| INSERT_REPO

  HOOK -->|"화면 시작·새로고침<br/>sessionId + limit=20"| API_CLIENT
  API_CLIENT -->|"GET 요청"| CORS

  LIST_REPO -->|"session_id 조건 조회<br/>created_at DESC"| TABLE
  TABLE -->|"저장 기록"| LIST_REPO
  MAPPER -->|"HTTP 200<br/>emotionAnalyses[]"| API_CLIENT
  API_CLIENT -->|"대화·최신 분석 복원"| HOOK

  classDef mock fill:#fff3cd,stroke:#d39e00,color:#5f4700;
  classDef real fill:#d9edf7,stroke:#31708f,color:#234d5e;
  classDef database fill:#dff0d8,stroke:#3c763d,color:#274e27;

  class MOCK_ANALYSIS,MOCK_RESPONSE mock;
  class API_CLIENT,CORS,POST_ROUTE,GET_ROUTE,INSERT_REPO,LIST_REPO real;
  class TABLE,RLS database;
```

## 분석 저장과 새로고침의 복원 순서

```mermaid
sequenceDiagram
  autonumber

  actor User as 사용자
  participant React as React 화면
  participant Storage as localStorage
  participant Mock as Mock 분석·답변
  participant Express as Express API
  participant DB as Supabase

  rect rgb(235, 245, 255)
    Note over React,DB: 화면 최초 실행 또는 새로고침

    React->>Storage: emotion-analysis-session-id 조회

    alt 유효한 UUID가 없음
      Storage-->>React: 값 없음 또는 잘못된 UUID
      React->>Storage: crypto.randomUUID() 저장
    else 기존 UUID가 있음
      Storage-->>React: 기존 sessionId 반환
    end

    React->>Express: GET /api/emotion-analyses?sessionId=...&limit=20
    Express->>Express: CORS 및 UUID·limit 검증
    Express->>DB: session_id 조건 SELECT
    DB-->>Express: created_at 내림차순 레코드
    Express-->>React: HTTP 200, emotionAnalyses[]

    alt 저장 기록이 있음
      React->>React: 레코드를 시간순으로 재배열
      React->>React: 사용자·AI 메시지 구성
      React->>React: 최신 analysisResult 복원
    else 저장 기록이 없음
      React->>React: 초기 Mock 메시지 유지
    end
  end

  rect rgb(255, 247, 225)
    Note over User,DB: 사용자가 감정 분석을 실행

    User->>React: 상황·얼굴·음성 입력
    User->>React: 분석하고 전송

    React->>React: 공백 및 처리 중 상태 확인
    React->>Mock: analyzeMockContext(input)
    Mock-->>React: Mock analysisResult
    React->>Mock: generateMockResponse(input, result)
    Mock-->>React: Mock aiResponse

    React->>React: 사용자 메시지 추가
    React->>React: analyzing / thinking 상태

    React->>Express: POST /api/emotion-analyses
    Note right of React: sessionId, situationText,<br/>signals, scenario,<br/>analysisResult, aiResponse

    Express->>Express: CORS 검사
    Express->>Express: UUID·공백·허용 신호 검증

    alt 입력값이 잘못됨
      Express-->>React: HTTP 400 VALIDATION_ERROR
      React->>React: 저장 실패 오류 표시
    else Origin이 허용되지 않음
      Express-->>React: HTTP 403 CORS_ORIGIN_DENIED
      React->>React: 저장 실패 오류 표시
    else 정상 요청
      Express->>DB: emotion_analyses INSERT
      DB-->>Express: 실제 저장된 레코드
      Express-->>React: HTTP 201, emotionAnalysis

      React->>React: 저장된 analysisResult 반영
      React->>React: 저장된 AI 답변 추가
      React->>React: completed → speaking → waiting
    end
  end
```