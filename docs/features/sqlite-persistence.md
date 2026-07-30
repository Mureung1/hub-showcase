# SQLite Persistence

## 목적

SQLite mode는 로컬 개발과 향후 데스크톱 환경에서 서버 재시작 후에도 학습 데이터를 유지하기 위한 repository adapter입니다. Node의 내장 `node:sqlite`를 사용하므로 별도 패키지가 필요하지 않습니다.

## Repository Mode

```env
ICU_REPOSITORY_MODE=sqlite
ICU_SQLITE_PATH=.icu/icu.sqlite
```

지원 mode:

| Mode        | 용도                    |
| ----------- | ----------------------- |
| `in-memory` | 테스트와 일회성 실행    |
| `sqlite`    | 로컬·오프라인 영속 저장 |
| `supabase`  | 배포 환경 영속 저장     |

## 저장 테이블

- `learner_profiles`: 표시 이름, 목표, 관심 트랙, 하루 학습 시간, 수준
- `learning_progress`: mission 상태, 실행 상태, 시도 수, active step, 완료 시각, 활동 로그
- `mistake_notes`: Git Lab, Workspace, 알고리즘, API 실습의 open/resolved 오답
- `git_lab_attempts`: command, result, reason, lesson id, created time
- `generated_curriculums`: 생성 커리큘럼 snapshot과 plan JSON

## 구현 파일

- `backend/shared/sqliteDatabase.mjs`
- `backend/modules/profile/adapters/sqliteProfileRepository.mjs`
- `backend/modules/learning-progress/adapters/sqliteLearningProgressRepository.mjs`
- `backend/modules/mistake-notes/adapters/sqliteMistakeNoteRepository.mjs`
- `backend/modules/git-lab/adapters/sqliteGitLabAttemptRepository.mjs`
- `backend/modules/git-lab/adapters/sqliteGitLabAttemptRecorder.mjs`
- `backend/modules/curriculum/adapters/sqliteGeneratedCurriculumRepository.mjs`
- `backend/http/server.mjs`

## 저장 경계

Frontend는 SQLite에 직접 접근하지 않습니다.

```text
React client
  → Core API
  → application/domain
  → SQLite repository
```

화면 상태는 API 성공 응답으로 Zustand store에 반영합니다.

## 후속 과제

1. schema 변경이 잦아지기 전에 migration version 관리 추가
2. 사용자 인증과 identity 전략 확정
3. SQLite와 Supabase 간 자동 동기화가 필요할지 별도 결정
