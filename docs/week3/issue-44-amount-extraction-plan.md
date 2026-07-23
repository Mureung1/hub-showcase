# 지원금액 추출 계획 — bsnsSumryCn 정규식 파싱 (이슈 #44)

> 작성일: 2026-07-23 · 대상 이슈: [#44 지원사업 개요(bsnsSumryCn) 구조화 추출](https://github.com/syd348/hub/issues/44)

## 목표 (한 줄)

**크롤러가 `bsnsSumryCn` 원문에서 정규식으로 지원금액을 추출해, 지금 전부 고정값인 `amount`
fallback을 실제 값으로 대체한다.**

## 현재 상태 (전환 전)

- `crawler/src/mapper.ts:74` — `amount`는 조건 없이 `FALLBACK_AMOUNT`('공고문 참조') 고정.
  `bsnsSumryCn`은 `BizinfoAnnouncement` 타입에도, API 응답에도 있지만 매퍼가 아예 사용하지 않음.
- 실크롤링 1500건(`PBLN_...`) 전수 조사 결과(2026-07-23) — `amount` fallback 비율 **100%
  (1500/1500)**. `match`도 100% 고정(`NEUTRAL_MATCH=50`)이지만 그건 [#43](https://github.com/syd348/hub/issues/43) 범위.
- `qualifications`/`documents`는 이미 `trgetNm`/`printFileNm` 실값을 쓰고 있어 fallback 비율
  0/1500 — #44 완료 기준 중 이 부분은 사실상 이미 달성된 상태. **이번 이슈는 amount 추출에 집중한다.**
- 실제 API 원문 샘플 조사(2026-07-23, 5건 상세 확인)로 다음 패턴을 확인:
  - `"업소당 1개의 노후 간판 교체 설치비 최대 200만원 지원"`
  - `"업체당 검사비용 최대 200만원 이내 지원"`
  - `"자세한 지원내용 공고문 참조"` ← 진짜로 금액 정보가 없는 공고도 존재 (융자 조건만 있고 정액
    지원이 없는 경우 등) — 이런 케이스는 fallback을 유지하는 게 맞다.

## 범위

### 포함 (이번 이슈)
- `bsnsSumryCn`에서 `"최대 N(만|천만|억)원"` 패턴을 추출하는 `extractAmount()` 함수
- `mapAnnouncementToSubsidy()`에 연결 — 추출 실패 시 기존 `FALLBACK_AMOUNT` 유지
- `mapper.test.ts`에 케이스 추가 (만원/천만원/억원 추출, 미매칭 fallback, 오탐 방지)
- 기존 Supabase 1500건에도 소급 반영 (재backfill)
- 검증: 재실행 후 fallback 비율 재측정 + 수동 샘플 대조

### 제외 (다음으로)
- `qualifications`/`documents` 추가 정교화 — 이미 실값 사용 중이라 이번엔 후순위
- Claude API 기반 추출 — 이번엔 정규식으로 먼저 시도, 회수율이 낮으면 후속 이슈에서 재검토
- [#43](https://github.com/syd348/hub/issues/43) match 점수/조건 필터 — 별도 문서
  [issue-43-match-plan.md](issue-43-match-plan.md)

## 실행 순서

### 묶음 1 — `extractAmount()` 함수 + 단위 테스트 (~30분) — **완료 (2026-07-23)**
- [x] `crawler/src/mapper.ts`에 `extractAmount(bsnsSumryCn)` 추가 — 억/천만/백만/만 단위 + 소수점
      (실API 검증 중 백만/억 단위가 흔함을 발견해 최초 설계보다 범위 확장)
- [x] `mapper.test.ts`에 케이스 11개 추가 (정상 추출 / fallback / 오탐 방지 / 단위별 / 소수점)
- [x] `npm test -w @hub/crawler`로 확인 — 25/25 통과

### 묶음 2 — 파이프라인 연결 + 실데이터 검증 (~20분) — **완료 (2026-07-23)**
- [x] `mapAnnouncementToSubsidy`에서 `extractAmount(item.bsnsSumryCn) ?? FALLBACK_AMOUNT`로 교체
- [x] 실제 API 300건으로 로컬 스크립트 돌려 추출 성공률 확인 — **65/300 = 21.7%** 채워짐,
      수동 샘플 10건 원문 대조 전부 일치
- [x] (발견) `server/src/db/subsidies-repo.ts`·`src/data/mockSubsidies.ts`의 `parseAmountForSort`가
      천만/만 단위만 인식해 백만/억 단위 실데이터가 정렬 시 0 취급될 위험 확인 → 두 곳 모두
      억/천만/백만/만 + 소수점 인식하도록 함께 수정

### 묶음 3 — 기존 데이터 소급 반영 (~10분, **Supabase 실데이터 갱신 — 승인 필요**) — **완료 (2026-07-23)**
- [x] `npm run backfill -w @hub/crawler` 재실행 — 8페이지, 1500건 전부 upsert 성공
- [x] `GET /api/subsidies`로 fallback 비율 재확인 — **346/1500(23.1%) 채워짐, 1154/1500(76.9%) fallback
      유지** (300건 샘플 21.7%와 일관된 비율). 수동 스팟체크(부천시 내일채움공제 "최대 7만원") 원문과
      일치 확인

## 완료 기준 — **전체 완료 (2026-07-23)**

- [x] `bsnsSumryCn`에서 금액 추출 시 fallback 대신 실제 값이 반영된다
- [x] 추출 실패 시 기존 fallback 문구가 유지된다 (빈 문자열/undefined 노출 없음)
- [x] `mapper.test.ts` 케이스로 정상 추출/오탐 방지가 검증된다 (11개 케이스, 25/25 전체 통과)
- [x] 1500건 기준 fallback 비율이 눈에 띄게 감소했음을 수치로 확인한다 — **100% → 76.9%**
      (346/1500건, 23.1% 채워짐)

## 리스크 / 결정 필요

| 항목 | 내용 | 제안 방침 |
|------|------|-----------|
| 정규식 오탐 | "5인 미만"/"3년 이내"처럼 금액이 아닌 숫자를 잘못 추출할 위험 | 반드시 "원" 단위(만원/천만원/억원)로 끝나는 패턴만 매칭, %/년/인 등 다른 단위 앞 숫자는 제외 |
| 여러 금액 언급 | 한 공고에 금액이 2개 이상(지원금+자기부담금 등) 등장 가능 | "최대"/"한도" 키워드 근접 매칭 우선, 없으면 첫 매칭 사용 — 오분류 사례는 수동 샘플 대조 시 기록 |
| 회수율이 낮으면 | 정규식으로 못 잡는 표현이 많으면 | 이번 이슈 완료 기준은 "100%→유의미한 개선"까지만, 잔여분은 Claude API 추출 여부를 별도 이슈로 재논의 |
| 소급 반영 범위 | 기존 1500건도 갱신할지, 신규 수집분만 할지 | 소급 반영(묶음 3) — 안 하면 다음 정기 배치까지 개선이 체감 안 됨. 사용자 승인 후 진행 |

## 다음 이슈 (참고)

- **#43**: match 점수/조건 필터 — 별도 문서 [issue-43-match-plan.md](issue-43-match-plan.md) (서로
  의존성 없어 병행 진행 가능)
