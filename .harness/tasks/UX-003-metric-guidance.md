# Task Packet: UX-003

## 1. Summary

```text
Task: 업종별 핵심 지표와 용어 안내
Backlog ID: UX-003
Type: analysis UX
Status: complete
Parent issue: GitHub #42
Issue: GitHub #49
```

## 2. Goal

일반 사용자가 선택 업종에서 어떤 지표를 왜 보고 어떻게 해석해야 하는지 세 단계 안에서 이해하게 한다.

## 3. Scope

포함: 업종별 우선 지표 최대 3개, 의미·사용법, 핵심 용어, coverage별 안내.

제외: AI 추천, 성공 보장 문구, 새로운 분석 공식.

## 4. Related Documents

- `.harness/runs/2026-07-19-UX-003-metric-guidance.md`
- GitHub #49

## 5. Expected Changes

```text
component: MetricGuide
inspector: overview before detailed charts
test: full and unavailable coverage
```

## 6. Acceptance Criteria

- [x] 업종별 우선 지표가 최대 3개다.
- [x] 각 지표에 의미와 활용 방법이 있다.
- [x] 용어 설명이 keyboard로 열리는 native details다.
- [x] 미지원 업종에 다른 값을 대신 표시하지 않는다.
- [x] test, typecheck, lint, build가 통과한다.

## 7. Verification Plan

```powershell
pnpm --dir product --filter @localtwin/web test
pnpm --dir product --filter @localtwin/web typecheck
pnpm --dir product --filter @localtwin/web lint
pnpm --dir product --filter @localtwin/web build
```

## 8. Documentation Updates

- [x] Task Packet과 Run Report 작성
- [ ] GitHub #49 상태 동기화

## 9. Commit Plan

```text
feat(web): explain category metrics before charts
```

## 10. Self-check

- [x] 지표가 성공 가능성을 보장한다고 표현하지 않았는가?
- [x] 기존 점수와 데이터 계약을 바꾸지 않았는가?
- [x] secret이나 사용자 파일을 건드리지 않았는가?
