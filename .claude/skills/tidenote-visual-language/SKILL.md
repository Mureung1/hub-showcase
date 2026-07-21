---
name: tidenote-visual-language
description: TideNote 실제 화면(채팅 스트림, History 사이드바, Tide Check 카드) 디자인 시 반드시 참고. 화이트 베이스 + 단일 블루 포인트 컬러, 알약형 곡률, 그리고 "블러 = 잠김/흐릿한 상태"를 표현하는 이 프로젝트만의 시맨틱 블러 장치를 정의한다. 새 화면/컴포넌트를 만들거나 색상·라운딩·블러 값을 정할 때 이 문서의 토큰과 레시피를 따른다.
---

# TideNote 비주얼 랭귀지

Figma 목업(2026-07-13 확정본) 기준. 핵심 원칙 한 줄:
**"채도는 낮추고, 확신은 흐리게(blur), 곡선은 부드럽게."**

> ⚠️ `prototype/index.html`의 다크/새벽빛(`--deep-night`, `--dawn-coral`, `--morning-cream` 등) 팔레트는
> 이 스킬과 다른 이전 방향이다. 이 문서가 최신 확정 방향이므로, 프로토타입을 이 화면 기준으로
> 다시 맞출지(재작업) 여부는 별도로 결정해야 한다 — 이 스킬만 보고 임의로 두 팔레트를 섞지 말 것.

## 1. 핵심 원칙

1. **화이트 베이스, 블루는 딱 하나의 포인트로만.** 배경/카드/사이드바는 전부 화이트~라이트 그레이
   뉴트럴이고, 액션 가능한 요소(제출 버튼, 활성 탭, 첨부 플래그, 전송 버튼, 슬라이더 진행)에만
   블루를 쓴다. 두 가지 이상의 액센트 컬러를 동시에 쓰지 않는다.
2. **블러는 장식이 아니라 상태 표시다.** 이 프로젝트의 핵심 기능(Recall Module)은 "원문을
   숨긴다"이므로, 잠긴/흐린 콘텐츠는 항상 블러 처리로 표현한다 — 색을 흐리게 하거나 투명도만
   낮추는 방식으로 대체하지 않는다. 포스터 문구 그대로 **"No numbers, just a feeling"** —
   슬라이더 핸들도 정확한 점이 아니라 번져 보이는 블러 블롭으로 그려 "숫자가 아니라 감각"이라는
   제품 철학을 시각적으로 반복한다.
3. **곡률은 크고 일관되게.** 버튼·칩·세그먼트 컨트롤은 알약형(완전 라운드), 카드는 큰 라운드
   (20~28px). 각진 요소를 거의 쓰지 않는다.
4. **타이포는 절제.** 시스템 산세리프(SF Pro/Inter 계열) 한 종류만 쓰고, 크기·굵기 단계만으로
   위계를 만든다. 장식적 폰트(세리프 등)를 섞지 않는다.
5. **TideNote는 웹 서비스다 — 폰 프레임 금지.** 베젤·노치가 있는 스마트폰 목업(고정
   360~430px 너비의 둥근 프레임)으로 화면을 감싸지 않는다. 브라우저 창 폭을 그대로 쓰는
   데스크톱 웹 레이아웃(사이드바 + 메인 콘텐츠)으로 만든다. 자세한 구조는 7번 참고.

## 2. 컬러 토큰

```css
:root {
  /* base */
  --tn-bg: #ffffff;
  --tn-surface: #f4f5f8;        /* 사이드바 카드, 비활성 세그먼트 배경 */
  --tn-surface-muted: #ececf1;  /* 타임스탬프 칩 배경 */
  --tn-divider: #e7e8ec;

  /* text */
  --tn-ink: #1a1b1e;            /* 본문/제목 */
  --tn-ink-soft: #8a8d96;       /* 비활성 탭, 보조 텍스트 */
  --tn-ink-faint: #b5b8c0;      /* placeholder */

  /* accent — 이 프로젝트에서 유일한 포인트 컬러 */
  --tn-blue: #4c6ef5;
  --tn-blue-soft: #e4e9fd;      /* 슬라이더 트랙 배경 */
  --tn-blue-glow: rgba(76, 110, 245, 0.55); /* 슬라이더 핸들 블러 글로우 */
  --tn-pill-muted: #9aa0ac;     /* "View original" 같은 중립 pill 배경 */
}
```

## 3. 라운딩 / 스페이싱

```css
:root {
  --tn-radius-pill: 999px;   /* 버튼, 칩, 세그먼트 컨트롤, 채팅 입력창 */
  --tn-radius-card: 24px;    /* 카드, 첨부 레퍼런스 카드, 모달 */
  --tn-radius-bubble: 18px;  /* 채팅 버블 */

  --tn-space-1: 4px;
  --tn-space-2: 8px;
  --tn-space-3: 12px;
  --tn-space-4: 16px;
  --tn-space-5: 24px;
}
```

## 4. 타이포그래피

```css
:root {
  --tn-font: -apple-system, "SF Pro Text", "Pretendard", Inter, sans-serif;
}
.tn-title    { font: 600 22px/1.3 var(--tn-font); color: var(--tn-ink); }
.tn-label    { font: 500 15px/1.4 var(--tn-font); color: var(--tn-ink); }
.tn-body     { font: 400 15px/1.6 var(--tn-font); color: var(--tn-ink); }
.tn-caption  { font: 500 12px/1.4 var(--tn-font); color: var(--tn-ink-soft); }
```

## 5. 시맨틱 블러 (가장 중요한 장치)

### 5.1 잠긴(submerged) 원문 텍스트
Recall Module에서 `|D_gen − D_recall| > T`일 때 원문이 잠긴다. 잠긴 상태는 **텍스트 자체를
블러 처리**하고 그 위에 옅은 화이트/블루 그라데이션을 얹어 "물 아래 잠긴" 느낌을 낸다.

```css
.tn-submerged-text {
  filter: blur(4px);
  user-select: none;
  pointer-events: none;
}
.tn-submerged-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(228,233,253,0.35));
}
```
- 블러 강도(4px)는 고정값으로 시작하되, 나중에 실제로 gap 크기에 비례해 블러를 더/덜 주는 것도
  고려할 수 있다(예: gap이 클수록 6~8px). 지금은 과설계하지 말고 고정값으로 구현한다.
- "View original"을 눌러야만 블러가 풀린다 — hover나 자동 해제는 없다(능동적 선택이라는
  제품 원칙, 포스터 3절 참고).

### 5.2 Tide Check 슬라이더 (Figma 실측 스펙, 2026-07-20 갱신)
> ⚠️ 이전 버전은 "블러된 블롭(glow)" 핸들로 적혀 있었는데, 실제 Figma 스펙을
> 받아보니 블러가 아니라 **웨이브 모양 SVG 장식 + 알약형 핸들** 조합이었다.
> 아래가 최신 정확한 스펙이고, 위 문단의 "숫자 대신 감각" 철학 자체는 여전히
> 유효하다 — 시각적 구현 방식만 블러에서 웨이브로 정정한다.

3개 레이어로 구성된다: ①얇은 회색 트랙(바탕선) ②파란 그라데이션 웨이브 장식
(항상 트랙 전체 폭을 채움, 값과 무관) ③값 위치를 따라 좌우로 움직이는 회색
알약형 핸들. 실제 구현은 `src/TideSlider.jsx` 참고 — 투명한
`<input type="range">`를 맨 위에 얹어 드래그/키보드 조작을 담당시키고, 트랙·
웨이브·핸들은 그 값을 그대로 반영하는 장식 레이어로만 그린다.

```css
.tide-slider-track {
  height: 1.5px;
  border-radius: 999px;
  background: #d9d9d9;         /* 트랙은 파란 계열이 아니라 뉴트럴 그레이 */
}
.tide-slider-handle {
  width: 17px;
  height: 12px;
  border-radius: 999px;         /* 완전한 원이 아니라 살짝 납작한 알약형 */
  background: #d9d9d9;
  transform: translateX(-50%);  /* left: {value%} 로 위치, 중앙 정렬 */
}
```
웨이브 SVG의 채움은 `linear-gradient(90deg, #9EC5FF 0%, #1A75FF 40%, #9EC5FF 100%)` —
가운데가 가장 진한 파랑이고 양 끝으로 갈수록 옅어지는 대칭 그라데이션이다.
`--tn-blue`(#4c6ef5)보다 밝고 채도 낮은 별도 팔레트(`#9EC5FF`/`#1A75FF`)를
슬라이더 전용으로 쓴다 — 다른 곳의 액션 블루와 굳이 맞추지 않는다.
- 라벨은 숫자 대신 감각 단어로만 표시한다: `Cloudy ↔ Clear`, `Calm ↔ Rippling` (포스터 원문 그대로).
- 슬라이더에는 눈금/숫자를 절대 표시하지 않는다.

## 6. 컴포넌트 레시피

### 6.1 세그먼트 토글 (예: `Long History` / `24h History`)
- 전체를 감싸는 트랙은 `--tn-surface` 배경, `--tn-radius-pill`.
- 활성 세그먼트만 `--tn-bg`(화이트) 배경 + `--tn-ink` 텍스트로 튀어나와 보이게, 비활성은
  투명 배경 + `--tn-ink-soft` 텍스트.

### 6.2 타임스탬프 칩 (예: `3:40 AM – 4:05 AM · Topic: Identity`)
- `--tn-surface-muted` 배경, `--tn-radius-pill`, `--tn-caption` 타이포, 패딩 `--tn-space-2 --tn-space-3`.

### 6.3 채팅 버블
- 사용자 메시지: 오른쪽 정렬, `--tn-surface` 배경, `--tn-radius-bubble`.
- AI 응답: 버블 없이 배경 없는 `--tn-body` 텍스트 그대로(왼쪽 정렬) — 두 발화자를 "버블 유무"로만 구분한다.

### 6.4 첨부(Attachment) 레퍼런스 카드 — "Update your tide" 플래그
- History 카드를 채팅창에 첨부할 때 새 방을 열지 않고, 입력창 위에 **깃발(flag) 탭이 달린
  카드**로 붙인다.
- 플래그 탭: `--tn-blue` 배경 + 화이트 텍스트, 카드 본문: 화이트 배경 + `--tn-radius-card`
  (플래그가 카드 왼쪽 위 모서리에서 이어지는 형태).
- 탭 라벨은 액션을 그대로 담는다 (`Update your tide`, `History` 등) — 아이콘보다 텍스트 우선.

## 7. 레이아웃 — 웹 서비스 구조

기준은 Figma 목업의 데스크톱 스크린샷(2026-07-13). 뼈대는 **사이드바 + 메인 콘텐츠**
두 칼럼이고, 뷰포트 전체 폭/높이를 쓴다. 폰 프레임처럼 고정 크기 박스에 화면을
가두지 않는다.

```css
.app-shell {
  display: flex;
  width: 100%;
  min-height: 100vh;
  background: var(--tn-bg);
}
.app-sidebar {
  flex: 0 0 300px;       /* 고정 너비 */
  border-right: 1px solid var(--tn-divider);
  padding: 28px 20px;
  overflow-y: auto;
}
.app-main {
  flex: 1;                /* 남은 폭 전부 */
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 28px 40px;
}
```

- **사이드바**: History/Recent 세그먼트 토글 + episode 목록. 화면이 좁아지면
  (`@media (max-width: 860px)`) 사이드바를 위쪽 가로 탭으로 접는 정도로만 반응형
  처리하고, 폰 카드로 되돌아가지 않는다.
- **메인 콘텐츠**: 채팅 스트림. `max-width: 720px` 정도로 본문 가독 폭만 제한하고,
  좌우 여백은 `padding`으로 남긴다 — 전체 페이지 폭 자체를 좁히지 않는다.
- **Tide Check**: 별도 페이지 전체를 차지하는 게 아니라, 메인 콘텐츠 위에 뜨는
  모달/카드(`--tn-radius-card`, `max-width: 420px`, 화면 중앙)로 띄운다. 뒤 배경은
  살짝 어둡게(`rgba(20,20,26,0.35)`) 눌러서 포커스를 준다.

## 8. 체크리스트 (새 화면 만들 때)

- [ ] 폰 프레임(베젤·고정 360~430px 너비 박스) 없이 뷰포트 폭을 그대로 쓰는가?
- [ ] 배경/카드가 화이트 또는 `--tn-surface` 뉴트럴인가? (색이 있는 배경을 쓰지 않았는가)
- [ ] 블루를 액션 요소 하나에만 썼는가? (여러 군데 남발하지 않았는가)
- [ ] 잠긴/불확실한 콘텐츠에 블러를 시맨틱하게 썼는가? (단순 opacity로 대체하지 않았는가)
- [ ] 버튼/칩/카드가 알약형 또는 큰 라운드인가?
- [ ] 슬라이더에 숫자 라벨이 없는가?
