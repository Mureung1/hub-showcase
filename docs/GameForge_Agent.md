# GameForge Agent

> **AI-powered Waterfall Workflow for Unity Game Development**
>
> 관련 문서: [UI/UX 설계](./GameForge_Agent_UI_Spec.md) · [제작 계획](./GameForge_Agent_Dev_Plan.md) · [팀 소개 발표 대본](./GameForge_Agent_Presentation_Script.md)

## 1. Project Overview

### Introduction

GameForge Agent는 Unity 게임 개발을 지원하는 **Multi-Agent 기반 AI 개발 지원 시스템**이다.

기존 AI 챗봇은 사용자의 요청에 대해 개별적인 답변이나 코드를 생성하는 데 초점을 맞춘다. 반면 GameForge Agent는 **프로젝트 전체의 Context를 유지**하며, **워터폴(Waterfall) 개발 프로세스**에 따라 프로젝트를 단계적으로 진행한다.

또한 GitHub Repository를 기반으로 기존 프로젝트를 분석하고, 구조를 유지하면서 새로운 기능을 안전하게 추가할 수 있도록 지원한다.

---

## 2. Motivation

게임 개발에서는 프로젝트가 커질수록 다음과 같은 문제가 발생한다.

- 기능을 빠르게 추가하면서 설계가 무너진다.
- 동일한 기능이 여러 클래스에 중복 구현된다.
- 프로젝트의 전체 구조를 이해하기 어려워진다.
- AI에게 매번 프로젝트를 다시 설명해야 한다.
- 새로운 기능이 기존 구조를 손상시킨다.

GameForge Agent는 이러한 문제를 해결하기 위해 프로젝트 전체를 하나의 개발 과정으로 관리하며, 모든 단계를 문서 중심으로 수행한다.

---

## 3. Goals

본 프로젝트는 다음 목표를 가진다.

- Unity 게임 개발을 워터폴 방식으로 지원한다.
- 아이디어를 개발 가능한 요구사항으로 구체화한다.
- 설계 중심 개발을 유도하여 유지보수성을 높인다.
- 기존 프로젝트를 분석하여 구조를 유지한 채 기능을 추가한다.
- SOLID와 DRY 원칙을 기반으로 코드 품질을 향상시킨다.

---

## 4. Target Users

- 개인 인디 게임 개발자
- AI를 활용하여 개발 생산성을 높이고 싶은 Unity 개발자

---

## 5. Development Workflow

GameForge Agent는 다음 순서를 반드시 따른다.

1. 요구사항 분석
2. 게임 기획
3. 게임 시스템 설계
4. 클래스 설계 (UML)
5. 프로젝트 구조 설계
6. ScriptableObject 설계
7. 코드 생성
8. 리팩토링 및 코드 리뷰
9. 문서화

각 단계는 사용자의 승인 후 다음 단계로 진행된다. UI에서도 이 순서를 강제한다 — 완료되었거나 현재 진행 중인 단계만 열람/이동할 수 있고, 아직 도달하지 않은 단계는 잠긴 상태로 표시된다 (UI/UX 설계 문서 4.1 참고).

> **v1 변경**: 별도의 "테스트" 단계를 두지 않고, 8단계 "리팩토링"을 "리팩토링 및 코드 리뷰"로 확장해 검증 역할을 흡수했다.

### 단계별 산출물 구분

- **게임 기획 (2단계)**: 어떤 기능이 존재하는가(WHAT) — 콘텐츠 범위와 체크리스트 (예: "대시가 있다/없다")
- **게임 시스템 설계 (3단계)**: 그 기능이 어떻게 동작하는가(HOW) — 규칙과 데이터 흐름 (예: 대시의 무적 프레임, 쿨다운, 피격 판정)
- **클래스 설계 (4단계)**: 시스템을 객체지향 구조로 번역 — 클래스와 관계(UML), 논리적 설계
- **프로젝트 구조 설계 (5단계)**: 클래스들이 실제 파일시스템 어디에 위치하는가 — Unity `Assets/` 폴더 구조, 네임스페이스, Assembly Definition 분리 기준. 물리적 설계.

---

## 6. Multi-Agent Architecture

각 Agent는 자신의 역할만 수행하며 이전 단계에서 생성된 Markdown 문서를 기반으로 작업한다.

| Agent | 역할 |
|---|---|
| Requirements Agent | 요구사항 분석 |
| Planning Agent | 게임 기획 |
| System Design Agent | 게임 시스템 설계 |
| Architecture Agent | 클래스 및 프로젝트 구조 설계 |
| Code Generation Agent | Unity 코드 생성 |
| Refactoring Agent | 리팩토링 및 코드 리뷰 (SOLID / DRY 기반) |
| Documentation Agent | 문서 생성 |

모든 Agent는 동일한 Claude 모델을 사용하며, 역할별 프롬프트와 이전 단계의 Markdown 문서를 기반으로 동작한다.

---

## 7. Context Management

프로젝트의 모든 Context는 Markdown 문서로 관리한다.

```
docs/
├── 01_Requirements.md
├── 02_Game_Design.md
├── 03_System_Design.md
├── 04_Class_Design.md
├── 05_Project_Structure.md
├── 06_ScriptableObjects.md
└── 07_Development_Log.md
```

각 Agent는 이전 단계의 Markdown 문서를 읽고 자신의 결과를 새로운 Markdown 문서로 생성한다.

이를 통해 프로젝트의 Context를 지속적으로 유지한다.

---

## 8. Markdown-based Workflow

GameForge Agent의 모든 문서는 체크리스트를 포함한다.

**예시)**

```markdown
# Requirements

## Core Gameplay
- [x] Player Movement
- [x] Jump
- [ ] Dash
- [ ] Inventory

## UI
- [x] Main Menu
- [ ] Inventory UI

## Enemy
- [x] Normal Enemy
- [ ] Boss
```

체크리스트는 단순한 문서가 아니라 프로젝트의 진행 상태를 관리하는 역할도 수행한다. 각 단계의 진행률(%)은 이 체크리스트의 완료 비율로 자동 계산되어 워크스페이스 사이드바에 표시된다.

---

## 9. Approval Process

문서 하나로 끝나는 단계(1~6, 9단계)는 아래 절차를 따른다.

```
AI가 Markdown 생성 (채팅형 Q&A로 답변 수집)
        ↓
사용자가 Markdown 수정 (원문 직접 편집, 저장/취소)
        ↓
     Approve
        ↓
  다음 Agent 수행
```

사용자가 수정한 Markdown이 다음 단계의 공식 Context가 된다.

Agent와의 상호작용은 선택지 버튼 방식이 아니라 **자유 응답 채팅**으로 이루어진다 — 정해진 선택지에 없는 답변(세부 수치, 조건부 답변 등)도 받을 수 있도록 하기 위함이다. Agent가 필요한 정보를 충분히 모았다고 판단하면 대화 내용을 바탕으로 Markdown 초안을 자동 생성한다.

### 코드 산출물의 승인 — 원자적 커밋

**코드 생성(7단계), 리팩토링 및 코드 리뷰(8단계)**는 한 번에 여러 파일이 신규/수정되므로 위 절차를 그대로 쓰지 않는다. 대신:

1. Agent가 변경 사항을 파일 단위로 분리해 제안 (경로, 변경 유형, Diff, 커밋 메시지 초안 포함)
2. 사용자는 파일별로 Diff를 확인하고, 포함할 파일을 체크박스로 선택
3. Approve 시 **선택된 파일(혹은 논리적 그룹) 단위로 여러 개의 원자적 커밋**을 생성 — "Approve 1회 = 커밋 1개"가 아니라 "Approve 1회 = 커밋 N개"
4. 체크 해제되어 이번에 포함되지 않은 파일은 다음 라운드에 다시 노출

이 방식으로 Git 히스토리가 `feat: add dash cooldown logic`, `refactor: extract IMovable interface`처럼 원자적인 단위로 남는다. 상세 화면 설계는 UI/UX 설계 문서 4.5절 참고.

---

## 10. Existing Project Analysis

GitHub Repository를 분석하여 다음 기능을 수행한다.

- 클래스 간 의존성 분석
- Prefab 구조 분석
- 중복 코드 탐지
- 리팩토링 대상 추천

이를 기반으로 기존 프로젝트의 구조를 유지하면서 새로운 기능을 추가한다.

### GitHub 연동 권한

> **v2 변경**: 저장소 URL 직접 입력 + PAT 방식 대신, **GitHub OAuth 로그인**으로 연동한다. 사용자는 "GitHub로 로그인" 버튼 한 번으로 인증하고, 이후 자신의 저장소/Branch를 드롭다운에서 선택한다.

| 작업 | 필요 권한 |
|---|---|
| 로그인, 저장소 목록/Branch 조회, 코드 분석 | 로그인 시 부여된 `repo` 스코프로 처리 |
| 승인된 문서/코드를 실제 저장소에 커밋 | 동일한 `repo` 스코프에 write가 포함되어 있어 별도 승인 불필요 |

OAuth App은 Fine-grained PAT처럼 저장소 단위로 권한을 좁힐 수 없어, 로그인 시 계정이 접근 가능한 **모든** 저장소가 범위에 들어간다. 이는 사용자 경험(로그인 한 번으로 끝)을 위해 감수하기로 한 트레이드오프이며, 로그인 전 안내 문구로 이 범위를 명확히 고지한다.

---

## 11. Feature Expansion Workflow

사용자가

> "대시 기능을 추가해줘."

라고 요청하면 Agent는 다음 절차를 수행한다.

1. 설계 변경 제안
2. ScriptableObject 생성
3. Unity 코드 생성
4. 코드 리뷰 및 리팩토링
5. 변경 사항 문서화
6. Git Commit Message 생성 (파일 단위, 9번 항목의 원자적 커밋 방식 적용)

코드를 먼저 생성하지 않고 반드시 설계를 먼저 수행한다.

> 이 워크플로우는 현재 제작 계획의 MVP 스코프 밖이며, 1~9단계 워크플로우 완성 이후 다음 단계로 진행한다.

---

## 12. Development Principles

GameForge Agent는 다음 원칙을 항상 준수한다.

### SOLID
객체지향 설계 원칙을 기반으로 유지보수성과 확장성을 확보한다.

### DRY
중복 코드를 최소화하고 재사용 가능한 구조를 우선적으로 제안한다.

---

## 13. Dashboard UI

React 기반 대시보드는 AI Agent와 사용자를 연결하는 인터페이스 역할을 수행한다. 상세 화면 설계는 [UI/UX 설계 문서](./GameForge_Agent_UI_Spec.md)에 정리되어 있으며, 핵심 흐름은 다음과 같다.

```
Repository 연결 (GitHub 로그인 → 저장소/Branch 선택 → 분석 프리셋 활성화)
      ↓
분석 리포트 열람 (의존성·중복코드·리팩토링 대상 요약)
      ↓ Approve
Agent 워크스페이스 (9단계 순차 진행)
```

**Agent 워크스페이스** 좌측에는 전체 단계 리스트와 단계별 진행률(%)이 고정 표시된다. 완료되었거나 진행 중인 단계는 클릭해 다시 열람할 수 있고, 아직 도달하지 않은 단계는 잠겨 있다. 우측 메인 패널에서는:

- Agent와 채팅형으로 대화하며 문서 초안을 만들고
- 생성된 Markdown을 직접 열람/수정하고
- Approve로 다음 단계로 넘어간다 (코드가 나오는 단계는 9번 항목의 커밋 리뷰 화면을 거친다)

**주요 기능**
- GitHub 로그인 및 저장소/Branch 선택
- AI와의 채팅형 대화
- 단계별 승인 및 반려
- Markdown 문서 열람/직접 편집/다운로드
- 파일 단위 Diff 검토 및 원자적 커밋 (코드 생성/리팩토링 단계)
- 프로젝트 변경 이력 조회

체크리스트 기반 진행률은 사이드바의 각 단계 항목에 개별 % 값으로 표시된다.

**예시)**

```
01 요구사항 분석         100%
02 게임 기획              40%
03 게임 시스템 설계         0%
04 클래스 설계 (UML)       0%
```

---

## 14. Deliverables

최종적으로 다음 문서를 생성한다.

- 요구사항 명세서
- 게임 기획서
- 시스템 설계서

이 문서들은 프로젝트의 공식 개발 문서로 활용된다.

---

## 15. Success Criteria

다음 목표를 달성하면 프로젝트가 성공한 것으로 판단한다.

- 사용자의 아이디어를 요구사항으로 구체화한다.
- 요구사항 명세서를 자동 생성한다.
- 승인된 요구사항을 기반으로 게임 기획서와 시스템 설계서를 생성한다.
- GitHub Repository를 분석하여 기능 추가 설계를 제안한다.
- 설계 승인 후 Unity 코드를 생성한다.
- 생성된 코드에 대해 SOLID 및 DRY 기반 개선 사항을 제안한다.

---

## 16. Future Work

향후 다음 기능을 추가하는 것을 목표로 한다.

- UML 자동 생성 및 시각화
- Unity Scene 분석
- ScriptableObject 설계 자동화
- 프로젝트 품질 분석 리포트
- GitHub Pull Request 자동 생성
- 다양한 LLM Provider 지원
- Feature Expansion Workflow (11번) 정식 구현

---

## 17. 변경 이력 (Changelog)

| 버전 | 변경 내용 |
|---|---|
| v0 | 최초 기획서 작성 (10단계 워크플로우, QA Agent 포함) |
| v1 | 워크플로우에서 "테스트" 단계 제거, "리팩토링" → "리팩토링 및 코드 리뷰"로 확장 (9단계 체제로 전환), QA Agent 역할을 Refactoring Agent로 흡수 |
| v1 | Repository 연결에 "저장소 확인" 검증 게이트 도입 — 확인 전에는 Branch 선택 불가 |
| v1 | Agent 질문 방식을 객관식 선택지 → 자유 응답 채팅형으로 변경 |
| v1 | 코드 생성/리팩토링 단계의 승인 방식을 "커밋 1개"에서 "파일 단위 원자적 커밋 N개"로 변경, 커밋 리뷰(Diff) 화면 추가 |
| v1 | GitHub 연동 권한을 read(조회/분석)와 write(커밋)로 구분해 명시 |
| v2 | Repository 연결 방식을 URL 직접 입력 + PAT에서 **GitHub OAuth 로그인**으로 전환 — 로그인 후 저장소/Branch를 드롭다운으로 선택 (권한 범위가 넓어지는 트레이드오프를 감수하고 사용자 경험 우선) |
