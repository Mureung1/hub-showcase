# Task Packet: SCORE-001

## 1. Summary

```text
Task: 근거 기반 상권 점수 공식과 특수상권 처리
Backlog ID: SCORE-001
Parent Epic: EPIC-03
Type: feature
Owner: N187_정현우
Status: done
```

## 2. Goal

상권 점수가 어떤 데이터와 공식으로 계산되었는지 API와 문서에서 재현하고, 동일 업종 집적의 긍정·부정 예외를 구분한다.

## 3. Scope

포함:

```text
peer percentile 기반 5개 component
누락 metric 가중치 재정규화
coverage·출처·최신성·표본 기반 신뢰도
LQ와 매출·수요·생존 근거를 결합한 집적효과
최대 ±8점 특수상권 보정
공식 version과 evidence API
```

제외:

```text
머신러닝 성공 예측
가중치 자동 최적화
실제 DB 조회 endpoint
Front 화면 연결
```

## 4. Related Documents

```text
docs/features/market-analysis.md
docs/features/market-score-methodology.md
docs/data/data-source-mapping.md
```

## 5. Expected Changes

```text
api: score model, formula와 endpoint
tests: 집적효과·과포화·근거 부족 case
docs: 공식 1.0.0과 조사 근거
```

## 6. Acceptance Criteria

- [x] 5개 component와 가중치가 코드·문서에서 일치한다.
- [x] 점수와 신뢰도가 별도로 반환된다.
- [x] 누락 metric은 0점이 아니라 가중치 제외와 coverage 감소로 처리된다.
- [x] 생산적 집적상권은 최대 +8점 보정을 받는다.
- [x] 과포화 상권은 최대 -8점 보정을 받는다.
- [x] fixture와 낮은 coverage는 근거 부족 상태가 된다.
- [x] API가 공식 version, 근거와 제한을 함께 반환한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest
uv run --directory product/apps/api ruff check .
uv run --directory product/apps/api ruff format --check .
python scripts/check_docs_html.py
```

수동 확인:

```text
생산적 베이커리 집적 vs 과포화 베이커리 집적 결과
동일 입력의 deterministic response
문서 공식과 코드 constant 대조
```

## 8. Documentation Updates

- [x] 점수 공식 문서 추가
- [x] 상권 분석 스펙에서 공식 문서 연결
- [x] 서울시 공식 데이터와 집적효과 연구 근거 기록
- [x] Run Report 작성

## 9. Commit Plan

```text
feat(score): formalize the evidence-based market score

why:
- explain why a market is strong or risky without treating every cluster as saturation

verify:
- uv run --directory product/apps/api pytest
- uv run --directory product/apps/api ruff check .
- python scripts/check_docs_html.py
```

## 10. Self-check

- [x] 성공 확률처럼 표현하지 않았는가?
- [x] 점수와 confidence를 분리했는가?
- [x] 집적효과 가점에 복수 근거 gate가 있는가?
- [x] 실제·추정·fixture source를 구분했는가?
- [x] 실제 DB peer distribution과 Front 설명 UI를 연결했다.
- [ ] 후속: 반경별 peer distribution과 추가 지표 coverage를 연결한다.
