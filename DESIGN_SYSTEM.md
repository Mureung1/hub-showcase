# 식비구조대 디자인 시스템

이 문서는 "식비구조대"의 공식 디자인 토큰과 컴포넌트 패턴을 정의한다. 실제 서비스 코드(`src/`, React + Tailwind v4)와 프로토타입(`prototype/`, 정적 HTML + CSS)에 **똑같이** 적용된다 — 구현 방식만 다르고 토큰 이름과 값은 하나다.

원본은 배달앱 UI 레퍼런스에서 추출한 웜톤(노랑 프라이머리)이며, `prototype/style-warm.css` / `prototype/index-warm.html`가 최초 구현이다.

> 참고: 저장소 루트의 `DESIGN.md`, `miro/DESIGN.md`는 외부 사이트(Figma, Miro)를 분석해둔 참고 자료이며 이 프로젝트의 공식 시스템이 아니다. 이 파일이 식비구조대의 유일한 기준이다.

## 색상

| 토큰 | 값 | 용도 |
|---|---|---|
| `primary` | `#F9BE3B` | CTA, 활성 필터, 프로모 배너 강조 |
| `primary-soft` | `#FDE9B9` | "최저가" 같은 배지 배경 |
| `primary-text` | `#8A5A08` | `primary-soft` 배경 위 텍스트 |
| `bg-page` | `#E9EBF2` | 화면 바깥 전체 배경 |
| `bg-surface` | `#FFFFFF` | 카드·패널·네비 배경 |
| `bg-muted` | `#F4F5F9` | 검색창, 필터 패널처럼 옅은 배경 |
| `text-primary` | `#17182B` | 제목·본문·가격 |
| `text-secondary` | `#9A9DAE` | 부제·캡션 |
| `accent-heart` | `#F0455C` | 찜/하트 아이콘 등 포인트 액센트 |
| `border` | `#EFEFF4` | 구분선, 카드 테두리 |

## 타이포그래피

- 폰트: `"Pretendard", "Noto Sans KR", -apple-system, sans-serif` (한글 지원 우선)
- 사이즈/웨이트: title 22px·700 (배너 헤드라인) · heading 15~16px·700 (카드 제목) · body 14px·400 · caption 12px·400 (부제·라벨)

## Radius 스케일

| 토큰 | 값 | 용도 |
|---|---|---|
| `radius-container` | 32px | 화면 전체를 감싸는 큰 패널 |
| `radius-banner` | 20px | 프로모 배너 |
| `radius-card` | 16px | 카드, 필터 패널 |
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
