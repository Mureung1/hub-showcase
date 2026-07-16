# 콕 디자인 시스템

콕의 모든 시각 산출물(슬라이드, 다이어그램, 프로토타입 화면)이 공유하는 톤: 크림색 배경 + 파스텔 액센트 + 세리프 제목. ADHD 사용자를 위한 서비스이므로 화면은 항상 차분하고 여백이 넉넉해야 한다.

## 공통 토큰

| 이름 | 값 | 용도 |
|---|---|---|
| `--cream` | `#FAF4EA` | 기본 배경 |
| `--cream-line` | `#EDE3D3` | 배경 위 얇은 구분선 |
| `--white` | `#FFFDF9` | 카드/패널 배경 (배경보다 한 톤 밝게) |
| `--ink` | `#3E332C` | 본문 텍스트 |
| `--ink-soft` | `#8A7A70` | 보조 텍스트 |
| `--ink-faint` | `#C6B9AC` | placeholder, 아주 옅은 텍스트 |
| `--rose` / `--rose-line` / `--rose-ink` | `#E4BFB9` / `#D9A9A3` / `#8C5A54` | 메인 포인트 컬러 (강조, 1차 액션) |
| `--lavender` / `--lavender-line` / `--lavender-ink` | `#E1D9EC` / `#D2C6E6` / `#7A6B94` | 보조 포인트 (휴식/차분함 관련) |
| `--sky` / `--sky-line` / `--sky-ink` | `#DCE8ED` / `#C4D9E1` / `#5C7986` | 보조 포인트 (집중/타이머 관련) |
| `--peach` | `#F5E1CE` | 포인트 배경 (배지, 하이라이트 바탕) |
| `--sage` / `--sage-ink` | `#E3EADD` / `#5F7A5A` | 슬라이드 전용 — 완료/긍정 상태 |

### 테마별 확장 토큰 (기능이 요구하면 추가 가능)

기능 자체가 새로운 색을 요구하면(화이트노이즈 테마처럼) 새 토큰을 추가해도 된다 — 톤(채도 낮은 더스티 파스텔)만 맞으면 된다. 이미 만들어진 전례:

![화이트노이즈 테마 예시](whitenoise-themes-example.png)

| 이름 | 값 | 용도 |
|---|---|---|
| `--forest` / `-line` / `-deep` / `-bg` | `#93A578` / `#7A8F60` / `#5C6E45` / `#F1F0E4` | 숲 테마 |
| `--night` / `-line` / `-soft` | `#33304A` / `#4C4868` / `#B9B4D6` | 밤 테마 |
| `--coffee` / `-line`, `--cafe-bg` | `#B4835A` / `#8E6440`, `#F6EBDD` | 카페 테마 |

이 기능을 다시 만들거나 확장할 때는 `docs/prototype/whitenoise-themes.html`을 직접 열어서 실제 구현(어디까지 색이 바뀌는지, 레이아웃 구조)을 확인한다 — 여기서는 톤/색상 값만 참고용으로 둔다.

새 테마 토큰을 추가할 때 체크할 것: 채도가 기본 팔레트(`--rose`, `--sky` 등)와 비슷한 수준인지, 쨍하거나 원색에 가까운 색은 아닌지. 톤만 맞으면 색 자체는 자유롭게 늘려도 된다.

**폰트**: `Gowun Batang`(제목, serif) + `IBM Plex Sans KR`(본문, weight 300/400/500). Google Fonts에서 로드:
```
https://fonts.googleapis.com/css2?family=Gowun+Batang&family=IBM+Plex+Sans+KR:wght@300;400;500&display=swap
```

**⚠️ 폰트 폴백 주의**: Gowun Batang은 한글 전용 세리프라 영문/숫자가 섞이면 해당 글자만 시스템 기본 세리프로 폴백되어 눈에 띄게 다르게 보인다. 제목에 "ADHD", "4주" 같은 영문·숫자가 들어가야 한다면 문구를 순한글로 바꿔서 피한다 (예: "4주 안에 증명할 것" → "지금 증명해야 할 것").

**공통 모양 값**: `border-radius: 100px`(필/버튼), `16px`(카드), `50%`(원/아이콘 배지), 유기적인 블롭 도형(`50% 50% 20% 20%` 등, 일러스트용).

---

## 1. PPT 슬라이드 (`docs/wiki/presentations.md`)

- 배경은 항상 `--cream`. 슬라이드 안에 다이어그램 이미지를 넣을 때도 그 이미지 자체의 배경을 크림색으로 맞춰서 경계가 안 보이게 한다 (흰 배경 이미지를 크림 배경 슬라이드에 그대로 박으면 흰 박스가 도드라져 보인다).
- 제목(h1): `Gowun Batang`, `font-weight: 400`, `font-size: 42px`.
- 상단 eyebrow 라벨(`01·문제 정의` 같은 것)은 본문 폰트, `--ink-soft` 또는 포인트 컬러 사용.
- 본문 강조는 `.hl` 하이라이터로 표시: `background: rgba(216,178,122,0.4); padding: 1px 5px; border-radius: 3px; box-decoration-break: clone;`
- **⚠️ 깊은 페이지 그림자 미렌더링 버그**: 12장을 세로로 이어 붙인 하나의 긴 문서(총 높이 8000px+)에서, 문서 아래쪽 깊숙이 있는 요소는 `box-shadow`나 PNG에 구운 그림자가 스크린샷에서 조용히 사라진다(레이아웃·색은 정상, 그림자만 안 보임). Puppeteer `elementHandle.screenshot()` 직전에 대상 슬라이드를 `position:fixed; top:0; left:0`으로 잠깐 옮겨 문서 맨 위에서 캡처하면 해결된다 (`shot-slides.js` 참고). viewport 높이를 키우거나 `transform:translateZ(0)`/`isolation:isolate`는 효과 없었다.
- **⚠️ 둥근 모서리 PNG에 하드 알파마스크 쓰면 안 됨**: 스크린샷을 `border-radius`만큼 투명 처리할 때 `ImageDraw.rounded_rectangle` + `putalpha`를 그대로 쓰면 모서리가 0→255로 급격히 전환되는 하드 엣지가 되고, 브라우저가 그 이미지를 축소 렌더링할 때 모서리에 밝은 링(fringe)이 생긴다. 4배 크기로 마스크를 그린 뒤 `LANCZOS`로 축소해 안티에일리어싱된 마스크를 써야 한다. 실제 화면 목업(Brain Dump 등)에 그림자까지 씌우려던 시도는 이 문제 때문에 포기하고, 그림자 없이 깔끔한 둥근 모서리만 유지하는 쪽으로 정리했다.
  - **⚠️ 하이라이트 간격 버그**: `.hl` span의 좌우 padding 때문에, span 경계가 조사(을/를/이/가/는 등) 바로 앞에서 끝나면 글자 사이에 어색한 공백이 생긴 것처럼 보인다. 하이라이트 범위에 뒤따르는 조사까지 포함시켜서 닫아야 한다 (예: `제안</span>한다`가 아니라 `제안한다</span>`).
- 스크린샷은 Puppeteer(`puppeteer-core` + 로컬 Chrome)로 슬라이드 전체를 **한 번의 페이지 로드에서 일괄 캡처**한다. 개별 슬라이드만 따로 다시 찍으면(별도 페이지 로드) 웹폰트 로딩 레이스로 인해 그 슬라이드만 다른 서체로 폴백될 수 있다 — 캡처 스크립트에서 `document.fonts.load(...)`로 필요한 폰트를 명시적으로 로드하고 `document.fonts.check(...)`로 확인한 뒤 스크린샷을 찍는다.

## 2. 다이어그램 (User Flow / Screen Flow, `docs/wiki/plan.md`에 임베드)

- ANSI 순서도 기호 규칙을 따른다: **oval = 시작/끝**, **rect = 처리 단계**, **parallelogram = 입출력**, **diamond = 분기/의사결정**. 모두 CSS `clip-path`로 구현.
- 커넥터는 검정색 elbow(꺾은선) SVG path로 통일. 화살표 마커는 `markerUnits="userSpaceOnUse"` + `markerWidth="10" markerHeight="8"`로 고정 — 기본값(`strokeWidth` 기준)을 쓰면 선 두께에 비례해 화살촉이 과도하게 커진다.
- 분기 다이아몬드에는 실제로 사용자가 그 상황에서 선택하는 말을 그대로 넣는다 (예: "뭘 도와줄까?"). 파스텔 pill 배지 라벨 대신 화살표 옆에 검정 텍스트로 분기 결과를 표기한다 (예: "집중 시작", "나 지금 힘들어").
- 슬라이드에 임베드되는 버전은 배경을 `--cream`으로, 문서/README에 독립적으로 쓰는 백업 버전은 흰 배경으로 별도 렌더링한다.
- Screen Flow 다이어그램은 추상 박스가 아니라 프로토타입에서 실제로 크롭한 화면 스크린샷을 사용하고, Agent가 개입하는 지점에만 최소한의 파스텔 pill로 짧게 주석("⚙ Agent")을 단다.

## 3. Web 화면 (`docs/prototype/*.html`)

- 실제로 검증된 CSS 변수 세트(위 공통 토큰과 동일): `--cream`, `--cream-line`, `--white`, `--ink`, `--ink-soft`, `--ink-faint`, `--rose(-line/-ink)`, `--lavender(-line)`, `--sky(-line/-ink)`, `--peach`. 테마 기능(화이트노이즈 등)에는 위 "테마별 확장 토큰"을 stage 영역 한정으로 추가 사용한다.
- 세 프로토타입 파일 모두 동일한 `<head>` 폰트 로드 구문을 공유한다 (위 Google Fonts 링크 그대로 복사).
- 컴포넌트 패턴:
  - 버튼/필: `border-radius: 100px`
  - 카드/패널: `border-radius: 16px`, 배경 `--white`, 배경(`--cream`)보다 한 톤 밝게 대비
  - 아이콘 배지/원형 요소: `border-radius: 50%`
  - 일러스트용 유기적 블롭: 비대칭 border-radius 조합
- 화면 전환/개입 문구는 실제 서비스 언어를 쓰고, "Brain Dump" 같은 내부 기획 용어를 사용자 화면 텍스트에 그대로 노출하지 않는다 — 사용자가 이해할 자연어로 바꾼다.

---

## 알려진 이슈 체크리스트 (새 산출물 만들기 전 확인)

- [ ] 제목에 영문/숫자가 Gowun Batang과 섞여 있지 않은가?
- [ ] `.hl` 하이라이트 span이 조사 앞에서 끊기지 않았는가?
- [ ] 다이어그램 화살촉 크기가 다른 다이어그램과 통일되어 있는가 (`markerUnits="userSpaceOnUse"`)?
- [ ] 새 색상을 추가했다면, 기존 팔레트와 같은 채도 낮은 톤을 유지하고 `design.md`에 새 토큰으로 기록했는가?
- [ ] 스크린샷을 개별 캡처했다면, 전체 배치 캡처와 폰트 렌더링이 동일한지 비교했는가?
