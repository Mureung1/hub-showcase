<div align="center">

# AI 시대 사고력 서비스 "깸"

### 🔔내 생각을 깨우자

관심 있는 글을 읽는 짧은 순간에 질문·반박·연결·표현을 더해,<br/>
AI 시대에 잃기 쉬운 비판적 사고 습관을 되찾는 서비스

[![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.139.0-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.4-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![MVP](https://img.shields.io/badge/status-MVP%20in%20progress-yellow)]()

</div>

---

## 목차

- [왜 만들었나](#왜-만들었나)
- [어떻게 다른가](#어떻게-다른가)
- [매일 반복되는 루프](#매일-반복되는-루프)
- [네 가지 사고 행동](#네-가지-사고-행동)
- [설계 인사이트](#설계-인사이트)
- [MVP 범위](#mvp-범위)
- [프로젝트 구조](#프로젝트-구조)
- [개발 환경 설정](#개발-환경-설정)
- [개발 문서](#개발-문서)
- [더 알아보기](#더-알아보기)

---

## 왜 만들었나

생성형 AI는 과제, 검색, 요약, 글쓰기에서 이미 일상 도구가 됐지만, 여러 연구는 AI 사용이 늘수록 비판적 사고와 인지적 노력이 줄어든다고 지적한다. 카네기멜론대·MS 공동 연구에서는 실사용 사례의 약 72%가 AI 사용 시 인지적 노력이 감소했다고 답했고, AI에 대한 신뢰가 높을수록 비판적 사고 감소 폭도 컸다.

> 문제는 AI를 쓰는 것 자체가 아니라, AI를 **정답 기계**로 사용하는 태도다.

읽고 판단하기보다 결과만 빠르게 소비하면서, 사고가 직접 수행에서 수동적 수용으로 옮겨가고 있다. **깸**은 이 흐름 속에서도 스스로 읽고, 질문하고, 반박하고, 표현하는 습관을 지키기 위한 서비스다.

## 어떻게 다른가

| | 초점 | 결과 |
|---|---|---|
| 일반 뉴스·콘텐츠 앱 | 많이 읽게 하는 것 | 생각 없이 계속 스크롤 |
| 일반 AI 챗봇 | 빨리 답을 주는 것 | 읽기·질문·반박 과정 생략 |
| **깸** | 읽은 뒤 짧은 사고 행동을 남기는 것 | 반드시 한 번은 생각을 남김 |

AI 요약은 제공하지 않는다. 요약만 보고 원문을 안 읽는 문제를 재생산하지 않기 위해서고, 질문·반박 미션이 성립하려면 저자의 논증 과정 자체가 남아 있어야 하기 때문이다.

## 매일 반복되는 루프

```text
오늘의 글 → 오늘의 미션 → 한 줄 사고 기록 → 사고 log
   ↑                                              │
   └──────────────────────────────────────────────┘
```

1. **오늘의 글** — 관심사 맞춤 글 1~3개
2. **오늘의 미션** — 질문·반박·연결·표현 중 하나
3. **한 줄 사고 기록** — 짧은 문장으로 남기기
4. **사고 log** — 쌓인 생각을 다시 보기

읽으며 인상 깊은 문장을 하이라이트하면, 그 문장을 기준으로 사고 미션이 하나 제시된다. 길고 완벽한 글이 아니라, 내 생각을 한 번이라도 밖으로 꺼내 남기는 것이 목표다.

## 네 가지 사고 행동

| 행동 | 질문 예시 |
|---|---|
| 🟡 질문 | 이 글의 핵심 주장은 뭐지? |
| 🔴 반박 | 이 주장에 반대한다면? |
| 🟢 연결 | 내 상황이나 프로젝트와 연결해보면? |
| 🔵 표현 | 이 글이 놓친 관점은 뭐지? |

## 설계 인사이트

- **태도의 문제** — AI를 쓰는 것보다 과의존하는 태도가 비판적 사고를 낮춘다.
- **공부로 만들면 안 온다** — 거창한 학습이 아니라 짧고 반복되는 마이크로 루틴이 현실적인 습관이 된다.
- **관심사 위에서 작동해야 한다** — 관심 있는 주제를 읽을 때 "진짜인가?", "내 상황에 맞나?" 같은 질문이 자연스럽게 떠오른다.
- **남겨야 진짜 훈련이다** — 읽은 뒤 한 번 남기는 루틴이 정보를 검증하고 통합하는 능력을 훈련시킨다.

## MVP 범위

| 우선순위 | 기능 |
|---|---|
| `P0` | 관심사 설정 |
| `P0` | 오늘의 깸 (사고 미션 + 한 줄 사고 기록) |
| `P1` | 오늘의 글 추천 |
| `P1` | 나의 깸 (사고 로그 아카이브) |

## 프로젝트 구조

```text
hub-clone/
├── frontend/          # React 19 + TypeScript + Vite
│   ├── src/
│   ├── index.html
│   └── vite.config.ts
├── backend/           # FastAPI + uv
│   ├── app/
│   │   ├── api/routes/
│   │   └── main.py
│   └── pyproject.toml
└── docs/
    ├── plan/          # 기획·설계 문서
    ├── prototype/     # HTML 프로토타입
    └── notes/         # 작업 메모
```

## 개발 환경 설정

**요구 사항** — Node.js 22 이상, [uv](https://docs.astral.sh/uv/), Python 3.13

**프론트엔드**

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

**백엔드**

```bash
cd backend
uv sync
uv run fastapi dev app/main.py   # http://localhost:8000
```

개발 서버는 두 개를 동시에 띄운다. 프론트엔드의 `/api` 요청은 Vite 프록시를 통해 백엔드(`localhost:8000`)로 전달되므로, 프론트엔드에서는 `/api/...` 경로만 호출하면 된다.

## 개발 문서

- [MVP 개발 태스크 관리](https://thorn-nation-e97.notion.site/Task-399a6f69fbb38067845ec8fb00791de8?source=copy_link)
- [하네스 엔지니어링 환경 구축 태스크 관리](https://thorn-nation-e97.notion.site/Task-399a6f69fbb3807ba71aef5bf6baa2d6?source=copy_link)

## 더 알아보기

1. [문제 정의 및 인사이트](docs/plan/product/problem-insight.md) — 문제 확인, 문제 정의, 인사이트, 가설 설정
2. [서비스 정의, 핵심 기능 개요, 우선순위 및 MVP](docs/plan/product/service-mvp.md) — 서비스 정의, 목표, 핵심 가치, 차별점, 핵심 기능 개요, MVP 및 우선순위
3. [핵심 기능 세부 정리](docs/plan/product/feature-details.md) — 오늘의 깸 처리 방식, 오늘의 글 추천 콘텐츠 수집/분류/품질관리, 나의 깸 재사고 유도 방식
4. [사용자 시나리오 및 화면 구조](docs/plan/product/scenario-ia.md) — 사용자 시나리오, 화면 흐름(IA)
5. [사용 기술](docs/plan/engineering/tech-stack.md) — 프론트엔드, 백엔드, 데이터베이스, 콘텐츠 수집

- 전체 기획 문서: [노션 기획 문서](https://thorn-nation-e97.notion.site/AI-397a6f69fbb38093a749fec41db4ceec?source=copy_link)
