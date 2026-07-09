# One-Step 디자인 시스템 (Warm Achievement)

> 컨셉 스터디(`stitch_color_variation_design_study` / EduQuest)의 6개 화면과 QuestLog 디자인 시스템을 종합한, **실제 앱 구현용 디자인 기준**.
> 스타일 키워드: **성장(Growth) · 자기효능감(Self-efficacy) · 친근한 도전(Friendly Challenge)**, 비주얼은 **모던 게이미파이드 미니멀리즘**.

---

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

## 7. 컴포넌트 스펙 (관찰된 6개 화면 기준)

### 7.1 상단 헤더
- 좌: 원형 아바타(그린 링) + `EduQuest`(→ One-Step) 워드마크 headline, 그린 볼드.
- 우: 코인 pill(`#ffb95f` 틴트 배경 + 코인 아이콘 + 숫자) / 설정 톱니.
- 배경 `background`, 하단 1px 구분선.

### 7.2 하단 탭바 (5탭)
- Home · Quest · Shop · Storage · My.
- **활성 탭**: 라운드(12px) `primary-container` 그린 배경 + 흰 아이콘/라벨.
- 비활성: `on-surface-variant` 회색.

### 7.3 캐릭터 카드 (홈)
- 흰 카드 안에 캐릭터 일러스트 + **하단 반원형 `primary-container` 그린 백드롭**.
- **레벨/진화명** "Level 12 Specter" (headline) + `XP 840 / 1000` 우측 정렬.
- **XP 바**: 두꺼운 pill 트랙(그린 10%) + 그린 그라디언트 필 + `xp-shimmer` 애니메이션.
- 아래 **코인 배너**: `surface-container` 배경 pill, 코인 아이콘 + "1,240 Coins".

### 7.4 액션 버튼 쌍 (홈)
- **Today's Quests**: solid `primary` 그린, 흰 텍스트+체크 아이콘, 12px 라운드, 아래쪽 2px 진한 그린 "pressable" 보더.
- **Rebirth**: 흰 배경 + `secondary` 블루 1.5px 아웃라인, 블루 텍스트+새로고침 아이콘.

### 7.5 퀘스트 카드
- 흰 카드, **좌측 accent 세로 보더**(난이도/카테고리 색).
- 상단 난이도 pill(`• Easy` 그린 틴트), 우측 `⋮` 더보기.
- 제목 body-lg, 메타(보상 🪙/XP) label-sm.

### 7.6 AI Quest Splitter 카드 (핵심 ★)
- 큰 흰 카드 + 그린 그라디언트 미세 배경.
- 좌상단 블루 아이콘 타일 + `AI Quest Splitter` headline.
- 설명문 → **입력 필드**(placeholder "e.g. Prepare for Final Exams…", 좌측 타깃 아이콘).
- **Split Goal →** solid 그린 버튼.
- 하단 `surface-container-high` 안내 박스: 분기 아이콘 + "AI analyzes your goal and creates a strategic quest path."

### 7.7 퀘스트 완료 / 인증 화면
- 중앙 **트로피 원형**(그린 배경 + 노랑 글로우) + `Quest Ready!` display.
- 대상 퀘스트명 안내문.
- **보상 표시 카드**: `+5 COINS`(노랑 코인) | `+10 XP`(그린 별). 2분할.
- **Verification 박스**(좌측 노랑 accent 보더): `Optional` 칩 + 우측 `+3 Bonus Coins`(노랑).
  - **Upload Photo Evidence**: dashed 테두리 업로더 + 카메라 아이콘.
  - **Add a Memo**: 텍스트영역.
- 하단 solid 그린 완료 버튼.

### 7.8 상점 (아이템 카드)
- 페이지 타이틀 `Item Shop` + 설명 + **Balance pill**(노랑, "1,450 Coins").
- **카테고리 칩 스크롤**: `All Items`(활성=블루 아웃라인) / Backgrounds / Effects…
- **아이템 카드**: 좌측 노랑 accent 보더. 상단 `EPIC` 뱃지(노랑) + `LVL` 배지. 일러스트 배너("ACHIEVEMENT UNLOCKED!", "COLLECT REWARD"). 제목 headline + 설명.

### 7.9 상점 (프리뷰/적용)
- 헤더에 코인 pill(2,450). **Preview 카드**: 큰 일러스트 배경 + 캐릭터 합성.
- 속성 리스트: `Background → Arcane Library`, `Aura → Scholar's Focus`.
- 하단 full-width solid 그린 **Apply {아이템}** 버튼(아이콘 동반).

### 7.10 성취 보관함 (Storage)
- 타이틀 `Storage` + 공유 아이콘.
- **Achievement Vault 카드**: `COMPLETIONS 142` | `CURRENT STREAK 14 days` (2분할 stat, 수치 display).
- **Rebirth 배너**: solid `primary-container` 그린 카드, `REBIRTH LEVEL` + **노랑 별 ★★★** + `Master Scholar` + 설명.
- **Timeline**: 좌측 노랑 accent 보더 카드들. `Milestone` 칩 + 날짜(달력 아이콘) + 제목 + 설명 + `🏆 +500 XP`(노랑 트로피).

## 8. 프로토타입 반영 가이드

현재 `prototype/`의 색을 아래처럼 교체하면 이 디자인 시스템에 정렬된다.

| prototype 현재 | → 교체 |
|----------------|--------|
| `--green #1f7a3f` | `primary #006e2f` (+ 밝은 강조는 `#22c55e`) |
| `--navy #22355e` (탭바) | 탭바는 흰 배경 유지, **활성 탭만 그린 라운드** |
| `--orange #e08a2b` (AI) | AI 강조는 **블루**(`#0058be`)로, 노랑은 **코인/보상 전용**으로 분리 |
| 난이도 pill | 위 §2 난이도 매핑 색으로 |
| 폰트 | **Sora** 로 통일 |
| 코인 | 노랑 원형 + inner-glow |

> ⚠️ 중요한 규칙 하나: **노랑(선플라워)은 코인·보상·스트릭에만.** AI/정보는 블루, 성장/완료는 그린. 이 3색 역할 분리가 이 디자인의 핵심이다.

## 9. 참고 원본

- 디자인 스터디: `stitch_color_variation_design_study/` (home / quest / quest_completion / shop_1 / shop_2 / storage + questlog_design_system)
- 앱 표기 이름은 스터디상 "EduQuest" → 프로젝트명 **One-Step** 으로 대체 사용.
