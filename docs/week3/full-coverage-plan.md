# 크롤러 전체 수집 계획 — backfill + 배치 크기 조정

Week 3(#28~#32)에서 만든 크롤러 파이프라인은 "동작 확인"이 목적이라 한 번에 5건만 가져오도록
작게 잡혀 있었다. 실제로 지원 중인 공고를 다 반영하려면 수집 범위를 넓혀야 한다는 걸 실행해보고
나서 알게 됐다 — 이 문서는 그 후속 작업 계획이다.

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

## 앞으로 구현해야 할 것

### 1. 공통 파이프라인 함수로 리팩터

- `crawler/src/index.ts`의 "map → 마감 제외 → upsert" 로직을 `backfill`과 `run`이 공유할 수 있게
  분리 (예: `pipeline.ts` 또는 `index.ts` 내 export 함수)
- `bizinfo-client.ts`의 `fetchAnnouncements()`는 이미 페이지 단위 함수라 그대로 재사용 가능

### 2. `backfill` 스크립트 신규 작성

- `pageIndex`를 1부터 증가시키며 반복 호출, 응답이 빈 배열이거나 `pageUnit`보다 적게 오면 마지막
  페이지로 간주하고 중단
- 페이지마다 map → 마감 제외 → upsert (한 번에 다 모았다가 upsert하지 않고 페이지 단위로 처리 —
  중간에 실패해도 이미 처리한 페이지는 남도록)
- API에 부담 안 주려고 페이지 사이 짧은 지연(예: 200~300ms) 추가
- 진행 상황 로그: `[backfill] N/1433건 처리 중...` 같은 식으로 실시간 확인 가능하게
- `crawler/package.json`에 `"backfill": "tsx src/backfill.ts"` 스크립트 추가

### 3. `run`(기존 cron 실행) 배치 크기 조정

- `index.ts`의 `pageUnit`을 `5` → `200`(제안값, 아래 리스크 표에서 최종 확정)으로 변경
- 매일 최근 200건만 훑는 구조가 되므로, 이미 DB에 있는 공고는 upsert가 그냥 같은 값으로
  덮어쓰기(변화 없음), 새 공고만 추가됨

### 4. 검증

- `backfill` 실행 후 `GET /api/subsidies` 또는 직접 DB 쿼리로 실제 upsert된 건수 확인
  (마감 지난 공고 제외된 수 vs 전체 1433건 대비 비율도 로그로 남기면 좋음)
- `backfill` 재실행해도 중복이 안 생기는지(idempotent) 재확인 — 기존 `upsertSubsidies()`가
  `onConflict: 'id'`라 이론상 안전하지만, 대량 페이지네이션에서도 동일하게 동작하는지 실제로 확인
- `run`(200건) 실행 후에도 정상 동작하는지 확인, GitHub Actions cron도 재트리거해서 확인

### 5. 문서화

- `docs/week3_plan.md` 또는 새 이슈(#33 등)로 정식 등록할지, 아니면 이 문서 하나로 충분한지 결정
- 완료되면 `docs/week3/verification.md`에 backfill 실행 결과(총 upsert 건수, 마감 제외 건수) 추가 기록

## 리스크 / 결정 필요

| 항목 | 내용 | 결정 필요 |
|------|------|-----------|
| `run` 모드 배치 크기 | 200건으로 제안했지만 근거는 "적당히 커 보여서" 수준 | 실제 하루에 새로 올라오는 공고 수를 며칠 관찰하고 조정할지, 지금은 200으로 확정하고 갈지 |
| API 정렬 순서 미보장 | "최신순"이라는 관찰만 있고 공식 보장 없음 | `run` 모드가 새 공고를 놓칠 가능성을 감수할지, 아니면 `run`도 훨씬 더 큰 배치(예: 500)로 안전 마진을 둘지 |
| backfill 소요 시간 | 1433건 ÷ pageUnit(예: 200) ≈ 8번 호출, 지연 포함해도 수 초~수십 초 예상이지만 실측 안 함 | 실행해보고 너무 오래 걸리면 pageUnit을 더 키울지 |
| 마감 지난 공고를 backfill 때도 계속 거를지 | 지금 방침은 `dday < 0`이면 무조건 제외 | 과거 이력 데이터로 남겨두고 싶은 경우가 있을지 (지금은 서비스 목적상 불필요하다고 판단, 재확인 필요) |
| GitHub Actions 실행 시간/비용 | backfill을 cron에 넣지 않고 수동 1회만 실행 | 맞는 방향인지, 아니면 backfill도 워크플로우로 노출해둘지(`workflow_dispatch` input으로 모드 선택 등) |

## 이번 문서의 범위

이 문서는 **계획만** 담고 있고, 실제 코드 구현은 아직 시작 안 했다.
[이슈 #40](https://github.com/syd348/hub/issues/40)으로 등록됨 — `issue-workflow` 스킬대로
묶음 단위 승인 받으며 진행할 예정.
