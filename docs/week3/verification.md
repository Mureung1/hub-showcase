# 기능 검증 체크리스트 — 기업마당 크롤러 파이프라인 (#28~#32)

`docs/week2/day6-verification-agent.md`와 동일한 형식으로, Week 3 전체 파이프라인(API 인증키 →
크롤러 워크스페이스 → 매핑 → Supabase upsert → cron 자동화)을 검증한다.

## 검증 방식 범례

| 표시 | 방법 |
|------|------|
| `[코드]` | 소스 코드를 직접 읽어 로직 경로를 추적 |
| `[API]` | 실제 bizinfo.go.kr API를 `curl` 또는 크롤러 스크립트로 직접 호출해 확인 |
| `[DB]` | Supabase에 직접 쿼리하거나 `GET /api/subsidies`로 row 존재/개수를 확인 |
| `[CI]` | GitHub Actions 워크플로우 실행 결과로 확인 |

---

## 1. API 인증키 + 응답 필드 (#28)

- [x] `[API]` bizinfo.go.kr Open API 인증키 발급 (개인 신청, 즉시 발급 확인)
- [x] `[API]` `curl`로 실제 API 호출 → 200 OK, 응답 필드 확인(`pblancNm`/`jrsdInsttNm`/
      `reqstBeginEndDe`/`bsnsSumryCn` 등 — 사전 조사 때 추정한 필드명과 다름을 확인 후 정정)
- [x] `[코드]` API가 제공하지 않는 필드(`amount`/`qualifications`/`documents`/`match`)의
      fallback 값 확정 ([docs/week3_plan.md](../week3_plan.md) 참고)

## 2. crawler 워크스페이스 + API 클라이언트 (#29)

- [x] `[코드]` `crawler/` npm workspace, 루트 `workspaces`/`lint`에 등록
      ([package.json](../../package.json))
- [x] `[코드]` `fetchAnnouncements()`가 `crtfcKey`/`dataType`/`pageIndex`/`pageUnit` 파라미터로
      페이지네이션 처리 ([crawler/src/bizinfo-client.ts](../../crawler/src/bizinfo-client.ts))
- [x] `[API]` `npm run run -w @hub/crawler` 로컬 실행 → 실제 데이터 5건 수신 확인

## 3. 매핑·정규화 (#30)

- [x] `[코드]` `mapAnnouncementToSubsidy()`가 `Subsidy` 타입의 모든 필드를 채움
      ([crawler/src/mapper.ts](../../crawler/src/mapper.ts))
- [x] `[코드]` `parseDeadline()` — 날짜 범위는 종료일 기준 `dday` 계산, `"예산 소진시까지"` 같은
      비-날짜 텍스트는 원문 유지 + `dday=9999`
- [x] `[코드]` 단위 테스트 12건 통과 (`crawler/src/mapper.test.ts`)
- [x] `[API]` 실제 API 응답 5건에 매퍼를 직접 적용해 결과 확인 (임시 스크립트)

## 4. Supabase upsert (#31)

- [x] `[코드]` `upsertSubsidies()`가 `onConflict: 'id'`로 중복 방지
      ([crawler/src/upsert.ts](../../crawler/src/upsert.ts))
- [x] `[코드]` `index.ts` 파이프라인이 `dday < 0`(이미 마감)인 공고를 upsert 전 제외
- [x] `[DB]` `npm run run -w @hub/crawler` 실행 → Supabase에 실제 upsert
- [x] `[API]` `GET /api/subsidies` → `total: 13` (샘플 8건 + 실데이터 5건) 확인
- [x] `[DB]` 재실행 후 `total` 동일(13) 확인 — upsert가 중복을 만들지 않음(idempotent)

## 5. GitHub Actions cron (#32)

- [x] `[코드]` `.github/workflows/crawler.yml` — 매일 00:00 UTC(09:00 KST) 스케줄 +
      `workflow_dispatch` 수동 실행 지원
- [x] `[코드]` `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`BIZINFO_API_KEY`를 GitHub repo
      secrets로 등록, 워크플로우에서 env로 주입
- [x] `[CI]` 실제 워크플로우 1회 성공 실행 — **완료 (2026-07-23)**. PR #38 머지 후
      `gh workflow run crawler.yml --ref main`으로 수동 트리거,
      [실행 #29983403708](https://github.com/syd348/hub/actions/runs/29983403708) `success`.
      로그에서 `[crawler] 5건 upsert 완료` 확인 — CI 환경에서도 secrets 정상 주입, API 호출
      + Supabase upsert 전부 성공

## 6. 자동 검사

- [x] `npm run build -w @hub/server`, `npm run build -w @hub/crawler`, `npm run build:client` 통과
- [x] `npm test` — 4 files, 33 tests 통과
- [x] `npm run lint` (client + server + crawler) 통과

## 7. 전체 수집 backfill (#40)

- [x] `[코드]` `crawler/src/pipeline.ts` 공용화, `crawler/src/backfill.ts` 신규 (페이지네이션
      순회 + 페이지별 upsert)
- [x] `[API]` `npm run backfill -w @hub/crawler` 실행 → **1500건 전부 조회/upsert, 마감 제외
      0건**. 재실행해도 동일 수치(idempotent 확인)
- [x] `[DB]` `GET /api/subsidies` → `total: 1508`(샘플 8 + 실데이터 1500) 확인
- [x] `[코드]` `npm test` — 2건 추가(총 35건) 통과, `npm run lint`/`build` 통과

---

## 발견한 이슈 (수정 완료)

1. **`.github/`가 `.gitignore`에 있었음** — 이전 세션에서 CLAUDE.md가 설명하던
   `pr-checks.yml`이 실제 `main`에 없었던 이유가 이거였다(삭제된 게 아니라 애초에 커밋된 적
   없음). 이번에 `.gitignore`에서 제거하고 정상적으로 커밋 대상으로 전환. 대신 캠퍼스 레포
   PR에는 `.github/`가 안 들어가도록 별도 동기화 절차를 로컬 스킬 문서에 남김.
2. **`reqstBeginEndDe` 비-날짜 텍스트** — #29에서 발견, #30에서 처리 완료 (위 3번 참고).
3. **`dday < 0`(마감 지난 공고) 필터링 위치** — #30 PR에서 미해결로 남겼던 질문. #31에서
   "매핑은 순수 변환만, 필터링은 파이프라인(`index.ts`)의 책임"으로 결론.
4. **`reqstMthPapersCn`/`refrncNm` 등이 없는 공고 존재** — #40 백필(1500건 규모)에서 처음 발견.
   기존 5~13건 규모 테스트로는 안 보였던 문제. `BizinfoAnnouncement`의 해당 필드들을
   optional로 정정하고 `mapper.ts`에 fallback 추가.
5. **`GET /api/subsidies`가 1000건까지만 반환** — PostgREST가 `.range()` 없이는 기본 1000행
   제한을 건다는 걸 DB가 1508건이 되고서야 처음 확인. `subsidies-repo.ts`의 `loadAll()`을
   1000건씩 페이지네이션 순회하도록 수정, curl로 1508건 정상 반환 확인. 지금까지 8~13건
   규모로만 테스트해서 전혀 몰랐던 제약이었음.

## 남은 리스크 / 다음에 볼 것

1. **cron 1회 성공 실행 확인이 이 PR 머지 이후로 밀림** — 위 5번 항목. 머지 직후
   `gh workflow run crawler.yml` 수동 트리거로 확인 예정.
2. **README/CLAUDE.md가 크롤러 기술 스택을 "Cheerio"로 여전히 설명** — 실제로는 API+`fetch`.
   문서 정정은 이번 PR 범위 밖 (`docs/week3/retrospective.md`에 별도 기록됨).
3. **upsert 부분 실패/재시도 처리 없음** — #31 PR에서 남긴 미해결 질문. cron이 매일 도는
   구조라 지금 단순함이 맞는지는 다음에 재검토 필요.
