# Modu Brain (`modu-brain-tjwnsdhfz.onrender.com`) 데이터 흐름 및 3계층 아키텍처 시각화

본 문서는 실제 배포 서비스인 **[modu-brain-tjwnsdhfz.onrender.com](https://modu-brain-tjwnsdhfz.onrender.com/)**의 시스템 아키텍처, 3계층 구조, 데이터 흐름, 및 보안 검증 파이프라인을 시각화한 명세서입니다.

---

## 1. 3계층 아키텍처 다이어그램 (Mermaid)

```mermaid
flowchart TB
    subgraph Frontend ["🖥️ 프론트엔드 레이어 (React SPA)"]
        direction TB
        UI_Home["공개 워크스페이스 (/)\n카카오톡 TXT · Teams · Notion JSON"]
        UI_Demo["공개 데모 (/demo)\n사전 구성 한국어 기록 & 결정 이력"]
        UI_Login["보안 로그인 (/login)\nTurnstile CAPTCHA & Magic Link"]
        UI_Project["브레인 캔버스 (/projects/:id)\n지식맵 · 원문 백링크 · 결정 이유 · Diff"]
        UI_Share["안전 공유 뷰어 (/share#token=...)\nFragment SHA-256 토큰 검증"]

        UI_Home -- "1. 비영속 로컬 분석 (fetch)" --> API_V1
        UI_Login -- "2. Magic Link & HttpOnly 쿠키" --> API_Auth
        UI_Project -- "3. 기록 저장 & 4단계 AI 분석" --> API_V1
        UI_Share -- "4. 만료/폐기 토큰 검증" --> API_Share
    end

    subgraph Backend ["⚙️ 백엔드 레이어 (Node BFF & Service Gateway)"]
        direction TB
        API_Auth["POST /api/v1/auth/magic-link\n(Origin/IP/CAPTCHA 검증)"]
        API_V1["POST /api/v1/projects\nPOST /api/v1/analysis-runs\n(BFF API Router)"]
        API_Share["POST /api/v1/shared/resolve\n(공유 해시 검증)"]
        
        Core["contextAnalysisCore.mjs\n1. 스냅숏 → 2. 분석 → 3. 근거 검증 → 4. 저장"]
        Repo["moduBrainRepository.mjs\n(PostgreSQL OpenApi & RPC 매핑)"]
        Gateway["supabaseGateway.mjs\n(JWT 세션 & Service-Role Isolation)"]

        API_V1 --> Gateway
        API_Auth --> Gateway
        API_Share --> Gateway
        Gateway --> Core
        Core --> Repo
    end

    subgraph Database ["🗄️ 데이터베이스 레이어 (Supabase PostgreSQL + RLS)"]
        direction TB
        DB_Projects[("projects\n(소유권 auth.uid() = owner_id)")]
        DB_Sources[("source_records\n(회의록 · 리서치 · 피드백 원문)")]
        DB_Runs[("analysis_runs & step_events\n(결정 이유 · 근거 부분문자열 인용)")]
        DB_Shares[("share_links\n(SHA-256 해시 토큰)")]

        Repo -- "5. SELECT / INSERT (RLS 제어)" --> DB_Projects
        Repo -- "6. 불변 원문 저장" --> DB_Sources
        Repo -- "7. 분석 이력 & 인용문 확정" --> DB_Runs
        Repo -- "8. 토큰 해시 검증 & 조회" --> DB_Shares
    end

    classDef fe fill:#e8f4fd,stroke:#0075de,stroke-width:2px,color:#000;
    classDef be fill:#fbfaf9,stroke:#615d59,stroke-width:2px,color:#000;
    classDef db fill:#e8f7ee,stroke:#1f7a3f,stroke-width:2px,color:#000;

    class UI_Home,UI_Demo,UI_Login,UI_Project,UI_Share fe;
    class API_Auth,API_V1,API_Share,Core,Repo,Gateway be;
    class DB_Projects,DB_Sources,DB_Runs,DB_Shares db;
```

---

## 2. 4단계 AI 분석 파이프라인 시퀀스 (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자 (React Client)
    participant Server as Node BFF Router
    participant Core as Analysis Core Engine
    participant DB as Supabase PostgreSQL

    User->>Server: POST /api/v1/projects/:id/analysis-runs (원문 ID & Idempotency-Key)
    Server->>Server: Same-Origin & Rate-Limit 검증
    Server->>Core: 분석 실행 요청
    
    rect rgb(240, 248, 255)
        note over Core,DB: Step 1. source_snapshot
        Core->>DB: 선택 원문 조회 및 불변 스냅숏 채록
    end

    rect rgb(255, 250, 240)
        note over Core: Step 2. provider_analysis
        Core->>Core: 로컬 휴리스틱 / OpenAI 샌드박스 호출 (30초 제한, CoT 비저장)
    end

    rect rgb(240, 255, 240)
        note over Core: Step 3. evidence_validation
        Core->>Core: JSON 결과 스키마 & 모든 인용문(Quote) 100% 원문 부분문자열 검증
    end

    rect rgb(255, 240, 245)
        note over Core,DB: Step 4. result_persistence
        Core->>DB: analysis_runs & step_events 트랜잭션 저장 (succeeded/failed)
    end

    Server-->>User: 201 Created (결정 이유, 관점 차이, 미결 질문, 검증된 인용문)
```

---

## 3. 계층별 세부 역할 명세

1. **프론트엔드 (React SPA)**:
   - `/`: 비영속 수신 및 붙여넣기 정규화
   - `/demo`: 시연용 사전 구성 데모
   - `/login`: Magic Link & HttpOnly 세션 발급
   - `/projects/:id`: 브레인 캔버스, 지식맵 탐색, 이력 diff 비교
   - `/share#token=...`: URL Fragment 기반 SHA-256 해시 검증 및 읽기 전용 공유
2. **백엔드 (Node BFF Router)**:
   - HttpOnly 쿠키 인증, Same-Origin 검증, CAPTCHA 확인, Rate Limit (IP/User HMAC 해시), IDOR 차단
3. **데이터베이스 (Supabase PostgreSQL + RLS)**:
   - `auth.uid() = owner_id` RLS 정책 기반의 멀티테넌트 데이터 격리 및 OpenApi/RPC 보안 제어
