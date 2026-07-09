# Handoff: 리뷰 답변 도우미 — 툴 화면 (Tool Screen)

## Overview
소상공인이 손님 리뷰를 붙여넣으면 감정 분석·핵심 키워드 추출·반복 문제 감지·답변 초안 3종을 생성해주는 웹 도구의 핵심 화면. 이번 핸드오프는 **"Tool" 화면 1개** (입력 카드 → 상태/에러 메시지 → 반복 문제 배너 → 결과 카드 리스트) + 상단 네비/히어로/사용법 섹션을 포함한다.

## About the Design Files
이 폴더의 `reference_리뷰답변도우미.dc.html`은 **디자인 레퍼런스로 만든 HTML 프로토타입**이며, 그대로 복사해 쓸 프로덕션 코드가 아니다. 목표는 이 HTML이 보여주는 룩앤필과 동작을 대상 코드베이스(React)의 기존 패턴과 라이브러리를 이용해 **재구현**하는 것이다. 아직 프로젝트 구조가 없다면 React + 일반적인 상태관리(useState 등)로 새로 시작해도 된다.

파일을 열면 `<x-dc>` 커스텀 태그로 감싸진 마크업과 `class Component extends DCLogic { ... }` 형태의 로직 클래스가 보이는데, 이는 사내 프로토타이핑 툴의 포맷이다. 마크업 구조와 인라인 스타일 값, 로직 클래스의 상태/함수는 그대로 참고하되, React 컴포넌트로 옮길 때는 통상적인 `useState`/`onChange` 패턴으로 변환하면 된다.

## Fidelity
**High-fidelity.** 색상, 타이포그래피, 간격, 인터랙션이 최종 값으로 확정되어 있다. 아래 스펙대로 픽셀 단위로 재현할 것.

## Screens / Views

### 1. Navbar
- **Layout**: `position: sticky; top:0`, 좌우 정렬 `justify-content: space-between`, padding `16px 32px`, 배경 `oklch(99% 0.006 70 / 0.9)` + `backdrop-filter: blur(8px)`, 하단 보더 `1px solid oklch(90% 0.02 60)`.
- **좌측**: 🍊 이모지 + "리뷰 답변 도우미", 18px/700.
- **우측**: "사용법" 텍스트 링크(14px/600, `#howitworks`로 스크롤) + "바로 사용하기" 버튼(`#tool`로 스크롤, 배경 `oklch(64% 0.17 45)`, hover `oklch(58% 0.18 42)`, 흰 글자, radius 8px, padding `9px 18px`).

### 2. Hero
- 중앙 정렬, max-width 720px, padding `56px 24px 40px`.
- H1 34px/800, color `oklch(26% 0.03 45)`, letter-spacing -0.01em: "손님 리뷰, 이제 고민하지 말고 답변하세요"
- 서브텍스트 16px, color `oklch(45% 0.02 50)`: "감정분석 · 반복문제 감지 · 개선제안, 붙여넣기 한 번으로 끝내세요"
- CTA 버튼 "지금 시작하기": 배경 `oklch(64% 0.17 45)`, 흰 글자 15px/700, padding `13px 28px`, radius 10px, shadow `0 6px 16px oklch(64% 0.17 45 / 0.3)`, hover `oklch(58% 0.18 42)`.

### 3. How it works (`#howitworks`)
- 중앙 정렬 flex row, gap 12px, max-width 760px.
- 3개의 pill 칩(배경 `oklch(99% 0.006 70)`, border `1px solid oklch(91% 0.02 60)`, radius 999px, padding `10px 18px`) 사이에 "→" 구분자.
- 각 칩: 22px 원형 숫자 배지(배경 `oklch(64% 0.17 45)`, 흰 글자 12px) + 라벨(14px/600): "리뷰 붙여넣기" / "분석 시작" / "답변 복사".

### 4. Tool 영역 (`#tool`, 핵심 화면)
max-width 800px, 중앙 정렬, padding `8px 24px 80px`.

#### 4-1. 입력 카드
- 컨테이너: 배경 `oklch(99% 0.006 70)`, border `1px solid oklch(91% 0.02 60)`, radius 16px, padding 24px, shadow `0 2px 10px oklch(40% 0.02 50 / 0.05)`.
- 라벨 "리뷰 붙여넣기": 15px/700, color `oklch(30% 0.02 50)`, margin-bottom 8px.
- Textarea: 100% width, min-height 160px, resize vertical, border `1px solid oklch(88% 0.02 60)`, radius 10px, padding 14px, 15px, 배경 `oklch(98.5% 0.01 70)`.
  - placeholder: "예) 음식은 맛있었는데 너무 오래 기다렸어요.\n직원분이 너무 불친절했어요.\n(리뷰 하나당 한 줄, 최대 15개)"
- 하단 힌트 행(margin-top 10px, flex space-between, 13px, color `oklch(55% 0.02 50)`): 좌측 "줄바꿈으로 리뷰를 구분해주세요 · 최대 15개" / 우측 "{n}개 입력됨" (실시간 줄 수 카운트).
- "분석 시작" 버튼: full width, padding 14px, 16px/700, 흰 글자, 배경 `oklch(64% 0.17 45)` hover `oklch(58% 0.18 42)`, radius 10px, `disabled` 상태는 로딩 중일 때. 로딩 중엔 라벨이 "분석 중..."으로 바뀜.

#### 4-2. 상태/에러 메시지 (입력 카드 바로 아래, margin-top 16px)
- **로딩**: 14px 스피너(16px 원, border 3px `oklch(85% 0.03 45)`, top-color `oklch(60% 0.17 45)`, 0.7s linear 무한 회전) + "분석 중이에요..." (14px/600, `oklch(45% 0.02 50)`).
- **에러**(입력 검증 실패/복사 실패 공용): 배경 `oklch(94% 0.05 30)`, border `1px solid oklch(75% 0.12 30)`, radius 10px, padding `14px 16px`, 텍스트 14px/600 `oklch(38% 0.14 30)`, 앞에 ⚠️ 아이콘.
  - 에러 메시지 3종: "리뷰를 먼저 입력해주세요." / "유효한 리뷰가 없어요." / "한 번에 최대 15개까지 분석할 수 있어요."
  - 복사 실패: "복사에 실패했어요. 직접 선택해서 복사해주세요."

#### 4-3. 반복 문제 감지 배너 (조건부, margin-top 28px)
- 배경 `oklch(93% 0.06 35)`, border `2px solid oklch(62% 0.18 30)`, radius 14px, padding `20px 22px`.
- 헤더 행: "⚠️ 반복되는 문제 감지" (16px/800, `oklch(35% 0.16 30)`) — 우측에 "누적 기록 초기화" 버튼(투명 배경, border `1px solid oklch(55% 0.15 30)`, 글자 `oklch(40% 0.15 30)`, 12px/700, radius 999px, padding `6px 12px`).
- 아이템 리스트(gap 10px): 각 항목 배경 `oklch(98% 0.01 30)`, radius 10px, padding `12px 14px`.
  - 제목 14px/700 `oklch(35% 0.14 30)`: `"{키워드}" 관련 부정 리뷰 {건수}건 누적`
  - 제안 13px `oklch(45% 0.1 30)`: `💡 {개선 제안 문구}`
- **표시 조건**: 세션 누적 기준으로 동일 키워드의 부정 리뷰가 2건 이상일 때만 노출.

#### 4-4. 결과 카드 리스트 (margin-top 28px, flex column, gap 18px)
리뷰 하나당 카드 하나. 카드: 배경 `oklch(99% 0.006 70)`, border `1px solid oklch(91% 0.02 60)`, radius 16px, padding 22px, shadow `0 2px 10px oklch(40% 0.02 50 / 0.05)`.

1. **원문**: `"{리뷰 텍스트}"`, 15px, `oklch(30% 0.02 50)`, margin-bottom 12px.
2. **태그 행** (flex wrap, gap 8px, margin-bottom 12px):
   - 감정 태그(pill, 12px/800, padding `5px 12px`): 긍정 `bg oklch(90% 0.09 150) / text oklch(35% 0.1 150)`, 부정 `bg oklch(91% 0.07 25) / text oklch(40% 0.15 25)`, 중립 `bg oklch(92% 0.01 60) / text oklch(45% 0.01 60)`.
   - 키워드 태그(최대 3개, pill, 12px/600, `bg oklch(95% 0.02 60) / text oklch(45% 0.02 50)`): `#{키워드}` 형식.
3. **개선 제안** (부정 리뷰일 때만): 배경 `oklch(96% 0.03 35)`, radius 8px, padding `10px 12px`, 13px `oklch(45% 0.1 30)`, margin-bottom 14px: `💡 개선 제안: {문구}`
4. **답변 초안 3종** (항상 동시에 펼쳐서 표시 — 탭/토글 없음, flex column gap 10px): 각 행은 border `1px solid oklch(90% 0.02 60)`, radius 10px, padding `12px 14px`, 배경 `oklch(98.5% 0.01 70)`.
   - 상단 행: 톤 라벨(12px/800, `oklch(55% 0.14 45)`: "정중함"/"친근함"/"간결함") + "복사하기" 버튼(우측 정렬, min-width 88px, white-space nowrap, 12px/700, padding `5px 14px`, radius 999px, border `1px solid oklch(70% 0.15 45)`, 기본 `bg oklch(98% 0.01 45) / text oklch(50% 0.15 45)`).
   - 클릭 시 클립보드 복사 + 버튼이 1.5초간 "복사됨 ✓" 로 전환(`bg oklch(88% 0.09 150) / text oklch(35% 0.1 150)`), 이후 원상복구.
   - 하단: 답변 초안 텍스트, 14px `oklch(32% 0.02 50)`.

### 5. Footer
- 중앙 정렬, padding `32px 24px`, 13px `oklch(55% 0.02 50)`, 상단 border `1px solid oklch(91% 0.02 60)`: "🍊 리뷰 답변 도우미 · 소상공인 무료 도구"

## Interactions & Behavior
- **입력 검증** (분석 시작 클릭 시, 순서대로 체크):
  1. textarea가 완전히 비어있음(length 0) → "리뷰를 먼저 입력해주세요."
  2. trim 후 빈 줄만 있음(공백/줄바꿈만) → "유효한 리뷰가 없어요."
  3. 줄바꿈 기준 분리한 유효 리뷰가 15개 초과 → "한 번에 최대 15개까지 분석할 수 있어요."
  4. 통과 시 로딩 상태 진입 → 약 500ms 후 결과 렌더링.
- **감정 분석 로직**: 키워드 사전 매칭 점수 비교.
  - 긍정 단어 사전(어간 포함 변형 매칭): 맛있, 친절, 깨끗, 좋아요, 최고, 빠르, 만족, 추천, 훌륭, 쾌적, 친근
  - 부정 단어 사전: 별로, 불친절, 오래, 대기, 기다, 길었, 실망, 비싸, 비싼, 비쌌, 더러운, 늦게, 불편, 최악, 부족, 무례, 시끄러
  - 부정 접두사("불/안/못")가 긍정 단어 바로 앞에 오면 그 매칭은 부정으로 카운트 (예: "불친절"의 "친절" 매칭은 부정 처리).
  - 점수 비교: 부정>긍정 → negative, 긍정>부정 → positive, 동점이면서 부정 매칭이 1개 이상 있으면 → negative (부정 신호가 있으면 중립으로 묻히지 않도록), 둘 다 0이면 neutral.
- **키워드 추출**: 6개 카테고리(맛/친절도/대기시간/가격/청결도/분위기) 각각 트리거 단어 목록으로 텍스트 포함 여부 검사, 리뷰당 최대 3개, 매칭 없으면 "일반".
- **개선 제안 문구** (부정 리뷰의 1순위 키워드 기준, 고정 매핑):
  - 대기시간 → "피크타임 인력 배치 조정을 검토해보세요."
  - 친절도 → "응대 매뉴얼 교육을 강화해보세요."
  - 맛 → "레시피와 조리 일관성을 점검해보세요."
  - 가격 → "가격 대비 만족도를 높일 세트/할인 구성을 고려해보세요."
  - 청결도 → "청소 주기와 위생 점검을 강화해보세요."
  - 분위기 → "매장 조명·음악·좌석 배치를 점검해보세요."
  - 일반 → "구체적인 피드백을 요청해 개선 포인트를 파악해보세요."
- **답변 초안 3종 생성**: 감정(positive/negative/neutral) × 1순위 키워드 조합의 고정 템플릿에서 생성. 템플릿 3종은 정중함(polite)/친근함(friendly)/간결함(concise) 고정 톤.
- **반복 문제 감지**: 세션(브라우저 상태) 누적 카운터. 매 분석마다 negative로 분류된 리뷰의 키워드(단, "일반" 제외)별로 누적 카운트 +1. 누적 카운트가 2 이상인 키워드가 있으면 배너 노출, 목록은 그 키워드들만. "누적 기록 초기화" 클릭 시 누적 카운터만 리셋(현재 화면에 보이는 결과 카드는 그대로 유지).
- **클립보드 복사**: `navigator.clipboard.writeText` 사용. 성공 시 해당 버튼만 1.5초간 "복사됨 ✓"로 전환 후 원복. 실패(권한 등) 시 카드 위 공용 에러 배너에 "복사에 실패했어요. 직접 선택해서 복사해주세요." 노출.
- **로딩 상태**: 버튼이 disabled + 라벨 "분석 중..."로 바뀌고, 입력 카드 아래 스피너+텍스트 노출. 약 500ms 인위적 지연(실제 API 연동 시 이 지연은 실제 네트워크 응답 대기로 대체).
- **초기 화면 상태**: 첫 진입 시 샘플 리뷰 6개가 이미 textarea에 채워져 있고, 분석도 자동 실행되어 결과 카드 + 반복 문제 배너까지 이미 보이는 상태로 시작 (데모/QA 편의용). 실제 서비스에서는 이 자동 실행을 제거하고 빈 textarea + "초기(입력 카드만)" 상태로 시작해야 함.

## State Management
필요한 상태:
- `text: string` — textarea 값
- `results: Array<{id, originalText, sentiment, keywords[], suggestion}> | null` — 분석 결과 (null = 아직 미실행)
- `loading: boolean`
- `errorMessage: string | null`
- `copyError: string | null`
- `copiedKey: string | null` — 현재 "복사됨" 표시 중인 draft 식별자 (`{reviewId}-{tone}` 형식)
- `historyCounts: Record<keyword, count>` — 세션 누적, negative 키워드별 카운트
- `recurringIssues: Array<{keyword, count, suggestion}>` — `historyCounts`에서 count>=2인 것만 파생

상태 전이:
- 분석 시작 → 검증 실패 시 `errorMessage` set, 상태 변화 없음.
- 검증 통과 → `loading=true` → 500ms 후 `results`, `historyCounts`, `recurringIssues` 갱신, `loading=false`.
- 복사 클릭 → 성공 시 `copiedKey` set → 1.5초 후 clear. 실패 시 `copyError` set.
- 초기화 클릭 → `historyCounts={}`, `recurringIssues=[]`.

데이터 페칭: 현재는 브라우저 내 규칙 기반 로직으로, 서버 호출 없음. 기획서상 향후 `POST /api/v1/reviews/analyze` (요청: `{reviews: string[]}`, 헤더 `X-Session-Id`)로 교체 예정 — 이 경우 `runAnalysis`의 계산 로직을 API 호출로 치환하고, `historyCounts`/`recurringIssues`는 서버 응답의 `recurringIssues` 필드를 그대로 사용하도록 변경. 에러 코드 매핑: `EMPTY_INPUT`/`NO_VALID_REVIEW`/`TOO_MANY_REVIEWS` → 각각 위 에러 메시지, `ANALYSIS_FAILED`(500) → "잠시 후 다시 시도해주세요."

## Design Tokens

### Colors (OKLCH)
- 배경(페이지): `oklch(97.5% 0.014 70)`
- 카드/서페이스 배경: `oklch(99% 0.006 70)`
- 서브 배경(입력창 등): `oklch(98.5% 0.01 70)`
- 보더(기본): `oklch(91% 0.02 60)` / 얕은 보더: `oklch(90% 0.02 60)`
- 텍스트 진함(헤딩): `oklch(26–30% 0.02–0.03 45–50)`
- 텍스트 본문: `oklch(28–32% 0.02 50)`
- 텍스트 보조/뮤트: `oklch(45–55% 0.02 50)`
- Primary(오렌지): `oklch(64% 0.17 45)`, hover `oklch(58% 0.18 42)`
- Positive(초록): bg `oklch(90% 0.09 150)`, text `oklch(35% 0.1 150)`
- Negative(빨강): bg `oklch(91% 0.07 25)`, text `oklch(40% 0.15 25)`
- Neutral(회색): bg `oklch(92% 0.01 60)`, text `oklch(45% 0.01 60)`
- 경고/에러(주황): bg `oklch(94% 0.05 30)`, border `oklch(75% 0.12 30)`, text `oklch(38% 0.14 30)`
- 반복문제 배너(강조): bg `oklch(93% 0.06 35)`, border `oklch(62% 0.18 30)` 2px, heading text `oklch(35% 0.16 30)`

### Typography
- 폰트: **Pretendard Variable** (CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css`), fallback `-apple-system, BlinkMacSystemFont, sans-serif`
- Scale: 34px/800 (H1) · 18px/700 (로고) · 16px/700·600 (서브헤드/버튼) · 15px/700·400 (라벨/본문) · 14px/600·700 (버튼/캡션) · 13px (힌트/보조) · 12px/600·800 (태그/배지)
- line-height: 1.55 (body 기본)

### Spacing / Radius
- Container max-width: 800px(Tool) / 760px(How it works) / 720px(Hero)
- 카드 padding: 22–24px · 버튼 padding: 13–14px(대) / 9–6px(소) · pill padding: 5–10px×12–18px
- Radius: 8px(소버튼) · 10px(입력/버튼/draft행) · 14px(배너) · 16px(카드) · 999px(pill/배지)

### Shadow
- 카드: `0 2px 10px oklch(40% 0.02 50 / 0.05)`
- Hero CTA: `0 6px 16px oklch(64% 0.17 45 / 0.3)`

## Assets
이모지만 사용(🍊, ⚠️, 💡, ✓) — 별도 로고/아이콘 에셋 없음. 커스텀 아이콘 시스템 도입 시 별도 논의 필요.

## Files
- `reference_리뷰답변도우미.dc.html` — 전체 화면 레퍼런스 (원본 프로토타이핑 포맷, 위 스펙의 출처)
