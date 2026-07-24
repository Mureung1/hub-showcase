# CareerSignal

CareerSignal은 여러 채용공고의 반복 요구를 통계로 정리하고, 직무 기준선과 기업군·개별 공고의 편차를 해석해 취업 준비 전략으로 연결하는 대학생 진로탐색 리서치 에이전트입니다.

사용자는 `통계 분석 → 채용공고 해석 → 합격 전략 → 준비 로드맵` 순서로 요구 수준과 근거를 확인하고, 체크리스트의 미보유 항목을 채우는 프로젝트·학습 순서를 받습니다. 일반 화면은 미리 생성·검증한 분석 결과를 조회하며, 에이전트는 데이터 갱신과 사용자 공고 직접 입력 때 실행합니다.

## 데모

- [정적 프로토타입](https://careersignal-prototype.vercel.app/)
- 프로토타입은 백엔드 신입·주니어 공고 30건을 가정한 mock 리서치이며 실제 수집·분석 결과가 아닙니다.

## 핵심 구조

- 화면: 직무 선택, 통계 분석, 채용공고 해석, 합격 전략, 준비 로드맵
- 분석 범위: 직무 전체, 기업군, 개별 공고
- 실행 방식: 데이터 갱신 시 여섯 에이전트가 분석 결과를 생성·검증해 Supabase에 저장
- 일반 조회: React가 Express를 통해 활성 분석 버전을 조회
- 체크 상태: 준비 현황과 프로젝트 로드맵·학습 전략만 규칙으로 재조합
- 검색 구조: 키워드·벡터 검색과 지식 그래프를 결합한 Hybrid RAG·GraphRAG

발표용 전체 구조와 흐름은 [아키텍처](docs/architecture.md), 에이전트별 입출력과 내부 단계는 [에이전트 설계](docs/agent-design.md)에서 확인할 수 있습니다.

## 프로젝트 구조

```text
hub/
  prototype/       HTML/CSS 정적 프로토타입
  project-intro/   프로젝트 소개용 독립 React 앱
  product/         실제 서비스 React 앱
  server/          product 전용 Express API
  agent/           FastAPI·LangGraph 에이전트 서비스
  docs/            기획·아키텍처·데이터·에이전트·디자인 문서
  showcase/        챌린지 쇼케이스 메타데이터
```

각 디렉터리는 독립 실행 환경이며 코드와 `node_modules`를 공유하지 않습니다.

## 기술 스택

- Frontend: React, Vite
- Backend: Express
- Agent: Python, FastAPI, LangChain, LangGraph
- Database: Supabase Postgres, pgvector
- LLM: OpenAI API(생성·임베딩·웹 검색), 공개 영상 보강용 Gemini API, 평가 교차검증용 NVIDIA Build API

## 로컬 실행

PowerShell에서는 실행 정책 충돌을 피하기 위해 `npm.cmd`를 사용합니다.

### 실제 제품 화면

```powershell
cd product
npm install
npm.cmd run dev
```

Vite 개발 서버는 `/api` 요청을 `http://localhost:4000`의 Express로 전달합니다.

### Express 서버

`server/.env`에 Supabase와 에이전트 주소를 설정합니다.

```powershell
cd server
npm install
npm.cmd start
```

### FastAPI 에이전트 서비스

```powershell
cd agent
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

`server/`나 `agent/` 코드를 변경하면 해당 프로세스를 재시작합니다.

## 검증

```powershell
cd product
npm.cmd run lint
npm.cmd run build
```

Express의 통계 집계 규칙은 vitest로 검증합니다.

```powershell
cd server
npm.cmd test
```

Express의 통계 집계는 `server/data/backend-postings.sample.json`을 Supabase에 적재한 뒤 `/api/stats?job=backend`에서 확인합니다.

## 문서

- [기획서](docs/plan.md): 문제·사용자·핵심 기능·화면 흐름
- [아키텍처](docs/architecture.md): 전체 구조·데이터 갱신·런타임·버전
- [에이전트 설계](docs/agent-design.md): 여섯 에이전트의 입출력·도구·내부 흐름
- [데이터 전략](docs/data-strategy.md): 자료 계층·출처·획득·신뢰도·평가 세트
- [디자인 컨셉](docs/design-concept.md): 화면 구조와 정보 위계
- [디자인 토큰](docs/design-tokens.md): 색상·레이아웃·컴포넌트 규칙
- [개발 백로그](docs/backlog.md): 주차별 이니셔티브·우선순위·완료 조건
- [검증 체크리스트](docs/checklist.md): MVP·최종 결과물 수용 기준
- [GitHub Projects](https://github.com/users/joo-hyun/projects/2): Issue 실행 상태와 일정
- [Wiki](https://github.com/joo-hyun/hub/wiki)

## 개발 범위

백엔드 직무는 최초 검증 범위입니다. 데이터·화면·에이전트 계약은 다른 디지털·기술 직무를 같은 구조로 추가할 수 있도록 직무 식별자를 입력으로 사용합니다. 세부 진행 상태와 3·4주차 범위는 [개발 백로그](docs/backlog.md)를 따릅니다.
