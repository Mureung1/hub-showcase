# DevChat / ICU MVP 개발 계획

## 프로젝트 개요

ICU는 `I CODE U`의 약자이며, 사용자가 오늘 무엇을 공부해야 하는지 정하고, 커리큘럼을 따라 실습하고, 실행 피드백과 오답 기록까지 이어갈 수 있게 하는 AI coding tutor desktop app입니다. 저장소와 기획 문서에서는 DevChat 이름도 함께 사용합니다.

현재 우선순위는 React product flow 위에 Monaco Workspace와 Express local API boundary를 안정화하고, Electron/RAG/Notion은 이후 단계로 분리하는 것입니다.

## 현재 구현 상태

### Frontend

- Vite + React + TypeScript 기반 화면 구현
- React Router 기반 route 구성
- Zustand + localStorage 기반 mock 상태 관리
- Today Learning Hub 구현
- Learning Workspace IDE 구현
- Workspace 코드 입력 영역에 Monaco Editor 도입
- Workspace 실행 버튼을 Express 기반 `/api/code/run`에 연결
- Git Branching Lab 구현
- Mistake Notes 목록 화면 구현
- Profile Setup 구현
- 생성 커리큘럼 snapshot 공유 상태 구현
- Today Hub에서 생성한 커리큘럼을 Workspace로 연결
- Workspace에서 생성 플랜 요약, 오늘 미션, 단계 목록, 추천 근거와 출처 표시
- 긴 단계/출처/활동 기록은 패널 내부 스크롤로 처리

### Backend

- Express 기반 Node backend 추가
- `POST /api/curriculum/recommend` 구현
- 학습 진행 상태 API 구현
- 오답노트 API 구현
- Git Lab attempt API 구현
- `POST /api/code/run` 코드 실행 API 구현
- in-memory repository 기반 mock backend 상태 관리
- 선택형 SQLite repository mode 준비
- Gemini provider adapter 구현
- JSON curriculum catalog loader 구현
- JSONL knowledge loader 구현
- React/Docker 지식 데이터 context 연결

### Data

- 커리큘럼 track 데이터는 `shared/curriculum/*.json`을 기준으로 사용
- 공식 문서 기반 knowledge chunk는 `data/*.jsonl`에서 로드
- React JSONL의 `{ title, content, url }` alias schema 지원
- React `/learn/` 문서를 우선 참고하도록 scoring 보강

## 현재 주요 흐름

```txt
/profile
  -> 학습 프로필 저장
  -> /today
  -> 목표 입력 또는 저장된 목표 사용
  -> POST /api/curriculum/recommend 또는 mock generator
  -> icu.generatedCurriculum 저장
  -> /workspace?mission=generated-first-mission
  -> 생성 커리큘럼 기반 오늘 미션 학습
  -> Monaco Editor에서 코드 수정
  -> POST /api/code/run으로 실행 결과 확인
```

Git Lab 흐름:

```txt
/git-lab
  -> Pro Git 커리큘럼 레벨 선택
  -> 터미널 명령 입력
  -> gitEngine 실행
  -> 현재 그래프와 목표 비교
  -> 실패 명령은 오답노트로 기록
```

## 아키텍처 방향

현재 구조는 Express 기반 modular monolith입니다. 기능별 module 안에서 application/domain/adapters를 나누고 있어 헥사고날 아키텍처 방향을 일부 적용한 상태입니다.

```txt
React screen
  -> frontend API client / Zustand store
  -> REST API
  -> backend/http route
  -> backend/modules/*/application
  -> backend/modules/*/domain
  -> backend/modules/*/adapters
  -> Gemini / JSON data / in-memory or SQLite repository / code runner
```

아직 완성형 헥사고날 구조는 아닙니다. `ports/` 계층과 DB/provider interface는 DB, RAG, code runner가 더 커지는 시점에 강화합니다.

## 다음 우선순위

1. 현재 코드 변경과 문서/issue 동기화 커밋 정리
2. Workspace에서 Monaco 편집, 실행, 단계 진행 경험 QA
3. 코드 실행 API의 JavaScript 성공/실패/timeout edge case 보강
4. Git Lab의 불필요한 주석/문구 정리
5. 커리큘럼 생성 결과와 Workspace 진행 상태의 edge case 보강
6. backend repository를 in-memory에서 실제 저장소로 바꿀 준비

## 후속 범위

- Judge Service 구현
- Python 실행 지원
- 코드 실행 격리 강화 또는 Electron IPC 전환
- AI 코드 리뷰 API 연결
- full RAG 검색/embedding/vector store
- 사용자별 DB 저장 강화
- Notion API 연동
- Electron desktop packaging

## 검증 기준

코드 변경 시 아래 명령을 확인합니다.

```bash
npm test
npm run build
npm run lint
git diff --check
```

문서만 변경한 경우 `git diff --check`를 우선 확인하고, 코드와 함께 커밋할 경우 전체 검증을 수행합니다.

## SQLite Persistence Update

- Added optional SQLite repository mode for backend persistence.
- Enable with `ICU_REPOSITORY_MODE=sqlite` and optional `ICU_SQLITE_PATH`.
- Current persisted data: learning progress, mistake notes, Git Lab attempts.
- Prepared schema for generated curriculum snapshots; API wiring remains next.
- In-memory repositories remain the default for mock mode and tests.
