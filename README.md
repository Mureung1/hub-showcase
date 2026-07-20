# hub

- [프로젝트 기획서](docs/plan.md)
- [개발 Task 및 백로그](https://app.notion.com/p/AI-Agent-Challenge-Task-399bd5ad252d80f5a73afd5e6443d3fd?source=copy_link)

## 2주차 작업 계획

- [2주차 수직 슬라이스 구현 계획](docs/week2-vertical-slice-plan.md)

## 3주차 작업 계획

- Supabase DB 연동 상태 점검
- 저장된 학습계획의 새로고침 복원 기능 구현
- Vitest를 이용한 테스트 환경 구성 및 TDD 적용
- 서비스 구조와 데이터 흐름을 Mermaid로 시각화
- 테스트코드 생성 Skill 제작
- 코드 검증 Agent 제작
- 개인 개발 Workflow 문서화

### 서비스 구조와 데이터 흐름

이 서비스는 React가 화면을 보여주고, Express가 API 요청을 처리합니다. `studyPlans.js`는 Express가 사용하는 학습 계획 검증 및 데이터 변환 모듈입니다. Supabase는 학습 계획 데이터를 저장하고 조회합니다.

```mermaid
flowchart LR
  React[React 화면]
  Express[Express 서버]
  StudyPlans[studyPlans.js]
  Supabase[Supabase DB]
  Storage[브라우저 localStorage<br/>studyPlanId]

  React -->|API 요청| Express
  Express -->|JSON 응답| React

  Express -->|검증 및 데이터 변환 요청| StudyPlans
  StudyPlans -->|검증 결과 및 변환 데이터| Express

  Express -->|읽기/쓰기| Supabase
  Supabase -->|조회 결과| Express

  React -->|저장 성공 후 ID 기록| Storage
  Storage -.->|페이지 시작 시 React가 ID 확인| React
```

### 저장 및 새로고침 복원 흐름

```mermaid
sequenceDiagram
  participant User as 사용자
  participant React as React 화면
  participant Storage as localStorage
  participant Express as Express 서버
  participant Supabase as Supabase DB

  User->>React: 학습계획 저장 요청
  React->>Express: POST /api/study-plans
  Express->>Supabase: 학습계획 저장
  Supabase-->>Express: 저장된 학습계획 ID 반환
  Express-->>React: 저장 성공 응답
  React->>Storage: 학습계획 ID 저장
  React->>Express: GET /api/study-plans/:id
  Express->>Supabase: 학습계획 조회
  Supabase-->>Express: 학습계획 데이터 반환
  Express-->>React: 조회 성공 응답
  React->>React: savedStudyPlan 상태 반영

  User->>React: 새로고침
  React->>Storage: 저장된 학습계획 ID 확인
  React->>Express: GET /api/study-plans/:id
  Express->>Supabase: 학습계획 조회
  alt 조회 성공
    Supabase-->>Express: 학습계획 데이터 반환
    Express-->>React: 조회 성공 응답
    React->>React: savedStudyPlan 상태 복원
  else 조회 실패
    Express-->>React: 404 또는 오류 응답
    React->>Storage: 저장된 학습계획 ID 제거
    React->>React: 사용자 메시지 표시
  end
```
