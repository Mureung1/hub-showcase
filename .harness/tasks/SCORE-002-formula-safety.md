# Task Packet: SCORE-002

## 1. Summary

```text
Task: 점수 공식 1.1.0 누락·fixture·freshness·cluster 안전성 보완
Backlog ID: SCORE-002
Parent Epic: EPIC-03
Type: feature
Owner: N187_정현우
Status: backlog
```

## 2. Goal

현재 1.0.0 공식의 설명 가능한 구조를 유지하면서 누락 metric 과대대표, fixture supported, 오래된 데이터 과대신뢰, 표본 미상 역전과 낮은 근거의 집적 보정을 차단한다.

## 3. Scope

포함:

```text
component coverage 기반 50점 중립 수축
fixture score/confidence/coverage 제외와 hard blocker
known/unknown/administrative_population sample basis
metric별 freshness grace·expire policy
coverage·confidence·fixture·required·peer decision blocker
전체 점포 20개·동일 업종 5개 cluster 최소값
cluster evidence confidence와 effective adjustment
formula version 1.1.0 및 additive response field
API·FE·snapshot·evaluation 회귀
```

제외:

```text
업종별 새 weight 확정
성공 확률 예측
과거 결과 기반 band calibration
전체 업종 자동 지원
새 데이터 provider 추가
```

## 4. Related Documents

- `docs/features/market-score-methodology.md`
- `docs/features/market-analysis.md`
- `docs/data/data-source-mapping.md`
- `docs/development/tasks.md`
- `.harness/tasks/SCORE-001-market-score-formula.md`

## 5. Expected Changes

```text
api/market_score.py: 공식 1.1 계산·schema·blocker
api/market_analysis.py: sample/freshness/peer metadata 입력
api tests: 안전성·호환 회귀
web service/types: additive score field
web UI: blocker·coverage·cluster confidence 설명
snapshot/evaluation: 1.1 재생성과 1.0 비교
docs/run report: 공식 변경 근거와 실제 결과
```

## 6. Acceptance Criteria

- [ ] metric 하나만 있는 component가 해당 metric 점수 전체를 그대로 사용하지 않고 coverage만큼 50점으로 수축된다.
- [ ] fixture는 score, coverage와 confidence에서 제외되고 존재만으로 `insufficient_evidence`가 된다.
- [ ] 표본 미상은 0.40, 전수 행정자료는 manifest 근거가 있을 때만 1.00을 사용한다.
- [ ] fast/cohort/structural freshness가 문서의 grace·expire 공식과 일치한다.
- [ ] `supported`는 confidence·coverage·fixture·필수 metric·peer blocker를 모두 통과해야 한다.
- [ ] 전체 점포 20개 미만의 상권은 집적 보정을 받지 않는다.
- [ ] cluster evidence confidence 0.60 미만은 `specialized_watch`, adjustment 0이다.
- [ ] 충분한 집적 보정은 raw adjustment에 evidence confidence를 곱하고 최종 ±8 범위를 넘지 않는다.
- [ ] 기존 request contract가 동작하고 새 response field는 additive다.
- [ ] formula version이 `1.1.0`으로 바뀌고 기존 1.0 결과와 비교 기록이 남는다.
- [ ] API, FE, snapshot과 평가 test가 함께 통과한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api ruff format --check .
uv run --directory product/apps/api ruff check .
uv run --directory product/apps/api pytest -q
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web test -- --run
pnpm --dir product/apps/web build
uv run --directory product/apps/api python ../../product/scripts/build_market_analysis_snapshot.py
uv run --directory product/apps/api python ../../product/scripts/evaluate_market_analysis.py
python scripts/check_docs_html.py
python scripts/check_task_packet.py --root . --require
git diff --check
```

필수 case:

```text
full official, one metric, empty metrics
full/mixed fixture
stale fast/current structural
unknown/known/administrative sample
tiny/weak/trusted productive/trusted saturated cluster
old request compatibility와 new response schema
```

## 8. Documentation Updates

- [ ] 공식 문서의 구현 상태와 최종 formula version 갱신
- [ ] API·화면의 blocker 한국어 문구 기록
- [ ] snapshot과 evaluation 결과 기록
- [ ] tasks 상태와 Run Report 갱신
- [ ] 1.0과 1.1 차이·known limitation 기록

## 9. Commit Plan

```text
fix(score): harden evidence and missing-data handling

why:
- prevent incomplete or fixture evidence from producing supported high scores

verify:
- api/web tests, snapshot evaluation and docs checks
```

한 번에 구현하지 않고 `missing/fixture → evidence/blocker → cluster → API/FE snapshot` 순으로 작은 commit을 만든다.

## 10. Self-check

- [ ] 첨부 제안을 검증 없이 그대로 복사하지 않았는가?
- [ ] 1.0 결과와 version을 보존했는가?
- [ ] fixture가 어떤 경로에서도 supported가 되지 않는가?
- [ ] missing을 0점 또는 완전한 관측값처럼 처리하지 않는가?
- [ ] 숫자 기준과 계산 근거가 코드·문서·test에서 일치하는가?
- [ ] 성공 확률이나 투자 조언으로 표현하지 않았는가?
