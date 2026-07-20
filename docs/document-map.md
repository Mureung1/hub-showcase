# PtoP 문서 구조

## 목적

AGENTS.md가 매 작업마다 불필요하게 긴 맥락을 포함하지 않도록, 문서를 목적별로 나눠 관리한다.  
Agent가 항상 읽어야 하는 내용은 AGENTS.md에 최소한으로 남기고, 상세 맥락은 필요한 문서만 선택해 참고한다.

## 문서 분류

| 분류 | 문서 | 목적 |
| --- | --- | --- |
| Agent 기본 지침 | `AGENTS.md` | 매 작업에서 지켜야 할 최소 규칙 |
| 기록용 | `docs/records/agent-record.md` | 프로젝트 배경, 문제 정의, 기술 선택 이유처럼 자주 바뀌지 않는 기록 |
| 기획용 | `docs/plans/plan.md` | 문제 정의, 사용자 시나리오, 핵심 기능, 화면 흐름 |
| 개발용 | `docs/development/development-guide.md` | 기술 스택, 모노레포 계획, NestJS 선택 이유, 코드/커밋 기준 |
| 데이터 설계 | `docs/development/supabase-data-model.md` | Repository 분석 결과를 저장할 Supabase 테이블, 관계, 중복 처리 기준 |
| 구조 설계 | `docs/superpowers/specs/2026-07-15-nest-monorepo-design.md` | React·Nest·공통 계약 패키지와 Supabase 저장 구조 설계 |
| 구현 계획 | `docs/superpowers/plans/2026-07-15-nest-monorepo-implementation.md` | 모노레포 전환 작업 순서와 검증 기준 |
| 전체 개발 일정 | `docs/plans/development-tasks.md` | 2주차 이후 개발 Task와 4주 백로그 |
| 주간 계획 | `docs/plans/week2-plan.md` | 2주차 요일별 계획과 GitHub Issue 등록 목록 |
| 계획 Agent | `docs/agents/week-planning-agent.md` | 요구사항을 주간 작업과 Issue 후보로 쪼개는 Agent 문서 |
| 기능 검증 Agent | `docs/agents/feature-verification-agent.md` | 수직 슬라이스가 요구사항대로 동작하는지 점검하는 Agent 문서 |
| Agent 학습 | `docs/agents/agent-rules-study.md` | AGENTS.md 간소화와 Skill 문서화 기준 학습 기록 |
| 디자인용 | `docs/design/design-system.md` | 색상, 레이아웃, 상태 화면, 마스코트 사용 기준 |
| 디자인 Skill | `docs/design/ptop-design-skill.md` | 화면 제작 시 반복 적용할 디자인 판단 기준 |
| 학습용 | `docs/research/repo-analysis-study.md` | Git Repository 분석 방법 학습 기록 |
| AI 분석 전략 | `docs/research/issue14-ai-analysis-strategy.md` | 기술적 도전 후보의 입력 컨텍스트, prompt, RAG 도입 기준 |
| 사용자 조사 | `docs/research/ptop-survey-google-form.gs` | PtoP 사용자 설문 Google Form 생성 스크립트 |
| 테스트용 | `docs/testing/test-cases.md` | 입력, 분석, 결과, 오류 케이스 |
| 템플릿 | `docs/templates/pr-template.md` | AI Agent Challenge PR 작성 템플릿 |
| 제출/Wiki용 | `docs/wiki/wiki-home.md` | GitHub Wiki에 반영할 요약 문서 |
| 기획 가이드 | `docs/guides/planning-tip.md` | 루카스 기획 수업 요구사항 정리 |

## 관리 원칙

- AGENTS.md에는 장기 기록, 회고, 상세 설계 내용을 길게 넣지 않는다.
- Agent 관련 반복 절차와 학습 기록은 `docs/agents/` 아래에 둔다.
- 디자인 관련 판단은 `design-system.md`와 `ptop-design-skill.md`에서 관리한다.
- 개발 구조와 컨벤션은 `development-guide.md`에서 관리한다.
- 프로젝트 방향성, 선택 이유, 회고성 기록은 `agent-record.md`에 남긴다.
- 새 문서를 추가하면 README와 이 문서의 목록을 함께 갱신한다.
