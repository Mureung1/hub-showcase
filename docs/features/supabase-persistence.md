# Supabase Persistence

## 역할

- `in-memory`: 격리된 테스트와 기본 mock 실행
- `sqlite`: 로컬 개발 및 향후 오프라인 데스크톱 실행
- `supabase`: 배포 환경의 영속 저장소

SQLite와 Supabase는 서로 데이터를 이전하거나 동기화하지 않습니다. React는 Supabase를 직접 호출하지 않고 기존 Express `/api/*` 경계를 사용합니다.

## 서버 설정

```env
ICU_REPOSITORY_MODE=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

`SUPABASE_SECRET_KEY`는 Express와 배포 secret store에서만 사용합니다. `VITE_*` 또는 `NEXT_PUBLIC_*` 변수에 넣지 않습니다.

## SQL 적용

기존 네 테이블을 만든 뒤 Supabase SQL Editor에서 다음 migration을 실행합니다.

```text
backend/supabase/migrations/001_git_lab_attempt_transaction.sql
```

이 migration은 열린 오답노트 중복을 막는 부분 고유 인덱스와 Git Lab 시도·오답노트를 한 트랜잭션으로 저장하는 RPC를 추가합니다. RPC 실행 권한은 `service_role`에만 있습니다.

## 검증

서버 secret 설정 후 다음 명령을 실행합니다.

```bash
npm run smoke:supabase
```

검증 스크립트는 `icu-smoke-*` fixture만 생성하고 `finally`에서 해당 fixture만 삭제합니다. 기존 학습 데이터 전체 삭제 API는 호출하지 않습니다.
