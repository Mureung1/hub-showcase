# 미리캣 (Miricat)

내 출근길의 보초 — 이동 경로 상시 감시 에이전트.
고정 경로를 등록해두면 매일 대신 확인하고, 이상 없으면 한 줄 보고 / 영향 있으면 근거 담긴 경보를 보낸다.

> 제품·아키텍처·원칙은 [`CLAUDE.md`](./CLAUDE.md) 참고. 기획서 전문은 [`docs/plan.md`](./docs/plan.md), 로드맵은 [`docs/checklist.md`](./docs/checklist.md).
> 동작하는 UI 흐름 프로토타입: [`docs/prototype-flow.html`](./docs/prototype-flow.html) (브라우저로 열기).

## 구조
```
miricat/
├── backend/     FastAPI + LangGraph 에이전트 + APScheduler + 평가 하네스
│   └── app/
│       ├── agent/     Planner → Scout ⇄ Verifier → Analyst → Reporter (LangGraph)
│       ├── matching/  4단계 매칭 (노선/정류장/도로명/반경)
│       ├── sources/   게시판 크롤링 소스 어댑터
│       ├── notify/    디스코드 웹훅
│       ├── db/        SQLite (경로/수집정보/알림이력/조사기록)
│       └── api/        경로 등록 · 리포트 엔드포인트
├── frontend/    Vite + React (경로 등록 + 리포트 열람실)
└── docs/        기획서 · 체크리스트 · 프로토타입
```

## 개발 시작

### 백엔드
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env      # 키 채우기
uvicorn app.main:app --reload   # http://localhost:8000/health
```

### 프론트엔드
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

### 평가셋 회귀 (추출 정확도)
```bash
cd backend
python -m eval.run_eval         # dataset/ 의 공지들로 추출 정확도 측정
```

## 원칙
**예측하지 않는다.** 이미 공지된 사실만 찾아 경로 맥락과 결합해 전달한다. 자세한 원칙은 CLAUDE.md.
