# 프로젝트 지식 지도

이 문서는 전자 매니저 키우기 프로젝트의 문서, 에셋, skill, 실제 적용 위치가 어떤 관계인지 설명하는 상위 지도다.

`docs/README.md`가 링크 허브라면, 이 문서는 문서들의 상하 관계와 파생 흐름을 설명한다.

## 한 줄 구조

```text
기획 원칙 -> 화면/기능 명세 -> 디자인 시스템 -> 에셋 프롬프트/실행 규칙 -> 프로토타입 적용
```

## 전체 계층

```text
README.md
└─ 프로젝트 소개 / 실행 방법 / 문서 허브 링크

AGENTS.md
└─ Codex 작업 규칙 / 금지사항 / 필수 확인 문서

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
│  └─ agent-design.md
├─ 실행 규칙 줄기
│  ├─ AGENTS.md
│  ├─ xp-desktop-pet-ui skill
│  └─ docs/codex-skills/xp-desktop-pet-ui/
├─ 운영·학습 줄기
│  ├─ four-week-roadmap.md
│  ├─ status.md
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

이 줄기는 “무엇을 만들 것인가”에서 “어떻게 동작해야 하는가”로 내려간다.

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

`asset-prompts`는 `design-system.md`에서 파생된 생성용 문서다. 생성된 이미지가 자동으로 적용되는 것은 아니며, 선별된 파일을 `public/assets`에 넣고 코드에서 경로를 연결해야 화면에 보인다.

## 3. Agent 줄기

```text
product-plan.md
  -> agent-design.md
  -> mvp-functional-spec.md
  -> 규칙 기반 퀘스트 생성/리밸런싱
  -> 추후 LLM Agent 확장
```

| 문서 | 역할 |
|---|---|
| `agent-design.md` | 목표 해석, 퀘스트 생성, 리밸런싱, 피드백 Agent의 역할 정의 |
| `mvp-functional-spec.md` | MVP에서 실제 구현해야 하는 규칙 기반 동작 범위 |
| `future-expansion-plan.md` | 개인 LLM, 음성 입력, 웹캠, 소셜 탐색 등 MVP 이후 확장 |

MVP에서는 실제 LLM API가 아니라 규칙 기반으로 Agent처럼 행동한다. LLM 연동은 확장 계획에 둔다.

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

중요한 점은 `xp-desktop-pet-ui skill`이 `asset-prompts`에서만 유래한 것이 아니라는 것이다. 이 skill은 `design-system.md`, `mvp-functional-spec.md`, `user-flow-wireframes.md`의 핵심 규칙과 `asset-prompts` 구조를 짧게 압축한 외부 실행 규칙이다.

로컬 skill은 Git PR에 자동 포함되지 않는다. 그래서 `docs/codex-skills/xp-desktop-pet-ui/`에 문서화 버전을 두어 다른 컴퓨터에서도 복사해 재사용할 수 있게 한다.

## 5. 운영·학습 줄기

```text
four-week-roadmap.md
  -> status.md
  -> learning/
```

| 문서 | 역할 |
|---|---|
| `tasks.md` | 우선순위가 표시된 전체 개발 Task 백로그 |
| `four-week-roadmap.md` | 7월 10일, 17일, 24일, 30일 기준 작업 분해 |
| `status.md` | 완료, 검증, 다음 작업, 차단 요소만 기록 |
| `learning/` | ChatGPT 프로젝트에 넣고 공부할 키워드와 참고 코드 위치 |

이 줄기는 “작업을 어떻게 이어갈 것인가”와 “무엇을 공부해야 하는가”를 담당한다.

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

어느 줄기에도 속하지 않으면 새 문서를 만들기보다 기존 문서에 합치는 것을 우선 검토한다.

## 발표용 요약

- `README.md`: 프로젝트 입구
- `docs/README.md`: 문서 링크 허브
- `project-knowledge-map.md`: 문서 관계 지도
- `design-system.md`: 시각 규칙의 원천
- `asset-prompts/`: 에셋 생성 지시서
- `public/assets/`: 실제 적용 에셋
- `AGENTS.md`: Codex 작업 규칙
- `xp-desktop-pet-ui skill`: Codex 반복 작업을 위한 외부 실행 규칙



