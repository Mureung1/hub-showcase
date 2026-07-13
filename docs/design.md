# Beacon 디자인 시스템

> 일관된 디자인으로 개발하기 위한 **단일 원천(single source of truth)**.
> 모든 화면은 여기 정의된 토큰만 참조한다. 색·간격·라운드를 코드에 하드코딩하지 않는다.

**기반 레퍼런스: Stripe / Linear풍 클린 SaaS.** 밝은 캔버스 + 인디고 accent + 소프트 섀도우 +
사각-라운드의 미니멀 라이트 UI. **라이트 온리**(다크모드 미지원).

이 문서는 코드의 토큰 파일과 1:1로 동기화된다.

- **프로토타입**: [`prototype/src/index.css`](../prototype/src/index.css) — `:root` CSS 변수 + 공용 컴포넌트 클래스
- **MVP**: [`mvp/src/index.css`](../mvp/src/index.css) — 동일 토큰 + 사용 중인 공용 클래스
- **참고 목업**: [`mockups/`](../mockups/)

---

## 1. 디자인 원칙

1. **토큰 우선** — 색/간격/라운드/그림자/모션은 항상 CSS 변수. 리터럴 색(`#…`, `rgb(...)`)을 컴포넌트에 직접 쓰지 않는다. (차트 라이브러리처럼 JS 인자가 필요하면 `getComputedStyle`로 토큰을 읽어 전달. 알파가 필요하면 `color-mix(in srgb, var(--토큰) N%, transparent)`.)
2. **라이트 온리** — 밝은 캔버스 기준 단일 테마. 다크모드·`prefers-color-scheme` 분기를 두지 않는다(유지보수 단순화).
3. **한국어 카피** — 모든 UI 문구는 한국어. 본문/제목 모두 `system-ui` sans, 숫자는 mono.
4. **국내 시장 관례색** — 상승/매수 = 빨강, 하락/매도 = 파랑, 관망 = 앰버. 시장 관례이므로 브랜드 accent와 독립적으로 유지한다.
5. **미니멀 · 큰 숫자** — 여백 위주, 가격/티커/수치는 mono·tabular-nums로 크게.
6. **에이전트 강조** — AI 판단/개입은 브랜드 **accent(인디고)**로 시각적으로 구분. accent는 CTA·활성·에이전트 전용이며 장식으로 남발하지 않는다.

---

## 2. 색 토큰

### 표면 / 텍스트

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--page-bg` | `#f6f8fb` | 페이지 캔버스 (은은한 쿨그레이) |
| `--bg` | `#ffffff` | 카드 표면 |
| `--text` | `#3c4257` | 본문 |
| `--text-h` | `#1a1f36` | 제목/강조 |
| `--muted` | `#6b7280` | 캡션/보조 |
| `--border` | `#e4e8ee` | 테두리 (hairline) |
| `--code-bg` | `#f4f6f9` | 코드/inset/칩 |

### 브랜드 accent (인디고)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--accent` | `#635bff` | 브랜드 인디고 (CTA·에이전트·활성) |
| `--accent-2` | `#8b5cf6` | 바이올렛 하이라이트 포인트 |
| `--accent-bg` | `rgba(99,91,255,0.10)` | accent 배경 |
| `--accent-border` | `rgba(99,91,255,0.32)` | accent 테두리 |
| `--on-accent` | `#ffffff` | accent 버튼 위 텍스트 |

### 시맨틱 / 시장 관례색

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--green` / `--green-bg` | `#0e9f6e` / `12%` | 긍정 |
| `--red` / `--red-bg` | `#e5484d` / `12%` | 경고/삭제/에러 |
| `--up` | `#e0453f` | 상승 · 매수 (빨강) |
| `--down` | `#2f6bd6` | 하락 · 매도 (파랑) |
| `--hold` | `#d99a2b` | 관망 (앰버) |

### 그림자

```
--shadow: 0 1px 2px rgba(16,24,40,0.06), 0 8px 24px -6px rgba(16,24,40,0.10);
```

소프트 2단 섀도우. 버튼 등 작은 컨트롤은 `0 1px 2px rgba(16,24,40,0.04)`(accent 버튼은 accent 알파)로 더 얕게.

---

## 3. 타이포그래피

| 토큰 | 값 |
|------|-----|
| `--sans` / `--heading` | `'Geist Variable', system-ui, 'Segoe UI', Roboto, sans-serif` |
| `--mono` | `'Geist Mono Variable', ui-monospace, Consolas, monospace` — 가격·티커·날짜 (`tabular-nums`) |

> **폰트: Geist**(investment_journal 차용). `@fontsource-variable/geist`·`@fontsource-variable/geist-mono`를
> npm으로 번들해 `main.jsx`에서 import(오프라인·CSP 안전, CDN 아님). 미로드 시 system-ui로 폴백.

### 스케일

| 단계 | 크기 / 행간 / 자간 / 굵기 | 용도 |
|------|--------------------------|------|
| display | 44px / 118% / -1.4px / 600 | 랜딩 히어로 h1 (720px 이하 32px) |
| h1 | 32px / 116% / -0.7px / 600 | 페이지 제목 |
| h2 | 22px / 130% / -0.3px / 600 | 섹션 |
| h3 | 16px / 145% / 0 / 600 | 카드/블록 제목 |
| body | 16px / 150% / 0.1px / 400 | 본문 |
| sm | 14px / 150% / 0 / 400~600 | 보조 본문·버튼·태그 |
| caption | 12~13px / 145% / 0 / 400~600 | 캡션·라벨·상태 |

- 숫자(가격/티커)는 `--mono` + `font-variant-numeric: tabular-nums` (`.mono`).

---

## 4. 간격 · 라운드 · 레이아웃

### 간격 스케일 (4px 기반)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64`px. 카드 패딩 22~24px, 그리드 gap 12~16px, 섹션 간격 24~56px.

### 라운드 (클린 SaaS 사각-라운드)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--r-card` | `12px` | 카드 |
| `--r-cell` | `10px` | 내부 셀/레코드/입력 |
| `--r-pill` | `8px` | 컨트롤(버튼·뱃지·칩·상태·탭) 라운드 |

> 이전 Robinhood 시절의 999px 라운드(원형 pill)는 폐기. 이름 `--r-pill`은 유지하되 값은 컨트롤 라운드(8px)로 재정의.

### 레이아웃

- **콘텐츠 폭 표준 `max-width: 1152px`**(investment_journal `max-w-6xl`), `margin: 0 auto`, 좌우 패딩 20px.
  앱 셸(`AppLayout`)의 네비바 내부(`.app-nav__inner`)와 콘텐츠(`.app-content__inner`) 모두 이 컨테이너를 쓴다.
  랜딩 `.landing`은 좁게 `max-width: 900px`.
- **상단 네비바**: 전폭 바(하단 `--border` + 반투명 배경 + backdrop blur, sticky). 내부는 1152px 중앙 컨테이너,
  높이 64px, `justify-between`(좌: 로고 / 우: 링크 + 로그아웃). 로고 클릭 → `/`(로그인 시 홈 게이트가 `APP_HOME`으로 분기).
- 반응형 분기: 860px(2→1컬럼), 720px(히어로 축소·루프 1열).

---

## 5. 컴포넌트 레시피

공용 클래스는 [`prototype/src/index.css`](../prototype/src/index.css)에 정의(MVP는 사용 분만 이식). 새 화면은 재사용한다.

| 클래스 | 설명 |
|--------|------|
| `.card` | 표면 카드 (`--bg` + hairline `--border` + `--r-card` + `--shadow`) |
| `.badge.buy/.sell/.hold` | 매매 유형 뱃지 (mono, 시장 관례색, `color-mix` 배경) |
| `.pill` | accent 강조 라벨 |
| `.status.active/.pending/.done` | 상태 뱃지 |
| `.btn`, `.btn.accent`, `.btn.block` | 버튼. accent = 인디고 배경 + `--on-accent` 텍스트 |
| `.verdict` (`.tag` + `.headline`) | 에이전트 판단 블록 (좌측 accent 보더 + `--accent-bg`) |
| `.cell` | 3분할 정보 셀 |
| `.brand` / `.caption` | 로고 / 보조 텍스트 |

### 상태 매트릭스

- **버튼(`.btn`)**: default = 흰 배경 + hairline + 얕은 섀도우. hover = `--code-bg` 배경·보더 진하게. `.accent` = 인디고 배경, hover `brightness(1.06)`. focus-visible = accent 아웃라인(전역 `:focus-visible` 규칙). disabled = 페이지에서 `opacity` + `cursor:not-allowed` 권장.
- **내비 링크**: default `--text`, hover `--social-bg` 배경, active `--accent` + `--accent-bg`.
- **입력(input/textarea)**: `--bg` 배경 + `--border` + `--r-cell`, focus 시 accent 보더 + `--accent-bg` 링, 에러 시 `--red` 보더.

### 폼

- 라벨은 caption 크기·`--text-h`. 입력 높이 여유 있게(패딩 10~12px). 도움말/에러 문구는 caption + 각각 `--muted`/`--red`.

### 차트

- **lightweight-charts v5** 캔들. 상승 `--up`(빨강) / 하락 `--down`(파랑). 배경 `--bg`, 텍스트 `--text`, 그리드/보더 `--border`. JS 인자는 `getComputedStyle`로 토큰을 읽어 전달.
- 마커: 매수 ▲·매도 ▼·관망 ⏸.

---

## 6. 피드백 상태 · 모션 · 접근성

- **로딩**: `.route-loading`(중앙 정렬 + `--text`). 인라인 로딩은 caption 문구.
- **빈 상태**: 카드 안 중앙 안내 문구(`--muted`) + 다음 행동 힌트.
- **에러**: `--red` 텍스트, 필요 시 `--red-bg` 배경 박스.
- **모션**: `--transition: 0.15s ease` 표준. hover/색 전환에만 사용, 과한 모션 금지.
- **접근성**: 전역 `:focus-visible`에 accent 아웃라인(2px, offset 2px). 텍스트 대비 WCAG AA 목표, 상태를 색에만 의존하지 말고 아이콘/라벨 병기.

---

## 7. 화면별 적용 (MVP 확정 IA)

| 화면 | 경로 | 핵심 패턴 | 비고 |
|------|------|-----------|------|
| 홈(랜딩) | `/` | **인증 인지형**: 로그아웃=히어로+예시 chip+3스텝 루프+단일 CTA / 로그인=`APP_HOME` 리다이렉트 | 단일 CTA(`무료로 시작하기`→`/login`) |
| 로그인 | `/login` | 중앙 카드 + 폼 | Discord 연결은 Day 5(T4) |
| 대시보드 | `/dashboard` | 종목검색 + 관심종목 + 최근기록 허브 | Day 3 신설, 이후 `APP_HOME` |
| 저널 | `/journal` | 2컬럼(차트+마커 / 기록 사이드바) | `:symbol` 딥링크는 Day 3 |
| 히스토리 | `/history` | 완주 루프 KPI + 감시→기록→복기 체인 | |
| 조건 관리 | `/conditions` | 조건 카드 + 상태 뱃지 (목록·삭제) | 내비 맨 뒤(보조 관리) |
| AI 복기 | `/review/:tradeId` | 좌: 차트+스냅샷 / 우: verdict+3셀+인용 | 딥링크 전용 |

- 내비 순서: **저널 → 히스토리 → 조건 관리** (Day 3에 대시보드 맨 앞 추가). 로고 → `/`.
- `/discord` 인터랙티브 데모는 **프로토타입 전용**(발표 아티팩트). MVP에는 포함하지 않는다.

---

## 8. 디자인 변경 절차 (토큰 스왑)

다른 레퍼런스로 다시 바꿀 때:

1. 레퍼런스에서 색·타이포·간격·라운드를 추출(Lazyweb 리서치 등).
2. **§2~§4 토큰 값**과 [`prototype/src/index.css`](../prototype/src/index.css)·[`mvp/src/index.css`](../mvp/src/index.css)의 `:root` 변수 값만 교체. **변수 이름은 유지** → 컴포넌트 수정 최소화.
3. `beacon-design` 스킬([`.claude/skills/beacon-design/SKILL.md`](../.claude/skills/beacon-design/SKILL.md))에 규칙 병합.
4. 프로토타입·MVP를 실행해 전 페이지가 리스타일됐는지 확인.

> 이 구조 덕분에 디자인 변경 비용은 "토큰 값 교체"로 국한된다 — Robinhood 다크 → Stripe/Linear 라이트 전환도 변수 이름 유지·값 교체로 수행했다.
