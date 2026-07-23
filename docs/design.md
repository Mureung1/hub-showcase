# SUBZIP 디자인 가이드

**하나금융파인드 "핑글(Fingle)" 대시보드 UI를 참고해 일반화·표준화한 SUBZIP 디자인 시스템 문서**

## 1. 개요

하나금융파인드 "핑글(Fingle)" 코치 대시보드 UI를 참고해 컬러 체계·카드/배지 패턴·정보 위계·톤앤매너를 추출했다. SUBZIP은 데스크톱 대시보드가 아닌 모바일 우선 PWA이므로, 레퍼런스의 2단 내비게이션 같은 레이아웃 구조는 가져오지 않고 아래 기준으로 재정의한다.

## 2. 디자인 원칙

1. **신뢰감 있는 핀테크 톤 + 친근한 표현** — 금액·정산처럼 신뢰가 중요한 정보는 명확한 위계와 절제된 색으로, 만족도 이모지 같은 감성적인 지점은 파스텔 포인트 컬러와 둥근 형태로 표현한다.
2. **정보 위계 명확화** — 큰 금액·핵심 지표는 가장 큰 타이포로, 보조 설명은 저채도 텍스트로 분리한다.
3. **모바일 우선** — 사이드바형 데스크톱 레이아웃이 아니라 세로 스크롤 카드/리스트 중심 모바일 레이아웃을 기본으로 하며, 내비게이션은 하단 탭바 또는 상단 GNB로 구성한다.
4. **상태는 색+텍스트 병기** — 정산 대기/완료 같은 상태는 배지 색상만이 아니라 항상 텍스트 라벨을 함께 표기한다(색맹/저시력 사용자 고려).

## 3. 컬러 팔레트

기존 `docs/prototype/style.css`에 정의된 값을 토큰으로 승격한다. 구독 서비스별 아이콘/도트 등 **서비스별 구분 컬러**는 별도 고정 팔레트로 관리한다(아래 참고).

| 토큰 | 값 | 용도 | 근거 |
|---|---|---|---|
| `color-primary` | `#1f9d55` | 브랜드 강조, 버튼, 활성 상태, 링크 | `.hero-cta`, `.btn-primary`, `.gnb-logo` |
| `color-primary-light` | `#d2f0e0` | primary 배지 배경, 완료 상태 | `.member-status.done` |
| `color-primary-dark` | `#14532d` | 짙은 그린 히어로/강조 섹션 배경 | `.highlight-section` |
| `color-on-primary` | `#ffffff` | 진한 배경 위 텍스트·아이콘 | `.btn-primary`, `.highlight-title`, `.scenario-number` |
| `color-on-primary-dark-muted` | `#bbf7d0` | 다크 섹션 보조 텍스트 | `.highlight-desc` |
| `color-bg` | `#ffffff` | 페이지 배경 | `body` |
| `color-card` | `#e6f7ee` | 기본 카드 배경 | `.card`, `.mini-card`, `.emoji-btn` |
| `color-card-suggest` | `#c3ecd4` | 제안형 카드(대체 서비스 제안 등) | `.chip`, `.stepper-btn` |
| `color-card-warning` | `#fff4e8` | 경고/주의 카드 | `.card-warning` |
| `color-text` | `#16261c` | 본문/제목 텍스트 | `body`, `.big-amount` |
| `color-text-muted` | `#5a6f61` | 보조 설명 텍스트 | `.sub-note`, `.card-desc` |
| `color-text-faint` | `#7fa38d` | 캡션, 타임스탬프, 비활성 텍스트 | `.sub-share`, `.email-snippet` |
| `color-border` | `#dcf0e4` | 리스트 구분선, GNB 언더라인 등 여린 테두리 | `.sub-list`, `.gnb` |
| `color-border-input` | `#cce3d3` | 인풋 필드, 프레임처럼 또렷해야 하는 테두리 | `.form-input`, `.browser-frame` |
| `color-accent-toss` | `#0064ff` | 외부 결제 연동(토스) 버튼 전용 | `.btn-toss` |
| `color-accent-kakao` | `#fee500` | 카카오 연동(결제/공유) 버튼 전용 | `.btn-kakao`, `.btn-kakaopay`, `.kakao-share-btn` |

### 서비스 구분 색상 (고정 팔레트 + 결정론적 배정)

SUBZIP은 사용자가 임의의 구독 서비스를 자유롭게 등록하는 구조라, 서비스명 전체를 미리 색상표로 만들어둘 수 없다. 그렇다고 화면마다 색을 즉흥적으로 고르면 같은 서비스(예: 넷플릭스)가 화면마다 다른 색으로 보이는 문제가 생긴다. 이를 막기 위해 **고정된 8색 팔레트**와 **결정론적 배정 규칙**을 둔다.

| 이름 | 값 |
|---|---|
| 하늘 | `#6FA8DC` |
| 라벤더 | `#B8A6E0` |
| 코럴 | `#F2A488` |
| 머스터드 | `#E8C468` |
| 로즈 | `#E896B0` |
| 틸 | `#5FC7C0` |
| 플럼 | `#A97CA5` |
| 샌드 | `#C9B38C` |

8색은 hue가 서로 고르게 떨어져 있어 나열했을 때 구분이 쉬우며, `color-primary`(hue 146°)·`color-accent-toss`·`color-accent-kakao`와도 겹치지 않도록 선정했다.

**배정 규칙**: 서비스명(또는 서비스 ID) 문자열을 해시한 값을 8로 나눈 나머지로 팔레트 인덱스를 정한다. 같은 서비스명은 항상 같은 나머지 → 항상 같은 색이 나오므로, 어느 화면에서 렌더링하든 개발자가 누구든 색이 일관된다. 다만 넷플릭스·유튜브 프리미엄처럼 인지도가 높아 브랜드 색상을 기대하게 되는 서비스는 예외적으로 고정 색을 지정할 수 있다.

상태 배지·CTA 버튼 색상과는 항상 시각적으로 구분되도록 하며, 이 8색은 어디까지나 "서비스 구분용 장식 색"이라 상태 표현(§2 원칙 4)에는 사용하지 않는다.

> **톤 일관성 메모**: `color-text`, `color-text-muted`, `color-text-faint`, `color-card`, `color-card-suggest`, `color-primary-light`, `color-primary-dark`, `color-on-primary-dark-muted`, `color-border`, `color-border-input`은 모두 hue 140~146° 그린 패밀리로 통일되어 있다. 의도적 예외는 네 가지뿐이다: `color-bg`(카드와의 명도 대비를 위한 순백), `color-on-primary`(진한 배경 위 텍스트 대비를 위한 순백), 경고색(`#fff4e8`), 외부 브랜드색(토스 블루, 카카오 옐로).

## 4. 타이포그래피

- **폰트 패밀리**: `-apple-system, "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif` (기존 `body` 정의 유지)
- **크기 스케일**

| 레벨 | 크기 | 굵기 | 예시 용도 |
|---|---|---|---|
| Display | 32px | 700 | 정산 금액 등 핵심 수치(`.big-amount`) |
| H1 | 28px | 700 | 페이지 제목(`.page-header h1`) |
| H2 | 22px | 800 | 히어로/섹션 타이틀(`.hero-title`) |
| Body-lg | 17px | 600 | 질문형 텍스트(`.question`) |
| Body | 13~14px | 400~600 | 카드 설명, 리스트 아이템 |
| Caption | 11~12px | 400~700 | 타임스탬프, 배지, 보조 라벨 |

## 5. 레이아웃 & 그리드

- GNB는 뷰포트 전체 폭을 채우고(풀블리드), 콘텐츠 영역은 최대 폭 1024px로 제한해 중앙 정렬하며 좌우 padding 20px을 기본으로 한다(`.frame-body`). 1024px 미만 뷰포트(대부분의 모바일)에서는 그대로 반응형으로 줄어든다.
- 카드 간 세로 간격은 14px, 섹션 간 간격은 16~18px을 기본값으로 한다.
- 가로로 여러 항목을 나열할 때(이모지 선택, 미니 카드 등)는 `flex` + `gap: 8~10px`로 균등 분할한다(`.emoji-row`, `.mini-grid`).
- 내비게이션은 상단 GNB(`.gnb`, `.pubnav`) 단일 구조를 기본으로 하고, 필요 시 하단 탭바를 더한다.

위 수치는 CSS 커스텀 프로퍼티로도 승격해 매 화면에서 값을 재입력하지 않도록 한다:

| 토큰 | 값 | 용도 |
|---|---|---|
| `space-page-padding` | 20px | 프레임 좌우 기본 padding |
| `space-card-gap` | 14px | 카드/리스트 아이템 세로 간격 |
| `space-section-gap` | 18px | 섹션 간 간격(16~18px 중 상한) |
| `space-inline-gap` | 10px | 가로 나열 flex/grid gap(8~10px 중 상한) |

위 간격 값은 기본값이며, 콘텐츠 밀도가 낮고 폭이 넓게 확장되는 화면(예: 프로젝트 소개 페이지)에서는 섹션 간 여백을 더 넓게 조정할 수 있다.

## 6. 컴포넌트 패턴

레퍼런스에서 관찰된 패턴을 아래와 같이 일반화하고, 기존 `style.css` 클래스와 매핑한다.

- **카드 (Card)**: 배경색으로 성격을 구분하는 3가지 variant — 기본(`color-card`), 제안(`color-card-suggest`), 경고(`color-card-warning`). border-radius 16px, padding 16px 18px. 감성적 요소(만족도 이모지 등)는 `.emoji-btn` 패턴을 따른다.
- **상태 배지/칩 (Badge/Chip)**: pill 형태(`border-radius: 999px`), 배경색 + 텍스트로 상태 표현. 정산 대기(`.member-status.pending`) / 완료(`.member-status.done`) 등.
- **버튼 (Button)**: 기본 버튼은 `border-radius: 14px`의 block 버튼(`.btn`), 외부 결제 연동 버튼(토스/카카오)은 각 브랜드 컬러를 그대로 사용하고 브랜드 가이드를 우선한다. 보조 액션은 outline(`.btn-outline`) 또는 텍스트 링크(`.link-btn`) 형태로 위계를 낮춘다.
- **리스트 아이템**: 상단 border-top + 항목별 border-bottom으로 구분선을 그리는 방식(`.sub-list`, `.member-list`)을 기본으로 하며, 좌측 도트/아바타 + 중앙 텍스트 + 우측 부가 정보(금액, 상태)의 3분할 구조를 유지한다. 구분선은 `color-border`(여린 톤), 인풋/프레임 테두리는 `color-border-input`(또렷한 톤)으로 구분해 사용한다.
- **캘린더/날짜 위젯**: 주간 그리드 + 오늘 강조 패턴으로 결제일/정산일을 하이라이트한다(별도 컴포넌트로 신규 정의 필요, 현재 프로토타입에는 없음).
- **공지·Q&A 리스트**: 제목 + 날짜 + 우측 "더보기" 링크 구조. 안읽음 상태는 배경색(`color-bg` 계열의 옅은 틴트)으로 구분(`.email-row.unread` 패턴 참고).
- **탭 (Tabs)**: pill 컨테이너 안에서 활성 탭만 primary 배경으로 강조(`.tabs`, `.tab-btn.active`).

## 7. 엘리베이션 & 라운드 값

| 토큰 | 값 | 용도 |
|---|---|---|
| `radius-sm` | 6~8px | 입력 필드, 작은 아이콘 박스 |
| `radius-md` | 10~14px | 버튼, 알림 카드 |
| `radius-lg` | 16px | 콘텐츠 카드 |
| `radius-pill` | 999px | 배지, 칩, 탭, CTA 버튼 |
| `shadow-card` | `0 6px 16px rgba(31, 157, 85, 0.12)` | 떠 있는 카드/토스트(`.web-toast`) |
| `shadow-frame` | `0 24px 48px rgba(31, 157, 85, 0.14), 0 4px 10px rgba(0,0,0,0.06)` | 프레임/모달 등 큰 컨테이너 |

## 8. 접근성 메모

- 상태 표현(정산 대기/완료 등)은 배경색만으로 구분하지 않고 항상 텍스트 라벨을 함께 표기한다.
- 저채도 텍스트(`color-text-faint`)는 배경(`color-bg`, `color-card`) 대비 명도 차를 최소 WCAG AA 기준(4.5:1)으로 확인 후 사용하며, 캡션 용도 외에 본문 텍스트로는 사용하지 않는다.
- 카카오/토스 브랜드 버튼처럼 노란색 배경에 어두운 텍스트를 쓰는 경우, 배경-텍스트 대비를 별도로 검증한다.

## 9. 참고 자료

- 레퍼런스: 하나금융파인드 "핑글(Fingle)" 코치용 대시보드 UI 스크린샷 (외부 참고 자료, 저장소에는 미포함)
- 프로토타입: [`docs/prototype/index.html`](./prototype/index.html), [`docs/prototype/style.css`](./prototype/style.css)
- 시각화 프리뷰: [design.md 토큰 프리뷰 아티팩트](https://claude.ai/code/artifact/a06cc914-5844-4bcd-beaa-038a8629f03f) — 위 팔레트/타이포/컴포넌트를 실제로 렌더링해 검토할 수 있는 페이지(비공개, 게시자만 접근 가능)
