# Task Packet: WEB-019

## 1. Summary

```text
Task: 분석 filter·inspector UI 책임 분리
Backlog ID: WEB-019
Parent Epic: EPIC-08 / GitHub #63
Type: refactor
Owner: HyunKN
Status: in_progress
```

## 2. Goal

필터와 결과 패널을 작은 표시 단위로 분리하고 기존 선택·오류·접근성 동작을 보존한다.

## 3. Scope

포함: 점포 목록, layer toggle, 분석 section 분리와 component test.

제외: 분석 공식·API contract·새 화면 기능.

## 4. Related Documents

```text
docs/development/refactoring-standards.md
.harness/tasks/REFACTOR-001-full-code-boundaries.md
GitHub #66
```

## 5. Expected Changes

```text
web: MarketFilters, MarketInspector, child UI components
tests: UI state characterization
```

## 6. Acceptance Criteria

- [ ] MarketFilters와 MarketInspector가 임시 structure budget 없이 통과한다.
- [ ] 점포 목록의 loading·empty·error·전체보기 상태가 유지된다.
- [ ] inspector topic별 metric과 retry 상태가 유지된다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web test
pnpm --dir product/apps/web run typecheck
pnpm --dir product/apps/web run lint
python scripts/check_code_structure.py
```

## 8. Documentation Updates

- [x] Task Packet 생성
- [ ] Run Report 및 backlog 상태 갱신

## 9. Commit Plan

```text
refactor(web): split filter and inspector sections
test(web): preserve analysis panel interactions
```

## 10. Self-check

- [x] 화면 기능을 변경하지 않는다.
- [ ] 검증 결과를 기록한다.
