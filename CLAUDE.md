# CLAUDE.md

이 문서는 사내 LLM 사용 보안 게이트웨이 프로젝트의 개발 환경/구조에 대한 맥락을 정리한 문서다. 서비스 내용은 [기획서](docs/wiki/기획서.md), 개발 일정은 [backlog.md](docs/wiki/backlog.md) 참고. 이전 주제(탑히어 — 대학생 자취 지역 추천)의 문서는 [docs/wiki/v1/](docs/wiki/v1/)에 보관되어 있으며 더 이상 유지되지 않는다.

## 개발 환경

- **Frontend**: React 18 + Vite (프로젝트 루트, 기존 구성 유지)
- **Backend**: Express (`server/` 디렉토리, 신규 추가)
- 3주 MVP 일정([기획서](docs/wiki/기획서.md) 4번 참고)이므로 초기부터 과설계하지 않고, 동작하는 파이프라인을 우선한다.

## 디렉토리 구조

```
hub/
├── src/                     # 프론트엔드 (React)
│   ├── components/          # 공통 UI 컴포넌트 (Button, Badge, Table 등)
│   ├── features/
│   │   ├── chat-demo/       # 프롬프트 입력 → 전송 → 결과(통과/마스킹/차단) 표시
│   │   └── log-viewer/      # 탐지 로그 테이블 조회
│   ├── api/                 # 백엔드 호출 client (axios 인스턴스, endpoint 함수)
│   └── main.jsx
├── server/                  # 백엔드 (Express)
│   ├── src/
│   │   ├── routes/          # /v1/chat, /v1/logs 라우터
│   │   ├── providers/       # LLMProvider 어댑터 (openai/claude/gemini 구현체)
│   │   ├── services/
│   │   │   ├── detectors/   # 정규식 PII 탐지, NER 클라이언트, Ollama 위험도 클라이언트
│   │   │   └── policy/      # DLP 정책 엔진 (차단/마스킹/통과 분기)
│   │   ├── data/            # 탐지 로그 sqlite DB
│   │   └── app.js
│   ├── package.json         # 프론트와 별도 관리 (모노레포 워크스페이스 아님)
│   └── .env                 # LLM 제공자 API 키 등 (gitignore 대상)
├── docs/
│   └── wiki/
│       └── v1/               # 이전 주제(탑히어) 문서 보관
├── prototype/
└── public/
```

- 프론트/백엔드는 각자 `package.json`을 갖는 별도 Node 프로젝트로 분리한다(워크스페이스 미사용).
- 개발 시 `npm run dev`(vite, 5173)와 `server`에서 `npm run dev`(express, 4000)를 각각 띄운다.
- 화면은 chat-demo, log-viewer 2개뿐이고 서로 상태를 공유하지 않으므로 전역 상태 라이브러리(zustand 등)는 도입하지 않는다.

## 라이브러리

### Frontend (추가 설치 필요)

| 라이브러리 | 용도 |
|---|---|
| axios | 백엔드 API(`/v1/chat`, `/v1/logs`) 호출 |
| react-markdown | LLM 응답의 마크다운(굵게·목록·제목·코드블록) 렌더링. 기본 설정이 raw HTML을 막아 별도 sanitize 불필요 |

### Backend (신규 설치)

| 라이브러리 | 용도 |
|---|---|
| express | 서버 프레임워크 |
| cors | 프론트(5173) ↔ 백엔드(4000) 간 CORS 허용 |
| dotenv | LLM 제공자 API 키 등 환경변수 관리 |
| axios | HuggingFace Inference API(NER), Ollama REST API(위험도 분석) 호출 |
| openai, @anthropic-ai/sdk, @google/generative-ai | LLMProvider 어댑터의 각 제공자 구현체 |
| better-sqlite3 | 탐지 로그 저장. 데이터 규모가 작아 별도 DB 서버 없이 파일 기반으로 충분 |

## 개발 전에 결정한 것

1. **포트**: 프론트 5173(Vite 기본), 백엔드 4000. `vite.config.js`에 `/v1` 프록시 설정해서 프론트 코드에서는 상대경로(`/v1/chat`, `/v1/logs`)로만 호출.
2. **API 키 관리**: OpenAI·Claude·Gemini API 키와 HuggingFace 토큰은 `server/.env`에 보관. `.gitignore`에 추가하고 `.env.example`만 커밋.
3. **게이트웨이는 Node 단일 백엔드로 시작**: 프록시가 외부 LLM API·Ollama 호출 대기가 대부분인 I/O 바운드 작업이라 Node 비동기 모델과 맞는다. NER은 우선 HuggingFace Inference API를 axios로 호출하고, 이게 한국어 NER 모델을 안정적으로 지원하지 못하면 그때 Python(FastAPI + transformers) 서비스로 분리한다([backlog.md](docs/wiki/backlog.md) 2주차 "로컬 테스트" 항목이 이 판단 근거).
4. **로컬 LLM 위험도 분석**: Ollama는 REST API(`localhost:11434`)이므로 Node에서 axios로 직접 호출한다. 파인튜닝은 하지 않고 프롬프트 기반 분류로 한정한다.
5. **인증**: 초기 버전은 로그인 없이 전체 API를 공개로 운영한다(데모 범위).
6. **에러 응답 포맷 통일**: `{ "error": { "code": "...", "message": "..." } }` 형태로 백엔드 전 라우터에 공통 적용.
7. **RAG 미사용 원칙**: 이 서비스는 요청이 실제 LLM API로 나가기 전 가로채 검사하는 프록시 구조이지, 문서를 검색해 응답을 보강하는 RAG가 아니다([기획서](docs/wiki/기획서.md) 1.3 참고). 검사 대상은 항상 "요청 텍스트"로 고정한다.
