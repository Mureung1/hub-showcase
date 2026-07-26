# 크롤러 fetch 재시도 이중 안전망 (이슈 #74)

> 작성일: 2026-07-26 (일) · 대상 이슈: [#74 크롤러 fetch 실패 시 재시도 로직 없음](https://github.com/syd348/hub/issues/74)

## 목표 (한 줄)

**bizinfo API 호출에 코드 레벨(지수 백오프) 재시도를 먼저 두고, 그래도 실패하면 GitHub Actions 워크플로우 레벨 재시도로 한 번 더 커버하는 이중 안전망을 만든다.**

## 현재 상태 (전환 전)

- `crawler/src/bizinfo-client.ts:53`의 `fetchAnnouncements`가 `fetch(url)`을 한 번만 호출 — 실패
  시 바로 예외를 던짐, 재시도 없음
- `crawler/src/index.ts`(일일 크론 엔트리)의 `main()`이 `fetchAnnouncements` 실패 시 그대로
  reject → 뒤에 있는 `sweepExpired()`(#63, 마감 지난 공고 삭제)까지 같이 안 돌아감
- `crawler/src/backfill.ts`도 같은 `fetchAnnouncements`를 재사용 — 재시도 추가 시 자동으로 혜택
- `.github/workflows/crawler.yml`에 재시도 관련 설정 전혀 없음(step 1회 실행, 실패 시 그대로 job
  실패)
- 2026-07-26 02:35 UTC 실행이 `www.bizinfo.go.kr` 커넥트 타임아웃(10s)으로 실패 — 이전 실행은
  모두 성공(2026-07-23~07-25), 첫 발생 사례라 일시적 네트워크 blip으로 추정

## 범위

### 포함 (이번 이슈)
- `fetchAnnouncements`(bizinfo API 호출)에 지수 백오프 재시도 추가 — 네트워크 에러/5xx만 재시도,
  4xx(클라이언트 에러)는 재시도 없이 즉시 실패
- `.github/workflows/crawler.yml`의 크롤러 실행 step에 워크플로우 레벨 재시도 추가 — 코드 레벨
  재시도가 모두 소진된 뒤에도 실패하면 step 전체(`npm ci` 포함)를 몇 분 간격으로 재시도
- 재시도 동작 단위 테스트 (실패 N회 후 성공 / 4xx는 즉시 실패)

### 제외 (다음으로)
- 첨부파일 다운로드(PDF/HWP, #67 범위)에 대한 재시도 — 같은 헬퍼를 재사용할 수 있지만 #67
  구현 시점에 별도로 적용
- 실패 알림(Slack/이메일 등) — 재시도까지 다 실패했을 때 사람이 알게 하는 방법은 이번 범위 밖,
  필요성 확인되면 별도 이슈
- bizinfo API 자체의 에러 응답 포맷 정식 문서화 — 재시도 판별에 필요한 최소한만 확인

## 실행 순서

### 묶음 1 — 코드 레벨 재시도 (승인 필요)
- [ ] `crawler/src/bizinfo-client.ts`(또는 공용 유틸)에 `withRetry` 헬퍼 추가 — 기본값: 최대 3회
      시도, 백오프 1s/2s/4s
- [ ] 재시도 대상 판별: 네트워크 에러(`fetch` 자체가 throw, 예: `ConnectTimeoutError`) 또는
      5xx 응답은 재시도, 4xx는 즉시 실패(재시도해도 의미 없음 — API 키 오류 등)
- [ ] 실제 bizinfo API가 에러 시 4xx/5xx 중 무엇을 반환하는지 로컬에서 확인(예: 잘못된
      `crtfcKey`로 호출) — 판별 기준이 맞는지 검증
- [ ] `fetchAnnouncements`에 적용 (index.ts/backfill.ts 둘 다 자동 적용됨)
- [ ] 단위 테스트: `fetch`를 mock해 2회 실패 후 3회째 성공하는 케이스, 4xx는 재시도 없이 즉시
      실패하는 케이스

### 묶음 2 — 워크플로우 레벨 재시도 (승인 필요)
- [ ] `.github/workflows/crawler.yml`의 `npm run run -w @hub/crawler` step을 재시도 가능한
      형태로 감싸기(예: `nick-fields/retry` 액션, 버전 pin 필요) — 최대 2회 추가 재시도, 시도
      간격 수 분(코드 레벨과 겹치지 않게 충분히 크게)
- [ ] 재시도 간격이 다음 날 크론 실행(00:00 UTC)과 안 겹치는지 확인
- [ ] 워크플로우 문법 검증(`actionlint` 있으면 사용, 없으면 실제 `workflow_dispatch`로 수동 실행
      확인)

## 완료 기준

- [ ] `fetchAnnouncements` 등 bizinfo API 호출에 지수 백오프 재시도(코드 레벨)가 적용된다
- [ ] 코드 레벨 재시도가 모두 실패해도 GitHub Actions 워크플로우 레벨에서 한 번 더 재시도된다
- [ ] 재시도 중에도 4xx처럼 재시도해도 의미 없는 실패는 즉시 실패 처리된다
- [ ] 관련 단위 테스트 추가, `npm test`/`npm run lint` 통과

## 리스크 / 결정 필요

| 항목 | 내용 | 기본 방침 |
|------|------|-----------|
| 재시도 횟수/백오프 간격 구체값 | 너무 짧으면 blip을 못 넘기고, 너무 길면 크론 다음 실행과 겹칠 수 있음 | 코드 레벨 3회(1s/2s/4s), 워크플로우 레벨 2회(수 분 간격) 기본값으로 시작, 실제 재발 시 조정 |
| bizinfo API 에러 응답 포맷 | 4xx/5xx 판별 기준이 실제 API 동작과 맞는지 미확인 | 묶음 1에서 잘못된 `crtfcKey`로 실제 호출해 확인 후 판별 로직 확정 |
| 워크플로우 재시도 액션 선택 | 서드파티 마켓플레이스 액션(`nick-fields/retry` 등) 신뢰·버전 pin 필요 | 묶음 2에서 커밋 해시로 pin, 대안(자체 bash 재시도 스크립트)도 비교 |
| 실패 알림 여부 | 재시도까지 다 실패하면 아무도 모름(현재도 그럼) | 이번 범위 제외, 필요성 확인되면 별도 이슈로 분리 |

## 오늘 끝나면 다음 (참고)

- **#67**: 첨부파일 다운로드에도 같은 재시도 헬퍼 재사용 검토
