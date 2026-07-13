# 📄 08_DATABASE.md

# Portfolio Zero-to-One Builder

---

# 0. 변경 배경

기존 스키마의 Resume, JobDescription, ProjectTag(직무 관련성 태그), PortfolioVersion 등 JD 매칭 관련 엔티티를 제거하고, 인터뷰 세션과 후보 파일 중심의 스키마로 재정의했다. 상세 배경은 [[01_PRD]] 0장 참고.

---

# 1. 문서 목적

본 문서는 Portfolio Zero-to-One Builder의 데이터베이스 구조를 정의한다.

데이터베이스는 인터뷰 세션의 진행 상태와 각 턴의 근거(코드, 답변)를 기록하는 역할을 수행한다.

---

# 2. 설계 원칙

## 2.1 Session 중심 설계

시스템의 핵심은 InterviewSession이다. 하나의 Repository 스캔은 하나의 인터뷰 세션으로 이어지며, JD 매칭처럼 여러 결과를 조합하지 않는다.

```text
GitHub

↓

Repository

↓

CandidateFile (스코어링 결과)

↓

InterviewSession

↓

InterviewMessage (turn 단위)

↓

PortfolioDraft
```

---

## 2.2 Evidence 기반 저장

모든 포트폴리오 문장은 근거(코드 스니펫 + 유저 답변)와 연결되어야 한다.

---

## 2.3 세션 단위 저장, 재사용 없음

동일 Repository라도 인터뷰를 다시 시작하면 새로운 InterviewSession을 생성한다. (JD 매칭이 없으므로 Project Library 재사용 구조는 사용하지 않는다.)

---

# 3. ERD (Entity Relationship Diagram)

```text
User (선택적, MVP는 익명 세션 허용)
 │
 ▼
Repository
 │
 ▼
CandidateFile
 │
 ▼
InterviewSession
 │
 ├──────────────┐
 ▼              ▼
InterviewMessage   PortfolioDraft
```

---

# 4. Entity 목록

Entity | 설명
-- | --
User | 사용자 (MVP에서는 선택 사항, 익명 세션 허용)
Repository | GitHub 저장소
CandidateFile | 스코어링된 후보 파일
InterviewSession | 인터뷰 세션
InterviewMessage | 인터뷰 turn (질문/답변/판정)
PortfolioDraft | 현재 시점의 전체 마크다운 초안

---

# 5. User

## Fields

```
id
email (선택)
github_username (선택)
created_at
```

MVP에서는 로그인 없이 세션 토큰만으로 동작할 수 있다.

---

# 6. Repository

GitHub Repository 정보

## Fields

```
id
user_id (nullable)
repository_url
default_branch
last_scanned_at
created_at
```

### 관계

User → Repository (1:N, user_id nullable)

---

# 7. CandidateFile

Code Scanner & Scorer가 생성하는 핵심 데이터

## Fields

```
id
repository_id
file_path
score
score_reason
chunks (JSON 배열, 파일당 최대 2개)
  └ [{ "code_snippet": "", "pattern": "" }, ...]
created_at
```

`chunks`는 별도 테이블로 분리하지 않고 JSON 컬럼으로 저장한다(파일당 최대 2개로 개수가 작고, 항상 CandidateFile과 함께 조회되므로 JOIN이 필요 없음).

### 관계

Repository → CandidateFile (1:N)

---

# 8. InterviewSession

## Fields

```
id
repository_id
status (IN_PROGRESS | COMPLETED)
current_candidate_index    (몇 번째 후보 파일을 인터뷰 중인지)
current_chunk_index        (그 파일의 몇 번째 chunk/질문 차례인지, 0 또는 1)
created_at
updated_at
```

`id`는 순차 증가 값이 아닌 랜덤 UUID로 발급한다. 로그인 없는 MVP에서는 이 UUID가 사실상 접근 토큰 역할을 하므로([[07_API_SPEC]] 3장 참고), 추측 가능한 값이면 안 된다.

한 파일에서 chunk가 최대 2개까지 나올 수 있으므로(`[[05_CODE_SCANNER_SCORER]]` 7장 참고), 인터뷰 진행 위치는 "몇 번째 파일"과 "그 파일의 몇 번째 chunk" 두 값으로 함께 추적해야 한다. `current_chunk_index`가 그 파일의 마지막 chunk를 넘어서면 `current_candidate_index`를 다음 파일로 올리고 `current_chunk_index`를 0으로 리셋한다.

### 관계

Repository → InterviewSession (1:N)

---

# 9. InterviewMessage

인터뷰 turn 단위 기록

## Fields

```
id
session_id
candidate_file_id
chunk_index          (candidate_file.chunks 배열 내 인덱스, 어떤 chunk에서 나온 질문인지)
question
cited_code
user_answer
judgement (SUFFICIENT | AMBIGUOUS | LOW_UNDERSTANDING)
content_type (PROBLEM_SOLVING | IMPLEMENTATION_INTRO)
is_follow_up (boolean)
created_at
```

`candidate_file_id`만으로는 한 파일에서 나온 chunk 2개 중 어느 것인지 구분할 수 없으므로 `chunk_index`를 함께 저장한다. `content_type`은 [[06_INTERVIEW_WRITER]] 3장의 섹션 배치 규칙(Key Implementation vs Trouble Shooting)에 사용된다.

### 관계

InterviewSession → InterviewMessage (1:N)

---

# 10. PortfolioDraft

턴마다 재생성되는 전체 마크다운 스냅샷

## Fields

```
id
session_id
markdown_content
turn_number
created_at
```

### 관계

InterviewSession → PortfolioDraft (1:N, 최신 turn_number가 현재 초안)

---

# 11. 관계(Relationship)

```text
User
│
└── Repository

Repository
│
├── CandidateFile
└── InterviewSession

InterviewSession
│
├── InterviewMessage
└── PortfolioDraft
```

---

# 12. AI Agent 데이터 흐름

```text
GitHub Repository

↓

Repository

↓

CandidateFile

↓

InterviewSession

↓

InterviewMessage (반복)

↓

PortfolioDraft (턴마다 갱신)
```

---

# 13. 인덱스 전략

```
repository_url
session_id (InterviewMessage, PortfolioDraft)
created_at
```

---

# 14. 향후 확장

향후 다음 테이블을 추가할 수 있다.

```
ResumeContext (선택 입력)
JDContext (선택 입력)
InterviewPrepQuestion
CareerReport
LLMLog
PromptHistory
```

현재 구조는 이러한 기능을 추가해도 기존 스키마를 크게 변경하지 않고 확장할 수 있도록 설계한다.

---

# 15. 핵심 설계 요약

Portfolio Zero-to-One Builder의 데이터베이스는 JD 매칭을 위한 재사용형 Project Library가 아니라, 하나의 인터뷰 세션이 진행되는 과정과 각 턴의 근거를 기록하는 것을 목표로 한다.

```text
GitHub Repository

↓

CandidateFile

↓

InterviewSession

↓

InterviewMessage

↓

PortfolioDraft
```

InterviewMessage와 PortfolioDraft는 모든 AI Agent가 공통으로 참조하는 핵심 데이터이며, 시스템 전체의 기반이 된다.
