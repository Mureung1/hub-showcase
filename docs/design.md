# Beacon 디자인 시스템

> 일관된 디자인으로 개발하기 위한 **단일 원천(single source of truth)**.
> 모든 화면은 여기 정의된 토큰만 참조한다. 색·간격·라운드를 코드에 하드코딩하지 않는다.

**기반 레퍼런스: Robinhood** (Lazyweb 디자인 리서치로 추출). 순수 블랙 캔버스 +
시그니처 그린 accent + pill 버튼 + 큰 숫자 타이포의 미니멀 다크 UI.

이 문서는 코드의 토큰 파일과 1:1로 동기화된다.

- **프로토타입**: [`prototype/src/index.css`](../prototype/src/index.css) — `:root` CSS 변수
- **MVP**: [`mvp/src/index.css`](../mvp/src/index.css) — (다음 단계에서 동일 토큰으로 정렬 예정)
- **참고 목업**: [`mockups/`](../mockups/)

---

## 1. 디자인 원칙

1. **토큰 우선** — 색/라운드/그림자는 항상 CSS 변수. 리터럴 색(`#…`, `rgb(...)`)을 컴포넌트에 직접 쓰지 않는다. (차트 라이브러리처럼 JS 인자가 필요하면 `getComputedStyle`로 토큰을 읽어 전달. 알파가 필요하면 `color-mix(in srgb, var(--토큰) N%, transparent)`.)
2. **다크 우선** — 기본(`:root`)은 Robinhood 블랙 테마. `prefers-color-scheme: light`에서 라이트 변형으로 자동 전환.
3. **한국어 카피** — 모든 UI 문구는 한국어. (Robinhood의 serif 디스플레이는 한국어 글리프에서 부적절하므로 채택하지 않고 system-ui sans 유지.)
4. **국내 시장 관례색** — 상승/매수 = 빨강, 하락/매도 = 파랑. Robinhood는 상승=그린이지만 Beacon은 한국 관례를 유지하고, **그린은 브랜드/CTA 전용**으로 쓴다.
5. **미니멀 · 큰 숫자** — 여백 위주, 가격/티커/수치는 mono·tabular-nums로 크게.
6. **에이전트 강조** — AI 판단/개입은 브랜드 **그린(accent)**으로 시각적으로 구분.

---

## 2. 색 토큰

### 다크 (기본 `:root` — Robinhood)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--page-bg` | `#000000` | 페이지 배경 (순수 블랙) |
| `--bg` | `#17181c` | 카드 표면 (블랙에서 살짝 들림) |
| `--text` | `#9ca3af` | 본문 |
| `--text-h` | `#ffffff` | 제목/강조 |
| `--muted` | `#6b7280` | 캡션/보조 |
| `--border` | `#26282e` | 테두리 (hairline) |
| `--code-bg` | `#1c1d22` | 코드/inset |
| `--accent` | `#00c805` | 브랜드 그린 (CTA·에이전트·활성) |
| `--accent-2` | `#ccff00` | 라임 하이라이트 포인트 |
| `--accent-bg` | `rgba(0,200,5,0.12)` | accent 배경 |
| `--accent-border` | `rgba(0,200,5,0.45)` | accent 테두리 |
| `--on-accent` | `#052b0d` | 그린 버튼 위 텍스트(다크) |
| `--green` / `--green-bg` | `#00c805` / `12%` | 긍정 |
| `--red` / `--red-bg` | `#ff5a52` / `12%` | 경고/삭제 |

### 시장 관례색 (다크)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--up` | `#ff5b5b` | 상승 · 매수 (빨강) |
| `--down` | `#4d8dff` | 하락 · 매도 (파랑) |
| `--hold` | `#f5c451` | 관망 (앰버) |

### 라이트 변형 (`@media (prefers-color-scheme: light)`)

| 토큰 | 값 |
|------|-----|
| `--page-bg` / `--bg` | `#fafafa` / `#ffffff` |
| `--text` / `--text-h` / `--muted` | `#4b5563` / `#05060a` / `#9aa0a6` |
| `--border` / `--code-bg` | `#e6e7ea` / `#f3f4f6` |
| `--accent` (+bg/border) | `#00a306` (흰 배경 대비용 진한 그린) |
| `--on-accent` | `#ffffff` |
| `--up` / `--down` / `--hold` | `#e0453f` / `#2f6bd6` / `#d99a2b` |

### 그림자

```
/* 다크 */ --shadow: rgba(0,0,0,0.6) 0 10px 24px -6px, rgba(0,0,0,0.4) 0 4px 8px -3px;
/* 라이트 */ --shadow: rgba(0,0,0,0.1) 0 10px 15px -3px, rgba(0,0,0,0.05) 0 4px 6px -2px;
```

---

## 3. 타이포그래피

| 토큰 | 값 |
|------|-----|
| `--sans` / `--heading` | `system-ui, 'Segoe UI', Roboto, sans-serif` |
| `--mono` | `ui-monospace, Consolas, monospace` — 가격·티커·날짜 (`tabular-nums`) |

- **본문**: `16px / 150%`, `letter-spacing: 0.1px`.
- **h1**: 32px, `-0.9px`, weight 600. (랜딩 히어로만 더 큼.)
- **h2**: 22px, `-0.4px`, weight 600. **h3**: 16px.
- 숫자(가격/티커)는 `--mono` + `font-variant-numeric: tabular-nums` (`.mono`).

---

## 4. 간격 · 라운드 · 레이아웃

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--r-card` | `20px` | 카드 |
| `--r-cell` | `14px` | 내부 셀/레코드 |
| `--r-pill` | `999px` | 버튼·뱃지·pill·탭 (Robinhood pill 버튼) |

- 카드 패딩 18~24px · 콘텐츠 폭 `max-width: 1000px`(`.page`) · 그리드 gap 12~16px.
- 반응형: 860px(2→1컬럼), 780px(체인 세로), 720px(히어로 축소).

---

## 5. 컴포넌트 레시피

공용 클래스는 [`prototype/src/index.css`](../prototype/src/index.css)에 정의. 새 화면은 재사용한다.

| 클래스 | 설명 |
|--------|------|
| `.card` | 표면 카드 (`--bg` + hairline `--border` + `--r-card` + `--shadow`) |
| `.badge.buy/.sell/.hold` | 매매 유형 pill (mono, 시장 관례색) |
| `.pill` | accent 강조 라벨 |
| `.status.active/.pending/.done` | 상태 뱃지 |
| `.btn`, `.btn.accent`, `.btn.block` | pill 버튼. accent = 그린 배경 + `--on-accent` 텍스트 |
| `.verdict` (`.tag` + `.headline`) | 에이전트 판단 블록 (좌측 accent 보더 + `--accent-bg`) |
| `.cell` | 3분할 정보 셀 |
| `.brand` / `.caption` | 로고 / 보조 텍스트 |

### 차트

- **lightweight-charts v5** 캔들. 상승 `--up`(빨강) / 하락 `--down`(파랑). JS 인자는 `getComputedStyle`로 토큰을 읽어 전달 → 다크/라이트 자동 대응.
- 마커는 DOM 오버레이(`timeToCoordinate`×`priceToCoordinate`), 매수 ▲·매도 ▼·관망 ⏸. 구현: [`prototype/src/components/TradeChart.jsx`](../prototype/src/components/TradeChart.jsx).

---

## 6. 다크/라이트 전략

- 기본 `:root` = Robinhood 다크. `@media (prefers-color-scheme: light)`에서 값만 재정의.
- 컴포넌트는 토큰만 참조하므로 별도 테마 스타일 불필요.
- 차트는 스킴 변경 시 `matchMedia`로 색 재적용.

---

## 7. 화면별 적용 (프로토타입)

| 화면 | 경로 | 핵심 패턴 |
|------|------|-----------|
| 랜딩 | `/` | 블랙 히어로 + 예시 chip + 3스텝 루프 카드 |
| 로그인 | `/login` | 중앙 카드 + 폼 + Discord 연결 |
| 조건 관리 | `/conditions` | 조건 카드 + 상태 뱃지 |
| 저널 | `/journal/:symbol` | 2컬럼(차트+마커 / 기록 사이드바) |
| AI 복기 | `/review/:entryId` | 좌: 읽기전용 차트+스냅샷 / 우: verdict+3셀+인용 |
| 히스토리 | `/history` | 완주 루프 KPI + 감시→기록→복기 체인 |
| Discord 알림 | `/discord` | Discord 자체 팔레트 + Beacon accent |

---

## 8. 디자인 변경 절차 (토큰 스왑)

다른 레퍼런스로 다시 바꿀 때:

1. 레퍼런스에서 색·타이포·간격·라운드를 추출.
2. **§2~§4 토큰 값**과 [`prototype/src/index.css`](../prototype/src/index.css)의 `:root`(+라이트) 변수 값만 교체. **변수 이름은 유지** → 컴포넌트 수정 불필요.
3. `beacon-design` 스킬([`.claude/skills/beacon-design/SKILL.md`](../.claude/skills/beacon-design/SKILL.md))에 규칙 병합.
4. 프로토타입을 실행해 전 페이지가 리스타일됐는지 확인.

> 이 구조 덕분에 디자인 변경 비용은 "토큰 값 교체"로 국한된다 — 이번 Robinhood 적용도 컴포넌트 재작성 없이 토큰만 바꿔 완료했다.
