# Task Packet: SCORE-003

## 1. Summary

```text
Task: 업종별 score profile과 과거 결과 기반 calibration
Backlog ID: SCORE-003
Parent Epic: EPIC-03
Type: data
Owner: N187_정현우
Status: backlog
```

## 2. Goal

동일한 가중치를 모든 업종에 적용하는 한계를 줄이고, 여러 분기의 과거 데이터로 peer group·weight·threshold가 미래 결과와 어떤 관계를 갖는지 검증한다.

## 3. Scope

포함:

```text
최소 5개 연속 분기의 evaluation dataset
동일 period/category/market type/radius peer group과 fallback metadata
카페·음식점·베이커리·편의점 profile 가설
metric 상관관계 report
formula 1.0/1.1/category candidate out-of-time backtest
미래 4분기 매출 변화·폐업/생존·순증 결과 비교
승인된 profile·threshold versioning
```

제외:

```text
단일 분기 fixture로 weight 최적화
서울 전체 모든 업종의 동시 profile 제작
개별 점포 성공 확률 주장
검증 없이 ML model 도입
미래 데이터가 입력에 섞이는 random split
```

## 4. Related Documents

- `docs/features/market-score-methodology.md`
- `docs/data/data-source-mapping.md`
- `docs/development/tasks.md`
- `.harness/tasks/SCORE-002-formula-safety.md`
- `.harness/tasks/DB-001-supabase-migration.md`

## 5. Expected Changes

```text
data: multi-period manifest와 품질 report
api: peer group builder·profile registry·version metadata
evaluation: correlation·out-of-time comparison script
tests: peer fallback, no leakage, profile selection, versioning
docs: 가설·결과·승인 또는 보류 근거
```

선행 Gate:

```text
SCORE-002 완료
DB-001 전체 canonical 이관
ANALYSIS-002~004 공간·기간 metric 정의
동일 정의의 5개 이상 분기와 미래 4분기 결과 확보
```

## 6. Acceptance Criteria

- [ ] peer group이 period, canonical category, market type, radius와 실제 fallback level을 기록한다.
- [ ] peer 표본 30개 미만은 자동으로 다른 업종·기간·반경을 섞지 않는다.
- [ ] 카페·음식점·베이커리·편의점 profile 가설과 필요한 데이터가 먼저 문서화된다.
- [ ] `|Spearman rho| ≥ 0.80` metric pair가 report되고 유지·축소·제거 결정 근거가 남는다.
- [ ] 분기 t score가 t 이후 데이터만으로 평가되며 미래 정보 leakage test가 있다.
- [ ] 1.0, 1.1 default와 category candidate가 같은 out-of-time split에서 비교된다.
- [ ] score와 미래 연속 결과의 rank 관계, 상·하위 group 차이, bootstrap interval과 표본 수가 기록된다.
- [ ] 특정 지역·분기 하나에만 의존한 candidate는 승인하지 않는다.
- [ ] 승인되지 않은 업종은 default profile과 `profile_not_calibrated` limitation을 사용한다.
- [ ] weight·threshold 변경은 profile/formula version을 올리고 이전 결과를 덮어쓰지 않는다.
- [ ] 결과를 성공 확률로 표현하지 않는다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest -q
uv run --directory product/apps/api ruff check .
uv run --directory product/apps/api python ../../product/scripts/evaluate_market_analysis.py --help
python scripts/check_docs_html.py
python scripts/check_task_packet.py --root . --require
git diff --check
```

평가 script 실행 명령은 구현 시 고정하되 다음 입력·출력을 필수로 한다.

```text
input: snapshot manifest, train periods, holdout periods, formula/profile versions
output: peer counts, leakage check, correlation, future outcome comparison, blockers
```

## 8. Documentation Updates

- [ ] data mapping에 분기·target·결측·제외 기준 기록
- [ ] score methodology에 승인 profile과 실제 결과 기록
- [ ] experiment 또는 Run Report에 baseline 비교 기록
- [ ] tasks 상태와 남은 미지원 업종 기록
- [ ] 사용자 화면 문구의 상대 비교 한계 재검토

## 9. Commit Plan

```text
feat(score): validate category profiles against historical outcomes

why:
- replace one-size-fits-all weights only when multi-period evidence supports the change

verify:
- peer quality, leakage tests and out-of-time comparison report
```

dataset 준비, peer builder, baseline evaluation, candidate profile을 서로 다른 검증 commit으로 나눈다.

## 10. Self-check

- [ ] 데이터가 부족한데 weight를 임의 확정하지 않았는가?
- [ ] 미래 데이터 leakage가 없는가?
- [ ] 한 업종·기간 결과를 전체 업종에 일반화하지 않았는가?
- [ ] 상관관계와 인과관계를 혼동하지 않았는가?
- [ ] baseline보다 좋아졌다는 주장을 같은 조건에서 검증했는가?
- [ ] 실패·보류 결과도 기록했는가?
