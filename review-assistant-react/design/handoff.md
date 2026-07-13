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

## §2. `/` — 랜딩 화면 (신규 구성, 기존 Hero/How it works 재사용 + 신규 섹션 추가)

### 2-0. Navbar (랜딩 전용)
- 좌측: 🍊 + "리뷰 매니저 AI" (18px/700, 링크 아님).
- 우측: "사용법"(`/guide`) · "총 분석"(`/dashboard`) 텍스트 링크 + "로그인/회원가입" 버튼(**신규, 데코레이션만 — 실제 인증 없음**. 클릭 시 페이지 이동 없이 버튼 아래 작은 말풍선 "곧 지원 예정이에요!"가 1.8초간 노출 후 사라짐. 말풍선: `position: absolute`, 배경 `oklch(99% 0.006 70)`, border `1px solid oklch(91% 0.02 60)`, radius 8px, shadow 카드와 동일, padding `8px 12px`, 12px/600).

### 2-1. Hero (신규 — 2단 레이아웃으로 재설계)
- 원본은 중앙 정렬 단일 컬럼이었으나, 좌우 2단(`display:flex`)으로 재구성. max-width 1040px, gap 56px, padding `64px 24px 56px`. 800px 이하에서는 세로로 쌓이고 텍스트 중앙 정렬로 전환.
- **좌측(hero-content)**: 좌측 정렬, `animation: fadeInUp 0.6s ease both`(마운트 시 아래→위 페이드인).
  - H1 34px/800, `oklch(26% 0.03 45)`: "리뷰를 관리하면 매장의 문제가 보입니다" (기존 카피 "손님 리뷰, 이제 고민하지 말고 답변하세요" → "리뷰 답장은 기본, 반복되는 문제까지 잡아드려요"를 거쳐 재변경 — 답변 생성보다 "관리를 통한 문제 발견"을 앞세우는 포지셔닝으로 조정)
  - 서브텍스트 16px `oklch(45% 0.02 50)`: "감정분석·답변 초안은 물론, 같은 불만이 쌓이면 가장 먼저 알려드립니다"
  - CTA "지금 시작하기": 기존과 동일 스타일(`oklch(64% 0.17 45)`, radius 10px, shadow `0 6px 16px oklch(64% 0.17 45 / 0.3)`) + hover 시 `translateY(-2px)`, shadow `0 10px 22px oklch(64% 0.17 45 / 0.35)`. **동작 변경**: 기존엔 `#tool`로 스크롤이었으나 지금은 `/app`로 실제 라우트 이동.
- **우측(hero-preview-card, 신규)**: max-width 340px, `animation: fadeInUp 0.6s ease 0.15s both`(좌측보다 0.15s 늦게 페이드인), 카드 스타일(배경/보더/radius 16px/shadow — 입력 카드와 동일 토큰), padding 20px. hover 시 `translateY(-4px)` + shadow `0 12px 28px oklch(40% 0.02 50 / 0.14)`.
  - 상단: 창 컨트롤 점 3개(●●●, 8px 원, `bg oklch(90% 0.02 60)`, gap 6px) — "미니 앱 화면"처럼 보이게 하는 장식.
  - **콘텐츠는 입력 폼이 아니라 미니 대시보드 형태**(변경 — 기존엔 "리뷰 입력" 박스 + 기능 리스트였음):
    1. 별점 행: `★★★★★`(5개, `oklch(64% 0.17 45)`, 16px) + 평점 숫자(20px/800, `oklch(26% 0.03 45)`) — "4.7"
    2. 라벨(12px/700, `oklch(55% 0.02 50)`) "이번달 리뷰" + 큰 숫자(32px/800, primary) "132개"
    3. 구분선(`border-top: 1px solid oklch(91% 0.02 60)`)
    4. 감정 비율 3행(`bg oklch(98.5% 0.01 70)`, radius 10px, padding `8px 12px`, flex space-between, 13px/600): "😊 긍정 — 83%"(퍼센트는 positive 색), "😐 보통 — 12%"(neutral 색), "😡 부정 — 5%"(negative 색)
    5. 구분선
    6. 라벨 "반복 불만" + pill 칩 목록(가로 나열, `bg oklch(98% 0.01 30) / text oklch(35% 0.14 30)`, border `1px solid oklch(62% 0.18 30)` — 반복문제 배너와 같은 색 계열): "대기시간", "직원 친절", "가격"
  - 이 카드는 **예시/장식용 정적 데이터**이며 실제 계정 데이터와 연동되지 않음(로그인 기능 자체가 없음).

### 2-2. 차별점 데모 섹션 (신규)
max-width 800px, 중앙 정렬, padding `16px 24px 40px`, 텍스트 중앙 정렬.
- 섹션 타이틀(공통 `.section-title` — 20px/700, `oklch(26% 0.03 45)`, 아래 §5 참고): "다른 도구엔 없는 기능"
- 서브텍스트 14px `oklch(45% 0.02 50)`: "리뷰 하나하나 답장만 써주는 게 아니라, 반복되는 진짜 문제를 짚어드려요"
- **§1-3 반복 문제 감지 배너를 그대로 재사용**(리셋 버튼 없이, 헤더만) — 예시 데이터 고정: "대기시간" 관련 부정 리뷰 3건 누적 + 피크타임 인력 배치 조정 제안.

### 2-3. 수치 섹션 (신규, count-up 애니메이션)
max-width 760px, 중앙 정렬, flex row gap 48px, padding `24px 24px 8px`, 스크롤 진입 시(`IntersectionObserver`) 0→목표값 카운트업(1000ms).
- 3개 항목, 각 `stat-number`(32px/800, primary color) + `stat-label`(13px, muted) + `stat-detail`(11px, muted, 선택):
  1. **15개** — "리뷰 한 번에 분석"
  2. **6종** — "키워드 카테고리 자동 감지" / detail: "맛·친절도·대기시간·가격·청결도·분위기"
  3. **3종** — "톤별 답변 초안" / detail: "정중함·친근함·간결함"
- 실제 기능 수치를 그대로 사용(가짜 사용자 통계 아님).

### 2-4. 공감 포인트 섹션 (신규)
max-width 760px, 중앙 정렬, padding `40px 24px 8px`.
- 섹션 타이틀: "이런 고민 있으신가요?"
- 카드 3개(flex wrap, gap 16px, 각 max-width 260px): 배경/보더/radius 14px, padding `20px 18px`, 텍스트 중앙 정렬, hover 시 `translateY(-4px)` + shadow 강조. 아이콘(28px) + 텍스트(14px):
  1. 🔁 "같은 불만이 반복되는데 정확히 뭐가 문제인지 모르겠어요" (차별점과 연결되도록 맨 앞에 배치)
  2. 😥 "리뷰에 뭐라고 답장해야 할지 매번 막막해요"
  3. ⏰ "리뷰 하나하나 답변 쓸 시간이 없어요"

### 2-5. 예시 답변 섹션 (신규)
max-width 800px, 중앙 정렬, padding `8px 24px 40px`.
- 섹션 타이틀: "이런 답변을 받아요"
- **§1-4 결과 카드 컴포넌트를 그대로 재사용**(`ExampleResultCard`, `/guide`와 공유) — 고정 예시: "음식은 맛있었는데 너무 오래 기다렸어요." → 부정 · #맛 #대기시간 · 개선 제안 · 답변 3종. (신규 버전은 §1-4와 동일 컴포넌트라 AI 점수 배지는 없음 — 정적 예시 데이터에는 점수 필드를 넣지 않았음)

### 2-6. How it works (기존 유지, 앵커 id만 제거)
- 원본과 동일: 중앙 정렬 flex row, gap 12px, max-width 760px, 3개 pill 칩("리뷰 붙여넣기" → "분석 시작" → "답변 복사") + hover 시 `translateY(-2px)` + shadow.
- **변경점**: 더 이상 `id="how-it-works"`로 앵커 스크롤 대상이 아님(사용법 링크가 `/guide` 페이지로 이동하도록 바뀌었기 때문). 순수 장식/설명 섹션으로만 남음.

### 2-7. 타겟 업종 섹션 (신규)
max-width 760px, 중앙 정렬, padding `8px 24px 48px`.
- 섹션 타이틀: "이런 가게에 딱이에요"
- Chip 5개(pill, `oklch(99% 0.006 70)` 배경, border, 13px/600, padding `8px 16px`, hover 시 `translateY(-2px)` + shadow): "☕ 카페" · "🍽️ 식당" · "💇 미용실" · "🏨 숙박" · "🛍️ 소매점"

### 2-8. Footer
§1-5와 동일 텍스트.

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
- **`/` (LandingPage)**: `showAuthNotice`(로그인 버튼 말풍선), 5개의 `useInView` 결과(반복 문제 데모/수치/공감/예시/사용법/타겟업종 각 섹션), `useCountUp` 3개(수치 섹션).
- **`/dashboard` (DashboardPage)**: `summary`(`GET /stats/summary` 응답), `months`(`GET /stats/monthly` 응답), `loading`, `error`.
- **데이터 페칭**: `src/lib/api.js`의 `analyzeReviews` / `resetHistory` / `getSummary` / `getMonthlyStats` — 전부 `fetch` 기반, 세션ID 헤더 자동 첨부. 에러 시 서버 응답의 `error.message`를 그대로 노출.

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
