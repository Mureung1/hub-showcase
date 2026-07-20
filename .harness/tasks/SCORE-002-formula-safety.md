# Task Packet: SCORE-002

## 1. Summary

```text
Task: 점수 공식 1.1.0 누락·fixture·freshness·cluster 안전성 보완
Backlog ID: SCORE-002
Parent Epic: EPIC-03
Type: feature
Owner: N187_정현우
Status: done
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

### 5.1 Code-level contract

기존 request JSON은 계속 검증 가능해야 한다. 새 입력 필드는 기본값을 두고, 새 response 필드는
기존 필드를 제거하거나 이름을 바꾸지 않는 additive 변경으로 구현한다.

```python
SampleBasis = Literal["known", "unknown", "administrative_population"]

class ScoreMetric(BaseModel):
    # 기존 field 유지
    sample_basis: SampleBasis = "unknown"

class MarketScoreRequest(BaseModel):
    # 기존 field 유지
    peer_sample_size: int | None = Field(default=None, ge=0)

class ComponentResult(BaseModel):
    # 기존 field 유지
    observed_score: float | None
    coverage: float
    configured_weight_percent: float

class MetricEvidenceResult(BaseModel):
    metric_key: str
    reliability: float
    freshness_policy: Literal["fast", "cohort", "structural"]
    freshness_grace_days: int
    freshness_expire_days: int
    freshness: float
    sample_basis: SampleBasis
    sample_strength: float
    evidence_strength: float

class ClusterResult(BaseModel):
    # 기존 field 유지
    raw_adjustment: float
    evidence_confidence: float
    evidence_keys: list[str]

class MarketScoreResponse(BaseModel):
    # 기존 field 유지
    decision_blockers: list[str]
    metric_evidence: list[MetricEvidenceResult]
```

검증 규칙:

```text
sample_basis=known -> sample_size 필수
sample_basis=unknown -> sample_size가 없어야 함
sample_basis=administrative_population -> importer/분석 조립부에서 검증된 manifest 근거로만 설정
peer_sample_size=None 또는 30 미만 -> peer_sample_too_small
필수 metric = sales_per_store, foot_traffic
필수 metric 누락 또는 fixture -> required_metric_missing
```

기존 client가 `sample_basis`를 보내지 않고 `sample_size`만 보내는 경우에는 하위 호환을 위해
`known`으로 해석한다. 둘 다 보내지 않으면 `unknown`이다. 기존 client가 `peer_sample_size`를
보내지 않으면 요청은 성공하지만 `peer_sample_too_small` blocker로 `insufficient_evidence`가 된다.

### 5.2 Calculation boundaries

```text
1. fixture를 먼저 분리해 score, coverage, confidence, reason, cluster 근거에서 제외한다.
2. 5개 component를 항상 생성하고, 관측값이 없으면 observed_score=null, score=50으로 둔다.
3. component coverage로 observed score를 50점 방향으로 수축한다.
4. base score는 고정 component weight 합으로 계산한다. available weight 재정규화는 제거한다.
5. metric evidence strength를 reliability 45% + freshness 35% + sample 20%로 계산한다.
6. confidence는 전체 configured metric weight를 분모로 사용해 coverage와 근거 강도를 함께 반영한다.
7. cluster는 점포 수와 LQ gate를 먼저 적용한 뒤, 실제 판정 metric의 evidence strength를 적용한다.
8. blocker를 계산하고 blocker가 하나라도 있으면 decision_status=insufficient_evidence로 둔다.
9. reason에는 fixture와 미사용 metric을 포함하지 않는다.
```

`weight_percent`는 기존 response 호환을 위해 유지하고 `configured_weight_percent`와 같은 고정
component weight를 반환한다. 누락에 따른 실제 반영 정도는 `coverage`와 `observed_score`로
분리해 설명한다.

### 5.3 File-by-file execution order

1. `product/apps/api/tests/test_market_score.py`
   - 1.0 baseline 방향성을 고정하고 13개 필수 안전성 case를 실패 test로 추가한다.
2. `product/apps/api/src/localtwin_api/market_score.py`
   - 새 model field와 validator, evidence helper, component 수축, blocker, cluster 보정을 구현한다.
3. `product/apps/api/src/localtwin_api/market_analysis.py`
   - canonical metric에 `sample_basis="known"`, `peer_sample_size=len(enriched)`를 전달한다.
4. `product/apps/api/tests/test_market_analysis.py`
   - 실제 조립 response의 1.1.0, blocker, metric evidence와 deterministic 결과를 고정한다.
5. `product/apps/web/src/services/marketAnalysis.ts`
   - 새 response field를 optional이 아닌 1.1 contract로 반영한다.
6. `product/apps/web/src/App.tsx` 및 service test
   - blocker code를 한국어로 변환하고 coverage·집적 근거를 evidence dialog에 표시한다.
7. `product/scripts/build_market_analysis_snapshot.py`
   - 새 canonical response로 12개 snapshot을 재생성한다.
8. `product/scripts/evaluate_market_analysis.py`
   - version, blocker, fixture 부재, 범위, deterministic snapshot gate를 1.1 기준으로 바꾼다.
9. `docs/features/market-score-methodology.md`, `docs/development/tasks.md`, Run Report
   - 구현 결과와 1.0/1.1 비교 결과만 기록한다.

`product/apps/web/src/App.tsx`에는 사용자의 미커밋 변경이 있으므로 구현 시작 전에 해당 diff를
다시 확인한다. 충돌하거나 변경 소유권이 불분명하면 UI 단계만 멈추고 API·test 결과와 함께
사용자에게 알린다.

## 6. Acceptance Criteria

- [x] metric 하나만 있는 component가 해당 metric 점수 전체를 그대로 사용하지 않고 coverage만큼 50점으로 수축된다.
- [x] fixture는 score, coverage와 confidence에서 제외되고 존재만으로 `insufficient_evidence`가 된다.
- [x] 표본 미상은 0.40, 전수 행정자료는 manifest 근거가 있을 때만 1.00을 사용한다.
- [x] fast/cohort/structural freshness가 문서의 grace·expire 공식과 일치한다.
- [x] `supported`는 confidence·coverage·fixture·필수 metric·peer blocker를 모두 통과해야 한다.
- [x] 전체 점포 20개 미만의 상권은 집적 보정을 받지 않는다.
- [x] cluster evidence confidence 0.60 미만은 `specialized_watch`, adjustment 0이다.
- [x] 충분한 집적 보정은 raw adjustment에 evidence confidence를 곱하고 최종 ±8 범위를 넘지 않는다.
- [x] 기존 request contract가 동작하고 새 response field는 additive다.
- [x] formula version이 `1.1.0`으로 바뀌고 기존 1.0 결과와 비교 기록이 남는다.
- [x] API, FE, snapshot과 평가 test가 함께 통과한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api ruff format --check .
uv run --directory product/apps/api ruff check .
uv run --directory product/apps/api pytest -q
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web test -- --run
pnpm --dir product/apps/web build
uv run --directory product/apps/api python ../../scripts/build_market_analysis_snapshot.py
uv run --directory product/apps/api python ../../scripts/evaluate_market_analysis.py
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

- [x] 공식 문서의 구현 상태와 최종 formula version 갱신
- [x] API·화면의 blocker 한국어 문구 기록
- [x] snapshot과 evaluation 결과 기록
- [x] tasks 상태와 Run Report 갱신
- [x] 1.0과 1.1 차이·known limitation 기록

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

- [x] 첨부 제안을 검증 없이 그대로 복사하지 않았는가?
- [x] 1.0 결과와 version을 보존했는가?
- [x] fixture가 어떤 경로에서도 supported가 되지 않는가?
- [x] missing을 0점 또는 완전한 관측값처럼 처리하지 않는가?
- [x] 숫자 기준과 계산 근거가 코드·문서·test에서 일치하는가?
- [x] 성공 확률이나 투자 조언으로 표현하지 않았는가?
- [ ] Jira에 최종 commit과 Run Report 링크를 연결했는가?
