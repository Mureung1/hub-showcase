# PtoP(Project to Portfolio)

PtoP는 GitHub Repository를 분석해 대학생 개발자가 프로젝트 경험을 다시 복기하고, 포트폴리오와 회고로 확장할 수 있는 작업 단서를 정리해주는 서비스입니다.

## 문제 정의

프로젝트 경험을 쌓는 대학생 개발자는 프로젝트가 끝난 뒤 시간이 지나면 자신이 맡은 역할, 기여도, 핵심 구현 내용, 문제 해결 과정을 정확히 기억하고 정리하기 어렵습니다.

## 서비스 목표

PtoP는 Repository의 객관적인 작업 근거와 사용자의 짧은 회고를 결합해, 사용자가 “내가 어떤 문제를 해결했고 왜 그렇게 판단했는지” 설명할 수 있는 단서를 제공하는 것을 목표로 합니다.

현재 MVP는 다음 흐름을 탄탄하게 만드는 데 집중합니다.

- GitHub OAuth 로그인
- Repository URL과 사용자 GitHub ID 기반 분석
- Repository 근거와 AI 해석을 구분한 기술적 도전 후보
- 분석 중 Poppy와 진행하는 최소 입력 회고
- Supabase에 저장한 회고를 분석 결과에 반영
- 분석 기록을 컴퓨터로 표현하는 2D 작업실

## 핵심 기능

### 1. Repository 분석 기능

GitHub Repository URL을 입력하면 URL을 검증하고, 이후 Nest API가 Repository 기본 정보, 참여자, commit 수, 최근 commit message를 분석할 수 있도록 요청 형태를 구성합니다.

### 2. 최소 입력 회고와 결과 보완

분석 중 Poppy가 한 번에 하나의 짧은 질문을 제시하고, 저장된 답변을 Repository 근거와 함께 결과에 반영합니다. Repository owner나 팀 전체 작업을 사용자 본인의 경험으로 단정하지 않습니다.

## 화면 흐름

```mermaid
flowchart TD
    A[랜딩 페이지] --> B{GitHub 로그인}
    B -->|성공| C[2D 작업실]
    C --> D[새 분석 컴퓨터 상호작용]
    D --> E[Repository 입력 모달]
    E --> F[Repository 분석 + Poppy 회고]
    F --> G{분석 완료}
    G -->|회고 작성 중| F
    G -->|사용자가 결과 확인| H[통합 분석 결과]
    H --> I[작업실 복귀]
    I --> J[Repository 컴퓨터 추가]
```

## 실행 방법

프로젝트는 npm workspaces 기반 모노레포로 구성되어 있습니다.

```text
apps/web             React + Vite 프론트엔드
apps/api             Nest API
packages/contracts   웹과 API가 공유하는 분석 타입
```

의존성을 설치합니다.

```bash
npm install
```

두 개의 터미널에서 웹과 API를 각각 실행합니다.

```bash
npm run dev:web
```

```bash
npm run dev:api
```

실행 주소:

```text
Web:    http://localhost:5173/hub/
Health: http://localhost:3000/api/v1/health
```

전체 workspace를 검증합니다.

```bash
npm test
npm run typecheck
npm run build
```

## 프로토타입 확인

React 메인 페이지와 동일한 흐름을 HTML/CSS/Vanilla JavaScript로도 확인할 수 있습니다.

- [HTML/CSS 프로토타입](./prototype/index.html)

정적 파일로 확인하려면 프로젝트 루트에서 간단한 서버를 실행합니다.

```bash
python3 -m http.server 4177
```

브라우저에서 아래 주소로 접속합니다.

```text
http://127.0.0.1:4177/prototype/index.html
```

## 문서

- [GitHub Wiki](https://github.com/SubJeeLee/hub/wiki)
- [문서 구조](./docs/document-map.md)
- [PtoP 기획서](./docs/plans/plan.md)
- [Wiki용 기획서](./docs/wiki/wiki-home.md)
- [프로젝트 기록](./docs/records/agent-record.md)
- [개발 가이드](./docs/development/development-guide.md)
- [Supabase 데이터 모델 설계](./docs/development/supabase-data-model.md)
- [Day4 작업 계획](./docs/plans/day4-plan.md)
- [전체 개발 일정 및 백로그 계획](./docs/plans/development-tasks.md)
- [최소 입력 회고 흐름 설계](./docs/plans/reflection-flow.md)
- [Week2 주간 계획](./docs/plans/week2-plan.md)
- [Week Planning Agent](./docs/agents/week-planning-agent.md)
- [Feature Verification Agent](./docs/agents/feature-verification-agent.md)
- [Agent RULES 학습 노트](./docs/agents/agent-rules-study.md)
- [PtoP 디자인 시스템](./docs/design/design-system.md)
- [PtoP 디자인 Skill](./docs/design/ptop-design-skill.md)
- [게임형 작업실 설계](./docs/design/game-workspace-design.md)
- [게임 에셋 라이선스 기록](./docs/research/game-asset-license.md)
- [1주차 작업 체크리스트](./docs/plans/checklist.md)
- [Git Repository 분석 학습 노트](./docs/research/repo-analysis-study.md)
- [OpenAI 모델 비교 테스트 계획](./docs/research/openai-model-evaluation-plan.md)
- [OpenAI 모델 비교 결과](./docs/research/model-evaluation-results.md)
- [PtoP 설문 생성 스크립트](./docs/research/ptop-survey-google-form.gs)
- [PtoP 테스트 케이스](./docs/testing/test-cases.md)
- [기획하기 with AI 가이드](./docs/guides/planning-tip.md)
- [PR 작성 템플릿](./docs/templates/pr-template.md)
- [Nest 모노레포 전환 설계](./docs/superpowers/specs/2026-07-15-nest-monorepo-design.md)
- [Nest 모노레포 구현 계획](./docs/superpowers/plans/2026-07-15-nest-monorepo-implementation.md)
- [게임형 작업실 기술 스파이크 구현 계획](./docs/superpowers/plans/2026-07-23-game-workspace-spike-implementation.md)

## 기술 스택

- React
- Vite
- Phaser
- Tiled
- NestJS
- npm workspaces
- TypeScript
- HTML
- CSS
- Vanilla JavaScript
- GitHub REST API
- Supabase

## 현재 MVP에서 제외한 것

- 프로젝트 폴더 업로드
- 멀티플레이와 실시간 위치 동기화
- 캐릭터 생성과 커스터마이징
- 사용자가 직접 가구를 배치하는 맵 편집
- Repository 전체 코드를 무제한으로 AI에 전송하는 분석
- 자동으로 완성본이라 단정하는 최종 포트폴리오 생성
- Notion, GitHub Pages 내보내기
- 여러 프로젝트 비교
