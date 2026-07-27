# D-day 배지 "상시/소진시까지" 표시 수정 (이슈 #82)

> 작성일: 2026-07-27 (월) · 대상 이슈: [#82 D-day 배지가 상시/소진시까지 공고에서 'D-9999'로 표시됨](https://github.com/syd348/hub/issues/82)

## 목표 (한 줄)

**`dday === NO_DEADLINE_DDAY`(9999)인 공고에서 D-day 배지가 `D-9999` 대신 `subsidy.deadline`
원문 텍스트를 중립 색상으로 보여주도록 고친다.**

## 현재 상태 (전환 전)

- `crawler/src/mapper.ts:8`에 `const NO_DEADLINE_DDAY = 9999` — crawler 내부에만 존재,
  `shared/`에는 없음
- `crawler/src/mapper.ts:38-41` `parseDeadline()`이 날짜 형식이 아닌 마감 텍스트("예산
  소진시까지", "상시 접수" 등, 실측 104/600건=17.3%)에 대해 `{ deadline: 원문, dday: 9999 }`
  반환 — `deadline` 필드는 이미 정상
- `src/utils/dday.ts`의 `getDdayClass(dday)`는 숫자 구간(≤7/≤14/그 외)만 분류, 9999는 그냥
  `dday-normal`로 분류됨
- `src/components/SubsidyCard.tsx:18`과 `src/pages/SubsidyDetailScreen.tsx:81` 둘 다
  `D-{subsidy.dday}`로 하드코딩 렌더링 — 9999가 그대로 노출되는 지점
- 색상 토큰은 `src/styles/tokens.css`에 danger/warning/success만 있고 중립색 없음
- `.cursor/skills/gov-subsidy-design/design-tokens.md`는 `--warning`/`--warning-bg`도 이미
  누락되어 있음(기존 drift, 이번에 같이 보정)

## 범위

### 포함 (이번 이슈)
- `shared/`에 `NO_DEADLINE_DDAY` 상수 추가, crawler/client 양쪽에서 재사용
- `src/styles/tokens.css`에 `--neutral`/`--neutral-bg` 추가 (danger/warning/success와 동일
  패턴: 채도 있는 색 + 옅은 배경)
- `design-tokens.md`에 `--neutral`/`--neutral-bg` 문서화 (겸사겸사 기존에 빠져있던
  `--warning`/`--warning-bg`도 추가)
- `src/utils/dday.ts`에 라벨/클래스 로직 추가 — sentinel 값일 때 `dday-flexible` 클래스 +
  원문 텍스트 반환
- `SubsidyCard.tsx`/`SubsidyDetailScreen.tsx`와 각 CSS(`SubsidyCard.css`,
  `SubsidyDetailScreen.css`) 반영 — 텍스트 길이 방어용 `max-width`+`text-overflow: ellipsis`
- `dday.test.ts` 테스트 추가

### 제외 (다음으로)
- 상세 페이지 전반 구성 재검토(신청 방식/접수 방식 중복 등) — 별도 논의 주제, 이 이슈 범위 아님
- `SubsidyCard.css`/`SubsidyDetailScreen.css`에 중복된 `.dday-*` 규칙 자체를 공유 파일로
  합치는 리팩터 — 이번엔 기존 중복 패턴을 그대로 따라 4번째 클래스만 추가, 통합은 상세 페이지
  재검토(topic 5) 때 판단

## 실행 순서

### 묶음 1 — 공유 상수 + 토큰 (완료)
- [x] `shared/src/constants.ts` 신설 — `export const NO_DEADLINE_DDAY = 9999`, `shared/src/index.ts`에서 export
- [x] `crawler/src/mapper.ts`가 로컬 상수 대신 `@hub/shared`의 `NO_DEADLINE_DDAY` import
- [x] `src/styles/tokens.css`에 `--neutral: #6b7280` / `--neutral-bg: #f3f4f6` 추가
- [x] `design-tokens.md` 표에 `--neutral`/`--neutral-bg`, `--warning`/`--warning-bg` 추가

### 묶음 2 — 유틸 + 컴포넌트 반영 (완료)
- [x] `src/utils/dday.ts`: `getDdayClass`에 sentinel 분기 추가(`dday-flexible`), `getDdayLabel(subsidy)` 함수 추가(sentinel이면 `deadline` 원문, 아니면 `D-{dday}`)
- [x] `SubsidyCard.tsx`/`SubsidyDetailScreen.tsx`에서 `D-{subsidy.dday}` 하드코딩을 `getDdayLabel(subsidy)` 호출로 교체
- [x] `SubsidyCard.css`/`SubsidyDetailScreen.css`에 `.dday-flexible` 규칙 추가 + 방어적 `max-width`/`text-overflow: ellipsis`
- [x] `dday.test.ts`에 sentinel 케이스(`getDdayClass(9999)`, `getDdayLabel`) 테스트 추가

### 묶음 3 — 검증 (완료)
- [x] `npm test`(148 passed) / `npm run lint` / 타입체크(client·server·crawler) 통과

## 완료 기준

- [x] dday=9999 공고에서 배지가 `subsidy.deadline` 원문(예: "예산 소진시까지")을 보여준다
- [x] 배지 색상이 danger/warning/success와 구분되는 중립색(`--neutral`/`--neutral-bg`)이다
- [x] `NO_DEADLINE_DDAY`가 `shared/`의 단일 소스에서 crawler/client 양쪽에 쓰인다
- [x] 리스트(`SubsidyCard`)·상세(`SubsidyDetailScreen`) 양쪽 다 반영된다
- [x] 관련 테스트 추가, `npm test`(148 passed)/`npm run lint`/타입체크 통과

## 리스크 / 결정 필요

| 항목 | 내용 | 기본 방침 |
|------|------|-----------|
| 원문 텍스트 길이 편차 | 실측값이 "상시 접수"(4자)~"세부사업별 상이"(9자)로 다양 | 하드코딩 라벨 대신 원문 그대로 표시(사용자 결정, Option B) + `max-width`+ellipsis로 방어 |
| `--neutral` 색상값 | 기존 토큰과 겹치지 않으면서 danger/warning/success와 톤이 어울려야 함 | `#6b7280`/`#f3f4f6` (Tailwind gray-500/100과 동일 계열) 채택 |
| `NO_DEADLINE_DDAY` shared 승격 범위 | crawler 쪽 기존 테스트(`mapper.test.ts` 등)가 로컬 상수를 참조하는지 확인 필요 | import 경로만 바꾸고 값은 유지 — 기존 테스트 영향 없어야 함 |
