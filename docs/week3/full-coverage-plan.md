# 크롤러 전체 수집 계획 — backfill + 배치 크기 조정

Week 3(#28~#32)에서 만든 크롤러 파이프라인은 "동작 확인"이 목적이라 한 번에 5건만 가져오도록
작게 잡혀 있었다. 실제로 지원 중인 공고를 다 반영하려면 수집 범위를 넓혀야 한다는 걸 실행해보고
나서 알게 됐다 — 이 문서는 그 후속 작업 계획이다.

> **완료 (2026-07-23)**: 아래 "현재 상태"는 착수 전 스냅샷, "구현 완료" 섹션이 실제 결과다.

## 현재 상태 (2026-07-23)

- **완료된 것 (#28~#32, 전부 머지됨)**
  - bizinfo Open API 인증키 발급, 실제 응답 필드 확인
  - `crawler/` 워크스페이스: `bizinfo-client.ts`(API 클라이언트), `mapper.ts`(정규화),
    `upsert.ts`(Supabase upsert), `supabase.ts`(전용 DB 클라이언트)
  - `crawler/src/index.ts` — fetch → map → 마감 지난 공고 제외 → upsert 파이프라인
  - `.github/workflows/crawler.yml` — 매일 00:00 UTC(09:00 KST) cron + 수동 실행,
    GitHub Secrets(`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`BIZINFO_API_KEY`) 등록 완료,
    실제 워크플로우 1회 성공 실행 확인됨
  - 단위 테스트 12건(`mapper.test.ts`) + 전체 33건 통과
- **현재 한계**
  - `index.ts`가 `fetchAnnouncements({ pageIndex: 1, pageUnit: 5 })`로 **딱 5건만** 가져옴
    (하드코딩값, 파이프라인 동작 확인용이었지 실사용 목적이 아니었음)
  - 지금 Supabase `subsidies` 테이블은 샘플 8건 + 실데이터 5건 = **총 13건**뿐
  - API 전체 공고 수(`totCnt`)는 약 **1433건** — 그중 실제로 지원 중인(마감 안 된) 건수는 별도 확인
    안 됨
  - API에 "모집 중만" 걸러주는 파라미터가 없어서, 페이지네이션으로 가져온 뒤 크롤러가 자체적으로
    `dday >= 0`(마감 안 지남) 기준으로 걸러내는 구조

## 이번에 정한 방향

크롤러 실행을 **두 가지 모드**로 나눈다.

| 모드 | 언제 쓰나 | 범위 |
|------|-----------|------|
| **backfill** | 최초 1회, 수동 실행 | 전체 페이지네이션 순회 — `totCnt`까지 전부 가져와서 마감 안 지난 것만 upsert |
| **run** (기존 cron) | 매일 자동 실행 | 최근 N건(예: 200건)만 가져와서 upsert — 새로 올라온 공고 위주로 갱신 |

**전제/가정**: API 응답이 최신순(newest-first)으로 온다는 걸 지금까지 호출해본 결과로는
관찰했지만, 공식 문서로 보장된 건 아니다. `run` 모드가 "최근 N건 = 새 공고 놓치지 않음"이
성립하려면 이 가정이 계속 맞아야 한다 — 아래 리스크 표 참고.

## 구현 완료 (2026-07-23, 이슈 #40)

### 1. 공통 파이프라인 함수로 리팩터 — 완료
- [x] `crawler/src/pipeline.ts` 신규 — `processAnnouncements()`(map → 마감 제외 → upsert), `index.ts`/`backfill.ts`가 공유

### 2. `backfill` 스크립트 신규 작성 — 완료
- [x] `crawler/src/backfill.ts` — `pageIndex` 1부터 증가, 응답이 `PAGE_UNIT`(200)보다 적으면 마지막
      페이지로 간주하고 중단
- [x] 페이지 단위로 upsert (중간 실패해도 이미 처리한 페이지는 반영됨)
- [x] 페이지 사이 300ms 지연
- [x] 진행 상황 로그 (`[backfill] page N: ... (누적 X/Y건)`)
- [x] `crawler/package.json`에 `"backfill": "tsx src/backfill.ts"` 추가

### 3. `run`(cron) 배치 크기 조정 — 완료
- [x] `index.ts`의 `pageUnit`을 `5` → `200`으로 변경, `pipeline.ts` 공용 로직 사용하도록 재작성

### 4. 검증 — 완료, 그리고 중요한 버그 하나 더 발견/수정
- [x] 실제 `npm run backfill -w @hub/crawler` 실행 → **1500건 전부 조회, 1500건 upsert, 마감
      제외 0건** (API가 이미 활성 공고 위주로 주는 것으로 보임). 재실행해도 동일 수치 —
      upsert idempotent 확인
- [x] **대량 실데이터에서 새 버그 발견**: `reqstMthPapersCn`(접수방법)이 없는 공고가 실제로
      존재해 `normalizeWhitespace()`에서 크래시. 5~13건 규모 테스트로는 안 보였던 문제.
      `BizinfoAnnouncement`의 `reqstMthPapersCn`/`refrncNm`/`excInsttNm`/`trgetNm`을
      optional로 정정하고, `mapper.ts`에 fallback 처리 추가 (테스트 2건 추가, 총 35건 통과)
- [x] **더 심각한 버그 발견/수정**: 백필로 DB가 1508건(샘플 8 + 실데이터 1500)이 됐는데
      `GET /api/subsidies`가 **1000건까지만** 반환. PostgREST가 `.range()` 없이는 기본
      1000행 제한을 건다는 걸 이번에 처음 확인 — `server/src/db/subsidies-repo.ts`의
      `loadAll()`을 1000건씩 페이지네이션 순회하도록 수정, `curl` 확인 결과 1508건 정상 반환
- [x] GitHub Actions cron(`run`, pageUnit=200)은 별도 재트리거 없이 다음 스케줄(매일
      00:00 UTC)에 자동으로 새 로직 반영됨

### 5. 문서화 — 진행 중
- [x] 이슈 #40으로 등록됨 (Week 3 마일스톤 편입)
- [ ] `docs/week3/verification.md`에 이번 backfill 결과 + 두 버그 수정 내용 추가 기록

## 리스크 / 결정 필요

| 항목 | 내용 | 상태 |
|------|------|-----------|
| `run` 모드 배치 크기 | 200건으로 제안했지만 근거는 "적당히 커 보여서" 수준 | 200으로 확정하고 진행. 실제 하루 신규 공고 수는 며칠 cron 로그 관찰 후 재조정 |
| API 정렬 순서 미보장 | "최신순"이라는 관찰만 있고 공식 보장 없음 | 여전히 미해결 — `run`이 새 공고를 놓칠 가능성 남아있음. 문제 되면 배치를 키우거나 정기 백필로 보완 |
| backfill 소요 시간 | 1500건 ÷ 200 = 8번 호출 | **실측 완료** — 지연(300ms) 포함 수십 초 내 완료, 문제없는 수준 |
| 마감 지난 공고를 backfill 때도 계속 거를지 | `dday < 0`이면 무조건 제외 | 이번 백필에선 마감 제외 0건 — 실제로 활성 공고 위주로 오는 것으로 보여 당장은 이슈 아님 |
| GitHub Actions 실행 시간/비용 | backfill을 cron에 넣지 않고 수동 1회만 실행 | 유지 — backfill은 최초 1회 + 향후 필요시 수동 실행, cron은 `run`(일일 200건)만 담당 |

## 이번 문서의 범위

[이슈 #40](https://github.com/syd348/hub/issues/40)으로 등록돼 구현 완료됨 (2026-07-23).
`docs/week3/verification.md`에 최종 검증 기록 추가 예정.
