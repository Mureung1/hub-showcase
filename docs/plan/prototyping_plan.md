# "깸" 정적 HTML/CSS 프로토타입 기획서

## 배경

`docs/design/`에 Claude Design으로 만든 목업 GIF 7개(온보딩-관심사 설정, 오늘의 깸, 오늘의 깸 읽기, 오늘의 깸 읽기-하이라이트, 오늘의 깸-미션 받기, 오늘의 깸 -미션 완료, 나의 깸)와 디자인 토큰 문서([`design_system.md`](../design/design_system.md))가 있다. 이 목업을 참고해서 실제 브라우저에서 열어볼 수 있는 순수 HTML/CSS 프로토타입을 만들어, 화면 흐름과 스타일을 코드 레벨에서 검증하고 이후 React 구현의 참고 자료로 삼는다.

저장소의 React 앱(`src/`, `index.html`, vite)은 아직 뼈대만 있는 상태이며, 이번 프로토타입은 그 빌드 파이프라인과 무관하게 별도로 존재한다(빌드 도구, 프레임워크 없이 브라우저에서 파일을 바로 열어 확인 가능).

**확정된 방침**
- 위치: 리포지토리 최상위에 새 `prototype/` 폴더.
- 인터랙션: 없음. GIF 속 여러 상태(하이라이트 전/후 등)는 각각 별도의 정적 페이지로 표현한다. JS는 넣지 않는다.

## 화면 인벤토리 (IA 순서 = 빌드 순서)

[`04-scenario-ia.md`](04-scenario-ia.md)의 화면 흐름을 기준으로, GIF와 1:1 대응되는 순서로 만든다.

| 순서 | 파일명 | 대응 GIF | 내용 |
|---|---|---|---|
| 1 | `onboarding.html` | 온보딩-관심사 설정.gif | 관심사 태그 선택 화면 |
| 2 | `today.html` | 오늘의 깸.gif | 오늘의 글 홈, 하단 탭바(오늘의 글/나의 깸) |
| 3 | `read.html` | 오늘의 깸 읽기.gif | 원문 읽기, 하이라이트 전 상태 |
| 4 | `read-highlighted.html` | 오늘의 깸 읽기-하이라이트.gif | 원문 읽기, 문장 하이라이트 후 + "오늘의 미션 받기" 버튼 활성 |
| 5 | `mission.html` | 오늘의 깸-미션 받기.gif | 하이라이트 인용 + 미션 질문 + 한 줄 입력 |
| 6 | `mission-complete.html` | 오늘의 깸 -미션 완료.gif | 완료 안내 화면 |
| 7 | `my.html` | 나의 깸.gif | 연속 기록 배지, 달력, 기록 카드 |

먼저 1~2번(가장 기본적인 카드/탭바/버튼 컴포넌트가 정립되는 화면)을 만들면서 공통 스타일을 확정하고, 이후 화면은 그 공통 스타일을 재사용하며 순서대로 진행한다.

## 폴더 구조

```
prototype/
  index.html              # 전체 화면 목록으로 이동하는 진입 페이지(내비게이션 링크 모음)
  styles.css              # 디자인 토큰 + 공통 컴포넌트(카드, 버튼, 하단 탭바, 헤더) + 화면별 클래스
  onboarding.html
  today.html
  read.html
  read-highlighted.html
  mission.html
  mission-complete.html
  my.html
```

- 페이지 수가 적고 스타일이 대부분 공유되므로 스타일시트는 `styles.css` 하나로 시작한다(토큰 → 공통 레이아웃/컴포넌트 → 화면별 클래스 순으로 섹션 구분).
- 뷰포트는 `design_system.md` 기준 375px 폭 모바일 우선. 목업처럼 장식적인 "폰 프레임"은 넣지 않고, 실제 프로토타입답게 375px 폭 콘텐츠 영역만 만든다.
- 아이콘(뒤로가기 화살표, 설정 톱니, 하이라이트 형광펜, 하단 탭 아이콘, 마스코트 등)은 별도 아이콘 라이브러리 없이 인라인 SVG로 직접 작성해 각 HTML에 삽입한다.
- 토큰은 `design_system.md`에 정의된 CSS 커스텀 프로퍼티(`--paper`, `--ink`, `--brand`, `--hl-*` 등)를 `prototype/styles.css`의 `:root`에 그대로 옮겨온다.

## 화면 마크업 구조 (필수)

화면마다 예외 없이 **헤더 → 중앙(본문) → 하단** 3단 구조로 나눠서 만든다.

```html
<div class="app-shell">
  <header class="screen-header">...</header>   <!-- 뒤로가기/제목/설정 아이콘 등 -->
  <main class="screen-main">...</main>          <!-- 화면별 핵심 콘텐츠 -->
  <footer class="screen-footer">...</footer>    <!-- 하단 탭바 또는 하단 고정 CTA 버튼 -->
</div>
```

- `screen-header`: 뒤로가기 화살표/제목/설정 아이콘 등 각 화면 상단 요소. 온보딩처럼 헤더가 단순 타이틀뿐이어도 `<header>`로 감싼다.
- `screen-main`: 스크롤되는 본문 영역(카드, 텍스트, 리스트, 입력창 등).
- `screen-footer`: 하단 고정 요소 — `today.html`/`my.html`은 하단 탭바, `onboarding.html`/`read-highlighted.html`/`mission.html`은 하단 고정 CTA 버튼, `mission-complete.html`은 "나의 깸에서 보기" 버튼. 하단 고정 요소가 없는 화면(`read.html`처럼 비활성 버튼만 있는 경우도 포함)도 구조 일관성을 위해 `<footer>`에 넣는다.

7개 화면 모두 이 구조를 따르고, `styles.css`의 공통 컴포넌트도 이 3단 구조를 기준으로 클래스를 설계한다.

## 공통 컴포넌트 (styles.css에 먼저 정의)

- `.app-shell` — 375px 폭 컨테이너, `--paper` 배경, header/main/footer 세로 배치
- `.screen-header` / `.screen-main` / `.screen-footer` — 공통 레이아웃(패딩, 고정 여부)
- `.bottom-tabbar` — `screen-footer` 안에 들어가는 하단 2탭(오늘의 글/나의 깸)
- `.card` — `--paper-raised` 배경, `--rule` 테두리, `--card-radius` 라운드
- `.btn-primary` — `--brand` 배경 채움 버튼(활성/비활성 상태 클래스로 구분: `.btn-primary--disabled`)
- `.tag` — 관심사 선택 칩(선택/미선택 상태 클래스)
- `.highlight-*` — 4가지 미션 색상 하이라이트 (`mix-blend-mode: multiply`)

## 검증 방법 (완료 보고 전 필수)

1. `prototype/index.html`을 비롯해 7개 화면 HTML을 실제로 열어 렌더링 결과를 확인한다.
2. 각 화면을 대응하는 `docs/design/*.gif`와 나란히 비교해서 레이아웃(헤더/본문/하단 구성), 색상, 타이포그래피, 문구가 목업과 일치하는지 하나씩 확인한다.
3. `design_system.md`에 명시된 수치(카드 radius 12~14px, 본문 15~16px/line-height 1.6, 보조 텍스트 12~13px `--ink-soft` 등)가 실제 CSS에 반영됐는지 확인한다.
4. `prototype/index.html`의 7개 화면 링크가 모두 정상 연결되는지 확인한다.
5. 비교 중 목업과 다르게 렌더링된 부분을 발견하면 완료 보고 없이 먼저 수정한 뒤 다시 확인한다.
6. 위 확인을 모두 마친 뒤에만 작업 완료를 보고한다.
