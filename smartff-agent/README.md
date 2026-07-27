# SmartFF Agent

GS25 FF 데이터를 분석하여 점주의 발주 의사결정을 지원하는
AI Decision Support System(DSS)

---

## Roadmap

- ✅ v1.0 Deployable Foundation — Docker, CI, CORS, 보안 정리
- 🚧 v2.0 Postgres Migration
- 🚧 v3.0 Rule Engine
- 🚧 v4.0 Multi-Store SaaS

---

## 📄 Documents

- [Project Plan](docs/PROJECT_PLAN.md)
- [Discussion](docs/DISCUSSION.md)
- [User Flow](docs/USER_FLOW.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)

---

## Project Goal

SmartFF Agent는
자동발주를 대체하는 서비스가 아니라,

판매 데이터와 폐기 데이터를 분석하여
점주의 의사결정을 지원하는 AI Agent입니다.

---

## Development Setup

### Backend / Frontend

```bash
cd backend && npm install
cd frontend && npm install
```

### Data Pipeline (Python)

`data/scripts/*.py`는 백엔드가 업로드 시 자동으로 실행하는 ETL 스크립트입니다.
아래 명령으로 필요한 패키지를 먼저 설치해야 합니다.

```bash
pip install -r data/scripts/requirements.txt
```

`python3`가 백엔드 프로세스와 같은 환경(PATH)에서 실행 가능해야 업로드 시
ETL 자동 실행이 정상 동작합니다.