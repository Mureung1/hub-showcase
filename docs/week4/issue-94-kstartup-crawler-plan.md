# 오늘 할 일 — K-Startup 크롤링 소스 추가 (이슈 #94)

> 작성일: 2026-07-28 (화) · 대상 이슈: [#94 K-Startup 크롤링 소스 추가 (업력 10년 이내 창업기업 전용)](https://github.com/syd348/hub/issues/94)

## 오늘의 목표 (한 줄)

K-Startup(`nidview.k-startup.go.kr`) 진행중 공고를 bizinfo와 같은 `Subsidy` 파이프라인에
통합해, 업력 짧은 창업기업/소상공인 대상 커버리지를 늘린다.

## 현재 상태 (전환 전)

- `crawler/src/bizinfo-client.ts` + `mapper.ts` + `pipeline.ts`가 bizinfo 전용으로 강결합돼
  있음 — `processAnnouncements(items: BizinfoAnnouncement[])`가 `mapAnnouncementToSubsidy`를
  직접 호출
- `upsertSubsidies(subsidies: Subsidy[])`(`upsert.ts`)는 이미 소스 무관 제네릭이라 그대로 재사용
  가능
- K-Startup 실제 엔드포인트/필드는 이슈 #90 이후 세션에서 실측 완료(`docs/week4/issue-80-data-source-expansion-plan.md`
  "2026-07-28 추가 조사" 참고): `GET https://nidview.k-startup.go.kr/view/public/call/kisedKstartupService/announcementInformation?page=N&perPage=N`,
  인증키 불필요, `rcrt_prgs_yn` 쿼리는 서버가 필터링 안 함(클라이언트 재필터링 필요)

## 범위

### 포함 (오늘)

- `crawler/src/kstartup-client.ts` — 진행중 공고 조회 + 클라이언트 사이드 `rcrt_prgs_yn` 필터
- `crawler/src/kstartup-mapper.ts` — K-Startup 응답을 `Subsidy`로 매핑 (아래 "필드 매핑 결정" 참고)
- `crawler/src/kstartup-pipeline.ts` — K-Startup 전용 경량 파이프라인(AI 추출 불필요 — 첨부파일
  필드 자체가 없음, 아래 "전제 재확인" 참고), `upsertSubsidies` 재사용
- `crawler/src/index.ts`에 K-Startup 조회+upsert 단계 추가 (bizinfo와 순차 실행)
- id 네임스페이스 분리로 **ID 레벨 중복만** 방지 (아래 "리스크/결정" 참고 — 내용 레벨 dedup은 범위 제외)
- `npm test` / `npm run lint` 통과

### 제외 (오늘 아님)

- 소상공인24 추가 — 이슈 #95(보류)
- K-Startup 첨부파일 AI 추출 — 애초에 첨부파일 필드가 없어서 해당 없음(전제 재확인 참고)
- `backfill.ts`에 K-Startup 추가 — 오늘은 daily(`index.ts`)만, 필요하면 후속 이슈

## 전제 재확인 (구현 시작 전)

- `docs/week4/issue-80-data-source-expansion-plan.md`의 K-Startup 상세 조사 섹션: "아쉬운 점 —
  첨부파일 다운로드 링크 필드 없음(`detl_pg_url` 상세페이지만 있음)" — 즉 이슈 #67 AI 구조화
  추출 파이프라인(`enrichAnnouncements`/`document-cache`/`applyAiExtraction`)을 K-Startup에
  적용할 근거 자체가 없다. K-Startup 전용 파이프라인은 attachment/AI 단계를 아예 건너뛰는
  경량 버전으로 설계 — bizinfo `pipeline.ts`보다 훨씬 단순해짐.
- 2026-07-28 실측 재확인(160건): `rcrt_prgs_yn=Y` 쿼리 파라미터가 서버에서 무시됨 — 응답에
  Y/N 섞여 나오므로 클라이언트에서 반드시 재필터링해야 함(계획 문서에도 이미 반영됨).

## 필드 매핑 결정

| Subsidy 필드 | K-Startup 필드 | 비고 |
|---|---|---|
| id | `KS_${pbanc_sn}` | bizinfo `PBLN_...`와 접두사로 네임스페이스 분리(id 충돌 방지) |
| name | `biz_pbanc_nm` | |
| org | `pbanc_ntrp_nm` | 예: "중소벤처기업부 장관" |
| amount | `extractAmount(pbanc_ctnt)` 재사용, 실패시 fallback | 실측 금액 패턴 검출률 1.2%로 매우 낮음 — 대부분 fallback |
| dday/deadline | `pbanc_rcpt_bgng_dt`~`pbanc_rcpt_end_dt`(YYYYMMDD, 구분자 없음) | bizinfo와 날짜 포맷 달라 별도 파서 필요, `kstToday()` 재사용 |
| method/how | `aply_mthd_onli_rcpt_istc`/`aply_mthd_vst_rcpt_istc` 등 존재 여부 | bizinfo `inferMethod`(자유텍스트 정규식)와 달리 필드 존재 여부로 판단 — 더 신뢰도 높음 |
| qualifications | `aply_trgt_ctnt` | |
| documents | fallback 고정값 | 첨부파일 필드 없음 |
| where/whereUrl | `pbanc_ntrp_nm` / `detl_pg_url` | |
| contact | `prch_cnpl_no` | |
| region | `supt_regin`(단일 문자열, "전국"이면 전체 지역) | bizinfo는 배열(hashtags 기반) — 단일값→배열 변환 함수 필요 |
| industry | `[]` (미매핑) | `aply_trgt`가 "일반기업" 등 뭉뚱그려져 있어 업종 추출 근거 없음 |
| businessYears/businessYearsMax | `biz_enyy`(콤마 목록) | 토큰 중 최댓값을 `businessYearsMax`로, 원문을 `businessYears`로 저장 |
| supportRealm | `supt_biz_clsfc` → 번역표(아래) | 사용자 확인 결과(2026-07-28) 오늘 바로 매핑 |

### supportRealm 번역표 (사용자 확정, 2026-07-28)

추측 매핑 — bizinfo 8개 카테고리 기준 가장 가까운 값으로 대응, 확정된 공식 매핑 기준은 아님:

| `supt_biz_clsfc` | `supportRealm` |
|---|---|
| 사업화 | 경영 |
| 시설·공간·보육 | 창업 |
| 멘토링·컨설팅·교육 | 창업 |
| 행사·네트워크 | 기타 |
| 창업교육 | 창업 |
| 판로·해외진출 | 수출 |
| 글로벌 | 수출 |
| 정책자금 | 금융 |
| (그 외/미확인 값) | 기타 |

## 리스크 / 결정 필요 (2026-07-28 확정)

| 항목 | 내용 | 결정 |
|------|------|-----------|
| **supportRealm taxonomy 불일치** | K-Startup `supt_biz_clsfc`는 bizinfo `supportRealm`과 다른 분류 체계 | **확정**: 위 번역표대로 오늘 매핑(추측 매핑임을 주석에 명시) |
| **내용 레벨 중복 제거** | bizinfo·K-Startup이 같은 정부 프로그램을 재게시하는 경우(#80 리스크 표) | **확정**: 제목 유사도 기반 dedup을 오늘 구현(`crawler/src/dedup.ts`) — 정규화 후 문자 bigram Jaccard 유사도, 임계값 이상이면 K-Startup 항목을 스킵(bizinfo를 canonical로 취급) |
| `biz_enyy` 토큰 파싱 | "예비창업자,1년미만,2년미만,..." 형태 — 콤마 분리 후 각 토큰을 숫자로 매핑(예비창업자=0, N년미만=N), 최댓값 채택 | 온보딩 `BUSINESS_YEARS_MIN`(subsidies-repo.ts)과 동일 원칙으로 매칭 가능하게 설계 |
| region 단일값→배열 변환 | `supt_regin`이 "전국"이면 REGIONS 전체, 광역시/도 단일값이면 해당 1개만 | bizinfo `extractRegions`와 다른 함수 필요(콤마 파싱이 아니라 단일값 매핑) |
| 제목 유사도 임계값 미세 조정 | 정확한 임계값은 실제 중복 사례로 검증해야 하지만 오늘은 실제 중복 사례 표본이 없음 | 보수적으로 높은 임계값(오탐 방지 우선)으로 시작 — 운영 데이터로 나중에 조정 여지 남김 |

## 실행 순서

### 묶음 1 — K-Startup API 클라이언트 (~20분)
- [ ] `crawler/src/kstartup-client.ts`: 타입 정의(`KstartupAnnouncement`) + `fetchKstartupAnnouncements()`
      (페이지네이션 + `withRetry` + 클라이언트 사이드 `rcrt_prgs_yn` 필터)

### 묶음 2 — K-Startup → Subsidy 매퍼 (~30분)
- [ ] `crawler/src/kstartup-mapper.ts`: 위 필드 매핑 표대로 구현(날짜 파서, region 변환,
      biz_enyy 파서, method 판단 포함)

### 묶음 3 — 제목 유사도 dedup 모듈 (~20분)
- [ ] `crawler/src/dedup.ts`: 제목 정규화 + 문자 bigram Jaccard 유사도 + 임계값 판정 함수
- [ ] `dedup.test.ts`: 명백히 같은 제목/명백히 다른 제목 경계 케이스 위주

### 묶음 4 — 경량 파이프라인 + index.ts 통합 (~20분)
- [ ] `crawler/src/kstartup-pipeline.ts`: mapper → dday 필터 → 기존 subsidies 이름과 dedup
      비교 → 중복 스킵 → `upsertSubsidies`
- [ ] `crawler/src/index.ts`: K-Startup 조회+upsert 단계 추가(bizinfo 다음 순차 실행, 실패해도
      bizinfo 결과에 영향 없게 별도 try/catch)

### 묶음 5 — 테스트 + 검증 (~20분)
- [ ] `kstartup-client.test.ts`, `kstartup-mapper.test.ts` 작성
- [ ] `npm test` / `npm run lint` / `npm run build -w @hub/server`(타입 영향 확인)

## 완료 기준

- [ ] K-Startup 진행중 공고가 크롤러 실행 시 `Subsidy`로 정규화돼 upsert됨
- [ ] bizinfo와 id 충돌 없음(네임스페이스 분리 확인)
- [ ] supportRealm이 번역표대로 매핑됨
- [ ] 제목 유사도 dedup으로 bizinfo와 겹치는 K-Startup 항목이 스킵됨
- [ ] `npm test` / `npm run lint` 통과

## 오늘 끝나면 다음 (참고)

- supportRealm 번역표는 추측 매핑 — 실제 운영 데이터로 지켜보며 조정 필요
- dedup 임계값은 보수적으로 시작 — 실제 중복 사례로 조정 필요
- 소상공인24(#95)는 여전히 브라우저 구조 확인 대기 중
