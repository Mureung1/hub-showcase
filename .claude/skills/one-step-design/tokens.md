# One-Step 디자인 토큰

> 이 파일은 `one-step-design` Skill의 참고 문서다. 진입점은 `SKILL.md`.
> 색상·타이포그래피·간격·엘리베이션·아이콘 등 **파운데이션 값의 정본**이다. 화면 파일에 값을 하드코딩하지 말고 이 토큰을 참조한다.

## 1. 디자인 원칙

- **불안을 낮추는 색** — 경쟁이 아닌 성장. 숲 그린을 "성장 게이지"로, 노랑을 "보상"으로만 절제해서 사용.
- **모든 작은 할 일을 의미 있는 한 걸음으로** — 완료·보상·레벨업에 촉각적(tactile) 피드백.
- **깔끔한 여백 + RPG 요소** — 학업 도구의 신뢰감은 유지하되, 캐릭터·코인·뱃지로 재미를 주입.
- **둥근 형태(12px)** 로 위압감 없는 친근함. 검은 그림자 대신 **컬러 톤 그림자**.

## 2. 색상 토큰

폰트/색은 Material 3 톤 스케일 기반. 아래 값이 **정본**이다.

### 핵심 팔레트
| 역할 | 토큰 | HEX | 용도 |
|------|------|-----|------|
| **Primary (숲 그린)** | `primary` | `#006e2f` | 메인 버튼, 완료 상태, 성장 지표 |
| Primary Container | `primary-container` | `#22c55e` | 밝은 그린 강조(캐릭터 배경, 배너) |
| On Primary | `on-primary` | `#ffffff` | 그린 위 텍스트 |
| Inverse Primary | `inverse-primary` | `#4ae176` | 다크/강조 포인트 |
| **Secondary (스카이 블루)** | `secondary` | `#0058be` | 정보·네비·링크, Rebirth 아웃라인 |
| Secondary Container | `secondary-container` | `#2170e4` | 보조 강조 |
| **Tertiary/Accent (선플라워)** | `tertiary-container` | `#ef9900` | **코인·보상·스트릭 전용** |
| Accent Dim | `tertiary-fixed-dim` | `#ffb95f` | 코인 글로우, 보너스 강조 |
| On Tertiary Container | `on-tertiary-container` | `#5c3800` | 노랑 위 텍스트 |
| **Error** | `error` | `#ba1a1a` | 경고, 어려움 난이도 |
| Error Container | `error-container` | `#ffdad6` | 어려움 pill 배경 |

### 표면 / 중립
| 토큰 | HEX | 용도 |
|------|-----|------|
| `background` | `#f8f9ff` | 앱 배경(웜틴트 오프화이트) |
| `surface-container-lowest` | `#ffffff` | 카드 |
| `surface-container-low` | `#eff4ff` | 살짝 눌린 표면 |
| `surface-container` | `#e5eeff` | 코인 배너 등 |
| `surface-container-high` | `#dce9ff` | AI 안내 박스 |
| `on-surface` | `#0b1c30` | 본문 텍스트(진한 네이비) |
| `on-surface-variant` | `#3d4a3d` | 보조 텍스트 |
| `outline` | `#6d7b6c` | 테두리 |
| `outline-variant` | `#bccbb9` | 옅은 구분선 |

### 난이도 매핑 (plan.md 연동)
| 난이도 | 배경 | 텍스트 | 보상 |
|--------|------|--------|------|
| 쉬움 Easy | `#22c55e` 10% 틴트 | `#006e2f` | 🪙3 / 5XP |
| 보통 Normal | `#ffb95f` 20% 틴트 | `#855300` | 🪙5 / 10XP |
| 어려움 Hard | `#ffdad6` | `#93000a` | 🪙10 / 20XP |

## 3. 타이포그래피

**Sora** 단일 서체(기하학적·친근한 넓은 자간). 게이미파이드 요소(레벨·코인 수치)는 `label-md` + 대문자.

| 스타일 | 크기/굵기/행간 | 용도 |
|--------|----------------|------|
| display-lg | 48/700/56 (-0.02em) | 대형 히어로 (모바일 32) |
| headline-lg | 32/600/40 | 페이지 타이틀 "Item Shop" (모바일 24) |
| headline-md | 24/600/32 | 카드 제목 "AI Quest Splitter" |
| body-lg | 18/400/28 | 설명문 |
| body-md | 16/400/24 | 본문 |
| label-md | 14/600/20 (0.01em) | 뱃지·버튼·수치, **대문자** |
| label-sm | 12/500/16 | 캡션, pill |

## 4. 간격 · 그리드 · 형태

- **8px 베이스라인 리듬.** 토큰: `xs 4 · sm 8 · md 16 · lg 24 · xl 32`.
- 섹션 간 `lg(24)`, 카드 내부 `md(16)`. 좌우 여백 20px, 거터 16px.
- 모바일 4컬럼 / 데스크톱 12컬럼(max 1280).
- **라운드**: 표준 `12px`, 큰 컨테이너 `24px`, 상태 pill·칩·진행바 캡은 `full`.

## 5. 엘리베이션 (톤 레이어링 + 컬러 그림자)

- **L0 배경**: `#f8f9ff`
- **L1 카드**: `#ffffff` + 1px `#e2e8f0` 테두리
- **L2 떠있음/활성**: 흰 배경 + `0 10px 15px -3px rgba(34,197,94,0.1)` (그린 틴트 소프트 섀도)
- 검은 그림자 금지. hover/press 시 그림자 spread 증가로 "눌리는 버튼" 느낌.

## 6. 아이콘

- **Material Symbols Outlined** (weight/fill 가변). 24px 기본.
- 하단 탭: `home / assignment / storefront / inventory_2 / person`.
  - **이 목록이 정본이다.** Figma 목업의 탭 아이콘은 따르지 않는다 — 퀘스트 탭이 `subdirectory_arrow_right`(꺾이는 화살표)로 그려져 있어 세트가 큐레이션되지 않은 임시값으로 판단했다.
