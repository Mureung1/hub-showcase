# Modu Brain 데이터 흐름 및 아키텍처 시각화

본 문서는 Modu Brain 서비스의 **화면(React) — 서버(Vite/Node API) — 데이터베이스(Supabase PostgreSQL)** 간의 수직 슬라이스 연결 및 데이터 흐름을 시각화한 아키텍처 명세입니다.

---

## 1. 전체 시스템 아키텍처 다이어그램 (Mermaid)

```mermaid
flowchart TB
    subgraph Frontend ["🖥️ React (프론트엔드 화면)"]
        direction TB
        UI_Lesson["ReactBasicsLessonPage\n(학습 & 퀴즈)"]
        UI_Project["ProjectPage\n(브레인 캔버스)"]
        UI_Share["SharePage\n(공유 뷰어)"]
        UI_Auth["LoginPage\n(Magic Link Auth)"]
        
        UI_Lesson -- "1. 메모 작성 / 퀴즈 응답 (fetch)" --> API_V1
        UI_Project -- "2. 기록 저장 / 분석 요청 (fetch)" --> API_V1
        UI_Auth -- "3. Magic Link 요청 (fetch)" --> API_Auth
    end

    subgraph Backend ["⚙️ Express / Node Server (백엔드 API)"]
        direction TB
        API_Auth["POST /api/v1/auth/magic-link\n(인증 & CAPTCHA)"]
        API_V1["POST /api/v1/projects\nPOST /api/v1/analysis-runs\n(BFF Router)"]
        Repo["moduBrainRepository.mjs\n(비즈니스 & 데이터 매핑)"]
        Gateway["supabaseGateway.mjs\n(RLS & Token Validation)"]
        
        API_V1 --> Gateway
        Gateway --> Repo
        API_Auth --> Gateway
    end

    subgraph Database ["🗄️ Supabase PostgreSQL (데이터베이스 & RLS)"]
        direction TB
        DB_Projects[("projects\n(프로젝트 메타데이터)")]
        DB_Sources[("source_records\n(원문 스냅숏)")]
        DB_Runs[("analysis_runs\n(분석 실행 & 근거)")]
        DB_Notes[("user_notes\n(사용자 메모)")]
        DB_Quiz[("quiz_responses\n(퀴즈 이력)")]
        
        Repo -- "4. SELECT / INSERT (RLS Enforcement)" --> DB_Projects
        Repo -- "5. INSERT (불변 원문 저장)" --> DB_Sources
        Repo -- "6. PERSIST (분석 결과 & 인용문)" --> DB_Runs
        Repo -- "7. UPSERT (실습 메모 & 퀴즈)" --> DB_Notes
        Repo -- "7. UPSERT (실습 메모 & 퀴즈)" --> DB_Quiz
    end

    classDef fe fill:#e8f4fd,stroke:#0075de,stroke-width:2px,color:#000;
    classDef be fill:#fbfaf9,stroke:#615d59,stroke-width:2px,color:#000;
    classDef db fill:#e8f7ee,stroke:#1f7a3f,stroke-width:2px,color:#000;

    class UI_Lesson,UI_Project,UI_Share,UI_Auth fe;
    class API_Auth,API_V1,Repo,Gateway be;
    class DB_Projects,DB_Sources,DB_Runs,DB_Notes,DB_Quiz db;
```

---

## 2. 데이터 흐름 세부 시나리오

### 1) 메모 작성 및 자가 진단 퀴즈 응답 흐름
- **화면(React)**: 사용자가 `ReactBasicsLessonPage`에서 메모를 입력하거나 퀴즈 답안을 제출하면, `useState`로 로컬 상태를 관리함과 동시에 `fetch('/api/v1/...')`를 통해 백엔드로 전송합니다.
- **서버(Node/Worker)**: `authSession` 미들웨어가 HttpOnly 쿠키의 세션을 검증하고 `moduBrainRepository.mjs`에 데이터 처리를 위임합니다.
- **DB(Supabase)**: `user_notes` 및 `quiz_responses` 테이블에 `auth.uid() = user_id` RLS(Row Level Security) 정책에 따라 본인의 계정 데이터로 안전하게 영구 저장됩니다.

### 2) 외부 맥락 분석 및 근거 인용 흐름
- **화면(React)**: `ProjectPage`에서 외부 문서/기록을 가져와 "분석 실행"을 누르면, 백엔드로 분석 요청이 전달됩니다.
- **서버(Node/Worker)**: `contextAnalysisCore.mjs`가 4단계 이벤트(`source_snapshot` -> `provider_analysis` -> `evidence_validation` -> `result_persistence`)를 차례로 수행합니다.
- **DB(Supabase)**: 분석 결과와 실제 원문 부분 문자열 인용문이 `analysis_runs` 테이블에 저장되며, 타 계정 접근은 RLS로 100% 차단됩니다.
