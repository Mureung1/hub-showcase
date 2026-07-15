# SpendMate

기록하는 가계부가 아니라, 소비 습관을 바꿔주는 AI 코치입니다.
영수증을 찍으면 자취생 특화 카테고리로 분석하고, 현재 소비 속도로 생활비가 언제 바닥나는지 예측해 알려줍니다.

## 주요 기능
- 영수증 OCR 자동 인식 및 카테고리 분류
- 생활비 소진일 예측 + 월말 생존 모드
- AI 소비 코치 Agent: 소비 상황을 종합 판단해 레시피 추천 / 최저가 비교를 스스로 선택·실행

## 기술 스택
- **Backend**: Spring Boot (Java)
- **Frontend**: React
- **AI**: Claude API (Tool Use)
- **OCR**: 네이버 클로바 OCR
- **DB**: PostgreSQL

## 구조
모노레포로 `SpendMate/be`(백엔드), `SpendMate/fe`(프론트엔드) 두 프로젝트를 함께 관리한다.

## 문서
프로젝트 기획·설계 문서는 `docs` 폴더 및 위키에서 확인할 수 있다.

- **기획서** ([plan.md](./docs/plan.md)) — 문제 정의, 경쟁 서비스 분석, 핵심 사용자 시나리오, AI Agent 작동 구조, MVP 범위
- **개발 체크리스트** ([checklist.md](./docs/checklist.md)) — 4주 개발 작업을 주차별로 나눈 단위 체크리스트
- **개발 Task 백로그** ([Notion](https://www.notion.so/d51ee876a0778399965e8125be81487d?source=copy_link)) — 우선순위(P0/P1/P2)별 Task 목록과 주차별 진행 상태
- **2주차 계획** ([Notion](https://www.notion.so/2-39cee876a07780158747e107b24433ab?source=copy_link)) — 이번 주 목표, 하루 단위 작업 분해, 요일 배치
- **디자인 가이드** ([design.md](./docs/design.md)) — 프론트 프로토타입(React)에서 확정된 디자인 토큰·레이아웃·톤앤매너

화면 구성과 프로토타입은 작업 PR에서 확인할 수 있다.

## 커스텀 Agent
`.claude/agents/`에 이 저장소 전용 Claude Code 서브에이전트가 있다. 각각 역할이 겹치지 않게 나눠져 있다.

| Agent | 역할 | 언제 쓰나 |
|---|---|---|
| [feature-planner](./.claude/agents/feature-planner.md) | 기능/요구사항을 하루 단위 작업으로 쪼개고 우선순위(P0/P1/P2)·완료 기준을 표로 정리 | 새 기능 시작 전, 주간 계획 세울 때 |
| [progress-checker](./.claude/agents/progress-checker.md) | 지금까지 한 일(또는 지금 하는 일)이 `docs/plan.md`·`docs/checklist.md`와 실제로 맞는 방향인지 사후 점검 (체크리스트가 정직한지 코드까지 대조) | 기능 하나 끝낸 직후, 하루 마무리 |
| [code-reviewer](./.claude/agents/code-reviewer.md) | 커밋 전 diff를 짧게 훑어 버그·컨벤션 위반·보안 이슈를 Critical/Warning/Nit로 보고 | 커밋하기 전 |
| [code-analyzer](./.claude/agents/code-analyzer.md) | 코드/기능이 여러 파일에 걸쳐 어떻게, 왜 그렇게 동작하는지 설명 (학습용) | 낯선 코드 처음 볼 때, 흐름이 헷갈릴 때 |
| [env-guard](./.claude/agents/env-guard.md) | `.env`/API 키 등 시크릿이 git에 노출됐거나 노출될 위험이 있는지 점검 | 커밋/푸시 직전, 새 API 키 추가 직후 |