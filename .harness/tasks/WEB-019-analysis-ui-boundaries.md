# Task Packet: WEB-019

## 1. Summary

```text
Task: 분석 filter·inspector UI 책임 분리
Backlog ID: WEB-019
Parent Epic: EPIC-08 / GitHub #63
Type: refactor
Owner: HyunKN
Status: done
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

- [x] MarketFilters와 MarketInspector가 임시 structure budget 없이 통과한다.
- [x] 점포 목록의 loading·empty·error·전체보기 상태가 유지된다.
- [x] inspector topic별 metric과 retry 상태가 유지된다.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web test
pnpm --dir product/apps/web run typecheck
pnpm --dir product/apps/web run lint
python scripts/check_code_structure.py
```

## 8. Documentation Updates

- [x] Task Packet 생성
- [x] 검증 결과를 Task Packet에 기록

## 9. Commit Plan

```text
refactor(web): split filter and inspector sections
test(web): preserve analysis panel interactions
```

## 10. Self-check

- [x] 화면 기능을 변경하지 않는다.
- [x] FE test, typecheck, lint와 structure check를 수행한다.
- [ ] TEST-001에서 실제 브라우저의 분석 패널 시각 회귀를 별도로 확인한다.

## 11. Result

- `MarketFilters`의 지도 표시 제어와 점포 목록을 표시 전용 컴포넌트로 분리했다.
- `MarketInspector`는 header, 점수·경쟁, 개·폐업·매출, 순위, 유동인구, 인구, 요약 컴포넌트를 조립한다.
- FE test 27개 파일 / 78개 테스트, typecheck, lint, 구조 검사를 통과했다.
