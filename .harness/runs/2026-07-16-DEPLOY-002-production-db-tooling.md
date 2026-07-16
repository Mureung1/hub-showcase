# DEPLOY-002 Production DB Promotion Tooling Run Report

## 결과

- 상태: tooling ready, production apply pending
- production Supabase project는 아직 생성하지 않았다.
- 개발용 `product/.env`와 분리된 `PRODUCTION_DATABASE_URL`만 허용한다.
- 기본 실행은 dry-run이며 `--apply`가 있어야 migration과 import를 수행한다.

## 검증한 안전장치

- project ref 형식과 재입력 일치
- URL host 또는 username의 project ref 일치
- PostgreSQL scheme, host, username과 password 존재
- canonical file과 세 snapshot directory 존재
- 오류 메시지의 URL·password 비노출
- migration → canonical → KOSIS population → KOSIS business → market population 순서
- 종료 시 engine dispose

## 자동 검증

```text
production promotion tests: 4 passed
Ruff: passed
dry-run: target verified, inputs verified, no changes
```

dry-run은 가짜 PostgreSQL target identity와 실제 local snapshot 경로로 수행했으며 외부 DB에
연결하거나 변경하지 않았다.

## 남은 Gate

- 사용자 승인으로 별도 production Supabase 생성
- 실제 production URL을 현재 process에만 설정
- dry-run 재실행 후 `--apply`
- Render `DATABASE_URL` 설정
- API·Web 수동 release와 공개 smoke
