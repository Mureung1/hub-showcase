# PlaceSync 디자인 시스템

소상공인 사장님이 네이버 플레이스·카카오맵·배달앱에 등록된 매장 정보를 한 곳에서 관리하는
B2B SaaS 대시보드의 디자인 시스템입니다. 특정 구현체(정적 HTML, React 등)에 종속되지 않도록
토큰과 규칙을 일반화해 정리했습니다. 새 화면을 만들거나 기존 화면을 수정할 때 이 문서를 기준으로 삼습니다.

## 1. 디자인 목표

- **신뢰감**: 화려한 그라데이션·과한 그림자·불필요한 장식 없이, 은행/회계 소프트웨어에 가까운 차분하고 절제된 톤.
- **명확한 정보 구조**: 전문 개발자·디자이너가 아닌 일반 사장님이 사용하는 서비스. 전문 용어 대신 쉬운 한국어, 한눈에 읽히는 위계.
- **상태 중심 설계**: "무엇이 끝났고, 무엇을 더 해야 하는가"를 배지·아이콘·색으로 즉시 파악할 수 있게 한다.
- **밝은 회색 배경 + 흰 카드**: 화면은 따뜻한 밝은 회색, 콘텐츠는 흰색 카드에 담아 시각적 구획을 분명히 한다.
- **초록 단일 강조색**: primary는 초록 계열 하나로 통일하고 최소한의 자리(주요 버튼, 활성 상태, 성공)에만 사용한다.
- **데이터 슬롭 금지**: 근거 없는 숫자·아이콘 나열을 피하고, 실제 의사결정에 필요한 정보만 보여준다.

## 2. 컬러 토큰

```css
:root {
  /* Primary (강조) */
  --ps-primary:        #12996B;
  --ps-primary-hover:  #0E7D57;
  --ps-primary-soft:   #E6F4EE;
  --ps-primary-text:   #0E7D57;

  /* Base */
  --ps-background:     #F3F4F2; /* 화면 배경 (따뜻한 밝은 회색) */
  --ps-surface:        #FFFFFF; /* 카드 표면 */
  --ps-text:           #1B2420; /* 본문 텍스트 */
  --ps-muted:          #6A756F; /* 보조 텍스트 */
  --ps-muted-2:        #8A938E; /* 더 옅은 보조 텍스트 (메타 정보) */
  --ps-border:         #E7EAE8; /* 카드/구분선 테두리 */
  --ps-border-strong:  #D5DBD8; /* 입력창 테두리 */
  --ps-divider:        #F0F2F1; /* 카드 내부 얇은 구분선 */
  --ps-tile-dark:      #1B2420; /* 요약 카드 아이콘 타일 배경 */

  /* Status (4색 고정) */
  --ps-success: #12996B; --ps-success-soft: #E6F4EE; --ps-success-text: #0E7D57;
  --ps-warning: #C77A0A; --ps-warning-soft: #FBF0DD; --ps-warning-text: #B26F09;
  --ps-danger:  #D64545; --ps-danger-soft:  #FBE9E9; --ps-danger-text:  #C0392B;
  --ps-neutral: #64748B; --ps-neutral-soft: #EEF1F4; --ps-neutral-text: #556070;
}
```

| 토큰 | 값 | 용도 |
|---|---|---|
| primary | `#12996B` | 주요 버튼, 활성 nav, 체크박스/라디오 accent |
| background | `#F3F4F2` | 화면 배경 |
| surface | `#FFFFFF` | 카드, 사이드바, 헤더 배지 배경 |
| text | `#1B2420` | 본문 |
| muted text | `#6A756F` / `#8A938E` | 보조 설명, 라벨, 메타 정보 |
| border | `#E7EAE8` | 카드·입력창 외곽선 |
| success / warning / danger / neutral | 위 표 참고 | 상태 배지·배너 |

## 3. 타이포그래피

폰트: **Pretendard** (한글 가독성 우선), weight는 `400 / 500 / 600 / 700`만 사용.

| 용도 | 크기 | 굵기 | 비고 |
|---|---|---|---|
| 페이지 제목 (Hero) | 28–30px | 700 | letter-spacing -0.5~-0.6px |
| 섹션 제목 | 20px | 600 | letter-spacing -0.3px |
| 카드 제목 | 16px | 600 | |
| 본문 | 14px | 400 | 기본 텍스트 |
| 보조 설명 | 13px | 400 | `--ps-muted` 색 |
| 상태 배지 텍스트 | 12px | 600 | pill 안에서만 사용 |
| 큰 숫자 (요약 카드) | 32px | 700 | letter-spacing -1px, 단위는 15px/500 |

## 4. 레이아웃 셸

모든 화면은 같은 셸(sidebar + header)을 재사용한다. 화면마다 새로 그리지 않는다.

- **좌측 고정 사이드바(264px)**: 브랜드 블록 → 검색창 → 그룹 라벨(메뉴/관리/리소스)이 있는 내비게이션(각 항목 17px 라인 아이콘) → 하단 매장 카드(플랫폼별 연결 상태 포함).
- **상단 헤더**: 좌측 브레드크럼(`대시보드 / 현재 화면`), 우측에 상태 pill + 알림 버튼 + primary 액션 버튼 1개.
- **콘텐츠 영역**: `max-width 820~1040px` 중앙 정렬(편집류 화면은 920px), 카드 간격 16px.

## 5. 간격 규칙

```css
:root {
  --ps-space-screen:  32px; /* 화면 여백 (모바일 16px) */
  --ps-space-card:    24px; /* 카드 내부 여백 */
  --ps-space-section: 16px; /* 카드-카드, 섹션 간 간격 */
  --ps-space-btn:     12px; /* 버튼 간격 */
  --ps-space-input:   16px; /* 입력 그룹 간 간격 */
  --ps-content-maxw:  1040px; /* 콘텐츠 중앙 정렬 최대폭 (편집 화면 920px) */
}
```

- 요약 카드·플랫폼 카드 그리드는 `grid-template-columns: repeat(auto-fit, minmax(200~300px, 1fr))` + `gap: 16px`.
- 카드 내부 리스트 항목 사이는 `gap: 10~12px`.

## 6. 카드 스타일

```css
--ps-radius-card: 16px;
```

- 배경 `--ps-surface`, 테두리 `1px solid --ps-border`, radius **16px**(고정값. 이전에 쓰던 12px는 레거시이며 신규 작업에는 쓰지 않는다), 내부 padding **24px**.
- 그림자 대신 얇은 테두리로 구획한다(box-shadow 남용 금지).
- **요약 카드(Summary Card)**: 좌상단 40×40px, radius 11px의 다크(`--ps-tile-dark`) 아이콘 타일 → 32px/700 숫자 → 13px muted 라벨 순.
- **정보 상세형(라벨-값 그리드)**: 라벨 12px muted 위, 값 15px/600 아래, `grid-template-columns: repeat(auto-fit, minmax(220px,1fr))`.
- **플랫폼 카드/리스트 행**: 카드 안에 `--ps-background` 톤의 행(radius 10px, padding 12px 14px)으로 구분, 우측에 상태 배지.
- **Alert Banner(경고/오류)**: 상태 soft 배경 + 매칭 테두리, radius 16px, 좌측 원형 아이콘(20px), 우측 액션 버튼.
- **안내 배너(정보성)**: 흰 배경 + 테두리, 좌측 그라데이션 아이콘 타일(초록 계열), 우측 보조 버튼.
- **Step Indicator**: 완료=✓+초록 텍스트, 현재=번호 원형+primary pill, 미완료=muted.

## 7. 버튼

```css
--ps-radius-btn: 8px; /* 기본. 헤더 주요 버튼은 10px */
```

- **Primary**: 배경 `--ps-primary`, 흰 글씨, hover `--ps-primary-hover`. 화면당 핵심 동작 **1개**에만 사용.
- **Secondary**: 흰 배경, 텍스트 `--ps-text`, 테두리 `--ps-border-strong`, hover `--ps-background`.
- **Soft(강조 보조)**: 흰 배경 + 상태색 테두리 + 상태색 텍스트.
- 크기: padding `10px 18px`(기본) ~ `12px 24px`(강조), font 14px/600.
- 버튼 사이 간격 `12px`, 우선순위가 다른 버튼을 나란히 둘 때 secondary를 왼쪽/아래에 배치.

## 8. 상태 배지 & 상태 표현 규칙

```css
--ps-radius-badge: 999px;
```

- 상태는 항상 **success(완료) / warning(검토중·주의) / danger(실패) / neutral(대기)** 4종 중 하나. 색을 새로 만들지 않는다.
- 표현은 반드시 **dot 또는 아이콘 + 텍스트**를 함께 표기한다(`✓ 반영 완료`, `⟳ 검토 중`, `! 반영 실패`) — **색상만으로 상태를 전달하지 않는다.**
- 배지 폰트 12px/600, padding `5–6px 11–12px`, pill(`999px`), soft 배경 + 해당 상태 text 컬러.
- 실패 상태에는 **원인 텍스트**와 **다음 행동 버튼**(예: "수동으로 수정하기")을 반드시 함께 보여준다.
- 여러 상태가 섞인 목록은 완료 → 검토중 → 실패 순으로 정렬해, 나쁜 소식(실패)을 사장님이 놓치지 않도록 마지막이 아니라 눈에 띄는 위치에 배치한다.

## 9. 입력창과 폼

```css
--ps-radius-input: 8px;
```

- `input`, `select`, `textarea`: 테두리 `1px solid --ps-border-strong`, radius 8px, padding `10px 12px`, font 14px, 배경 흰색. placeholder `#9AA5A0`.
- 포커스 시 `outline: 2px solid --ps-primary; outline-offset: 2px` — 모든 인터랙티브 요소 공통.
- 체크박스/라디오: `accent-color: --ps-primary`, 크기 16–18px.
- **선택형 카드(라디오 카드)**: 미선택 `1px solid --ps-border-strong`, 선택 `2px solid --ps-primary` + 배경 `--ps-primary-soft`.
- 입력 그룹 사이 간격 16px, 라벨은 카드 제목(16px/600) 아래 위치.

## 10. 표와 목록

- **Table**: 헤더 13px/`--ps-muted`, 본문 14px. 행 구분선 `--ps-divider`, 헤더 하단만 `--ps-border`.
- 좁은 화면에서는 `overflow-x: auto` + `min-width`로 가로 스크롤 처리 — 줄바꿈으로 욱여넣지 않는다.
- 가격 비교 표기: 변경 전 가격은 취소선 + `#9AA5A0`, 변경 후 가격은 굵게.

## 11. 반응형 규칙

| 브레이크포인트 | 규칙 |
|---|---|
| 데스크톱 (≥1024px) | 사이드바 264px 고정, 콘텐츠 max-width 820–1040px 중앙 정렬, 카드 다열 그리드 |
| 태블릿 (760–1023px) | 그리드 `auto-fit minmax(...)`로 자동 축소, 테이블 가로 스크롤 |
| 모바일 (≤760px) | 사이드바 → 상단 가로 스크롤 탭 전환, 그룹 라벨/검색창/하단 매장카드 숨김, 화면 여백 16px, 카드 1열 |

```css
@media (max-width: 760px) {
  [data-shell]    { flex-direction: column; }
  [data-sidebar]  { width: 100%; height: auto; flex-direction: row; overflow-x: auto; }
  [data-search], [data-groups], [data-storecard] { display: none; }
  [data-content]  { padding: 20px 16px; }
}
```

- 고정폭(px)으로 레이아웃을 짜지 않는다 — 항상 `flex-wrap`, `grid auto-fit`, `minmax()`로 좁은 화면에서 자연스럽게 접히게 한다.
- 터치 대상(버튼, nav 행, 체크박스)은 모바일에서 44px 이상 유지한다.

## 12. 접근성

- 색상만으로 상태를 구분하지 않는다 — 배지는 항상 dot/아이콘 + 텍스트 병기.
- 모든 버튼·입력창·nav 항목에 포커스 표시(`outline: 2px solid --ps-primary`).
- 본문 14px 이상 유지, muted 텍스트도 배경 대비 4.5:1 이상.
- 네이티브 `<select>`, `<input type="checkbox/radio">` 사용 — 커스텀 UI로 대체해 스크린리더 접근성을 해치지 않는다.
- 터치 영역 최소 44px.

## 13. 새 화면을 만들기 전 체크리스트

- [ ] 이 화면은 핵심 흐름(대시보드→편집→미리보기→승인→결과→수동수정) 중 어디에 속하는가?
- [ ] 이 화면에 필요한 **주요 동작(primary 버튼) 1개**는 무엇인가?
- [ ] 보여줘야 할 상태값이 있는가? (있다면 8번 규칙 적용)
- [ ] 기존 화면 중 재사용 가능한 카드/레이아웃 패턴이 있는가? (있으면 새로 만들지 않는다)
- [ ] 모바일에서 이 레이아웃이 어떻게 접히는지 미리 생각했는가?

## 14. 하면 안 되는 디자인

- 강한 그라데이션 배경, 과한 그림자, 채도 높은 색의 남용.
- 색상만으로 상태 전달 (배지에서 텍스트/아이콘 제거).
- 근거 없는 숫자·아이콘을 화면을 채우기 위해 추가하는 것(데이터 슬롭).
- 전문 용어·영어 위주 라벨.
- primary 초록을 강조가 아닌 큰 배경 면적에 남발.
- 표를 좁은 화면에 그대로 눌러 넣어 내용이 깨지는 것 — 반드시 가로 스크롤.
- 라운드 카드 + 좌측 컬러 보더 강조 같은 전형적인 AI 생성 템플릿 클리셰.
- 카드 radius/padding, 색상 등을 화면마다 임의로 다르게 정하는 것.

---

> 예시 데이터(매장명, 메뉴, 가격, 플랫폼별 반영 결과 등)는 이 문서가 아니라 `docs/plan.md`, `prototype/README.md`에 정의된 세트를 그대로 재사용한다. 두 문서의 수치가 서로 다를 경우 화면 제작 전에 먼저 맞춘다.
