# Run Report: MAP-001 Mapo market cluster

## Summary

```text
Task: MAP-001
Status: passed
Date: 2026-07-11
Commit: 1ac6faa
```

## Scope

```text
상권 selector와 비교표를 연남·홍대·합정으로 고정했다.
성수·신촌을 제거하고 실제 OSM snapshot에서 확인한 합정 POI를 추가했다.
관평동은 상권 비교군에 포함하지 않았다.
```

## Changed Artifacts

```text
apps/web/src/App.tsx
apps/web/src/App.test.tsx
docs/features/market-map-experience.md
.harness/tasks/MAP-001-market-cluster.md
```

## Verification

```powershell
pnpm --dir apps/web test
pnpm --dir apps/web typecheck
pnpm --dir apps/web build
python scripts/check_docs_html.py
```

Result:

```text
자동 검사가 통과했다.
브라우저에서 selector 3개 항목, 합정 주소·점포와 비교 dialog 3개 행을 확인했다.
성수·신촌·관평동은 상권 selector와 비교 dialog에 표시되지 않았다.
```

## Follow-up

```text
POI는 snapshot이며 영업 상태 전체를 보장하지 않는다.
분석 수치는 API adapter 연결 전 demo fixture다.
```
