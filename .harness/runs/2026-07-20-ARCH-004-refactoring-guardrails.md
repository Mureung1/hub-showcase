# Run Report: ARCH-004 refactoring guardrails

## Summary

LocalTwin 전체 코드 리팩터링 전에 기존 구조 부채를 AST 기준 budget으로 기록하고 신규 과대 함수,
runtime 고정 period·지원 상권 ID 중복과 FastAPI 계층 침범을 자동 차단했다.

## Changes

- Web TypeScript AST 함수 budget 검사
- Python AST 함수 budget 검사
- 함수가 줄면 allowlist도 반드시 줄이는 stale budget 검사
- known runtime literal count ratchet
- FastAPI import boundary 검사
- checker 정상/실패 self-test
- 표준 harness와 pre-commit 연결

## Verification

```text
Task Packet: 61 passed
Docs index/HTML/viewer normalization: passed
Web structure: 4 temporary budgets, passed
Python structure: 78 runtime files, 15 temporary budgets, passed
Checker self-tests: passed
Web: 21 test files, 66 tests passed
API: 112 tests passed
TypeScript typecheck, oxlint, Ruff, production build: passed
```

## Known limitation

Function line budget은 책임 혼합을 찾는 신호이며 좋은 설계의 유일한 척도가 아니다. 각 allowlist에는
이유와 제거 Task가 있고, 응집된 알고리즘은 test와 review 근거로 유지할 수 있다. MapLibre, Three와
Spark의 500kB 이상 chunk warning은 기존 성능 backlog이며 이번 구조 gate 실패는 아니다.

## Result

ARCH-004 완료. 이후 모든 source commit은 기존 budget을 늘리거나 새 정책 literal을 추가하면
pre-commit 또는 `scripts/check.ps1`에서 실패한다.
