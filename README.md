# ⚖️ Civil Litigation Evolutionary AI Agent

본 프로젝트는 **Hybrid-Perception** 및 **Self-Evolution** 루프를 탑재한 진화형 법률 AI 에이전트입니다. 단순한 정적 정보 검색을 넘어, 사용자의 상황을 실시간으로 구조화하고 법률 문서(내용증명, 소장 등)를 자동 생성하며, 피드백을 통해 스스로 판단력을 고도화합니다.

## 주요 기능
- **Hybrid-Perception (Perception Layer):** 사용자 입력 문장에서 사실관계와 필수 변수를 자동 파싱하여 JSON 형태로 추출.
- **RAG 기반 법률 상담 (Reasoning Layer):** FAISS 벡터 DB와 BGE-M3 임베딩을 활용하여 최신 법령에 기반한 법적 근거 실시간 검색.
- **Dynamic Document Generation (Execution Layer):** Jinja2 템플릿 엔진을 통해 사용자의 상황에 최적화된 법률 서식 자동 생성.
- **Self-Evolution Loop (Feedback):** 사용자의 피드백을 Success-Log로 저장하여 에이전트의 전략 알고리즘을 강화하는 데이터 순환 구조.

## Tech Stack
- **Backend:** FastAPI (Python), LangChain, FAISS
- **Frontend:** React, Axios
- **AI/ML:** OpenAI API (LLM), BAAI/bge-m3 (Embedding)
- **Data Management:** Jinja2 (Document Templating), JSON-based Success Logging

## 프로젝트 구조
```text
project/
├── main.py              # FastAPI 서버 및 API 게이트웨이
├── agent.py             # ReAct 패턴의 추론 엔진 및 벡터 검색 모듈
├── doc_generator.py     # 법률 문서 생성 및 템플릿 바인딩 로직
├── faiss_law_index/     # 벡터 DB 인덱스 저장소
├── templates/           # 내용증명 및 소장 서식 파일
├── logs/                # 성공 경험(Success-Log) 저장소
└── frontend/            # React 프론트엔드 코드
```

## 실행 방법
1. 백엔드 실행
가상환경 활성화 후
python main.py

2. 프론트엔드 실행
cd frontend
npm install
npm start