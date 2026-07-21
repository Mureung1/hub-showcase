# 식비구조대 디자인 시스템

이 문서는 "식비구조대"의 공식 디자인 토큰과 컴포넌트 패턴을 정의한다. 실제 서비스 코드(`src/`, React + Tailwind v4)와 프로토타입(`prototype/`, 정적 HTML + CSS)에 **똑같이** 적용된다 — 구현 방식만 다르고 토큰 이름과 값은 하나다.

2026-07-20에 prototype-v2(마스코트 '기니' 방향)에서 검증한 웜톤(크림 배경·갈색 잉크) 팔레트로 전환했다 — 이전 팔레트(남색 잉크 `#17182B`·노랑 `#F9BE3B` 프라이머리, `prototype/style-warm.css`가 최초 구현)는 리브랜딩 전 버전이라 더 이상 기준이 아니다. `prototype-v2/style-fridge-flow.css`가 이 팔레트의 최초 구현이고, `src/index.css`의 `@theme`에도 동일하게 반영돼 있다.

> 참고: 저장소 루트의 `DESIGN.md`, `miro/DESIGN.md`는 외부 사이트(Figma, Miro)를 분석해둔 참고 자료이며 이 프로젝트의 공식 시스템이 아니다. 이 파일이 끼니픽의 유일한 기준이다.

## 색상

| 토큰 | 값 | 용도 |
|---|---|---|
| `primary` | `#F0A93E` | CTA, 활성 필터, 프로모 배너 강조 |
| `primary-soft` | `#FBE3C2` | "최저가" 같은 배지 배경 |
| `primary-text` | `#5B4130` | `primary-soft` 배경 위 텍스트 |
| `bg-page` | `#FBF1DE` | 화면 바깥 전체 배경 |
| `bg-surface` | `#FFFBF2` | 카드·패널·네비 배경 |
| `bg-muted` | `#F5F1E6` | 검색창, 필터 패널처럼 옅은 배경 |
| `text-primary` | `#5B4130` | 제목·본문·가격 |
| `text-secondary` | `#8A6F55` | 부제·캡션 |
| `accent-heart` | `#F0455C` | 찜/하트 아이콘 등 포인트 액센트 |
| `bg-cream` | `#FBF1DE` | 냉장고 씬(홈 진입 화면) 배경 |
| `border` | `#EADFC8` | 구분선, 카드 테두리 |
| `ink` | `#5B4130` | 카드·버튼의 굵은 테두리(3~4px) + 오프셋 하드 섀도로 "3D" 느낌을 내는 잉크색. 기존 `border`(연한 구분선)와는 용도가 다름 |

## 타이포그래피

- 폰트: 제목·버튼 `"Jua", sans-serif`(`font-display`) · 본문 `"Gowun Dodum", sans-serif`(`font-body`). 둘 다 Google Fonts에서 로드(`src/index.css` 상단 `@import url(...)`) — 별도 `@font-face` 불필요
- 사이즈/웨이트: title 22px (배너 헤드라인) · heading 15~18px (카드 제목) · body 14px · caption 11~12px (부제·라벨). Jua는 자체 웨이트가 하나뿐이라 `font-weight`를 따로 지정하지 않음
- 이전 `"Pretendard"` 지정은 실제로는 로드된 적이 없어(코드에 `@font-face`/링크 없음) 시스템 기본 산세리프로 폴백되고 있었음 — 이번 교체로 실제 로드되는 폰트로 정리됨

## Radius 스케일

| 토큰 | 값 | 용도 |
|---|---|---|
| `radius-container` | 28px | 화면 전체를 감싸는 큰 패널 |
| `radius-banner` | 20px | 프로모 배너 |
| `radius-card` | 18px | 카드, 필터 패널 |
| `radius-input` | 14px | 검색창 |
| `radius-pill` | 9999px | 버튼, 필터 칩, 배지 |

## Spacing 스케일 (4px 기준)

`space-1` 4px · `space-2` 8px · `space-3` 16px · `space-4` 24px · `space-5` 32px

## 컴포넌트 패턴 카탈로그

이번에 실제로 만들어서 검증된 패턴들. 새 컴포넌트를 만들 때 여기 없는 패턴이 필요해지면, 만들면서 이 표에 한 줄 추가할 것.

| 패턴 | 구성 | 쓰는 토큰 |
|---|---|---|
| `promo-banner` | 그라디언트 배경(`primary` → 밝은 노랑) + eyebrow + 헤드라인 | `primary`, `radius-banner`, `space-4` |
| `filter-chip` | pill 버튼, 비활성은 `bg-surface`+`border` 테두리, 활성은 `primary` 배경 | `radius-pill`, `primary`, `border` |
| `recipe-card` (실제 앱 `MenuCard`와 대응) | `bg-surface` 카드 + 상단 이미지 + 본문(이름/부제/가격). 하트 배지는 제거함(사용 안 함) | `radius-card`, `bg-surface`, `text-secondary` |
| `best-tag` | 작은 pill 배지, `primary-soft` 배경 + `primary-text` 글자 | `primary-soft`, `primary-text` |
| `quick-tab` | 상단 가로 pill 탭 줄. **음식종류(필터 패널의 메인음식/반찬/간식)와는 별개 축**으로, 요리 국가(전체/한식/일식/중식/양식/기타)를 다중 선택(OR)함. 체크박스가 아니라 버튼 `is-active` 상태로 직접 관리되고, 필터 패널과는 동기화되지 않음(서로 다른 데이터: `data-cuisine` vs `data-type`) | `radius-pill`, `primary`, `border` |
| `quick-tab` | 상단 가로 pill 탭 줄(전체/한식/일식/중식/양식/기타 — 음식종류는 요리 국가 기준 분류). 상세 필터 패널의 음식종류 체크박스와 항상 양방향 동기화됨. 필터 패널은 항상 열려있어서 별도 토글 버튼 없음 | `radius-pill`, `primary`, `border` |
| `banner-dot` | 프로모 배너 하단 원형 dot, 라디오 hack으로 슬라이드 전환(JS 없이 순수 CSS) | `radius-pill`, `text-primary` |
| `ingredient-chip-picker` (실제 앱 `IngredientChipPicker`) | 이모지+이름 pill 칩을 탭으로 토글하는 재료 선택 그리드. `filter-chip` 토글 패턴 재사용(미선택 `bg-surface`+`border`, 선택 `primary`). FridgePage에서는 `bg-surface` 카드(말풍선 꼬리 장식) 안에 카운트 배지(`primary-soft`+`primary-text`)·전체 해제·완료 버튼과 함께 사용 | `bg-surface`, `border`, `primary`, `primary-soft`, `primary-text`, `radius-card`, `radius-pill` |
| `ingredient-search-input` (실제 앱 `IngredientSearchInput`) | `bg-muted` 배경의 둥근 검색 인풋(돋보기 아이콘) + 타이핑하면 아래에 매칭되는 재료를 `filter-chip` pill 버튼 목록으로 보여주는 자동완성. label/matchNames뿐 아니라 `group`(예: "두부"→두부·순두부, "고기"→목살·삼겹살 등 변형 재료 묶음)까지 부분일치 검색. 결과 없으면 안내 문구. FridgePage에서 `IngredientChipPicker` 위에 배치, 선택은 같은 `selectedIds` 상태에 추가만 함(토글 아님) | `bg-muted`, `radius-input`, `border`, `primary`, `bg-surface`, `text-secondary`, `radius-pill` |
| `ingredient-section-heading` | 냉장고 재료를 카테고리(채소/고기·해산물/가공식품/면·곡물/기타)별로 묶어 보여줄 때, 각 그룹의 `IngredientChipPicker` 위에 오는 작은 블록 헤딩. `filter-group-label`과 타이포 톤(11px bold uppercase)은 같지만 칩 옆이 아니라 위에 오는 별도 줄이라 새 패턴으로 분리. 전체 그룹은 `bg-muted` 패널(`rounded-card`) 안에 세로로 쌓임 | `bg-muted`, `radius-card`, `text-secondary` |
| `filter-chip-group` (실제 앱 `FilterChipGroup`) | `filter-chip` 패턴을 단일 선택(라디오형)으로 쓰는 가로 칩 한 줄. 맨 앞에 항상 "전체" 칩을 넣어 선택 해제를 표현. 홈 화면의 음식종류(메인음식/반찬/간식)·시간(10분 미만/10~20분/20~30분/30분 이상) 필터에서 같은 컴포넌트를 두 번 재사용 — `ingredient-chip-picker`(다중 선택 토글)와는 선택 방식이 달라 별도 패턴으로 분리 | `radius-pill`, `border-primary`, `bg-primary`, `bg-bg-surface`, `border-border`, `text-text-primary`, `text-text-secondary` |
| `empty-state-card` | 추천 결과가 0건일 때 보여주는 카드 — `bg-surface` 카드(`radius-card`) 안에 마스코트 일러스트 + 기니 말투 카피(제목/본문) + `primary` CTA 버튼(`radius-pill`), 바로 아래 대체 추천 리스트("그래도 빨리 만들 수 있는 요리", `recipe-card` 재사용). 홈 화면의 재료 매칭 0건 상태에 사용. 일러스트(`끼니캐릭터.png`)는 임시 목업이라 교체 예정 | `radius-card`, `bg-surface`, `text-primary`, `text-secondary`, `primary`, `radius-pill` |

## 구현 매핑

두 코드베이스가 서로 다른 도구를 쓰므로, 토큰 이름은 같게 유지하고 구현만 아래처럼 나눈다.

### 실제 앱 (`src/`, Tailwind v4)

`tailwind.config.js`는 없음 — Tailwind v4는 CSS 안의 `@theme`로 토큰을 정의하면 `bg-primary`, `rounded-card` 같은 유틸리티가 자동 생성된다. `src/index.css`에 다음을 추가해서 사용한다 (아직 미적용 — 실제 컴포넌트 리스타일은 별도 작업):

```css
@import "tailwindcss";

@theme {
  --color-primary: #F9BE3B;
  --color-primary-soft: #FDE9B9;
  --color-primary-text: #8A5A08;
  --color-bg-page: #E9EBF2;
  --color-bg-cream: #F0F2F5;
  --color-bg-surface: #FFFFFF;
  --color-bg-muted: #F4F5F9;
  --color-text-primary: #17182B;
  --color-text-secondary: #9A9DAE;
  --color-accent-heart: #F0455C;
  --color-border: #EFEFF4;

  --radius-container: 32px;
  --radius-banner: 20px;
  --radius-card: 16px;
  --radius-input: 14px;
}
```

이후 컴포넌트에서는 `bg-primary`, `text-text-secondary`, `rounded-card` 같은 유틸리티 클래스를 그대로 쓰면 된다. 임의의 `bg-orange-500`, `rounded-xl` 같은 팔레트 기본값을 새로 끌어오지 않는다.

### 프로토타입 (`prototype/`, CSS 변수)

`prototype/style-warm.css`의 `:root` 블록이 그대로 기준이다. 새 프로토타입 화면을 만들 때는 이 파일을 그대로 링크하거나 복사해서 시작한다.

## Do / Don't

- **Do**: `primary` 노랑은 CTA·활성 상태·배지처럼 강조가 필요한 좁은 영역에만 쓴다.
- **Don't**: `primary`를 큰 배경 전체나 본문 텍스트 색으로 채우지 않는다 — 눈이 피로해진다.
- **Do**: 카드류는 항상 `radius-card`(16px), 버튼/칩/배지는 항상 `radius-pill`로 통일한다.
- **Don't**: 컴포넌트마다 임의의 radius 값(예: 10px, 12px)을 새로 발명하지 않는다.
- **Do**: 보조 텍스트(부제·캡션)는 `text-secondary`, 진한 텍스트는 `text-primary`만 쓴다 — 회색 톤을 여러 단계로 늘리지 않는다.
- **Do**: 새 컴포넌트를 만들면 위 "컴포넌트 패턴 카탈로그"에 한 줄 추가해서 문서를 최신 상태로 유지한다.
