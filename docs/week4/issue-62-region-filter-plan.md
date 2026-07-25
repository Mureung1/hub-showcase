# region 불일치 필터링 + industry 감지율 개선 (이슈 #62)

> 작성일: 2026-07-25 (토) · 대상 이슈: [#62 매칭 시 조건 필터링이 전혀 적용되지 않음](https://github.com/syd348/hub/issues/62)

## 목표 (한 줄)

**region이 안 맞는 지원금은 매칭 결과에서 실제로 제외하고, industry는 필터링 대신 감지율 자체를 높일 수 있는지 조사한다.**

## 현재 상태 (전환 전, 조사 완료)

- #43에서 "완전 필터링하면 사용자가 혼란스러울 수 있어 정렬(가중치) 우선"으로 명시적으로 결정
  (`docs/week3/issue-43-match-plan.md`)했고, 지금까지 그 정책 그대로 유지됨
- `scoreForProfile()`(`server/src/db/subsidies-repo.ts:157-171`)는 region 불일치 시
  `REGION_MISMATCH_PENALTY`(20점)만 감점하고 배열에서 제외하지 않음
- `paginate()`의 `total`은 필터링 없는 전체 배열 길이라, 어떤 프로필이든 항상 전체 건수(1554)가 뜸
- industry는 #52에서 감지율 6.6%(33/500)까지 개선했지만 여전히 낮아 가점만 적용, 페널티/필터 없음

## 범위

### 포함 (이번 이슈)
- **region**: 불일치 시 `REGION_MISMATCH_PENALTY` 감점 대신 완전히 필터링(제외)
- **industry**: 감지율 개선 조사 — bizinfo API의 다른 필드(`pldirSportRealmLclasCodeNm` 분야
  대분류 등) 활용 가능성, 동의어 사전 추가 확장 여지 확인. 개선 여지 있으면 반영, 한계면 문서화
  (필터링은 이번에도 도입하지 않음 — 아래 리스크 표 참고)

### 제외 (다음으로)
- industry 필터링 도입 — 이번 조사로 감지율이 크게 개선되지 않으면 계속 보류
- region 정보가 전혀 없는(hashtags 미포함) 지원금 처리 방식 변경 — 지금처럼 중립 유지(필터링 대상 아님)

## 실행 순서

### 묶음 1 — region 필터링 적용 (승인 필요)
- [ ] `match()`에서 `subsidy.region.length > 0 && !subsidy.region.includes(profile.region)`인
      항목을 스코어링 전에 배열에서 제외
- [ ] `REGION_MISMATCH_PENALTY` 상수·감점 분기 제거 (필터링으로 대체돼 dead code가 됨)
- [ ] `subsidies-repo.test.ts` region 불일치 테스트를 "감점 확인" → "배열에서 제외 확인"으로 수정
- [ ] 수동 검증: 프로필 지역을 바꿔가며 `POST /api/match`의 `total`이 실제로 달라지는지 확인

### 묶음 2 — industry 감지율 개선 조사 (승인 필요)
- [ ] bizinfo API 응답 필드 중 `pldirSportRealmLclasCodeNm`(분야 대분류) 등이 온보딩 5개 업종
      카테고리와 상관관계가 있는지 실 데이터로 표본 조사
- [ ] 기존 동의어 사전(`crawler/src/mapper.ts`의 `extractIndustry`) 확장 여지 확인
- [ ] 개선되면 반영 + backfill, 개선 안 되면 한계를 문서화하고 종료

## 완료 기준

- [ ] region 불일치 지원금은 매칭 결과에서 제외되고, 프로필별로 `total`이 달라진다
- [ ] industry 감지율 개선 조사 결과가 문서로 남는다 (반영 또는 한계 기록)
- [ ] `npm test`/`npm run lint` 통과

## 리스크 / 결정 필요

| 항목 | 내용 | 결정 |
|------|------|-----------|
| region 완전 필터링 vs 감점 | #43 당시엔 "혼란 가능성"으로 감점만 택함 | **필터링으로 정책 변경** (2026-07-25, 사용자 결정) — region 신뢰도 ~98%로 실사용 데이터 기준 안전하다고 재평가 |
| industry 필터링 여부 | 감지율 6.6%로 낮음 | **필터링 안 함 유지** — 실제로 맞는 지원금을 감지 실패만으로 대량 제외할 위험이 더 큼. 감지율 개선을 먼저 시도 |
| region 정보 없는 지원금(hashtags 없음) | 필터링 대상에서 빼야 함 | 기존과 동일하게 중립 유지(필터링 안 함) — "정보 없음"과 "불일치"를 구분해야 하므로 |
