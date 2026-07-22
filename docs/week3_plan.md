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
  - [ ] `crawler/` npm workspace 추가 (`package.json`, TS 설정, 루트 `workspaces`에 등록)
  - [ ] API 클라이언트: `crtfcKey`는 `.env`로, 페이지네이션(`pageUnit`/`pageIndex`) 처리
  - [ ] 원본 응답을 로컬 JSON 또는 콘솔로 확인 (Supabase 적재는 다음 이슈)
- **완료 기준**: 로컬에서 크롤러 스크립트를 실행해 실제 API 응답 N건을 확인할 수 있다.

### [30/P0/수] 매핑·정규화 로직
- **목표**: API 응답을 `Subsidy` 타입으로 안전하게 변환하는 함수를 만든다.
- **작업**
  - [ ] `crawler/src/mapper.ts` — 월요일 매핑표대로 변환, `dday`는 `reqstDt` 종료일 기준 계산
  - [ ] 원본 공고 고유 id로 중복 판단 (재수집 시 동일 공고 재처리 방지)
  - [ ] 매핑 함수 단위 테스트 — 실제 API 응답 샘플(월요일에 확보) 기준 케이스 포함
- **완료 기준**: 실제 API 응답 샘플이 `Subsidy` 형태로 정확히 변환되는 것을 테스트로 검증한다.

### [31/P1/목] Supabase upsert 파이프라인
- **목표**: 변환된 데이터를 `subsidies` 테이블에 실제로 채워 넣는다.
- **작업**
  - [ ] `supabase/schema.sql` 확장 검토 — 원본 공고 id, 원문 URL, 수집 시각 등 실데이터 특성상
        필요한 컬럼이 있는지 (기존 `subsidies` 스키마는 샘플 데이터 기준으로 설계됨)
  - [ ] `crawler/src/upsert.ts` — 매핑 결과를 Supabase에 upsert (`onConflict` 키 = 원본 공고 id)
  - [ ] 기존 샘플 8건과의 공존 방식 결정 (병행 유지 vs 실데이터로 교체)
- **완료 기준**: 실제 API에서 가져온 데이터가 Supabase에 upsert되고 `GET /api/subsidies`로 확인된다.

### [32/P1/금] GitHub Actions cron + 검증 문서화
- **목표**: 크롤러가 주기적으로 자동 실행되고, 결과가 검증 문서로 남는다.
- **작업**
  - [ ] `.github/workflows/crawler.yml` — cron 표현식으로 주기 실행 (빈도는 결정 필요, 아래 표 참고)
  - [ ] 실행 실패 시 로그/알림 정책 (최소: Actions 로그로 확인 가능하게)
  - [ ] `docs/week3/verification.md` — day2/day6 검증 문서와 동일한 형식(`[코드]`/`[API]`/`[DB]`)으로
        전체 파이프라인 검증 결과 기록
- **완료 기준**: cron 워크플로우가 최소 1회 성공 실행되고, 결과가 문서화된다.

---

## 완료 기준 (Week 3 전체)

- [ ] bizinfo API 인증키가 발급되고 크롤러가 실제 데이터를 가져온다
- [ ] API 응답이 `Subsidy` 타입으로 정규화되어 Supabase에 upsert된다
- [ ] GitHub Actions cron으로 주기 실행이 최소 1회 성공한다
- [ ] 매핑 정책·검증 결과가 문서로 남는다

## 리스크 / 결정 필요

| 항목 | 내용 | 제안 방침 |
|------|------|-----------|
| API 키 승인 소요 시간 | 개인 신청은 즉시 발급, 기업 신청만 1~2일 | 낮은 리스크로 재평가. 개인 신청으로 진행, 그래도 월요일 최우선 처리 |
| 응답 필드 부족 (`qualifications`/`documents`/`method`/`contact`) | `Subsidy` 타입 다수 필드에 대응 API 필드 없음 | 이번 주는 원문 링크 안내 위주로 채우고, AI 요약/정교한 파싱은 로드맵 2주차 항목으로 후순위 |
| 매칭 조건 필터 (업종/지역) | API가 구조화된 업종/지역 코드를 주지 않음 (해시태그 정도) | 이번 주는 수집·저장까지만. 조건 필터 고도화는 3주차 매칭 알고리즘 이슈로 이관 |
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
