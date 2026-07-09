# 디자인 시스템 (Toss UI 기반)

바탕화면 `토스 UI.png` 목업에서 색·폰트·모서리·여백·카드 스타일을 추출해 규칙으로 정리한 문서입니다.
값은 실제 이미지에서 픽셀을 샘플링해 캐노니컬 토스 팔레트에 맞춰 정돈했습니다.

## 핵심 원칙
- **화이트 기반**: 순백(`#FFFFFF`) 위에 옅은 회색 그룹 카드(`#F7F8FA`)로 영역을 나눔. 그림자는 최소한으로.
- **단일 강조색**: 파란색 하나로 버튼·활성 탭·아이콘·상태(완료)까지 통일.
- **둥근 모서리 + 넉넉한 여백**: 카드 16px, 버튼 14px, 8px 배수 스페이싱 스케일.
- **명확한 위계**: 진한 텍스트(제목/금액) ↔ 회색 텍스트(보조 설명) 대비로 정보 계층 표현.

---

## CSS 변수

```css
:root {
  /* ── 색상: 브랜드 / 강조 ───────────────────────── */
  --color-primary: #3182F6;          /* 토스 블루 (샘플 ~#4880EE) — 버튼·활성 상태·아이콘 */
  --color-primary-hover: #1B64DA;    /* hover / pressed */
  --color-primary-pressed: #1957C2;
  --color-primary-weak: #E8F0FE;     /* 파란 배경 칩·선택 상태 배경 */
  --color-primary-text: #3182F6;     /* 파란 텍스트 링크/강조 */

  /* ── 색상: 배경 / 표면 ─────────────────────────── */
  --color-bg: #FFFFFF;               /* 페이지 기본 배경 */
  --color-surface: #FFFFFF;          /* 기본 카드 표면 */
  --color-surface-alt: #F7F8FA;      /* 옅은 회색 그룹 카드 / 섹션 */
  --color-surface-sunken: #F2F4F6;   /* 입력창·눌린 영역 배경 */

  /* ── 색상: 텍스트 ──────────────────────────────── */
  --color-text: #191F28;             /* 기본/제목/금액 (샘플 #1A1E27) */
  --color-text-secondary: #4E5968;   /* 본문 보조 */
  --color-text-tertiary: #8B95A1;    /* 캡션·설명·플레이스홀더 (샘플 ~#A8AFB9) */
  --color-text-disabled: #B0B8C1;
  --color-text-on-primary: #FFFFFF;  /* 파란 버튼 위 글자 */

  /* ── 색상: 경계 / 구분선 ───────────────────────── */
  --color-border: #E5E8EB;           /* 카드 테두리·구분선 */
  --color-divider: #F2F4F6;          /* 리스트 항목 사이 옅은 선 */

  /* ── 색상: 상태 ────────────────────────────────── */
  --color-success: #3182F6;          /* 완료 체크 (토스는 블루로 성공 표현) */
  --color-danger: #F04452;           /* 출금·마이너스 금액·경고 */
  --color-warning: #FF9500;

  /* ── 폰트 ──────────────────────────────────────── */
  --font-sans: 'Pretendard', 'Toss Product Sans', -apple-system,
               BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic',
               system-ui, sans-serif;
  --font-number: 'Pretendard', system-ui, sans-serif; /* 금액은 tabular-nums 권장 */

  /* 크기 (모바일 기준) */
  --text-display: 28px;   /* 큰 금액 (1,000원) — weight 700 */
  --text-title: 20px;     /* 화면 제목 (어디로 돈을 보낼까요?) — weight 700 */
  --text-subtitle: 17px;  /* 카드 제목 (토스뱅크) — weight 600 */
  --text-body: 15px;      /* 본문 — weight 500 */
  --text-caption: 13px;   /* 보조 설명·계좌번호 — weight 500 */
  --text-micro: 11px;     /* 최소 캡션 */

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  --line-height-tight: 1.3;   /* 제목·금액 */
  --line-height-normal: 1.5;  /* 본문 */
  --letter-spacing-tight: -0.02em; /* 한글 제목 가독성 */

  /* ── 모서리(radius) ────────────────────────────── */
  --radius-xs: 6px;    /* 작은 칩·뱃지 */
  --radius-sm: 10px;   /* 입력창·작은 버튼 */
  --radius-md: 14px;   /* 기본 버튼 (보내기/확인) */
  --radius-lg: 16px;   /* 카드 */
  --radius-xl: 20px;   /* 큰 시트·모달 */
  --radius-full: 9999px; /* 원형 아이콘·pill 탭 */

  /* ── 여백(spacing) — 4px 베이스, 8의 배수 중심 ──── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;   /* 카드 내부 기본 패딩 / 화면 좌우 여백 */
  --space-5: 20px;
  --space-6: 24px;   /* 섹션 간 간격 */
  --space-8: 32px;
  --space-10: 40px;

  /* ── 그림자(elevation) — 아주 옅게 ─────────────── */
  --shadow-card: 0 1px 4px rgba(0, 27, 55, 0.04);
  --shadow-float: 0 4px 16px rgba(0, 27, 55, 0.08);
  --shadow-modal: 0 8px 32px rgba(0, 27, 55, 0.12);

  /* ── 레이아웃 ──────────────────────────────────── */
  --screen-padding: 16px;   /* 모바일 화면 좌우 안전 여백 */
  --max-width: 480px;       /* 모바일 컨테이너 최대 폭 */
}
```

---

## 컴포넌트 규칙

### 버튼 (Primary)
```css
.btn-primary {
  height: 52px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-md);        /* 14px */
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  font-size: var(--text-body);
  font-weight: var(--weight-bold);
  border: none;
}
.btn-primary:active { background: var(--color-primary-pressed); }
.btn-primary:disabled { background: var(--color-surface-sunken); color: var(--color-text-disabled); }
```
- 주요 액션(보내기·확인)은 화면 하단 고정, 좌우 여백(`--space-4`)만큼 띄우고 **꽉 찬 너비**.
- 보조 액션은 배경 없이 파란 텍스트(`--color-primary-text`)만.

### 카드
```css
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);        /* 16px */
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
  /* 또는 그림자 대신: border: 1px solid var(--color-border); */
}
/* 그룹형 회색 카드(계좌 목록 등) */
.card--group { background: var(--color-surface-alt); box-shadow: none; }
```
- 카드끼리는 `--space-3`(12px) 간격, 섹션 제목과는 `--space-4`.
- 리스트 항목 구분은 테두리 대신 `--color-divider` 얇은 선 또는 여백으로.

### 칩 / 탭 (pill)
```css
.chip {
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-full);
  font-size: var(--text-caption);
  font-weight: var(--weight-semibold);
}
.chip--active { background: var(--color-primary-weak); color: var(--color-primary-text); }
.chip--inactive { background: transparent; color: var(--color-text-tertiary); }
```

### 원형 아이콘
```css
.icon-circle {
  width: 40px; height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-primary-weak);   /* 또는 브랜드별 컬러 */
  display: grid; place-items: center;
}
```

### 금액 / 숫자 표기
- 큰 금액은 `--text-display` + `--weight-bold` + `font-variant-numeric: tabular-nums;`
- 마이너스(출금)는 `--color-danger`, 일반은 `--color-text`.

---

## 참고
- 웹 폰트: [Pretendard](https://github.com/orioncactus/pretendard) 를 우선 사용 (토스 제품 폰트의 무료 대체재).
- 다크모드가 필요하면 위 변수를 `:root[data-theme="dark"]` 로 오버라이드하는 구조 권장.
