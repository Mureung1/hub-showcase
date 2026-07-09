# 🎮 AI-Powered Game Planning & Project Management Multi-Agent Platform

> **AI 기반 게임 기획 · 프로젝트 관리 · 지식 관리 · 개발 자동화를 위한 범용 멀티 에이전트 플랫폼**
>
> 본 프로젝트는 특정 게임이나 장르에 종속되지 않는 범용 플랫폼으로, 게임 기획부터 프로젝트 관리, 문서 관리, 개발 자동화까지 하나의 AI 플랫폼에서 수행하는 것을 목표로 합니다.

## Project Vision

게임 개발 과정에서는 기획 문서, 회의록, 아이디어, 설정 변경, 일정, 개발 데이터가 지속적으로 생성되고 변경됩니다.

이 플랫폼은 흩어진 프로젝트 정보를 하나의 AI 기반 작업 공간에서 관리하여 다음 협업 환경을 만드는 것을 목표로 합니다.

- 기획자는 아이디어와 설계에 집중합니다.
- PM은 승인, 일정, 리스크 관리에 집중합니다.
- AI는 검색, 분석, 추천, 문서 초안, 자동화 요청을 담당합니다.

최종 목표는 기획서를 작성해주는 AI가 아니라, 게임 개발 프로젝트 전체를 이해하고 함께 운영하는 **AI Project Partner**입니다.

## Core Principle

### Human in the Loop

AI는 프로젝트를 직접 수정하지 않습니다.

AI는 분석, 추천, 문서 초안, 변경 제안, 자동화 요청을 수행하지만 모든 실제 변경은 반드시 사용자의 승인 이후에만 반영됩니다.

## Core Features

### Feature Tree

```text
AI Game Project Operating System
├── 1. Intelligent Knowledge Management
│   ├── Input Sources
│   ├── Input Intent Classification
│   │   ├── Temporary Idea
│   │   ├── Setting Change Request
│   │   ├── Question / Search
│   │   └── Workspace Recovery
│   ├── Temporary Idea Management
│   ├── Version History
│   ├── Decision Log
│   └── Project Search
├── 2. AI Planning Assistant
│   ├── Plan Mode
│   ├── AI Document Generation & Updating
│   ├── Intelligent Document Completion
│   ├── Conflict Analysis
│   ├── Confidence Report
│   ├── Impact Analysis
│   ├── AI Recommendation
│   └── AI Questioning
├── 3. Resource Management
│   ├── Resource Extraction
│   └── Automatic Task Generation
├── 4. Project Management
│   ├── Schedule & Risk Analysis
│   ├── Friendly Reminder
│   ├── Workspace Recovery
│   └── Task Workspace
├── 5. Approval System
│   ├── Approval Queue
│   ├── AI Action Preview
│   └── Diff Viewer
├── 6. Automation
│   ├── Live Data Sync
│   └── Unity In-Editor Bug Report
├── 7. Multi Project Support
│   ├── Multi Project Management
│   └── RuleSet
└── 8. Dashboard
    ├── AI PM Dashboard
    └── AI Control Tower
```

### Feature Summary

1. **Intelligent Knowledge Management**  
   다양한 입력을 프로젝트 지식으로 관리하고, Temporary Idea, Version History, Decision Log, Source 기반 검색을 제공합니다.

2. **AI Planning Assistant**  
   설정 변경과 신규 기획 요청을 Plan Mode에서 분석하고, 충돌 분석, 영향도 분석, 추천안, 문서 초안을 생성합니다.

3. **Resource Management**  
   회의록과 시나리오에서 NPC, Dialogue, Item, Quest, UI, Effect, Sound, Cutscene 등 리소스와 태스크 후보를 추출합니다.

4. **Project Management**  
   일정 지연, 병목, 리스크를 분석하고, Friendly Reminder와 Workspace Recovery를 통해 작업 흐름을 이어갑니다.

5. **Approval System**  
   AI가 생성한 모든 변경안을 Approval Queue에 등록하고, Action Preview와 Diff Viewer를 통해 승인 전 검토를 지원합니다.

6. **Automation**  
   승인된 변경 사항을 내부 문서, Notion, GitHub, Unity 등에 반영하고 Unity 버그 리포트 자동화를 지원합니다.

7. **Multi Project Support**  
   여러 프로젝트의 문서, 설정, 아이디어, Decision Log, Version History를 `Project_ID` 기준으로 독립 관리합니다.

8. **Dashboard**  
   AI PM Dashboard와 AI Control Tower에서 진행률, 리스크, 승인 대기, 변경 이력, AI 분석 결과를 통합 확인합니다.

## Documentation

- [Product Plan](docs/plan.md): 문제 정의, 목표 사용자, 사용자 시나리오, 핵심 기능, 화면 흐름, 예시 UI
- [Development Checklist](docs/checklist.md): 기능별 개발 실행 체크리스트
- [Architecture](docs/architecture.md): 시스템 아키텍처 문서, 작성 예정
- [2026-07-08 Development Log](docs/dev-log/2026-07-08.md): 승인 기반 AI 문서 생성/수정 파이프라인의 일별 개발 기록과 흐름도

## Current Status

- README 요약형 진입 문서 정리
- 제품 기획서 작성 완료
- 기능별 개발 체크리스트 작성 완료
- 예시 UI mockup 추가 완료
- 시스템 아키텍처 문서 작성 예정
- 승인 기반 문서 생성/수정 MVP 구현 시작
- 일별 개발 일지 구조 시작

## MVP Usage

기본 `rule` 에이전트는 외부 의존성 없이 Python 표준 라이브러리만 사용합니다. OpenAI 기반 `prompt` 에이전트는 `requirements.txt` 설치가 필요합니다.

```bash
python3 -m gamepm_agent.cli --store .gamepm project-create demo "Demo Project"
python3 -m gamepm_agent.cli --store .gamepm submit demo "새 NPC 문서로 만들어줘. 이름은 Rina이고 역할은 guide다."
python3 -m gamepm_agent.cli --store .gamepm proposals demo
python3 -m gamepm_agent.cli --store .gamepm decide demo <proposal_id> approved --user pm --reason "승인"
python3 -m gamepm_agent.cli --store .gamepm apply demo <proposal_id>
```

핵심 정책은 다음과 같습니다.

- 승인 전 변경안은 `Approval Queue`에만 저장되고 실제 문서는 수정되지 않습니다.
- 승인 후 저장 직전에 원본 문서 버전을 다시 확인합니다.
- 원본 문서가 바뀌었으면 저장하지 않고 `needs_reconfirmation` 상태로 돌립니다.
- 저장 성공 시 `Version History`와 `Decision Log`를 남깁니다.

에이전트 판단 레이어는 교체 가능하게 분리되어 있습니다.

- `--agent rule`: 기본값이며, 키워드/템플릿 기반으로 동작합니다.
- `--agent prompt`: 프롬프트 기반 엔진 경로를 사용합니다.

OpenAI API를 사용하는 prompt-agent 실행 예시는 다음과 같습니다. API key는 코드에 하드코딩하지 않고 환경 변수로만 설정합니다.

```bash
python3 -m pip install -r requirements.txt
export OPENAI_API_KEY="your_api_key_here"
python3 -m gamepm_agent.cli --store .gamepm --agent prompt --llm openai --model gpt-4o-mini submit demo "새 NPC 문서로 만들어줘. 이름은 Rina이고 역할은 guide다."
```

## Future Goal

최종 목표는 게임 개발 프로젝트 전체를 이해하고 다음 영역을 하나의 플랫폼에서 수행하는 **AI Game Project Operating System**을 구축하는 것입니다.

- 기획
- 문서 관리
- 프로젝트 관리
- 일정 관리
- 의사결정 관리
- 개발 자동화
