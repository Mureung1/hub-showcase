# ICU 이번 주 API 기준 기능 작업 목록

## Summary

이번 주 API 기준 작업은 React mock product flow를 실제 backend boundary와 맞추는 것입니다. 현재는 Express backend와 in-memory repository를 사용하며, 이후 DB, RAG, code runner, Electron IPC로 확장할 수 있게 route와 module 경계를 먼저 만들었습니다.

## 완료된 API 기준 기능

| 기능 | URL/API | Method | 상태 | 설명 |
| --- | --- | --- | --- | --- |
| 온보딩 화면 조회 | `/` | GET | 완료 | React route |
| 학습 프로필 설정 화면 조회 | `/profile` | GET | 완료 | React route |
| 학습 프로필 저장 | `/profile` | UI Submit | 완료 | Zustand + localStorage |
| Today Hub 조회 | `/today` | GET | 완료 | React route |
| 커리큘럼 추천 | `/api/curriculum/recommend` | POST | 완료 | Express backend + Gemini/mock provider |
| 오늘 학습 진행 조회 | `/api/progress/today` | GET | 완료 | server mode에서 진행 상태 조회 |
| 미션 진행 저장 | `/api/progress/missions/:missionId` | POST | 완료 | runState, attempt count, active step 저장 |
| 미션 진행 삭제 | `/api/progress/missions/:missionId` | DELETE | 완료 | 특정 미션 진행 상태 삭제 |
| 전체 진행 삭제 | `/api/progress` | DELETE | 완료 | 진행 상태 초기화 |
| 오답노트 조회 | `/api/mistake-notes` | GET | 완료 | server mode 오답 목록 조회 |
| 오답노트 생성 | `/api/mistake-notes` | POST | 완료 | Git Lab/Workspace 실패 기록 저장 |
| 오답노트 수정 | `/api/mistake-notes/:noteId` | PATCH | 완료 | 상태/내용 갱신 |
| 오답노트 삭제 | `/api/mistake-notes/:noteId` | DELETE | 완료 | 단건 삭제 |
| 전체 오답 삭제 | `/api/mistake-notes` | DELETE | 완료 | 전체 초기화 |
| Git Lab 시도 조회 | `/api/git-lab/attempts` | GET | 완료 | 명령 시도 기록 조회 |
| Git Lab 시도 저장 | `/api/git-lab/attempts` | POST | 완료 | 명령, 결과, 실패 이유 저장 |
| Git Lab 시도 삭제 | `/api/git-lab/attempts` | DELETE | 완료 | attempt 초기화 |

## Frontend 연결 상태

| 화면 | 연결 | 상태 |
| --- | --- | --- |
| Today Hub | `recommendCurriculum` client | 완료 |
| Today Hub | 생성 결과를 `icu.generatedCurriculum`에 저장 | 완료 |
| Workspace | 저장된 생성 커리큘럼 snapshot 우선 사용 | 완료 |
| Workspace | 진행 상태 API server mode sync | 완료 |
| Mistake Notes | 오답 API server mode sync | 완료 |
| Git Lab | attempt API server mode sync | 완료 |

## 후속 API

| 기능 | URL/API | Method | 상태 | 설명 |
| --- | --- | --- | --- | --- |
| 코드 실행 요청 | `/api/code/run` 또는 `ipc:runCode` | POST | 후속 | 실제 Python/JS 실행 |
| 코드 리뷰 요청 | `/api/code/review` | POST | 후속 | AI 리뷰 API |
| 튜터 답변 생성 | `/api/tutor/answer` | POST | 후속 | RAG 근거 기반 답변 |
| RAG 검색 | `/api/rag/search` | POST | 후속 | embedding/vector store 또는 FTS 필요 |
| RAG 문서 수집 | `/api/rag/ingest` | POST | 후속 | 공식 문서 수집 pipeline 필요 |
| 사용자 프로필 API | `/api/profile` | GET/POST | 후속 | DB/auth 도입 이후 |
| Notion 동기화 | `/api/notion/sync` | POST | 후속 | 사용자 인증과 저장 구조 이후 |

## API 정리 기준

- React 화면은 provider key를 직접 다루지 않습니다.
- LLM provider 호출은 backend module adapter에서만 처리합니다.
- 현재 저장소는 in-memory이며, DB가 붙으면 repository adapter만 교체합니다.
- `GeneratedCurriculumPlan` contract는 Today Hub와 Workspace가 공유합니다.
- JSONL knowledge data는 full RAG가 아니라 추천 근거 context 단계로 취급합니다.