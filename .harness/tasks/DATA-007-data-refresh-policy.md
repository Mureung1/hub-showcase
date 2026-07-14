# Task Packet: DATA-007

## 1. Summary

```text
Task: 운영 수집 범위, 요청 시점, 갱신과 보존 정책 결정
Backlog ID: DATA-007
Parent Epic: EPIC-02
Type: data
Owner: N187_정현우
Status: backlog
```

## 2. Goal

Supabase 이관과 핵심 검색 연결을 검증한 뒤 외부 provider별 수집 범위와 실행 시점을 결정한다. 현재 단계에서는 임의의 cron이나 갱신 간격을 구현하지 않는다.

## 3. Scope

- 서울 열린데이터광장과 공공데이터포털 source별 공개 주기 재확인
- 지원 지역 범위와 서울 전체 검색 제외 원칙 확인
- full snapshot과 incremental 수집 방식 결정
- API quota·실패 retry·중복 실행 제한 결정
- raw snapshot 보존 기간과 rollback 기준 결정
- 수동 실행, scheduled workflow 또는 별도 worker 중 운영 방식 결정
- 승인된 결정으로 후속 자동 수집 구현 Task 생성

## 4. Related Documents

- `docs/development/tasks.md`
- `docs/data/data-source-mapping.md`
- `docs/development/architecture.md`
- `docs/issues/security-hardening-review.md`

## 5. Expected Changes

- provider 공개 주기와 quota를 다시 확인한 근거 문서
- 지원 지역과 full/incremental 수집 결정
- raw snapshot 보존·rollback 운영 문서
- 승인 후 생성할 자동 수집 구현 Task

Depends on:

- `DB-001`: 제품 runtime schema와 전체 canonical seed 검증
- `SEARCH-001`: 실제 제품 조회에 필요한 데이터 범위 확인
- `SEC-006`: provider key 전송과 log 보호 방향 확인

## 6. Acceptance Criteria

- [ ] source별 지원 지역과 수집 대상 dataset이 문서화된다.
- [ ] source별 요청 시점과 갱신 주기를 근거와 함께 승인한다.
- [ ] full/incremental 방식, quota와 실패 처리 기준을 승인한다.
- [ ] raw snapshot 보존 기간과 이전 snapshot rollback 절차를 승인한다.
- [ ] browser가 provider API와 secret을 직접 사용하지 않는 원칙을 유지한다.
- [ ] 자동화 구현 범위와 별도 Task ID를 확정한다.

## 7. Verification Plan

```powershell
rg -n "DATA-007|갱신 주기|보존 기간|지원 지역" docs .harness
python scripts/check_docs_index.py
git diff --check
```

정책 결정 전에는 외부 API를 호출하거나 schedule을 추가하지 않는다.

## 8. Documentation Updates

- [ ] `docs/data/data-source-mapping.md`에 승인된 정책을 기록한다.
- [ ] `docs/development/tasks.md` 상태와 후속 자동화 Task를 갱신한다.

## 9. Commit Plan

```text
docs(data): define provider refresh policy
```

## 10. Self-check

- [ ] 서울 전체 검색을 암묵적으로 범위에 추가하지 않았다.
- [ ] 검증되지 않은 provider 주기를 확정값으로 기록하지 않았다.
- [ ] secret이나 실제 인증키를 문서에 기록하지 않았다.
