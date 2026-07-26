# 가져오기 되돌리기 데이터 보존 구현 계획

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 가져오기 원본 후보 데이터는 반영 완료 즉시 삭제하고, 되돌리기 최소 원장만 완료 시각부터 24시간 동안 서버에 보존합니다.

**Architecture:** 새 Supabase migration에서 작업 이력의 `undo_expires_at`과 최소 원장 테이블을 추가합니다. 반영 RPC는 생성된 인사이트 식별자와 반영 시각을 원장으로 옮긴 뒤 원본 후보 행을 삭제하고, 되돌리기 RPC는 DB 시각으로 만료를 검사합니다. 브라우저 서비스와 기록 UI는 만료 시각 및 전용 실패 사유를 명시적으로 처리합니다.

**Tech Stack:** PostgreSQL/Supabase RPC·RLS·pg_cron, TypeScript, React, Vitest, pgTAP

---

## 작업 1: 데이터베이스 보존 계약

**파일:**

- 생성: `supabase/migrations/20260726000000_limit_insight_import_undo_retention.sql`
- 수정: `supabase/tests/database/insight_imports.test.sql`
- 생성: `supabase/upgrade-tests/insight_import_undo_retention_fixture.sql`
- 생성: `supabase/upgrade-tests/insight_import_undo_retention.test.sql`
- 수정: `.github/workflows/supabase-migration-check.yml`

**1단계: 실패 테스트 작성**

- 완료된 작업의 후보 행이 남지 않는지 검증합니다.
- 최소 원장에 `job_id`, `user_id`, `created_insight_id`, `imported_updated_at`만 남는지 검증합니다.
- 완료 후 24시간 전에는 되돌리기가 성공하고, 만료 후에는 `undo-expired`가 반환되는지 검증합니다.
- 수정된 인사이트는 보존하고 수정되지 않은 인사이트만 삭제하는 기존 계약을 최소 원장 기준으로 검증합니다.
- 기존 완료 작업 중 24시간 이내인 항목만 원장으로 이관하고, 오래된 완료·되돌림 작업의 후보 행을 삭제하는 업그레이드 테스트를 추가합니다.

**2단계: RED 확인**

실행:

```powershell
supabase test db supabase/tests/database/insight_imports.test.sql
```

예상: 새 테이블·컬럼·만료 계약이 없어 실패합니다.

**3단계: migration 구현**

- `insight_import_jobs.undo_expires_at timestamptz`를 추가하고 완료 상태에서만 값이 허용되도록 제약을 갱신합니다.
- `insight_import_undo_items`를 생성하고 사용자 직접 접근을 막습니다.
- 기존 24시간 이내 완료 작업의 생성 인사이트만 최소 원장으로 이관합니다.
- 완료·되돌림 작업의 `insight_import_items`를 삭제합니다.
- `commit_insight_import`는 원장 기록, 완료 시각·만료 시각 기록, 후보 행 삭제를 한 트랜잭션에서 수행합니다.
- `undo_insight_import`는 `undo_expires_at > now()`를 검사하고 만료 시 `{ "ok": false, "reason": "undo-expired" }`를 반환합니다.
- 되돌리기 완료 시 원장을 삭제하고 `undo_expires_at`을 비웁니다.
- `cleanup_expired_insight_import_undo_items`를 pg_cron에서 1분마다 호출하되 외부 역할에는 실행 권한을 주지 않습니다.
- 기존 Vercel cleanup RPC는 미완료 작업과 Notion 연결 정리 책임만 유지합니다.

**4단계: GREEN 확인**

실행:

```powershell
supabase db reset --local
supabase test db supabase/tests/database/insight_imports.test.sql
```

예상: 가져오기 DB 테스트가 통과합니다.

## 작업 2: 브라우저 계약과 만료 UI

**파일:**

- 수정: `src/features/insight-import/model/import_types.ts`
- 수정: `src/features/insight-import/model/insight_import_service.ts`
- 수정: `src/features/insight-import/api/browser_insight_import_service.ts`
- 수정: `src/features/insight-import/api/browser_insight_import_service.test.ts`
- 수정: `src/features/insight-import/model/use_insight_import.ts`
- 수정: `src/features/insight-import/model/use_insight_import.test.tsx`
- 수정: `src/features/insight-import/ui/import_history.tsx`
- 수정: `src/features/insight-import/ui/insight_import_dialog.test.tsx`

**1단계: 실패 테스트 작성**

- 기록 응답의 `undo_expires_at`을 `undoExpiresAt`으로 검증·변환하는 테스트를 추가합니다.
- Undo RPC의 `{ ok: false, reason: "undo-expired" }`를 전용 실패 사유로 변환하는 테스트를 추가합니다.
- 만료된 기록은 되돌리기 버튼 대신 `되돌릴 수 있는 24시간이 지났어요.`를 표시하는 테스트를 추가합니다.
- 완료 기록에서 삭제된 원본 후보 상세를 다시 조회하지 않는 테스트로 변경합니다.

**2단계: RED 확인**

실행:

```powershell
npx vitest run src/features/insight-import/api/browser_insight_import_service.test.ts src/features/insight-import/model/use_insight_import.test.tsx src/features/insight-import/ui/insight_import_dialog.test.tsx --maxWorkers=1
```

예상: 새 타입·실패 사유·만료 UI가 없어 실패합니다.

**3단계: 최소 구현**

- `ImportHistoryEntry`에 `undoExpiresAt`을 추가하고 기록 조회 컬럼 및 파서를 갱신합니다.
- `ImportServiceFailureReason`에 `undo-expired`를 추가하고 Undo RPC만 명시적 실패 payload를 해석합니다.
- hook에서 만료 오류를 `되돌릴 수 있는 24시간이 지났어요.`로 표시하고 기록을 새로고침합니다.
- 기록 UI는 완료 상태이면서 만료 전인 항목에만 되돌리기 액션을 표시합니다.
- 완료 후 삭제되는 원본 후보 상세 조회 UI와 상태를 제거하고 요약 수치만 유지합니다.

**4단계: GREEN 확인**

실행:

```powershell
npx vitest run src/features/insight-import/api/browser_insight_import_service.test.ts src/features/insight-import/model/use_insight_import.test.tsx src/features/insight-import/ui/insight_import_dialog.test.tsx --maxWorkers=1
```

예상: 대상 테스트가 통과합니다.

## 작업 3: 문서와 최종 검증

**파일:**

- 수정: `docs/superpowers/specs/2026-07-26-import-undo-retention-design.md`
- 필요 시 수정: 가져오기 보존 정책을 설명하는 기존 활성 문서

**1단계: 운영 의미 명확화**

- 사용자에게 되돌리기 권한은 완료 시점부터 정확히 24시간이며 DB 시각으로 판정됨을 명시합니다.
- 원본 후보 데이터는 반영 완료 즉시 삭제되고, 최소 원장은 만료 뒤 다음 1분 cron 실행에서 물리 삭제됨을 명시합니다.
- 스케줄러 지연 시에도 만료 후 Undo는 허용되지 않는다고 명시합니다.

**2단계: 최소 최종 검증**

실행:

```powershell
npm run format:check
npm run lint
npm run build:web
git diff --check origin/main...HEAD
```

Supabase 검증은 작업 1의 전체 reset·pgTAP 통과 결과를 재사용하고 같은 테스트를 반복 실행하지 않습니다.

**3단계: 커밋**

구현과 테스트를 논리적 범위로 나누어 커밋하며, 각 커밋은 한글 명사형 제목과 3줄 본문을 사용합니다.
