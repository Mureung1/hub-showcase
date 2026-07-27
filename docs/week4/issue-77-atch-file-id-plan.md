# subsidies에 atch_file_id 컬럼 추가 (이슈 #77)

> 작성일: 2026-07-27 (월) · 대상 이슈: [#77 subsidies에 atch_file_id 컬럼 추가](https://github.com/syd348/hub/issues/77)

## 목표 (한 줄)

**`subsidies`에 `atch_file_id` 컬럼을 추가해 `document_extractions`와 직접 조인 가능하게 하고, 크롤러가 upsert 시 이 값을 채우게 한다.**

## 현재 상태

이슈 #67 리뷰 중 발견 — `document_extractions`(첨부파일 AI 추출 캐시)는 `atch_file_id`를 PK로
갖지만, `subsidies` 쪽엔 이 값을 저장하는 컬럼이 없다. 매핑은 `crawler/src/pipeline.ts` 실행
시점에만 메모리 안에서 일어나고 DB엔 안 남아, "이 지원금이 AI로 보강됐는지/어떤 모델로
처리됐는지"를 SQL 조인으로 확인할 방법이 없다.

## 범위

### 포함
- `supabase/schema.sql`에 `atch_file_id text` nullable 컬럼 추가
- `shared/src/types/subsidy.ts`(`Subsidy.atchFileId?`), `server/src/db/mappers.ts`,
  `crawler/src/upsert.ts`의 `SubsidyRow`/변환 함수에 반영
- `crawler/src/pipeline.ts`에서 subsidy 생성 시 `parseAttachment(item)?.atchFileId`로 채움
  (첨부파일 없거나 미지원 포맷이면 undefined/null)

### 제외
- 기존 upsert된 row에 대한 소급 backfill — 다음 크롤 실행부터 자연스럽게 채워짐(이슈 본문에
  이미 범위 외로 명시)

## 완료 기준

- [x] `supabase/schema.sql`에 컬럼 추가
- [x] shared/server/crawler 매퍼 반영
- [x] `pipeline.ts`가 upsert 전에 `atch_file_id`를 채움
- [x] 단위 테스트로 검증(atchFileId가 있으면 채워지고 없으면 undefined) — `pipeline.test.ts`에 2건 추가
- [x] `npm test`(134 passed)/`npm run lint`/타입체크(client·server·crawler) 통과

**완료 (2026-07-27)** — 스키마 적용은 이슈 #67과 동일하게 Supabase 대시보드 SQL Editor에서
수동으로 진행 필요.

## 리스크 / 결정 필요

없음 — 스키마 컬럼 하나 추가하는 기계적인 변경이라 판단이 갈리는 지점이 없다.
