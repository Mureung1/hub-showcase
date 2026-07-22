# ICU GitHub Issue 등록 목록

## 등록 상태

현재 환경에서는 GitHub Issue 원격 등록 대신, repo 내부 문서로 backlog를 관리합니다. 아래 상태는 현재 코드 구현 기준으로 갱신한 것입니다.

## Issue Backlog

| 순서 | 우선순위 | 제목 | 상태 | 라벨 |
| --- | --- | --- | --- | --- |
| 1 | P0 | SPEC 작업 체크리스트 보강 | 완료 | `docs`, `process` |
| 2 | P0 | ICU 디자인 skill references 구조 정리 | 완료 | `docs`, `design`, `skill` |
| 3 | P0 | Today Learning Hub 기능 설계 | 완료 | `feature`, `design`, `today` |
| 4 | P0 | Today Learning Hub 화면 구현 | 완료 | `feature`, `frontend`, `today` |
| 5 | P0 | 프로필 저장 후 Today Hub 이동 연결 | 완료 | `feature`, `frontend`, `profile` |
| 6 | P1 | 학습 mock data 구조 분리 | 완료 | `refactor`, `data` |
| 7 | P1 | Learning Workspace mock 화면 설계 | 완료 | `feature`, `design`, `workspace` |
| 8 | P1 | Learning Workspace mock 화면 구현 | 완료 | `feature`, `frontend`, `workspace` |
| 9 | P1 | 공통 App Navigation 추가 | 완료 | `feature`, `frontend`, `navigation` |
| 10 | P2 | Git Lab을 앱 학습 흐름에 연결 | 완료 | `feature`, `git-lab` |
| 11 | P2 | 이번 주 기능 구현 문서 업데이트 | 진행 중 | `docs` |
| 12 | P2 | 디자인 QA 및 브랜드 색상 점검 | 진행 중 | `design`, `qa` |
| 13 | P1 | 커리큘럼 Agent backend API 연결 | 완료 | `backend`, `agent`, `api` |
| 14 | P1 | JSONL 학습 지식 데이터 로더 추가 | 완료 | `backend`, `data`, `agent` |
| 15 | P1 | React 지식 데이터 연결 | 완료 | `backend`, `data`, `react` |
| 16 | P1 | 생성 커리큘럼 Workspace 연결 UX 보강 | 완료 | `frontend`, `workspace`, `curriculum` |
| 17 | P2 | Git Lab 주석/문구 정리 | 대기 | `cleanup`, `git-lab` |
| 18 | P2 | Workspace 생성 커리큘럼 QA | 대기 | `qa`, `workspace` |
| 19 | P3 | Monaco Editor 도입 | 후속 | `editor`, `workspace` |
| 20 | P3 | 실제 code runner 구현 | 후속 | `backend`, `code-runner` |
| 21 | P3 | full RAG 검색 구현 | 후속 | `rag`, `agent` |
| 22 | P3 | Notion 동기화 구현 | 후속 | `notion`, `integration` |
| 23 | P3 | Electron desktop packaging | 후속 | `electron`, `desktop` |

## 현재 완료로 볼 수 있는 핵심 범위

- React mock product flow: Profile -> Today Hub -> Workspace
- Today Hub 커리큘럼 생성 UX
- 생성 커리큘럼 공유 store
- Workspace 생성 플랜 표시
- Git Lab Pro Git 기반 시뮬레이터
- 오답노트 기본 흐름
- Express backend server mode
- curriculum/progress/mistake/git-lab attempt API
- JSON/JSONL 학습 데이터 연결

## 아직 열려 있는 작업

### Git Lab 정리

- `GitLabPage.tsx`의 설명만 반복하는 주석 정리
- 깨진 한국어 문구 점검
- Pro Git 후반 레벨의 playable 범위 확대

### Workspace QA

- React 목표 생성 후 Workspace에 React 미션/단계/출처가 보이는지 확인
- Docker 목표 생성 후 Dockerfile preview가 보이는지 확인
- 저장된 snapshot이 없을 때 fallback 표시가 자연스러운지 확인
- 긴 단계와 출처가 패널 내부에서 스크롤되는지 확인

### Backend 후속

- in-memory repository를 실제 저장소 adapter로 교체할 준비
- code runner API 또는 Electron IPC 계약 정의
- RAG 검색/embedding 구조 설계
- 사용자별 저장/auth 정책 결정

## 커밋 관리 메모

- 코드 변경과 문서 변경은 가능하면 별도 커밋으로 나눕니다.
- untracked 산출물은 요청 없이는 stage하지 않습니다.
- 문서 변경 커밋 전 `git diff --check`를 실행합니다.