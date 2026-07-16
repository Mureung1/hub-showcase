# 프로젝트 지식 지도

이 문서는 전자 매니저 키우기 프로젝트의 문서, 에셋, skill, 실제 적용 위치가 어떤 관계인지 설명하는 상위 지도다.

`docs/README.md`가 링크 허브라면, 이 문서는 문서들의 상하 관계와 파생 흐름을 설명한다.

## 한 줄 구조

```text
기획 원칙 -> 화면/기능 명세 -> 디자인 시스템 -> 에셋 프롬프트/실행 규칙 -> 프로토타입 적용 -> 계획/검증/백로그 운영
```

## 전체 계층

```text
README.md
└─ 프로젝트 소개 / 실행 방법 / 문서 허브 링크

AGENTS.md
└─ Codex 작업 규칙 / 금지사항 / 필수 확인 문서

.codex/
└─ Codex 서브에이전트 역할 설정 / 보수적 병렬 실행 제한

.agents/
└─ 프로젝트 workflow skill / 요청 분석, 계획, 실행, 검증, Wiki 작업

docs/README.md
└─ 문서 목록 / 각 문서 한 줄 역할 / Wiki 연결

docs/project-knowledge-map.md
├─ 기획 줄기
│  ├─ product-plan.md
│  ├─ user-flow-wireframes.md
│  └─ mvp-functional-spec.md
├─ 디자인·에셋 줄기
│  ├─ design-references/
│  ├─ design-system.md
│  ├─ asset-prompts/
│  └─ public/assets
├─ Agent 줄기
│  ├─ agent-design.md
│  ├─ planning-agent.md
│  ├─ verification-agent.md
│  ├─ document-management-agent.md
│  ├─ project-learning-agent skill
│  └─ agent-usage-guide.md
├─ 실행 규칙 줄기
│  ├─ AGENTS.md
│  ├─ xp-desktop-pet-ui skill
│  └─ docs/codex-skills/xp-desktop-pet-ui/
├─ 운영·학습 줄기
│  ├─ master-plan.md
│  ├─ four-week-roadmap.md
│  ├─ weekly-plan-2026-07-13.md
│  ├─ today-plan-2026-07-13.md
│  ├─ tasks.md
│  ├─ dynamic-asset-requirements.md
│  ├─ api-contracts.md
│  ├─ db-schema.md
│  ├─ environment-setup.md
│  ├─ supabase-setup.md
│  ├─ github-project-guide.md
│  ├─ status.md
│  ├─ plans/
│  ├─ wiki/
│  └─ learning/
└─ 보관 줄기
   └─ archive/
```

## 1. 기획 줄기

```text
product-plan.md
  -> user-flow-wireframes.md
  -> mvp-functional-spec.md
  -> React MVP / prototype-static.html
```

| 문서 | 역할 |
|---|---|
| `product-plan.md` | 문제 정의, 사용자 시나리오, MVP 범위, 핵심 기획 결정 |
| `user-flow-wireframes.md` | Profile Setup Wizard부터 QuestRunner.exe, 완료/실패/복구까지의 화면 흐름 |
| `mvp-functional-spec.md` | 구현자가 따라야 할 MVP 동작 계약과 Acceptance Criteria |

## 2. 디자인·에셋 줄기

```text
design-references/concept.png
  -> design-system.md
  -> asset-prompts/
  -> 생성·선별된 이미지
  -> public/assets/
  -> React MVP / prototype-static.html
```

| 위치 | 역할 |
|---|---|
| `design-references/` | 참고 이미지, 후보 이미지, 분해용 이미지 보관 |
| `design-system.md` | 색, 폰트, 여백, 창, 버튼, 작업표시줄, 매니저 창의 기준 규칙 |
| `asset-prompts/` | 디자인 시스템을 바탕으로 새 에셋을 생성하기 위한 상세 프롬프트 |
| `public/assets/` | 실제 브라우저가 불러오는 적용 에셋 위치 |

## 3. Agent 줄기

```text
product-plan.md
  -> agent-design.md
  -> planning-agent.md / verification-agent.md
  -> mvp-functional-spec.md
  -> 규칙 기반 퀘스트 생성/리밸런싱
  -> 추후 LLM Agent 확장
```

| 문서 | 역할 |
|---|---|
| `agent-design.md` | 목표 해석, 퀘스트 생성, 리밸런싱, 피드백 Agent의 역할 정의 |
| `planning-agent.md` | 요구사항을 Task와 일정으로 쪼개는 문서형 Agent |
| `verification-agent.md` | 구현 결과를 시나리오와 데이터 흐름으로 점검하는 문서형 Agent |
| `project-learning-agent skill` | 구현 중 생긴 학습 키워드, 참고 코드, ChatGPT 질문 예시를 짧게 정리 |
| `future-expansion-plan.md` | 개인 LLM, 음성 입력, 웹캠, 소셜 탐색 등 MVP 이후 확장 |

## 4. 실행 규칙 줄기

```text
design-system.md + mvp-functional-spec.md + user-flow-wireframes.md + asset-prompts 요약
  -> xp-desktop-pet-ui skill
```

| 항목 | 역할 |
|---|---|
| `AGENTS.md` | 저장소 안에서 Codex가 따라야 할 작업 규칙 |
| `xp-desktop-pet-ui skill` | Codex 개인 환경에 있는 XP 전자펫 UI 전용 실행 규칙 |
| `docs/codex-skills/xp-desktop-pet-ui/` | 다른 환경에서도 skill을 재사용할 수 있도록 보관한 repo 문서화 버전 |

## 5. 운영·학습 줄기

```text
master-plan.md
  -> four-week-roadmap.md
  -> weekly-plan-2026-07-13.md
  -> today-plan-2026-07-13.md
  -> tasks.md
  -> github-project-guide.md
  -> status.md
  -> learning/
```

| 문서 | 역할 |
|---|---|
| `master-plan.md` | 7월 30일까지의 최종 목표, 기술 구조, 확장 반영 방식 |
| `four-week-roadmap.md` | 주차별 일정표 |
| `weekly-plan-2026-07-13.md` | 2주차 요일별 계획 |
| `today-plan-2026-07-13.md` | 오늘의 작업 순서와 완료 기준 |
| `tasks.md` | 우선순위가 표시된 전체 개발 Task 백로그 |
| `dynamic-asset-requirements.md` | 승격된 확장 기능의 동적 에셋, manifest, 구현 연결 요구사항 |
| `api-contracts.md` | Hono Quest Event API 요청/응답 계약 |
| `db-schema.md` | Supabase `quest_logs` 테이블과 확장 필드 설계 |
| `environment-setup.md` | 로컬 Vite/Hono/Supabase 실행과 secret 관리 |
| `supabase-setup.md` | Supabase 실제 테이블 생성과 검증 절차 |
| `github-project-guide.md` | GitHub Issues/Projects 보드, 필드, 우선순위 표시 방식 |
| `status.md` | 완료, 검증, 다음 작업, 차단 요소만 기록 |
| `plans/` | 승인된 활성 계획과 완료된 계획을 보관 |
| `wiki/` | 원본 자료와 생성 지식을 구분하는 프로젝트 Wiki |
| `learning/` | ChatGPT 프로젝트에 넣고 공부할 키워드와 참고 코드 위치 |

## 6. 보관 줄기

```text
archive/
└─ 현재 프로젝트와 분리된 이전 아이디어, 원본 초안, 백업 문서
```

`archive/`는 현재 MVP의 기준 문서가 아니다. 발표나 회고에서 아이디어 변천 과정을 보여줄 때만 참고한다.

## 관리되지 않는 문서 점검 기준

새 문서를 추가할 때는 아래 중 하나에 반드시 속해야 한다.

- 기획 줄기
- 디자인·에셋 줄기
- Agent 줄기
- 실행 규칙 줄기
- 운영·학습 줄기
- 보관 줄기

`docs/notion-dashboard-guide.md`는 오래된 문서이므로 현재 공식 작업 흐름에는 포함하지 않는다.

어느 줄기에도 속하지 않으면 새 문서를 만들기보다 기존 문서에 합치는 것을 우선 검토한다.
