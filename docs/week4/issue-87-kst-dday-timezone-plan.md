# dday 계산 KST 기준으로 수정 (이슈 #87)

> 작성일: 2026-07-27 (월) · 대상 이슈: [#87 D-0 배지가 KST 자정 전후 마감 지난 공고에서 그대로 노출됨](https://github.com/syd348/hub/issues/87)

## 목표 (한 줄)

**`parseDeadline`/`recomputeDday`의 "오늘" 계산을 실행 서버(UTC) 타임존이 아니라 KST
명시적으로 고치고, 크론 스케줄도 KST 자정 직후로 옮겨 sweep 지연을 최소화한다.**

## 현재 상태 (전환 전)

- 사용자가 "D-0으로 마감 지난 공고가 뜬다"고 리포트, "크롤링을 KST 자정 넘어서 진행해야
  한다"고 제안
- 조사 결과 크론 시각이 아니라 **날짜 계산 자체가 UTC 기준**인 게 근본 원인:
  - `crawler/src/mapper.ts`의 `parseDeadline()`, `crawler/src/sweep.ts`의 `recomputeDday()`
    둘 다 `now.getFullYear()/getMonth()/getDate()`(로컬 타임존 getter)로 "오늘"을 계산
  - GitHub Actions 러너 시스템 타임존은 UTC — "오늘"이 UTC 달력 날짜가 됨
  - 실측: `new Date(Date.UTC(2026,6,26,15,0,0))`(=`2026-07-27 00:00 KST`)에서 UTC 기준
    "오늘"을 계산하면 `2026-07-26`으로 나와 실제 KST 날짜보다 하루 뒤처짐
- 사용자 제안대로 크론만 UTC 15:00(KST 00:00)로 옮기면, 그 시각의 UTC 날짜는 KST보다 항상
  하루 뒤처져 있어(`2026-07-26T15:00:00Z`의 UTC 날짜=07-26, KST 날짜=07-27) 오히려 매 실행
  마다 이 오차가 발생 — 스케줄 변경만으로는 해결되지 않음을 사용자에게 설명하고 "둘 다 수정"
  으로 합의

## 범위

### 포함
- `crawler/src/kst.ts` 신설 — `kstToday(now: Date): Date` (UTC+9 오프셋 후 UTC getter로 날짜
  추출, 실행 서버 타임존 무관)
- `parseDeadline`(mapper.ts)·`recomputeDday`(sweep.ts)가 `kstToday()` 사용하도록 변경
- KST 자정 경계 회귀 테스트 추가 (`kst.test.ts` 신규 + `mapper.test.ts`/`sweep.test.ts`에
  회귀 케이스)
- `.github/workflows/crawler.yml` 크론을 `0 15 * * *`(UTC, KST 00:00)로 변경 — sweep 지연
  시간 최소화 목적(근본 수정은 아님, 보완)

### 제외
- 이 버그로 하루 늦게 삭제됐을 수 있는 과거 row 소급 조사 — "늦게 지워짐" 정도의 영향이라
  데이터 손상 없음, 소급 조사 안 함

## 실행 순서

- [x] `crawler/src/kst.ts`에 `kstToday()` 추가
- [x] `mapper.ts`/`sweep.ts`가 `kstToday()` 사용하도록 교체
- [x] `kst.test.ts` 신규 작성 (KST 자정 직후/직전/정오 3케이스)
- [x] `mapper.test.ts`/`sweep.test.ts`에 KST 자정 롤오버 회귀 테스트 추가
- [x] `.github/workflows/crawler.yml` 크론 `0 15 * * *`로 변경, 주석 갱신
- [x] `npm test`(154 passed)/`npm run lint`/`actionlint`/crawler 타입체크 통과

## 완료 기준

- [x] `kstToday()`가 실행 서버 타임존과 무관하게 KST 달력 날짜를 반환한다 (UTC 인스턴트로
      테스트해 검증)
- [x] `parseDeadline`/`recomputeDday`가 KST 자정 롤오버 시각에도 정확한 dday를 계산한다
- [x] 크론이 KST 자정 직후(UTC 15:00)에 실행되도록 스케줄 변경
- [x] 관련 테스트 추가, `npm test`/`npm run lint`/`actionlint`/타입체크 통과

## 리스크 / 결정 필요

| 항목 | 내용 | 기본 방침 |
|------|------|-----------|
| 사용자의 원래 제안(크론 시각만 이동)과 실제 필요한 수정이 다름 | 크론만 옮기면 오히려 매번 오차가 나는 걸 실측으로 확인 | 사용자에게 근본 원인을 설명하고 "날짜 계산 KST 명시화 + 크론 이동" 둘 다 하는 것으로 승인받음 |
| `kstToday()`를 별도 유틸로 분리 vs 각 파일에 인라인 | mapper.ts/sweep.ts 둘 다 필요, 중복 방지 | crawler 내부 공용 유틸(`crawler/src/kst.ts`)로 분리 — client(`shared/`)는 이 계산이 필요 없어 shared로 승격하지 않음 |
