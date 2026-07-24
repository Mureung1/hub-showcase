# 인터랙션 (토스 스타일) — 구현 메모와 성능 확인 방법

PRD v2.0 §4 구현 결과. 코드는 아래 5곳이 전부다.

| 파일 | 역할 |
|---|---|
| [src/components/Pressable.jsx](../src/components/Pressable.jsx) | **공통 프레스 컴포넌트**. 버튼·탭·카드가 전부 이걸 거친다 |
| [src/lib/tabs.js](../src/lib/tabs.js) | 탭 순서 단일 소스(탭바 렌더 + 슬라이드 방향 계산이 같은 순서를 봐야 함) |
| [src/lib/useTabTransition.js](../src/lib/useTabTransition.js) | 방향 결정 → `<html data-nav-direction>` 설정 → View Transitions 실행 + 중복 클릭 가드 |
| [src/index.css](../src/index.css) | 실제 애니메이션 전부(프레스/바운스/슬라이드/reduce-motion) |
| [src/components/ProgressBarFill.jsx](../src/components/ProgressBarFill.jsx) | 진행 막대 채움 — `width` 대신 `transform: scaleX` |

---

## 1. framer-motion을 쓰지 않은 이유 (번들 실측)

PRD FR-4.3은 framer-motion을 후보로 두되 **"번들 영향 확인 후 최종 채택"**을 조건으로 달았다. 실제로
설치해서 `motion` + `AnimatePresence`를 import한 상태로 프로덕션 빌드를 재보면:

| | raw | gzip |
|---|---|---|
| 도입 전 | 579.64 kB | 170.01 kB |
| framer-motion 도입 후 | 705.49 kB | 211.08 kB |
| **증가분** | **+125.85 kB** | **+41.07 kB (+24%)** |
| 최종 채택한 CSS 방식 | 581.82 kB | 170.93 kB (**+0.92 kB**) |

**기각.** 이유 두 가지:

1. 실행 가이드가 정한 임계치(gzip 40KB)를 넘겼다.
2. 이 앱의 APK는 번들을 내장하지 않고 원격 URL을 그대로 로드한다(`capacitor.config.json`의
   `server.url`). 즉 증가분을 **콜드 스타트마다 모바일 네트워크로** 받는다. 반면 PRD가 요구하는 모션은
   전부 `transform`/`opacity`만 쓰는 것들이라 CSS로 동일하게 표현 가능해서, 라이브러리가 주는 이득이 없다.

---

## 2. 화면 전환이 두 갈래인 이유

`useTabTransition`은 지원 여부에 따라 두 경로로 갈린다.

**(a) View Transitions API 지원 (Chrome/Android WebView 111+)** — 기본 경로.
브라우저가 나가는 화면과 들어오는 화면을 스냅샷으로 잡아 합성해준다. 그래서 "새 화면이 우→좌로 들어오고
기존 화면은 좌측으로 20% 밀리며 페이드"를 **이전 화면의 React 트리를 붙잡아 두지 않고** 만들 수 있다.
직접 구현했다면 이전 라우트 엘리먼트를 들고 있다가 다시 렌더해야 하는데, 그러면 그 컴포넌트가 새로
마운트되면서 `useEffect`가 재실행된다 — 이 앱에서는 지도 검색·AI 추천 같은 API 호출이 전환할 때마다
한 번 더 나가는 사고로 이어진다.

```js
document.startViewTransition(() => flushSync(() => navigate(toPath)))
```

`flushSync`가 없으면 React 18+의 비동기 렌더링 때문에 콜백이 끝난 시점에 새 화면이 아직 DOM에 없어
전환이 빈 화면으로 잡힌다.

**(b) 미지원 브라우저** — 들어오는 화면만 방향대로 슬라이드-인(`.tds-screen`). 나가는 화면 연출만
빠지고 방향성과 부드러움은 그대로다.

두 경로 모두 `<html data-nav-direction="forward|back|none">` 하나로 방향을 전달하고, 실제 키프레임은
`index.css`에만 있다.

> **주의**: `data-nav-direction`은 탭바를 거치지 않는 이동(화면 안의 `Link`, 뒤로가기)에서도 반드시
> 갱신되어야 한다. `AppShell`이 경로가 바뀔 때마다 다시 계산해 `none`으로 되돌린다 — 이 처리가 없으면
> 직전 탭 전환의 방향값이 남아 `/analyze → /result` 같은 같은-탭 이동에도 엉뚱한 슬라이드가 붙는다.

### 상단 바·하단 탭바는 전환에서 빼둔다

(a) 경로가 애니메이션하는 `::view-transition-old/new(root)` 스냅샷은 **화면 전체**다 — `position: fixed`인
하단 탭바도 여기 포함된다. 그래서 아무 조치 없이 root에 `translateX(±100%)`를 걸면 탭을 옮길 때마다
**탭바 자체가 화면 밖으로 밀려났다가 반대편에서 들어온다.** 사용자에게는 "탭바가 깜빡인다"로 보인다.

해결은 두 바에 각자 `view-transition-name`을 주어 root에서 분리하는 것이다(`index.css`의 `.tds-appbar`
= `Header`, `.tds-tabbar` = `BottomTabBar`). 분리된 그룹은 크로스페이드를 꺼서(`old`는 `display: none`,
`new`는 `animation: none`) 전환 내내 제자리에 남고, 콘텐츠 영역만 좌우로 슬라이드한다.

- `old`를 지우고 `new`만 남기는 이유: `::view-transition-new`는 정지 이미지가 아니라 **실제 화면의 라이브
  표현**이라, 탭 아이콘 바운스(`.tds-tab-bounce`)가 전환 중에도 그대로 재생된다.
- `::view-transition-group`의 기본 애니메이션(위치·크기 보간)은 일부러 남겼다. 탭바는 fixed라 어느
  화면에서나 같은 자리지만, 헤더는 스크롤과 함께 흐르는 요소라 두 화면의 스크롤 복원 위치가 다르면
  좌표가 달라질 수 있다 — 그때 튀지 않고 부드럽게 맞춰지도록.
- 이 규칙들은 `prefers-reduced-motion` 미디어쿼리 **밖**에 둔다. 동작 줄이기에서도 똑같이 고정돼야 한다.

구조 쪽에도 같은 목적의 장치가 있다: `AppShell`(과 `LoadGate`)은 라우트마다 감싸는 래퍼가 아니라
**레이아웃 라우트**여서, 경로가 바뀌어도 탭바는 마운트된 채 남고 `<Outlet/>` 안쪽 콘텐츠만 교체된다.
이 성질은 `src/__tests__/appShell.tabbar.test.jsx`가 탭바 DOM 노드 동일성으로 고정한다.

---

## 3. FR-4.3 검증: 애니메이션하는 속성 전수 확인

"transform + opacity만, 레이아웃 속성 금지"는 눈으로 지킬 수 없으니 grep으로 확인한다.

```bash
# transition이 걸린 속성 중 transform/opacity가 아닌 것 찾기
grep -rn "transition:" src/ --include=*.jsx --include=*.js --include=*.css | grep -viE "transform|opacity"
```

현재 걸리는 것은 `stroke-dashoffset` 2건(`Result.jsx`의 달성률 링, `NutritionStatusPanel.jsx`의 도넛)뿐이다.
**의도적으로 남겨둔 것** — SVG `stroke-dashoffset`은 레이아웃을 유발하지 않는 페인트 전용 속성이라
`width`/`height` 같은 리플로우 비용이 없다. 원형 진행 표시의 표준 기법이기도 하다.

3주차에 실제로 고친 것: 영양소 진행 막대 4곳이 `transition: width 0.3s`였다. 한 화면에 막대가 6개씩
동시에 움직여 프레임마다 레이아웃→페인트→합성을 다시 타고 있었다. `ProgressBarFill` 하나로 합치고
`transform: scaleX()`로 바꿨다(합성 단계만 건드려 GPU가 처리).

---

## 4. 크롬 DevTools에서 CPU 4x 스로틀로 프레임 확인하기

1. 배포 URL(또는 `npm run dev`)을 **크롬**에서 연다.
2. `F12` → 우상단 `⋮` → **More tools → Rendering** 패널을 연다.
   - **Frame Rendering Stats** 체크 → 화면 좌상단에 실시간 FPS 오버레이가 뜬다.
   - (선택) **Paint flashing** 체크 → 초록색이 번쩍이면 그 영역이 매 프레임 다시 그려지는 것이다.
     탭 전환/버튼 프레스에서 화면 전체가 번쩍이면 안 된다.
3. **Performance** 패널 → 톱니바퀴 → **CPU: 4× slowdown** 선택.
   (모바일 시뮬레이션까지 하려면 `Ctrl+Shift+M`으로 기기 툴바를 켜고 Galaxy S20 등을 고른다.)
4. **Record**(●)를 누르고 탭을 5개 왕복하며 버튼·카드를 몇 번 누른 뒤 정지.
5. 볼 곳:
   - **Frames** 트랙: 초록 막대가 균일해야 한다. 빨간 막대(=long frame)가 전환마다 뜨면 문제.
   - **Main** 트랙: 전환 구간에 **Layout / Recalculate Style**이 반복되면 안 된다
     (`transform`/`opacity`만 쓰면 여기가 비고 **Compositor** 쪽만 바쁘다).
   - Summary 원형 차트에서 Rendering/Painting 비중이 전환 구간에 튀지 않는지.

**동작 줄이기(reduce-motion) 확인**: 같은 Rendering 패널 하단의
**Emulate CSS media feature prefers-reduced-motion → reduce**를 켜고 탭을 전환하면, 슬라이드가 사라지고
150ms 페이드로 바뀌어야 한다. 버튼 프레스도 scale 없이 투명도만 변한다.

> 이 문서를 쓴 시점에 확인한 것: 프로덕션 빌드가 헤드리스 크롬에서 콘솔 에러 0건으로 렌더되고,
> 진행 막대가 `transform: scaleX(...)`로 그려지는 것까지 확인했다. **실제 프레임 체감(위 4~5번)과
> 실기기 터치감은 사람이 직접 봐야 하는 항목**이라 확인 대상으로 남겨둔다.

---

## 5. 값 조정이 필요할 때

| 느낌 | 고칠 곳 |
|---|---|
| 버튼이 너무 많이/적게 눌린다 | `Pressable.jsx`의 `PRESSED_SCALE`(0.96), `PRESSED_OPACITY`(0.92) |
| 눌렀다 뗄 때 튕김이 과하다 | `Pressable.jsx`의 `PRESS_OUT_TRANSITION` 큐빅베지어 — `cubic-bezier(0.22, 1.2, 0.36, 1)`의 세 번째 값(1.2)을 1.0에 가깝게 낮추면 오버슈트가 줄어든다 |
| 탭 아이콘 바운스가 요란하다 | `index.css`의 `@keyframes tds-tab-bounce` — 35% 지점의 `scale(1.16)`을 1.10 정도로 |
| 화면 전환이 느리다/빠르다 | `index.css`의 전환 duration(280ms) **과** `useTabTransition.js`의 `TAB_TRANSITION_MS` — **둘을 같이** 고칠 것 |
| 전환 시 화면이 너무 많이 움직인다 | `@keyframes tds-vt-old-forward`의 `translateX(-20%)` |
