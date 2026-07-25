# 첨부파일 AI 구조화 추출 (이슈 #67)

> 작성일: 2026-07-25 (토) · 대상 이슈: [#67 첨부파일(PDF/HWP) AI 구조화 추출로 매칭 조건 커버리지 개선](https://github.com/syd348/hub/issues/67)

## 목표 (한 줄)

**공고 첨부파일(PDF 우선)을 Claude API로 읽어 employees/revenue/businessYears 조건을 구조화 추출하고, 매칭 점수에 반영한다.**

## 현재 상태 (조사 완료, 2026-07-25)

- `#62` 조사에서 `bsnsSumryCn`(사업개요 요약문) 정규식 추출은 신호가 낮음(업력 11.7%, 직원수
  7.7%, 매출 2~6%) — `docs/week4/issue-62-region-filter-plan.md` 참고
- bizinfo API의 `printFileNm`(첨부파일명)/`printFlpthNm`(다운로드 링크)는 **300건 표본 100%
  커버리지** — 모든 공고에 원본 공고문 첨부파일이 있음
- 확장자 분포(300건): **PDF 65%, HWP 23%, HWPX 12%**
- 실제 PDF 1건 다운로드 확인 — 25페이지, 정상 다운로드됨. 해당 문서는 상세페이지(`pblancUrl`)엔
  없던 지원 규모 정보가 있었음(첨부파일이 상세페이지보다 정보량이 많다는 간접 근거)
- Claude API는 PDF를 네이티브로 지원(Messages API document content block) — 별도 OCR·렌더링
  도구 불필요. `@anthropic-ai/sdk` 미설치, `ANTHROPIC_API_KEY`는 `.env.example`에 자리만 있음
- HWP(구버전 바이너리)·HWPX(zip+XML)는 Claude가 직접 못 읽음 — 변환 필요

## 범위

### 포함 (이번 이슈)
- PDF 첨부파일 다운로드 → Claude API에 document로 전달 → employees/revenue/businessYears
  조건을 JSON으로 구조화 추출
- HWPX(zip+XML) 파서 추가해 텍스트 추출 후 Claude에 텍스트로 전달
- `atchFileId` 기준 캐싱 — 이미 추출한 문서는 재호출하지 않음(신규 공고에만 실행)
- `subsidies` 스키마에 구조화 컬럼 추가 (예: `employee_limit int`, `business_year_limit numeric`,
  `revenue_limit_krw bigint` — 정확한 타입/단위는 묶음 1 스파이크에서 실제 추출 결과 보고 확정)
- `scoreForProfile()`에 가점 반영 (region/industry와 같은 패턴 — 추출 안 되면 중립, 페널티는
  정확도 검증 후 결정)
- 실측 기준 Claude API 비용·처리 시간 문서화

### 제외 (다음으로)
- HWP(구버전 바이너리) 처리 — LibreOffice 등 변환 도구 도입 여부는 묶음 4에서 별도 결정,
  이번 스코프엔 포함 안 될 수도 있음(23% 분량, PDF/HWPX만으로 77% 커버 가능하면 후순위 가능)
- creditScore 추출 — UI에도 없는 선택 필드라 이번엔 제외
- 기존 `amount`/`qualifications`/`documents` 정규식 추출 방식(#44) 교체 — 이번 이슈는 새 필드만
  다루고 기존 로직은 손대지 않음

## 실행 순서

### 묶음 1 — 기술 검증(spike): 실제 추출 정확도·비용 확인 (승인 필요)
- [ ] `@anthropic-ai/sdk` 크롤러 워크스페이스에 추가, `ANTHROPIC_API_KEY` 설정
- [ ] 실제 PDF 첨부파일 10~20건을 다운로드해 Claude API로 구조화 추출 시도 (프롬프트 설계 포함)
- [ ] 추출 결과를 원문 PDF와 수동 대조해 정확도 확인
- [ ] 1건당 토큰 사용량·비용·응답 시간 실측
- [ ] HWPX 샘플 몇 건을 압축 해제해 XML 텍스트 추출이 실제로 되는지 확인

### 묶음 2 — 크롤러 파이프라인 통합 (승인 필요)
- [ ] 첨부파일 다운로드 함수 추가, PDF/HWPX 포맷 분기
- [ ] `atchFileId` 기준 캐싱(이미 처리한 id는 skip) — 신규 공고만 추출 대상
- [ ] 다운로드/추출 실패 시 fallback(기존처럼 정보 없음으로 처리, 크롤러 전체 실패로 이어지지 않게)
- [ ] `crawler/src/index.ts` 파이프라인에 통합, 단위 테스트 추가

### 묶음 3 — 스키마 + 매칭 반영 (승인 필요)
- [ ] `supabase/schema.sql`에 구조화 컬럼 추가 + `server/src/db/mappers.ts` 반영
- [ ] `scoreForProfile()`에 가점/필터 반영 (정확도에 따라 결정, 아래 리스크 표)
- [ ] 기존 수집 데이터 backfill 재실행

### 묶음 4 — HWP(구버전) 처리 여부 결정 (승인 필요, 스코프 조정 가능)
- [ ] LibreOffice headless 변환 도입 비용 대비 23% 커버리지 증가가 가치 있는지 판단
- [ ] 도입 결정 시 GitHub Actions 러너에 설치 + 변환 단계 추가, 보류 결정 시 문서화하고 종료

## 완료 기준

- [ ] 신규 공고 첨부파일에서 employees/businessYears 조건이 정규식(11.7%/7.7%)보다 높은 비율로
      추출된다
- [ ] 이미 처리한 문서는 재호출하지 않는 캐싱 구조가 확인된다
- [ ] 실측 기준 Claude API 비용이 문서화된다
- [ ] 매칭 점수에 반영된다
- [ ] `npm test`/`npm run lint` 통과

## 리스크 / 결정 필요

| 항목 | 내용 | 결정 |
|------|------|-----------|
| HWP(구버전) 처리 방법 | LibreOffice 변환은 CI 의존성 추가, 23% 분량만 해당 | 묶음 4에서 실제 커버리지 증가폭 보고 결정 — PDF+HWPX(77%)만으로 충분하면 보류 가능 |
| 추출 정확도 검증 방법 | 자동 검증 기준이 없음 | 묶음 1 스파이크에서 원문과 수동 대조(샘플 10~20건), 정량 지표(정확히 뽑힌 비율)로 판단 |
| 필터 vs 가점 | region처럼 필터할지 industry처럼 가점만 할지 미정 | 묶음 1 정확도 결과를 보고 결정 — region 수준(~98%) 신뢰도면 필터, 그 이하면 가점만(industry 패턴) |
| Claude 모델 선택 | 정확도 vs 비용 트레이드오프 | 묶음 1에서 Haiku/Sonnet 둘 다 시도해보고 비용 대비 정확도로 결정 |
| API 비용 상한 | 신규 공고 수가 급증하면 비용도 증가 | 묶음 1에서 실측한 건당 비용 × 예상 일일 신규 건수로 상한 추정, 필요시 배치 크기 제한 |
| 캐싱 키 | `atchFileId`가 문서 갱신 시에도 유지되는지 미확인 | 묶음 2에서 실제 재수집 사례로 캐싱 무효화 조건 확인 |
