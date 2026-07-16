# Handoff: 리뷰 매니저 AI — 전체 화면 (구 "리뷰 답변 도우미")

## Overview
소상공인이 손님 리뷰를 붙여넣으면 감정 분석·핵심 키워드 추출·반복 문제 감지·답변 초안 3종을 생성해주고, 리뷰마다 AI 관심도 점수를 매겨 총 분석·월별 통계까지 보여주는 리뷰 관리 웹 도구. 2026-07-13 "리뷰 답변 도우미"(단일 스크롤 페이지, Tool 화면 1개)에서 "리뷰 매니저 AI"로 컨셉을 확장하면서 **React Router 기반 4개 화면**(`/` 랜딩, `/app` 도구, `/guide` 사용법, `/dashboard` 총 분석)으로 재구성했다. 이 문서는 그 확장을 반영한 as-built 스펙이다 — 원래 디자인 핸드오프(Tool 화면 1개, 아래 §11 "원본 레퍼런스" 참고)를 프론트/백엔드 개발자가 이후 직접 확장한 부분이 포함되어 있어, 신규 디자인 유입 시 재검토가 필요할 수 있다.

## About the Design Files
`reference_리뷰답변도우미.dc.html`은 최초 "Tool 화면" 1개에 대한 **디자인 레퍼런스 HTML 프로토타입**이며(§11 참고), 랜딩/사용법/대시보드 3개 화면은 이 문서 §2~§4에만 스펙이 있고 별도 `.dc.html` 레퍼런스는 없다(개발 과정에서 기존 색상/컴포넌트 토큰만 재사용해 직접 설계함 — 아래 각 화면 스펙에 "새 컴포넌트" 표시).

## Fidelity
**Tool 화면(§1)**: High-fidelity, 원본 레퍼런스 기준 픽셀 단위 확정.
**랜딩/사용법/대시보드(§2~§4)**: Medium-fidelity — 레이아웃·색상·간격은 기존 디자인 토큰을 그대로 재사용해 확정했지만, 정식 디자이너 검토를 거치지 않았다. 새 디자인 시안이 나오면 이 문서를 기준으로 갱신할 것.

## Screens / Views

라우트 구조:

| 경로 | 화면 | 상태 |
|---|---|---|
| `/` | 랜딩 | §2 |
| `/app` | 도구 (핵심 화면, 원본 Tool 화면) | §1 |
| `/guide` | 사용법 | §3 |
| `/dashboard` | 총 분석 | §4 |

---

## §1. `/app` — 도구 화면 (Tool, 원본 핵심 화면)

### 1-0. Navbar (도구 화면 전용)
- Layout은 공통(아래 "공통 컴포넌트 — Navbar" 참고).
- 좌측: 🍊 + "리뷰 매니저 AI" (더 이상 링크 아님, 홈으로 가려면 로고를 `Link to="/"`로 감쌈).
- 우측: "총 분석 보기"(`/dashboard`로 이동) + "← 홈으로"(`/`로 이동). 텍스트 링크 2개, 버튼 스타일 아님.

### 1-1. 입력 카드
- 컨테이너: 배경 `oklch(99% 0.006 70)`, border `1px solid oklch(91% 0.02 60)`, radius 16px, padding 24px, shadow `0 2px 10px oklch(40% 0.02 50 / 0.05)`.
- 라벨 "리뷰 붙여넣기": 15px/700, color `oklch(30% 0.02 50)`, margin-bottom 8px.
- Textarea: 100% width, min-height 160px, resize vertical, border `1px solid oklch(88% 0.02 60)`, radius 10px, padding 14px, 15px, 배경 `oklch(98.5% 0.01 70)`.
  - placeholder: "예) 음식은 맛있었는데 너무 오래 기다렸어요.\n직원분이 너무 불친절했어요.\n(리뷰 하나당 한 줄, 최대 15개)"
- 하단 힌트 행(margin-top 10px, flex space-between, 13px, color `oklch(55% 0.02 50)`): 좌측 "줄바꿈으로 리뷰를 구분해주세요 · 최대 15개" / 우측 "{n}개 입력됨" (실시간 줄 수 카운트).
- "분석 시작" 버튼: full width, padding 14px, 16px/700, 흰 글자, 배경 `oklch(64% 0.17 45)` hover `oklch(58% 0.18 42)` + hover 시 `translateY(-1px)`, radius 10px, `disabled` 상태는 로딩 중일 때. 로딩 중엔 라벨이 "분석 중..."으로 바뀜.

### 1-2. 상태/에러 메시지 (입력 카드 바로 아래, margin-top 16px)
- **로딩**: 14px 스피너(16px 원, border 3px `oklch(85% 0.03 45)`, top-color `oklch(60% 0.17 45)`, 0.7s linear 무한 회전) + "분석 중이에요..." (14px/600, `oklch(45% 0.02 50)`).
- **에러**(입력 검증 실패/API 오류/복사 실패 공용): 배경 `oklch(94% 0.05 30)`, border `1px solid oklch(75% 0.12 30)`, radius 10px, padding `14px 16px`, 텍스트 14px/600 `oklch(38% 0.14 30)`, 앞에 ⚠️ 아이콘.
  - 클라이언트 검증 에러: "리뷰를 먼저 입력해주세요." / "유효한 리뷰가 없어요." / "한 번에 최대 15개까지 분석할 수 있어요."
  - 서버 에러(백엔드 `error.message` 그대로 노출): "유효한 리뷰가 없어요." / "한 번에 최대 15개까지 분석할 수 있어요." / "잠시 후 다시 시도해주세요."(`ANALYSIS_FAILED`)
  - 복사 실패: "복사에 실패했어요. 직접 선택해서 복사해주세요."

### 1-3. 반복 문제 감지 배너 (조건부, margin-top 28px)
- 배경 `oklch(93% 0.06 35)`, border `2px solid oklch(62% 0.18 30)`, radius 14px, padding `20px 22px`.
- 헤더 행: "⚠️ 반복되는 문제 감지" (16px/800, `oklch(35% 0.16 30)`) — 우측에 "누적 기록 초기화" 버튼(투명 배경, border `1px solid oklch(55% 0.15 30)`, 글자 `oklch(40% 0.15 30)`, 12px/700, radius 999px, padding `6px 12px`, hover 시 `translateY(-1px)`).
- 아이템 리스트(gap 10px): 각 항목 배경 `oklch(98% 0.01 30)`, radius 10px, padding `12px 14px`.
  - 제목 14px/700 `oklch(35% 0.14 30)`: `"{키워드}" 관련 부정 리뷰 {occurrenceCount}건 누적`
  - 제안 13px `oklch(45% 0.1 30)`: `💡 {suggestion}`
- **표시 조건**: 서버(`node:sqlite`)에 저장된 세션 누적 기준으로 동일 키워드의 부정 리뷰가 2건 이상일 때만 노출. 백엔드 응답의 `recurringIssues` 배열을 그대로 렌더링(프론트 자체 계산 없음).

### 1-4. 결과 카드 리스트 (margin-top 28px, flex column, gap 18px)
리뷰 하나당 카드 하나. 카드: 배경 `oklch(99% 0.006 70)`, border `1px solid oklch(91% 0.02 60)`, radius 16px, padding 22px, shadow `0 2px 10px oklch(40% 0.02 50 / 0.05)`, hover 시 `translateY(-3px)` + shadow `0 12px 28px oklch(40% 0.02 50 / 0.14)`.

1. **원문**: `"{originalText}"`, 15px, `oklch(30% 0.02 50)`, margin-bottom 12px.
2. **태그 행** (flex wrap, gap 8px, margin-bottom 12px):
   - 감정 태그(pill, 12px/800, padding `5px 12px`): positive `bg oklch(90% 0.09 150) / text oklch(35% 0.1 150)`, negative `bg oklch(91% 0.07 25) / text oklch(40% 0.15 25)`, neutral `bg oklch(92% 0.01 60) / text oklch(45% 0.01 60)`. 라벨은 한글로 표시(긍정/부정/중립), API의 영문 enum(`positive`/`negative`/`neutral`)을 매핑.
   - **AI 관심도 점수 배지** (신규, pill, 12px/700, `bg oklch(96% 0.03 35) / text oklch(45% 0.1 30)` — 개선 제안 박스와 동일 톤): `관심도 {score}` 형식, 0~100 정수.
   - 키워드 태그(최대 3개, pill, 12px/600, `bg oklch(95% 0.02 60) / text oklch(45% 0.02 50)`): `#{키워드}` 형식.
3. **개선 제안** (부정 리뷰일 때만): 배경 `oklch(96% 0.03 35)`, radius 8px, padding `10px 12px`, 13px `oklch(45% 0.1 30)`, margin-bottom 14px: `💡 개선 제안: {improvementSuggestion}`
4. **답변 초안 3종** (항상 동시에 펼쳐서 표시 — 탭/토글 없음, flex column gap 10px): 각 행은 border `1px solid oklch(90% 0.02 60)`, radius 10px, padding `12px 14px`, 배경 `oklch(98.5% 0.01 70)`.
   - 상단 행: 톤 라벨(12px/800, `oklch(55% 0.14 45)`: API의 `polite`→"정중함" / `friendly`→"친근함" / `concise`→"간결함") + "복사하기" 버튼(우측 정렬, min-width 88px, white-space nowrap, 12px/700, padding `5px 14px`, radius 999px, border `1px solid oklch(70% 0.15 45)`, 기본 `bg oklch(98% 0.01 45) / text oklch(50% 0.15 45)`, hover 시 `translateY(-1px)`).
   - 클릭 시 클립보드 복사 + 버튼이 1.5초간 "복사됨 ✓" 로 전환(`bg oklch(88% 0.09 150) / text oklch(35% 0.1 150)`), 이후 원상복구.
   - 하단: 답변 초안 텍스트, 14px `oklch(32% 0.02 50)`.

### 1-5. Footer
- 중앙 정렬, padding `32px 24px`, 13px `oklch(55% 0.02 50)`, 상단 border `1px solid oklch(91% 0.02 60)`: "🍊 리뷰 매니저 AI · 소상공인 무료 도구"

---

## §2. `/` — 랜딩 화면 (2026-07-16 전면 재구성 — claude.ai/design 번들 `design/reference_landing-2026-07-16.html` 기준)

이전 버전(10개 섹션: 서비스소개·핵심기능·Dashboard미리보기·수치·공감포인트·예시답변·타겟업종·후기 등)을 폐기하고, 아래 5개 섹션으로 전면 교체했다. Navbar는 여전히 공유 `Header` 컴포넌트(§7 참고)를 그대로 쓴다 — **네비게이션 순서 "홈/사용법/도구/총 분석"은 이번 리디자인에서도 바뀌지 않음** (원본 번들의 네비 순서는 "홈/도구/사용법/총 분석"이었지만, 기존 구현을 우선해 그대로 유지).

### 2-1. Hero (리디자인)

2단 그리드(`grid-template-columns: 1fr 1fr`), gap 40px, `padding: 72px 56px 76px`, max-width 1120px. 800px 이하에서 1열로 전환.

- **좌측**: H1 34px/700/1.35, `var(--color-text-heading)` — "리뷰를 관리하면<br>매장의 문제가 보입니다". 서브텍스트 16px/1.65 `var(--color-text-muted)`, max-width 400px — "감정분석·답변 초안은 물론, 같은 불만이 쌓이면 가장 먼저 알려드립니다". CTA "지금 시작하기 →"(`.hero-cta` 재사용, `/app`로 이동).
- **우측(리뷰 티커, 신규)**: 높이 250px 카드, radius 16px, 위아래 페이드 마스크(`linear-gradient`로 카드 배경색에서 투명 → 다시 배경색). 내부에서 리뷰 스니펫 4종(★★★★★"응답이 정말 빨라졌어요" / ★★☆☆☆"대기시간이 길어요" / ★★★★★"직원분들이 친절해요" / ★★★☆☆"가격이 조금 아쉬워요")이 세로로 무한 스크롤(`animation: lpTickerUp 9s linear infinite`, 리스트를 2번 이어붙여 `translateY(-50%)`로 이음매 없이 루프). 별 색상 `--color-lp-star`(#e2932f), 아이템 배경 `--color-lp-ticker-bg`(#faf3ea).

### 2-2. 3단계 프로세스 (리디자인)

`.lp-process`, max-width 800px, 중앙 정렬, padding `64px 24px`. 타이틀 "리뷰가 쌓이면, 이런 흐름으로 정리돼요" / 서브 "최대 15개 리뷰를 한 번에 분석하고, 답변 초안까지 만들어드려요".

- 3개 스텝(리뷰 접수 → 감정 분석 → 답변 초안), 각 46px 원(배경 `--color-lp-step-circle-bg` #fdece1, 숫자 primary색) + 라벨.
- 스텝 사이를 점선(`repeating-linear-gradient`, `--color-lp-dash` #e3d3ba)으로 잇고, 10px 원형 점이 점선을 따라 좌→우로 무한 반복 이동(`animation: lpDashMove 3.2s linear infinite`).
- 스크롤 진입 시 `useInView` 기반 `scroll-reveal` 페이드인 (기존 다른 섹션과 동일 패턴).

### 2-3. 총 분석 리포트 섹션 (신규)

`.lp-report`, 배경 `--color-lp-report-bg`(#fbf3e7), 2단 그리드, padding `64px 56px`.

- 좌측: 타이틀 "총 분석 리포트로 한눈에" / 서브 "감정 비율과 반복되는 불만 키워드를 자동으로 모아드려요" + 키워드 pill 3개(대기시간·직원 친절·가격, white 배경).
- 우측 카드: 도넛 차트(96px, `conic-gradient` 3구간 — 긍정 83%/보통 12%/부정 5%, 중앙에 평점 "4.7") + 막대그래프 3행(긍정/보통/부정, 각 `width` CSS transition으로 스크롤 진입 시 0→목표%까지 애니메이션, 0.1s/0.2s 딜레이로 순차 표시).
  - 막대 색상: 긍정 `var(--color-primary)`, 보통 `--color-lp-bar-neutral`(#e6c07a), 부정 `--color-lp-bar-negative`(#d94f3d). 트랙 배경 `--color-lp-bar-track`(#f2e6d8).

### 2-4. 타겟 업종 섹션 (리디자인)

`.lp-industries`, max-width 800px, 중앙 정렬, padding `56px 24px`. 타이틀 "이런 업종에서 쓰고 있어요".

- Chip 5개, 각각 22px 원형 배지(업종 이니셜 1글자 + 업종별 고유 배경/텍스트 색 — 카페/식당/미용실/숙박/소매점, `--color-lp-industry-*-bg`/`-text` 토큰) + 업종명. pill 테두리, white 배경.

### 2-5. Footer (랜딩 전용, 신규 — `.lp-footer`)

어두운 배경(`var(--color-text-heading)`, #2a1f18과 동일 계열), `padding: 36px 56px`, 좌우 정렬(`justify-content: space-between`).

- 좌측: 🍊 + "리뷰 매니저 AI"(흰 글자, 14px/700).
- 우측: "© 2026 리뷰 매니저 AI"(흰 글자 50% 투명도, 12px).
- **주의**: 이 어두운 footer는 랜딩 페이지 전용 클래스(`.lp-footer`)이며, `/app`·`/guide`·`/dashboard`가 공유하는 기존 밝은 `.site-footer`는 그대로 둔다 — 마케팅 페이지에서만 쓰는 강조 요소이므로 공유 클래스를 바꿔 다른 화면까지 어두워지지 않게 했다.

---

## §3. `/guide` — 사용법 화면 (신규)

### 3-0. Navbar
좌측 로고(`/`로 이동) + 우측 "바로 사용하기" 버튼(`/app`) 하나만. "사용법" 링크는 없음(이미 사용법 페이지이므로).

### 3-1. Hero 영역 (§2-1 축약 버전)
- 2단 레이아웃 아님, 원본처럼 중앙 정렬 단일 컬럼(max-width 720px, padding `56px 24px 40px`).
- H1: "이렇게 사용하세요"
- 서브텍스트: "리뷰 붙여넣기 한 번이면, 감정분석부터 답변 초안까지 끝나요"
- CTA 없음(스크롤해서 아래 내용 확인 유도).

### 3-2. How it works
§2-6과 동일 컴포넌트 재사용.

### 3-3. 예시 결과 섹션
§2-5와 동일(`ExampleResultCard` 재사용) — 섹션 타이틀 "이런 결과를 받아요".

### 3-4. FAQ 섹션 (신규)
max-width 800px, 중앙 정렬, padding.
- 섹션 타이틀: "자주 묻는 질문"
- Q&A 카드 3개(flex column, gap 12px): 배경/보더/radius 14px, padding `16px 18px`, shadow, hover 시 `translateY(-3px)` + shadow 강조.
  - 질문(15px/700): "Q. {질문}"
  - 답변(14px, muted): "A. {답변}"
  - 내용: (1) 리뷰 최대 개수(15개, 줄바꿈 구분) (2) 반복 문제 감지 기준(동일 키워드 부정 리뷰 2건 이상) (3) 리뷰 저장 여부(세션 단위 임시 보관, 초기화 가능)

### 3-5. CTA 행
중앙 정렬, margin `36px 0 8px`. "지금 바로 써보기" 버튼(§2-1 CTA와 동일 스타일) → `/app`.

### 3-6. Footer
§1-5와 동일.

---

## §4. `/dashboard` — 총 분석 화면 (신규)

### 4-0. Navbar
좌측 로고(`/`로 이동) + 우측 "바로 사용하기" 버튼(`/app`).

### 4-1. 타이틀 영역
- `dashboard-title`(26px/800, `oklch(26% 0.03 45)`): "리뷰 총 분석"
- `dashboard-sub`(14px, muted): "이 브라우저에서 지금까지 분석한 리뷰를 기준으로 집계했어요"

### 4-2. 로딩 / 에러 / 빈 상태
- 로딩: §1-2 스피너 컴포넌트 재사용.
- 에러: §1-2 에러 박스 재사용(API 실패 시).
- **빈 상태**(`totalReviews === 0`): 중앙 정렬, muted 텍스트: "아직 분석한 리뷰가 없어요. [리뷰를 분석하러 가볼까요?](/app 링크)"

### 4-3. 수치 (데이터 있을 때)
§2-3 수치 컴포넌트 스타일 재사용(count-up 없이 정적 표시):
- "{totalReviews}개" — "분석한 리뷰"
- "{averageScore}" — "평균 관심도 점수"

### 4-4. 감정 분포
섹션 타이틀 "감정 분포" + §1-4 감정 태그 3개를 나열(긍정/부정/중립 각각 건수 포함, `sentiment-tag positive|negative|neutral` 재사용): "긍정 {n}" / "부정 {n}" / "중립 {n}"

### 4-5. 자주 언급된 키워드
섹션 타이틀 "자주 언급된 키워드" + §2-7 chip 컴포넌트 재사용: "#{keyword} {count}" 형식, 최대 5개.

### 4-6. 월별 통계 (신규 컴포넌트)
섹션 타이틀 "월별 통계" + 월별 행 리스트(`monthly-table`, flex column gap 10px):
- 각 행(`monthly-row`): 배경/보더, radius 10px, padding `12px 16px`, flex row gap 18px, 13px.
  - 월(`monthly-month`, 700, min-width 80px): "2026-07" 형식(`YYYY-MM`)
  - "{totalReviews}건 분석" · "평균 {averageScore}점" · "부정 {negative}건"
- 데이터 없는 달은 표시 안 함(0건으로 채우지 않음).

### 4-7. Footer
§1-5와 동일.

---

## §5. 공통 컴포넌트 / 신규 유틸리티 클래스

- **`.section-title`**: 20px/700, `oklch(26% 0.03 45)`, margin `32px 0 14px`, 중앙 정렬. §2~§4 전 화면의 섹션 제목에 재사용(원래 "가이드 페이지 전용"으로 만들었다가 랜딩/대시보드까지 재사용 범위 확장됨).
- **`.score-tag`**: pill, 12px/700, `bg oklch(96% 0.03 35) / text oklch(45% 0.1 30)` — 개선 제안 박스와 동일 톤 재사용(신규 색상 추가 없음).
- **Hover 공통 패턴**: 카드류(review-card, pain-point-card, faq-item, hero-preview-card)는 hover 시 `translateY(-3~4px)` + `box-shadow: 0 12px 28px oklch(40% 0.02 50 / 0.14)`. Pill류(step, industry-chip)는 `translateY(-2px)` + 기본 카드 shadow. 버튼류는 `translateY(-1~2px)`.
- **`fadeInUp` 키프레임**: `opacity:0, translateY(16px)` → `opacity:1, translateY(0)`, 0.6s ease. 히어로 요소 마운트 시 사용.
- **`.scroll-reveal` / `.in-view`**: `IntersectionObserver` 기반 커스텀 훅(`useInView`)으로 뷰포트 진입 시 `in-view` 클래스 추가, `opacity:0→1` + `translateY(24px)→0`, 0.6s. 랜딩의 아래 섹션들(수치/공감/예시/사용법/타겟업종)에 적용.
- **`prefers-reduced-motion: reduce`**: 모든 애니메이션/트랜지션 duration을 0.001ms로 강제 — 접근성 처리.

## Interactions & Behavior

- **라우팅**: React Router 4개 라우트(§2-4-0 표). 기존 앵커 스크롤(`#tool`, `#how-it-works`) 방식에서 실제 페이지 전환으로 변경.
- **입력 검증** (`/app`, 분석 시작 클릭 시, 순서대로 체크): 원본과 동일(§1-1 참고), 서버 측에서도 동일 규칙으로 재검증.
- **감정 분석 / 키워드 추출 / 답변 생성 로직**: 원본 스펙과 동일(백엔드 `review-assistant-server/src/services/reviews.service.js`로 이식됨, 순수 함수 로직 자체는 변경 없음 — 자동 비교 테스트로 프론트 원본과 결과 일치 확인함). **AI 관심도 점수(신규)**: 긍정 10 / 중립 40 / 부정 70(+매칭 키워드 수 따라 최대 +20), 0~100.
- **반복 문제 감지**: 원본은 브라우저 상태(세션 누적 카운터)였으나, 지금은 `node:sqlite` DB에 세션(`X-Session-Id`)별로 저장 후 서버가 계산해 응답에 포함. 판정 기준(동일 키워드 부정 2건 이상)은 동일.
- **세션 관리**: `X-Session-Id`를 프론트가 `localStorage`에 저장(`src/lib/sessionId.js`)하고 매 요청에 실어 보냄. 서버 응답 헤더로 새 세션ID를 받으면 갱신. (CORS `exposedHeaders`에 `X-Session-Id`를 명시하지 않으면 브라우저가 응답 헤더를 읽지 못하는 함정이 있어 주의.)
- **API 연동**: 원본은 브라우저 내 로직으로 서버 호출이 없었으나, 지금은 실제로 `review-assistant-server`(Express)를 호출함. `POST /api/v1/reviews/analyze`, `DELETE /api/v1/reviews/history`, `GET /api/v1/stats/summary`, `GET /api/v1/stats/monthly`. 상세 요청/응답 스펙은 [`기획서.md`](../기획서.md) §5 참고.
- **초기 화면 상태**: 원본 레퍼런스는 데모 편의를 위해 샘플 리뷰가 자동 채워진 상태로 시작했으나, 실제 구현은 빈 textarea + 입력 카드만 있는 상태로 시작(자동 실행 없음) — 원본 스펙의 "실제 서비스에서는 제거해야 함" 권장을 그대로 반영함.

## State Management

- **`/app` (ToolPage)**: `reviewInput`, `loading`, `error`, `results`(서버 응답의 `results` 배열, null=미실행), `recurringIssues`(서버 응답 그대로), `copiedId`. 히스토리 카운트는 더 이상 프론트 상태가 아님(서버 DB로 이전).
- **`/` (LandingPage)**: 7개의 `useInView` 결과(서비스소개/핵심기능/대시보드미리보기/사용과정/분석예시/월별통계/후기 각 섹션), `DashboardPreviewCard` 내부의 `useCountUp` 2개. 로그인 관련 상태는 더 이상 이 페이지에 없음(공통 `Header`로 이전, 아래 참고).
- **`/dashboard` (DashboardPage)**: `summary`(`GET /stats/summary` 응답), `months`(`GET /stats/monthly` 응답), `loading`, `error`.
- **공통 `Header` 컴포넌트** (2026-07-15 신규, §7 참고): `user`/`checked`(useCurrentUser 훅) — 마운트 시 저장된 토큰으로 `GET /auth/me` 호출해 로그인 상태 확인. 페이지마다 독립적으로 마운트되므로 페이지 이동할 때마다 다시 확인함(전역 상태 관리 라이브러리 없음).
- **데이터 페칭**: `src/lib/api.js`의 `analyzeReviews` / `resetHistory` / `getSummary` / `getMonthlyStats` / `signup` / `login` / `logout` / `getCurrentUser` — 전부 `fetch` 기반, 세션ID + (로그인 시) `Authorization: Bearer <token>` 헤더 자동 첨부. 에러 시 서버 응답의 `error.message`를 그대로 노출.

## Design Tokens

기존 토큰(`src/design-tokens.css`)에서 **새로 추가된 색상은 없음** — 모든 신규 컴포넌트(히어로 미리보기 카드, 수치, 공감 카드, FAQ, 월별 통계 행 등)는 기존 색상 변수(`--color-surface`, `--color-border`, `--color-suggestion-bg` 등)와 기존 radius/shadow 토큰만 재사용해 구성했다. 아래는 원본 대비 변경/추가된 레이아웃 값만 정리.

### Layout
- 히어로 max-width: 720px → **1040px**(2단 레이아웃 수용을 위해 확대), 800px 이하에서 세로 스택.
- 히어로 미리보기 카드 max-width: 340px(신규).
- Container(Tool) max-width는 원본과 동일 800px, 대시보드/사용법도 동일 컨테이너 재사용.

### Radius / Shadow
원본과 동일(§ Design Tokens 섹션, 8/10/14/16/999px, 카드 shadow `0 2px 10px oklch(40% 0.02 50 / 0.05)`). 신규로 hover 강조 shadow `0 12px 28px oklch(40% 0.02 50 / 0.14)` 추가.

## Assets
이모지만 사용(🍊, ⚠️, 💡, ✓, 😥, 🔁, ⏰, 🤖, 😊, ☕, 🍽️, 💇, 🏨, 🛍️, ●) — 별도 로고/아이콘 에셋 없음(원본과 동일 원칙 유지).

## §6. 원본 레퍼런스
- `reference_리뷰답변도우미.dc.html` — §1(Tool 화면) 스펙의 원본 레퍼런스(전체 화면이 아니라 원래 단일 스크롤 페이지 기준). §2~§4는 이 레퍼런스에 없는 신규 화면이므로 참고용으로만 남겨둠.

## §7. 공통 Header / 회원가입·로그인 화면 (2026-07-15 신규)

기존엔 화면마다 각자 `<nav className="navbar">`를 따로 그리고 있었으나, 공통 `Header` 컴포넌트(`src/components/Header.jsx`) 하나로 통합했다. `/`, `/app`, `/guide`, `/dashboard`, `/signup`, `/login` 전 화면이 이걸 공유한다.

### 7-1. Header 구성
기존 `.navbar` 레이아웃(§ Navbar 원본 스펙: sticky, `justify-content: space-between`, 배경 `oklch(99% 0.006 70 / 0.9)` + blur)은 그대로 두고, 가운데에 **진행 단계** 영역을 새로 추가한 3분할 구조로 바뀌었다.

- **좌측**: 로고(변경 없음, `/`로 이동하는 링크)
- **가운데(신규, `.nav-steps`)**: "홈 / 사용법 / 도구 / 총 분석" 4개 텍스트 링크, 13px/600, 기본 색 `oklch(55% 0.02 50)`(subtle). 현재 라우트와 일치하는 항목만 primary 색(`oklch(64% 0.17 45)`) + 하단 2px 보더로 강조. React Router `useLocation()`의 `pathname`으로 판정.
- **우측(변경)**: 로그인 여부에 따라 분기.
  - 확인 전(`checked === false`): 아무것도 안 보임(깜빡임 방지)
  - 비로그인: "로그인" 텍스트 링크 + "회원가입" 버튼(기존 `.nav-cta` 스타일 재사용 — 이전엔 이 자리에 있던 "로그인/회원가입" 데코 버튼을 완전히 대체함)
  - 로그인 상태: 이메일(13px, muted) + "로그아웃" 버튼(투명 배경, `1px solid` 보더, pill, hover 시 `translateY(-1px)`)

### 7-2. `/signup`, `/login` 화면
- Header 아래 중앙에 카드 하나(`.input-card` 재사용, max-width 400px)
- 카드 안: 제목("회원가입"/"로그인", 22px/800, 중앙 정렬) → 이메일 입력 → 비밀번호 입력 → (에러 시) 에러 박스(`.error-box` 재사용) → 제출 버튼(`.analyze-btn` 재사용, 로딩 중 "가입 중.../로그인 중...")
- 입력 필드(`.auth-input`, 신규): textarea와 동일한 톤(`border-input`, `radius-md`, 배경 `surface-sub`), focus 시 보더가 primary로 변경 — 기존 textarea:focus 패턴과 동일 원칙
- 카드 하단: "이미 계정이 있으신가요? 로그인" / "아직 계정이 없으신가요? 회원가입" 링크(13px, subtle, 링크만 primary 색)
- 성공 시 `/app`으로 이동(별도 환영 화면 없음)

### 7-3. 새로 추가된 색상
없음 — 전부 기존 토큰(`--color-surface`, `--color-border`, `--color-primary`, `--color-text-subtle` 등) 재사용.

### 7-4. 알려진 남은 격차
§2(랜딩 화면) 상세 스펙은 2026-07-14의 10섹션 재구성(서비스소개/핵심기능/Dashboard미리보기/... 순서) 이후 아직 전체 재검토가 안 된 상태였는데, 이번 Header 교체로 §2-1 라우트 표만 최소한으로 갱신했다. §2 본문(히어로 이후 각 섹션 상세 스펙)은 여전히 그 이전 버전 설명이 남아있을 수 있음 — 다음에 랜딩 화면을 다시 손볼 때 전체 재검토 필요.
