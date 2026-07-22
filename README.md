# 진로 에이전트 서비스 (링커리어 공고 추천 & 자소서 초안 Agent)

대학생의 전공·경험 기반 공고 추천 + 자소서 초안 생성 Agent. 기획은 [docs/plan.md](docs/plan.md), 4주 개발 Task는 [docs/checklist.md](docs/checklist.md) 참고.

이번 주 작업 현황은 [GitHub Issues](https://github.com/dohyeon-k/hub/issues)에서 확인할 수 있다(우선순위는 `P0`/`P1`/`P2` 라벨로 표시). 진행 상황은 [GitHub Project 보드](https://github.com/users/dohyeon-k/projects/1)에서 칸반 형태로도 볼 수 있다.

## 아키텍처

화면(4개) → Express 라우트 → 서비스 로직 → 데이터(Supabase/목업 JSON)로 이어지는 전체 구조. 추천 흐름(정보입력→추천)과 자소서 흐름(공고상세→초안) 두 개의 수직 슬라이스가 있다:

```mermaid
flowchart LR
    subgraph Frontend["React (src/)"]
        InfoInput["정보입력\nInfoInput.jsx"]
        RecommendList["추천목록\nRecommendList.jsx"]
        JobDetail["공고상세\nJobDetail.jsx"]
        DraftEditor["자소서초안\nDraftEditor.jsx"]
        Api["api.js"]
    end

    subgraph Backend["Express (backend/src/)"]
        ProfilesRoute["routes/profiles.js\nPOST /api/profiles"]
        DraftsRoute["routes/drafts.js\nPOST /api/postings/:id/draft"]
        Matching["services/matching.js\nscoreAndRank"]
        Claude["services/claude.js\ngenerateReasons"]
        EssayAnalysis["services/essayAnalysis.js\nanalyzeEssayQuestion"]
        DraftGen["services/draftGeneration.js\ngenerateDrafts"]
    end

    subgraph Data["데이터"]
        Profiles[("Supabase\nprofiles 테이블")]
        Drafts[("Supabase\ndrafts 테이블")]
        Postings[["postings.json\n(목업 공고 10건)"]]
    end

    InfoInput -->|"제출"| Api --> ProfilesRoute
    ProfilesRoute -->|"프로필 저장"| Profiles
    ProfilesRoute -->|"공고 조회"| Postings
    ProfilesRoute --> Matching
    Matching --> Claude
    Claude -->|"추천 이유 + 공고 목록"| ProfilesRoute
    ProfilesRoute -->|"201 profileId + recommendations"| Api
    Api --> RecommendList --> JobDetail

    JobDetail -->|"자소서 초안 생성 클릭\n(profileId+profile을 body로 재전송)"| Api --> DraftsRoute
    DraftsRoute -->|"공고 조회"| Postings
    DraftsRoute -->|"저장된 초안 있는지 조회"| Drafts
    DraftsRoute --> EssayAnalysis
    EssayAnalysis -->|"문항별 분석"| DraftGen
    DraftGen -->|"저장된 게 없을 때만: 문항별 초안 생성\n(LLM 또는 템플릿 폴백)"| DraftsRoute
    DraftsRoute -->|"200 essayQuestions + isSaved"| Api --> DraftEditor
    DraftEditor -->|"저장 클릭"| Api -->|"POST .../draft/save"| DraftsRoute
    DraftsRoute -->|"upsert(profile_id, posting_id)"| Drafts
```

요청 하나가 실제로 어떻게 도는지(수직 슬라이스)는 시퀀스로 보면 더 명확하다. 먼저 추천 흐름:

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as React (InfoInput)
    participant E as Express (/api/profiles)
    participant S as Supabase (profiles)
    participant M as matching.js
    participant C as claude.js

    U->>F: 정보 입력 후 제출
    F->>E: POST /api/profiles
    E->>S: insert(profile)
    S-->>E: profileId
    E->>E: postings.json 로드
    E->>M: scoreAndRank(profile, postings)
    M-->>E: 점수순 공고 목록
    E->>C: generateReasons(profile, postings)
    C-->>E: 추천 이유 (LLM 또는 템플릿 폴백)
    E-->>F: 201 {profileId, recommendations}
    F-->>U: 추천 목록 화면 렌더
```

그리고 자소서 초안 흐름 — 저장된 초안이 있으면 재생성 없이 그대로 돌려주고, 없을 때만 LLM을 부른다:

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as React (JobDetail → App.jsx)
    participant E as Express (/api/postings/:id/draft)
    participant S as Supabase (drafts)
    participant A as essayAnalysis.js
    participant D as draftGeneration.js

    U->>F: "자소서 초안 생성" 클릭
    F->>E: POST /api/postings/:id/draft { profileId, profile }
    E->>E: postings.json에서 공고 조회
    E->>A: analyzeEssayQuestion(question, profile) (문항별)
    A-->>E: 문항 유형별 분석 텍스트
    E->>S: select (profile_id, posting_id)
    alt 저장된 초안 있음
        S-->>E: 저장된 answers
        E-->>F: 200 { essayQuestions, isSaved: true }
    else 저장된 초안 없음
        S-->>E: null
        E->>D: generateDrafts(profile, posting, essayQuestions)
        D-->>E: 문항별 초안 (LLM 또는 템플릿 폴백)
        E-->>F: 200 { essayQuestions, isSaved: false }
    end
    F-->>U: 자소서 초안 화면 렌더 (isSaved면 잠긴 채로 시작)
```

저장 자체는 별도 엔드포인트다:

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as React (DraftEditor → App.jsx)
    participant E as Express (/api/postings/:id/draft/save)
    participant S as Supabase (drafts)

    U->>F: "저장 / 완료" 클릭
    F->>E: POST /api/postings/:id/draft/save { profileId, answers }
    E->>S: upsert({ profile_id, posting_id, answers }, onConflict: profile_id+posting_id)
    S-->>E: 저장 완료
    E-->>F: 200 { saved: true }
    F-->>U: textarea 잠금 + "저장됨" 배지 표시
```

### 알려진 제약

- `profile` 자체는 Supabase에 저장은 되지만, 프론트는 그걸 DB에서 다시 조회하지 않고 자소서 초안 요청 시 그대로 재전송한다(T10에서 단순함을 우선해 결정) — 이 구조 자체는 그대로 남아있다. 다만 새로고침하면 다 날아가던 문제는 별개로 해결했다: `step`/`profile`/`profileId`/`jobs`/`selectedJob`/`isDraftSaved`를 `sessionStorage`에 저장해뒀다가 마운트 시 복원한다(라우터 라이브러리 없이, URL 변경 없이). 라우터 도입(URL 딥링크, 브라우저 뒤로가기 등)은 여전히 범위 밖 — `CLAUDE.md`에 "라우터 라이브러리는 쓰지 않는다"고 결정돼 있고, 지금 문제(새로고침 복원)엔 필요하지 않다고 판단했다.
- 자소서 초안 "저장"은 원래 세션 로컬(T12)이었으나, 3주차가 예정보다 훨씬 빨리 끝나 생긴 여유로 Supabase `drafts` 테이블에 실제로 영속화하도록 확장했다(`docs/data-model.md` 참고).

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
