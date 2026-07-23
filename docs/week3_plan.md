---
name: crawler week plan
overview: >-
  CLAUDE.md "1주차에 결정할 것"과 ProjectIntro.tsx 로드맵의 "1주차: 데이터 소스 확정 + 크롤러
  프로토타입"에 해당하는 작업. 지금까지(Week 2 마일스톤)는 샘플 데이터로 FE-BE-DB 수직 슬라이스를
  완성했고, 이번 주는 기업마당(bizinfo.go.kr) 실데이터를 Supabase에 채워 넣는 파이프라인을 만든다.
todos:
  - id: apply-api-key
    content: bizinfo.go.kr Open API 인증키 신청 (월요일 최우선)
    status: pending
  - id: crawler-scaffold
    content: crawler/ npm workspace 스캐폴딩 + API 클라이언트
    status: pending
  - id: mapping-normalize
    content: API 응답 → Subsidy 타입 매핑/정규화 함수
    status: pending
  - id: supabase-upsert
    content: 크롤러 결과를 subsidies 테이블에 upsert
    status: pending
  - id: cron-schedule
    content: GitHub Actions cron으로 주기 실행 + 검증 문서화
    status: pending
isProject: false
---

# Week 3 — 기업마당 실데이터 크롤러

> 작성일: 2026-07-22 · 대상: `crawler/` 신규 구축, "1주차" 스코프(CLAUDE.md 기준)를 지금 진행

## 목표 (한 줄)

**기업마당 Open API에서 지원사업 공고를 가져와 `Subsidy` 타입으로 정규화한 뒤 Supabase `subsidies`
테이블에 자동으로 채워 넣는 파이프라인을 완성한다.**

## 사전 조사 결과 (2026-07-22)

- **공식 REST API 존재** — 스크래핑이 아니라 API 호출. `GET https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do`
  (JSON/XML 선택 가능). robots.txt/이용약관 리스크 없음.
- **인증키(`crtfcKey`) 발급 소요 시간** — 신청 폼(기관명·이메일·전화·시스템명·IP/URL) 제출 후 발급.
  **개인 신청은 즉시 발급**, 사업자(기업) 신청은 사업자등록증 검토로 1~2일 소요. 이 프로젝트는
  개인 신청이라 지연 리스크가 낮음. "기관(기업)명" 필드엔 개인명/프로젝트명 입력 가능(법인 제한 문구 없음).
- **주요 파라미터**: `crtfcKey`(필수), `dataType`(json/rss), `pageUnit`/`pageIndex`.
- **응답 필드 (2026-07-22, 실제 호출로 확인 — 아래가 정확한 값)**:
  `pblancNm`(공고명), `pblancId`(공고 고유id, `PBLN_...`), `jrsdInsttNm`/`excInsttNm`(소관/수행기관),
  `reqstBeginEndDe`(`"2026-07-20 ~ 2026-08-14"` 형식 신청기간), `bsnsSumryCn`(사업개요, HTML 포함),
  `trgetNm`(지원대상), `refrncNm`(문의처, 전화+이메일 텍스트 혼합), `reqstMthPapersCn`(접수방법),
  `pblancUrl`(원문 상세페이지 URL), `pldirSportRealmLclasCodeNm`(분야 대분류), `hashtags`, `totCnt`,
  `printFileNm`/`printFlpthNm`(첨부파일명/링크), `creatPnttm`/`updtPnttm`(등록/수정일시)
- **매핑안 (초안)**: `pblancNm→name`, `jrsdInsttNm→org`, `reqstBeginEndDe`의 종료일 파싱→`deadline`/`dday`,
  `pblancUrl→whereUrl`/`where`, `refrncNm→contact`, `reqstMthPapersCn→how`, `pblancId`→upsert 중복
  판단 키
- **갭 (실제 확인됨)**: `amount`(지원금액), `qualifications[]`(구조화 자격요건), `documents[]`(구조화
  서류목록), `match`(매칭점수)에 대응하는 API 필드가 없다 — `bsnsSumryCn` 본문에 산문으로만 섞여
  있음. 본문에서 정규식/AI로 추출하는 건 후순위로 미루고, **fallback 값 확정 (2026-07-22)**:
  - `qualifications`/`documents`: `['공고문 원문에서 확인해주세요']` — 빈 배열이면 상세 화면에서
    섹션 헤더("신청 자격"/"필요 서류")만 뜨고 리스트가 텅 비어 보여서, 안내 문구 1개를 넣어 대체
  - `amount`: `'공고문 참조'` 고정 문구
  - `match`: `50` (중립값) — 실제 조건 기반 매칭 점수가 아니라 3주차 매칭 알고리즘 전까지의
    임시값임을 크롤러 코드에 주석으로 명시. `0`으로 두면 "전혀 안 맞는 지원금"처럼 오인될 수 있어
    제외
- **대안(참고)**: 공공데이터포털에 "중소기업지원사업목록" 파일데이터(CSV, `data.go.kr`)가 별도로
  있음 — API 키 발급이 늦어질 때 임시 시드로 쓸 수 있는 폴백 후보.

## 범위

### 포함
- bizinfo Open API 인증키 신청·발급
- `crawler/` npm workspace 신규 생성 (CLAUDE.md 디렉토리 구조에 이미 예정된 위치)
- API 응답 → `Subsidy` 타입 매핑/정규화 (부족한 필드는 명시적 fallback 정책)
- Supabase `subsidies` upsert 파이프라인 (원본 공고 id 기준 중복 방지)
- GitHub Actions cron으로 주기 실행

### 제외
- AI 요약(Claude API) 연동 — 로드맵상 2주차 항목, 이번 주 범위 아님
- 업종/지역 구조화 매칭 필터 고도화 — 3주차 매칭 알고리즘 범위 (기존 `subsidies-repo.ts` 리스크와 동일선상)
- K-스타트업·소진공 등 다른 데이터 소스 — CLAUDE.md 기준 후순위
- 기존 `sample-subsidies.ts` 완전 제거 — 이번 주는 실데이터 upsert 파이프라인 검증까지, 샘플 대체 시점은 별도 판단

---

## 요일별 이슈

### [28/P0/월] bizinfo API 인증키 신청 + 필드 매핑 설계
- **목표**: API 신청을 최우선으로 넣고, 응답 필드 → `Subsidy` 타입 매핑표를 문서화한다.
- **작업**
  - [x] bizinfo.go.kr API 사용 신청 폼 제출 — 개인 신청, 즉시 발급 확인 (2026-07-22)
  - [x] 승인 지연 대비 결정 — **불필요로 판명** (개인 신청 즉시 발급이라 CSV 폴백 안 씀)
  - [x] 실제 API 호출로 응답 필드 확인 (`curl` 3건 테스트, 200 OK) — 위 "사전 조사 결과" 매핑안 참고
  - [x] `qualifications`/`documents`/`amount`/`match` fallback 문구 확정 (위 "갭" 항목 참고)
- **완료 기준**: 인증키 발급 완료, 매핑표가 문서로 남는다. **완료 (2026-07-22)**

### [29/P0/화] `crawler/` 워크스페이스 + API 클라이언트
- **목표**: 실제 API를 호출해 원본 응답을 로컬에서 확인할 수 있는 스캐폴딩을 만든다.
- **작업**
  - [x] `crawler/` npm workspace 추가 (`package.json`, `tsconfig.json`, 루트 `workspaces`에 등록)
  - [x] API 클라이언트(`bizinfo-client.ts`) — `BIZINFO_API_KEY`는 `.env`(`env.ts`가 로드), 페이지네이션(`pageUnit`/`pageIndex`) 처리
  - [x] `src/index.ts` 실행 스크립트로 콘솔 출력 확인 (`npm run fetch:sample -w @hub/crawler`)
  - [x] `vitest.config.ts`에 `crawler/src/**/*.test.ts` 추가 (다음 이슈부터 테스트 작성 가능하도록)
- **완료 기준**: 로컬에서 크롤러 스크립트를 실행해 실제 API 응답 N건을 확인할 수 있다. **완료 (2026-07-22)** — 5건 수신, 소상공인 관련 실제 공고 포함
- **발견한 엣지 케이스**: `reqstBeginEndDe`가 항상 `"YYYY-MM-DD ~ YYYY-MM-DD"` 형식은 아니고
  `"예산 소진시까지"` 같은 자유 텍스트도 옴 — #30 매핑/정규화에서 `dday` 계산 시 처리 필요

### [30/P0/수] 매핑·정규화 로직
- **목표**: API 응답을 `Subsidy` 타입으로 안전하게 변환하는 함수를 만든다.
- **작업**
  - [x] `crawler/src/mapper.ts` — `mapAnnouncementToSubsidy()`, `#28` 매핑안대로 변환
  - [x] `parseDeadline()` — `reqstBeginEndDe` 종료일 기준 `deadline`/`dday` 계산. "예산 소진시까지"
        같은 비-날짜 텍스트는 원문 유지 + `dday=9999`(정렬 시 뒤로 밀림)로 처리 (#29에서 발견한
        엣지 케이스 대응)
  - [x] `inferMethod()` — 접수방법 원문에서 온라인/방문/온라인+방문/기타 짧은 라벨 유추
  - [x] `pblancId`를 `Subsidy.id`로 그대로 사용 → 원본 공고 고유 id 기반 중복 판단(#31 upsert의
        `onConflict` 키로 재사용)
  - [x] `trgetNm`/`printFileNm`이 있으면 `qualifications`/`documents`에 실제 값 반영, 없으면
        #28에서 정한 안내 문구로 대체 (완전 fallback보다 실데이터 활용도를 높임)
  - [x] 매핑 함수 단위 테스트 12건 (`mapper.test.ts`) — 날짜 파싱, 방법 유추, 필드 누락 케이스,
        여러 줄 텍스트 정리 포함
  - [x] 실제 API 응답 5건에 매퍼를 직접 적용해 결과 확인 (임시 스크립트, 전부 정상 매핑)
- **완료 기준**: 실제 API 응답 샘플이 `Subsidy` 형태로 정확히 변환되는 것을 테스트로 검증한다.
  **완료 (2026-07-22)** — 단위 테스트 12건 + 실제 API 5건 수동 검증

### [31/P1/목] Supabase upsert 파이프라인
- **목표**: 변환된 데이터를 `subsidies` 테이블에 실제로 채워 넣는다.
- **작업**
  - [x] `supabase/schema.sql` 확장 검토 — **불필요로 판명**. `Subsidy` 타입 필드가 기존 컬럼과
        1:1 대응해서(매핑은 #28~#30에서 이미 확정) 새 컬럼 없이 그대로 upsert 가능
  - [x] `crawler/src/supabase.ts` — 크롤러 전용 Supabase 클라이언트 (server와 별도 워크스페이스라
        각자 둠, 로직은 `server/src/db/supabase.ts`와 동일 패턴)
  - [x] `crawler/src/upsert.ts` — `upsertSubsidies()`, `onConflict: 'id'`(원본 공고 `pblancId`)로
        재수집 시 중복 방지
  - [x] `crawler/src/index.ts` — 전체 파이프라인(fetch → map → 마감 지난 공고 제외 → upsert)으로
        재작성, 이미 마감된(`dday < 0`) 공고는 upsert 전 필터링 (#30에서 남겨둔 미해결 질문 해소)
  - [x] 기존 샘플 8건과의 공존 방식 — **병행 유지로 결정**. 크롤러 id(`PBLN_...`)와 샘플 id(`1`~`8`)가
        체계가 달라 충돌 없이 자연스럽게 공존
- **완료 기준**: 실제 API에서 가져온 데이터가 Supabase에 upsert되고 `GET /api/subsidies`로 확인된다.
  **완료 (2026-07-23)** — `npm run run -w @hub/crawler` 실행 → 5건 upsert → `GET /api/subsidies`
  total 8(샘플) + 5(실데이터) = 13건 확인. 재실행해도 13건 유지(중복 없음, upsert 정상 동작)

### [32/P1/금] GitHub Actions cron + 검증 문서화
- **목표**: 크롤러가 주기적으로 자동 실행되고, 결과가 검증 문서로 남는다.
- **작업**
  - [x] `.github/workflows/crawler.yml` — 매일 00:00 UTC(09:00 KST) 스케줄 + `workflow_dispatch`
        수동 실행
  - [x] 실행 실패 시 로그 확인 — 기본 Actions 로그로 충분 (별도 알림 없음)
  - [x] `docs/week3/verification.md` — day2/day6 검증 문서와 동일한 형식(`[코드]`/`[API]`/`[DB]`/
        `[CI]`)으로 전체 파이프라인(#28~#32) 검증 결과 기록
  - [x] `.gitignore`에서 `.github/` 제거 — 그동안 워크플로우 파일이 커밋된 적 없었던 원인이었음
        (CLAUDE.md가 설명하던 존재하지 않는 `pr-checks.yml`과 같은 원인)
  - [x] GitHub repo secrets 등록 (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`BIZINFO_API_KEY`)
  - [x] 캠퍼스 레포(`N106_신서연` 브랜치) PR에는 `.github/`를 포함하지 않도록 동기화 절차를
        `.cursor/skills/issue-workflow/SKILL.md`에 문서화 (로컬 전용)
- **완료 기준**: cron 워크플로우가 최소 1회 성공 실행되고, 결과가 문서화된다.
  **완료 (2026-07-23)** — 머지 후 `gh workflow run crawler.yml --ref main`으로 트리거,
  [실행 성공](https://github.com/syd348/hub/actions/runs/29983403708) 확인 (`5건 upsert 완료`)

---

## 완료 기준 (Week 3 전체)

- [x] bizinfo API 인증키가 발급되고 크롤러가 실제 데이터를 가져온다
- [x] API 응답이 `Subsidy` 타입으로 정규화되어 Supabase에 upsert된다
- [x] GitHub Actions cron으로 주기 실행이 최소 1회 성공한다
- [x] 매핑 정책·검증 결과가 문서로 남는다

**Week 3 (#28~#32) 전체 완료 (2026-07-23)**

> **후속 작업 (2026-07-23)**: 실제 실행해보니 `index.ts`가 5건만 가져오도록 하드코딩돼 있어
> 지원 중인 공고를 다 반영하지 못하는 걸 발견. 전체 백필(backfill) + 일일 배치 크기 조정 계획을
> [`docs/week3/full-coverage-plan.md`](week3/full-coverage-plan.md)에 정리하고
> [이슈 #40](https://github.com/syd348/hub/issues/40)으로 등록함 (아직 미구현).

## 후속 이슈 (#43·#44) — 3~4주차 범위, 마일스톤 없이 등록 (2026-07-23)

리스크 표 검토 중 완료 기준이 있는 미착수 작업 2건을 이슈로 등록했다. 아직 시작 전.

### [#43] 매칭 조건 필터 + 점수 알고리즘 구현
- **목표**: 온보딩 프로필(업종/지역/직원수/연매출/업력) 기준 조건 필터링 + 매칭 점수 계산
- **작업**
  - [ ] `subsidies` 스키마에 업종/지역 등 구조화 컬럼 추가 여부 결정
  - [ ] 프로필-지원금 조건 비교 로직 구현 (필터 또는 가중치)
  - [ ] `match` 점수를 조건 부합도 기반으로 계산 (현재 mock 고정값/크롤러 중립값 50 대체)
  - [ ] 크롤러의 `trgetNm` 등 실데이터 필드 활용 여부 검토
- **완료 기준**: 업종/지역 조건에 맞는 지원금만 필터링되고, 조건 부합도에 따라 `match` 점수가
  실제로 계산되어 반환된다.

### [#44] bsnsSumryCn 구조화 추출 (amount/qualifications/documents)
- **목표**: 크롤러가 가져오는 사업개요(`bsnsSumryCn`)에서 지원금액·자격요건·서류를 추출해
  #28~#30에서 정한 fallback 문구를 실제 값으로 대체
- **작업**
  - [ ] 정규식 규칙 파싱 vs Claude API 추출 방식 결정
  - [ ] `amount` 추출 (실패 시 기존 fallback 유지)
  - [ ] `qualifications[]`/`documents[]` 추출
  - [ ] 추출 정확도 검증 방법 정하고 실제 수집 데이터로 확인
- **완료 기준**: 크롤러가 수집한 공고 중 일정 비율 이상에서 fallback 문구 대신 실제 값이 채워진다.

## 리스크 / 결정 필요

| 항목 | 내용 | 제안 방침 |
|------|------|-----------|
| API 키 승인 소요 시간 | 개인 신청은 즉시 발급, 기업 신청만 1~2일 | 낮은 리스크로 재평가. 개인 신청으로 진행, 그래도 월요일 최우선 처리 |
| 응답 필드 부족 (`qualifications`/`documents`/`method`/`contact`) | `Subsidy` 타입 다수 필드에 대응 API 필드 없음 | 이번 주는 원문 링크 안내 위주로 채우고, AI 요약/정교한 파싱은 로드맵 4주차 항목으로 후순위 → [이슈 #44](https://github.com/syd348/hub/issues/44)로 등록 (2026-07-23) |
| 매칭 조건 필터 (업종/지역) | API가 구조화된 업종/지역 코드를 주지 않음 (해시태그 정도) | 이번 주는 수집·저장까지만. 조건 필터 고도화는 3주차 매칭 알고리즘 이슈로 이관 → [이슈 #43](https://github.com/syd348/hub/issues/43)으로 등록 (2026-07-23) |
| 크롤러 실행 위치 | `server/` 안 vs 별도 `crawler/` 워크스페이스 | CLAUDE.md 디렉토리 구조대로 `crawler/` 분리, GitHub Actions cron이 직접 실행 (서버 상시 구동 불필요) |
| 기존 샘플 데이터(`sample-subsidies.ts`) | 언제 대체하나 | 이번 주는 실데이터 upsert 파이프라인 검증까지만, 완전 대체는 검증 후 별도 판단 |
| cron 실행 주기 | 하루 1회 vs 여러 번 | 공고 갱신 빈도가 낮을 것으로 예상 — 하루 1회로 시작, 필요시 조정 |

## 진행 방식

Week 2와 동일하게 `issue-workflow` 스킬 흐름을 따른다: 계획 문서화(본 문서) → GitHub 이슈·라벨·마일스톤
생성 → 이슈 단위로 묶음별 승인 받으며 진행 → 검증 → 커밋 → PR(`Closes #N`).

- **마일스톤**: [`Week 3 Crawler Pipeline`](https://github.com/syd348/hub/milestone/2)
- **라벨**: `week-3`(기존 라벨 설명 오류 수정), `area:crawler`(신규 추가)
- **이슈**: [#28](https://github.com/syd348/hub/issues/28) [#29](https://github.com/syd348/hub/issues/29) [#30](https://github.com/syd348/hub/issues/30) [#31](https://github.com/syd348/hub/issues/31) [#32](https://github.com/syd348/hub/issues/32) 생성 완료 (2026-07-22)
  — 순번은 GitHub 실제 이슈 번호(#28~#32)를 그대로 사용 (PR이 번호를 함께 소비해 #13~#17과 어긋나므로 실제 번호로 통일)
