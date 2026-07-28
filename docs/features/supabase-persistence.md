# Supabase Persistence

## 역할

- `in-memory`: 격리된 테스트와 기본 mock 실행
- `sqlite`: 로컬 개발 및 향후 오프라인 데스크톱 실행
- `supabase`: 배포 환경의 영속 저장소

SQLite와 Supabase는 서로 데이터를 이전하거나 동기화하지 않습니다. React는 Supabase를 직접 호출하지 않고 기존 Express `/api/*` 경계를 사용합니다.

프론트엔드의 기본 API mode는 `server`입니다. mock 화면이 필요할 때만 `VITE_ICU_API_MODE=mock`을 명시합니다. Vite 개발 서버는 `/api`를 `http://127.0.0.1:8787`로 proxy하므로 같은 저장소에서 실행할 때 `VITE_API_BASE_URL`은 비워 둡니다.

## 서버 설정

```env
ICU_REPOSITORY_MODE=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

`SUPABASE_SECRET_KEY`는 Express와 배포 secret store에서만 사용합니다. `VITE_*` 또는 `NEXT_PUBLIC_*` 변수에 넣지 않습니다.

## SQL 적용

기존 `learning_progress`, `mistake_notes`, `git_lab_attempts`, `generated_curriculums` 테이블을 만든 뒤 Supabase SQL Editor에서 migration을 번호 순서대로 실행합니다.

```text
backend/supabase/migrations/001_git_lab_attempt_transaction.sql
backend/supabase/migrations/002_learner_profile.sql
```

`001`은 열린 오답노트 중복을 막는 부분 고유 인덱스와 Git Lab 시도·오답노트를 한 트랜잭션으로 저장하는 RPC를 추가합니다. `002`는 고정 ID `primary`를 사용하는 `learner_profiles` 테이블을 추가합니다. 테이블과 RPC 접근 권한은 `service_role`에만 있습니다.

## 검증

서버 secret 설정 후 다음 명령을 실행합니다.

```bash
npm run smoke:supabase
```

검증 스크립트는 `icu-smoke-*` fixture만 생성하고 `finally`에서 해당 fixture만 삭제합니다. 프로필은 고정 ID를 사용하므로 기존 값을 먼저 백업하고 save/get/delete 검증 후 반드시 복원합니다. 기존 학습 데이터 전체 삭제 API는 호출하지 않습니다.
