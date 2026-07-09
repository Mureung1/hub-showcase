# 빵지도 디자인 시스템

`index.html` + `style.css`에 적용된 디자인 규칙을 정리한 문서. 새 화면/기능을 추가할 때 아래 원칙과 토큰을 그대로 재사용해서 일관성을 유지한다.

## 0. 디자인 철학

- **중립 베이스 + 단 하나의 비비드 포인트.** 배경/카드/보더/텍스트는 전부 무채색(웜 그레이~잉크) 톤으로 통일하고, 색은 오렌지 계열 `--accent` 하나만 의도적으로 사용한다. "여기저기 다 색칠"이 아니라 "필요한 곳에만 색이 튄다"가 기준.
- **모노 그레이스케일에 라운드 필(pill) 형태.** 버튼·태그·네비게이션은 대부분 `border-radius: 999px`. 카드류만 12~20px의 중간 라운드를 쓴다.
- **비비드는 상태/의미 전달용으로도 사용.** 랭크 색(주황/파랑/코럴), 마감임박(레드), 한산해요(그린), 찜(코럴) 같은 기능적 색은 accent와 별개로 존재하며, 이건 "장식"이 아니라 "정보"이므로 팔레트를 늘려도 된다. 단, UI 크롬(버튼/보더/배경)에는 여전히 accent 하나만 쓴다.
- **그라디언트는 CTA 전용.** primary 버튼(`.btn-solid`, `.modal-actions .primary`, `.chat-input button`)에만 오렌지 그라디언트 + glow shadow를 쓴다. 나머지 요소는 flat.
- **깊이는 은은하게.** 그림자는 블러가 크고 옅은 편(`--shadow-md`, `--shadow-app`)으로, 진하고 딱딱한 그림자를 쓰지 않는다. 앱 카드 자체에는 accent 톤이 살짝 섞인 앰비언트 글로우(`--shadow-app`)를 준다.

## 1. 컬러 토큰 (`:root` in `style.css`)

```css
/* 배경/서피스 */
--canvas: #F2F1EC;      /* 앱 카드 바깥, body 배경 */
--bg: #F6F5F1;           /* 앱 내부 섹션(지도, 인풋 등) 바탕 */
--surface: #FFFFFF;      /* 카드/모달/버튼 기본면 */
--surface-alt: #F6F5F0;  /* 카드 안의 서브 섹션(옅은 그레이 틴트) */
--border: #E6E4DB;
--border-soft: #EFEDE5;

/* 텍스트 */
--ink: #16150F;          /* 본문/제목 */
--ink-soft: #6E6B60;     /* 보조 텍스트 */
--ink-faint: #A6A295;    /* placeholder, 아이콘 등 가장 옅은 톤 */

/* 포인트(비비드 오렌지, 유일한 강조색) */
--accent: #FF7A1A;
--accent-deep: #C4560A;      /* 텍스트로 쓸 때(작은 숫자/태그) */
--accent-dark-text: #7A3705; /* accent-soft 배경 위 텍스트 */
--accent-soft: #FFEBD8;      /* 옅은 배경 (칩, 활성 카드 배경 등) */
--accent-line: #FFCB9B;      /* 옅은 보더 */

/* 경로 랭크 컬러 — 기능적 구분색 */
--rank1: #FF7A1A;  --rank1-soft: #FFEBD8;
--rank2: #2F63EA;  --rank2-soft: #E8EDFD;
--rank3: #E23A63;  --rank3-soft: #FCE6EC;

--selected: #16150F; /* 선택된 지도 핀 색 (ink 재사용) */
```

**상태 색(코드에 하드코딩, 변수 아님)** — 지도/리스트의 "마감임박·한산해요" 뱃지, 찜하기 하트에 사용:

| 의미 | 색 | 사용처 |
|---|---|---|
| 마감임박 | `#E1596B` | `.status-bubble.closing`, `.status-chip.closing` |
| 한산해요 | `#3FA07D` | `.status-bubble.quiet`, `.status-chip.quiet` |
| 찜(하트 active) | `var(--rank3)` `#E23A63` | `.heart-btn.active` |
| 별점 | `#F2A93B` | `.rating-row` |

새 상태 뱃지를 추가할 때도 CSS 변수로 승격하지 말고 이 표에 추가하는 정도로 충분함 — 상태색은 소수이고 팔레트에 영향 없음.

**배경 블롭(장식)** 3가지 파스텔(오렌지/블루/핑크)만 사용, `.bg-decor .blob-a/b/c`에 하드코딩:
`var(--accent-line)`, `#CFE0FF`, `#FFD8E8`.

## 2. 다크 모드

`<html data-theme="dark">`를 토글하면 `:root[data-theme="dark"]`에서 배경/텍스트 계열 변수만 스왑된다. **accent, rank, 상태색은 다크에서도 값을 바꾸지 않는다** — 비비드 컬러는 라이트/다크 공통으로 그대로 두는 게 원칙 (대비가 다크 배경에서도 충분하기 때문). 다크에서 새로 덮어써야 했던 변수는 `--accent-dark-text`뿐(칩 텍스트 대비 때문).

새 컴포넌트를 만들 때 색을 하드코딩하지 말고 반드시 `var(--surface)`, `var(--ink)` 등 변수를 쓰면 다크모드가 자동으로 따라온다.

## 3. 타이포그래피

- 본문 폰트: `'Pretendard Variable', Pretendard, sans-serif`
- 숫자/코드성 텍스트(카운트, 거리, 순위 태그, 소요시간): `'JetBrains Mono', monospace` — 랭크 카드 태그, tray count, mode-result, stop-item num 등
- 로고 워드마크만 예외적으로 `'Cloudsofa'`(핸드드로잉 느낌 커스텀 폰트) 사용. 이 외 어디에도 쓰지 않는다.
- 제목류(`h3`, `.rank-card .title`, `.selection-card h4`, `.count-label`)는 `font-weight: 800`, `letter-spacing: -0.01em ~ -0.02em`로 살짝 타이트하게.
- 본문/라벨은 `font-weight: 500~700`, 자간 기본값.

## 4. 형태 토큰

```css
--radius-sm: 8px;   /* 인풋, 작은 요소 */
--radius: 12px;      /* 카드, 리스트 아이템, 모달 내부 요소 */
--radius-lg: 20px;   /* 앱 셸, 모달, 빈 상태 박스 */
/* 버튼/칩/뱃지류는 border-radius: 999px (완전한 필) 고정 */
```

```css
--shadow-sm: 0 1px 2px rgba(22,21,15,0.05);        /* hover, 살짝 뜬 느낌 */
--shadow-md: 0 14px 34px rgba(22,21,15,0.10);       /* 모달, 트레이, 토스트 */
--shadow-btn: 0 10px 22px rgba(255,122,26,0.38);    /* accent 그라디언트 버튼 전용 */
--shadow-app: 0 40px 80px -20px rgba(255,122,26,0.16), 0 18px 40px rgba(22,21,15,0.10); /* 앱 셸 앰비언트 글로우 */
```

## 5. 컴포넌트 패턴

새 UI를 만들 때 아래 기존 클래스를 최우선으로 재사용하고, 없는 경우에만 새 클래스를 이 표의 패턴에 맞춰 추가한다.

| 패턴 | 클래스 | 규칙 |
|---|---|---|
| Primary CTA | `.btn-solid` | 오렌지 그라디언트 + `--shadow-btn`, hover 시 `translateY(-1px)` + 그림자 강화 |
| Secondary 버튼 | `.btn-outline` | `--surface` 배경 + `--border`, hover는 `--surface-alt` |
| 카드 | `.list-card`, `.profile-card`, `.rank-card`, `.course-item` | `1px solid var(--border)`, `border-radius: var(--radius)`, hover 시 `border-color: var(--ink-faint)` + `translateY(-1px)` |
| 선택/활성 카드 | `.rank-card.active`, `.list-card.selected` | 보더를 `var(--ink)`로, 필요하면 `box-shadow: 0 0 0 3px var(--accent-soft)` 링 추가 |
| 필터/토글 칩 | `.filter-chip`, `.checkgroup label` | 비활성: `--surface` + `--border` + `--ink-soft` 텍스트. 활성: `--ink`(중립 강조) 또는 `--accent`(강한 강조, 가격대처럼 단일 선택일 때) |
| 상태 뱃지(필) | `.status-chip`, `.chip` | `border-radius: 999px`, 작은 폰트(0.62~0.76rem), `font-weight: 700~800` |
| 원형 아이콘 버튼 | `.heart-btn`, `.theme-toggle`, `.remove-btn` | 정원(`border-radius: 50%`), 기본 `--surface`/`--border-soft` 배경, active/hover에서만 색이 붙음 |
| 빈 상태 | `.mypage-empty`, `.list-empty`, `.detail-panel .empty` | `border: 1px dashed var(--border)`, `background: var(--surface-alt)`, `border-radius: var(--radius-lg)`, 가운데 정렬 텍스트 |
| 모달 | `.modal-wrap` / `.modal` | 반투명 잉크 오버레이(`rgba(22,21,15,0.5)`) + 흰 카드(`--radius-lg`, `--shadow-md`), 새 모달 추가 시 이 두 클래스 그대로 재사용 |
| 토스트 | `.toast` | 화면 하단 중앙 고정, `--ink` 배경 pill, `.show` 클래스로 opacity/translateY 트랜지션 |

## 6. 아이콘

- 전부 인라인 SVG, `viewBox="0 0 24 24"`, `class="icon"` (16×16, `stroke:currentColor`, `stroke-width:1.8`, `fill:none`).
- 채워야 하는 아이콘(하트 active 등)만 예외적으로 `fill`을 준다.
- 새 아이콘 추가 시 outline 스타일 유지 — 이 프로�트에 solid/filled 아이콘 세트를 섞지 않는다.
- 마스코트(크루아상 캐릭터)는 `character.png` 이미지 또는 `#mascot` SVG 심볼(`<use href="#mascot">`)로 재사용. 새로 그리지 말 것.

## 7. 배경/장식

- `body`는 `--canvas` 위에 옅은 accent/blue radial gradient 2개를 얹는다 (앱 카드 바깥의 은은한 앰비언트).
- `.bg-decor`의 블러 블롭 3개(`.blob-a/b/c`)는 앱 카드 뒤에서만 보이는 장식 — 새로 추가할 필요는 거의 없지만, 추가한다면 같은 blur(64px)/opacity(.6) 톤을 유지.
- 이모지로 된 떠다니는 장식 요소는 사용하지 않는다 (한 번 추가했다가 제거함 — 과함).

## 8. 인터랙션 / 모션

- 트랜지션은 `.15s ease` (hover 색/배경/보더)와 `.2~.3s ease`(모달, 토스트, 테마 전환) 두 속도만 사용.
- Hover는 색상 변화 + 아주 미세한 `translateY(-1px)` 정도로 절제. 큰 스케일/회전 애니메이션은 쓰지 않는다 (지도 핀 hover의 `scale(1.08)` 정도가 최대치).
- `prefers-reduced-motion: reduce`에서 전체 트랜지션을 끄는 전역 규칙이 있으니, 새 애니메이션도 이 규칙에 자동으로 걸리는지 확인.

## 9. 로고 / 브랜드

- 워드마크: 2줄 구조 — 작은 트래킹된 `DAEJEON` (`.brand-sub`, ink-soft, 0.62rem, letter-spacing 0.16em) 위에 `PANG MAP` (`.brand-main`, Cloudsofa 폰트, 1.26rem, 컬러 `#452615` 고정값).
- 로고 옆 작은 점(`.dot`)만 accent 컬러 — "미니멀하지만 비비드한 포인트 하나"라는 원칙을 로고 자체에도 그대로 적용한 것.
- 로고에는 마스코트 이미지를 쓰지 않는다 (의도적으로 제거함).

## 10. 새 기능을 추가할 때 체크리스트

1. 색은 `:root` 변수로만 참조한다. 새 UI색이 필요하면 accent/rank/상태색 중 의미가 맞는 걸 재사용하고, 정말 새로운 의미의 색이 필요할 때만 §1의 "상태 색" 표에 추가한다. `--accent` 외의 새 브랜드 컬러는 추가하지 않는다.
2. 버튼/칩/뱃지는 `border-radius: 999px`, 카드는 `var(--radius)`, 앱 레벨 컨테이너는 `var(--radius-lg)`.
3. Primary 액션은 `.btn-solid` 그라디언트, 나머지는 flat.
4. 그림자는 `--shadow-sm`(hover) / `--shadow-md`(모달·플로팅 요소) / `--shadow-btn`(accent 버튼) 중에서 고른다. 새 그림자 값을 만들지 않는다.
5. 다크모드에서 깨지지 않도록 `--surface`/`--border`/`--ink*` 변수만 쓰고 색 하드코딩은 상태색·랭크색 등 "의미 색"에만 한정한다.
6. 아이콘은 outline 24×24 SVG, 폰트는 Pretendard(본문)/JetBrains Mono(숫자)만 사용.
