# UniBoard Dashboard Design System

프로토타입(`UniBoard Dashboard.dc.html`)에서 추출한 완전한 디자인 시스템입니다. 
최종 대시보드 구현 시 아래 CSS 변수를 기준으로 진행하세요.

---

## 1. 색상 (Colors)

### 주색상 (Primary)
```css
--color-primary: #6366f1;         /* Indigo - 주 액션, 강조 */
--color-primary-light: #ede9fe;   /* 주색 배경 (연함) */
```

### 중립색 (Neutrals)
```css
--color-text-primary: #111;       /* 주요 텍스트, 제목 */
--color-text-secondary: #6b7280;  /* 보조 텍스트, 설명 */
--color-text-tertiary: #9ca3af;   /* 약한 텍스트, 플레이스홀더 */
--color-text-muted: #374151;      /* 어두운 회색 텍스트 */

--color-bg-primary: #fff;         /* 메인 배경 (카드, 사이드바) */
--color-bg-secondary: #f8f9fa;    /* 페이지 배경, 약한 배경 */
--color-bg-tertiary: #f5f5f5;     /* 호버 상태, 약한 배경 */

--color-border: #e5e7eb;          /* 기본 보더색 */
--color-border-light: #f3f4f6;    /* 약한 구분선 */
```

### 상태/의미 색상 (Status Colors)
```css
--color-success: #10b981;         /* 초록색 - 적합도 높음, 긍정 */
--color-success-light: #d1fae5;   /* 초록색 배경 (연함) */

--color-warning: #f59e0b;         /* 주황색 - 경고, 주의 */
--color-warning-light: #fef3c7;   /* 주황색 배경 (연함) */

--color-danger: #ef4444;          /* 빨간색 - 긴급, 마감임박 */
--color-danger-light: #fee2e2;    /* 빨간색 배경 (연함) */

--color-orange: #d97706;          /* 짙은 주황색 */

--color-info: #3b82f6;            /* 파란색 - 정보 */

--color-text-success: #059669;    /* 초록색 텍스트 */
--color-text-warning: #d97706;    /* 주황색 텍스트 */
--color-text-danger: #dc2626;     /* 빨간색 텍스트 */
```

### 배경 색상 조합
```css
/* 카테고리 배지 */
--bg-category-competition: #fef3c7;     /* 공모전 */
--text-category-competition: #d97706;

--bg-category-activity: #ede9fe;        /* 대외활동 */
--text-category-activity: #6366f1;

--bg-category-policy: #d1fae5;          /* 정책·지원금 */
--text-category-policy: #059669;

--bg-category-event: #dbeafe;           /* 교내행사 */
--text-category-event: #2563eb;
```

---

## 2. 타이포그래피 (Typography)

### 폰트 패밀리
```css
--font-family-base: 'Inter', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-family-sans: 'Inter', 'Pretendard', sans-serif;
```

### 폰트 사이즈 (Font Sizes)
```css
--font-size-xs: 10px;      /* 배지, 작은 라벨 */
--font-size-sm: 11px;      /* 보조 텍스트, 메타 정보 */
--font-size-base: 12px;    /* 본문 기본 */
--font-size-md: 13px;      /* 일반 텍스트, 입력 */
--font-size-lg: 14px;      /* 카드 제목 */
--font-size-xl: 15px;      /* 내비게이션 아이템, 아이콘 */
--font-size-2xl: 18px;     /* 아이콘 (큼) */
--font-size-3xl: 22px;     /* 페이지 제목 */
--font-size-4xl: 28px;     /* 큰 숫자 강조 */
```

### 폰트 굵기 (Font Weights)
```css
--font-weight-regular: 400;    /* 기본 */
--font-weight-medium: 500;     /* 탭, 필터 */
--font-weight-semibold: 600;   /* 제목, 배지, 라벨 */
--font-weight-bold: 700;       /* 강조 제목, 큰 숫자 */
```

---

## 3. 간격 (Spacing)

### 기본 간격 단위
```css
--spacing-0: 0;
--spacing-1: 2px;
--spacing-2: 4px;
--spacing-3: 6px;
--spacing-4: 8px;
--spacing-5: 10px;
--spacing-6: 12px;
--spacing-7: 14px;
--spacing-8: 16px;
--spacing-9: 18px;
--spacing-10: 20px;
--spacing-12: 24px;
```

### 주요 패딩
```css
--padding-compact: 5px 14px;          /* 필터 칩 */
--padding-sm: 7px 10px;               /* 배지 */
--padding-md: 9px 10px;               /* 내비게이션 아이템 */
--padding-card: 18px;                 /* 카드 내부 여백 */
--padding-sidebar: 20px 14px;         /* 사이드바 */
--padding-topbar: 14px 24px;          /* 상단바 */
--padding-main: 24px;                 /* 메인 콘텐츠 영역 */
--padding-panel: 20px 18px;           /* 우측 패널 */
```

### 주요 갭 (gap)
```css
--gap-xs: 2px;       /* 탭 간 간격 */
--gap-sm: 4px;       /* 태그 간 간격 */
--gap-md: 6px;       /* 아이콘과 텍스트 */
--gap-base: 8px;     /* 일반 컴포넌트 간 */
--gap-lg: 10px;      /* 열 간 간격 */
--gap-xl: 12px;      /* 섹션 간 간격 */
--gap-2xl: 14px;     /* 카드 그리드 간격 */
--gap-3xl: 20px;     /* 우측 패널 섹션 */
```

---

## 4. 모서리/보더 (Border Radius & Border)

### 보더 반경
```css
--radius-none: 0;        /* 직각 */
--radius-sm: 6px;        /* 약한 모서리 (배지 내부) */
--radius-md: 8px;        /* 기본 (입력, 내비 아이템, 필터 칩) */
--radius-lg: 10px;       /* 프로필 박스 */
--radius-xl: 12px;       /* 카드 */
--radius-full: 9999px;   /* 완전 원형/무한 (배지, 버튼) */
```

### 보더 스타일
```css
--border-width: 1px;
--border-style: solid;
--border-color: var(--color-border);        /* 기본 보더 */
--border-color-light: var(--color-border-light);  /* 약한 보더 */

/* 주요 보더 */
--border-default: 1px solid var(--color-border);
--border-light: 1px solid var(--color-border-light);
--border-primary: 1px solid var(--color-primary);
--border-left-accent: 3px solid var(--color-primary);  /* 스마트 추천 카드 */
```

---

## 5. 그림자 (Shadows)

```css
--shadow-sm: 0 4px 16px rgba(0, 0, 0, 0.08);  /* 카드 호버 상태 */
--shadow-md: 0 10px 25px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.15);
```

---

## 6. 레이아웃 (Layout)

### 사이드바 (Sidebar)
```css
--sidebar-width: 220px;
--sidebar-min-width: 220px;
--sidebar-bg: var(--color-bg-primary);
--sidebar-border: var(--border-default);
--sidebar-padding: 20px 14px;
```

### 우측 패널 (Right Panel)
```css
--panel-width: 272px;
--panel-min-width: 272px;
--panel-bg: var(--color-bg-primary);
--panel-border: var(--border-default);
--panel-padding: 20px 18px;
```

### 상단바 (Top Bar)
```css
--topbar-height: auto;
--topbar-bg: var(--color-bg-primary);
--topbar-border: var(--border-default);
--topbar-padding: 14px 24px;
```

### 메인 콘텐츠
```css
--main-content-padding: 24px;
```

### 뷰포트
```css
--viewport-height: 100vh;
--layout-gap: 0;
```

---

## 7. 컴포넌트 스타일

### 입력 필드 (Input)
```css
--input-height: 38px;
--input-padding: 0 14px;
--input-border: var(--border-default);
--input-border-radius: var(--radius-md);
--input-bg: var(--color-bg-secondary);
--input-font-size: var(--font-size-md);
--input-text-color: var(--color-text-primary);
--input-placeholder-color: var(--color-text-tertiary);
```

### 버튼 / 인터랙티브 요소
```css
--button-padding-md: 7px 16px;          /* 탭 버튼 */
--button-padding-sm: 5px 14px;          /* 필터 칩 */
--button-border-radius: var(--radius-full);
--button-transition: all 100ms;
--button-transition-hover: all 120ms;

/* 기본 상태 */
--button-bg-default: transparent;
--button-text-default: var(--color-text-secondary);
--button-bg-default-hover: var(--color-bg-tertiary);

/* 활성 상태 */
--button-bg-active: var(--color-text-primary);
--button-text-active: var(--color-bg-primary);
```

### 카드 (Card)
```css
--card-bg: var(--color-bg-primary);
--card-border: var(--border-default);
--card-border-radius: var(--radius-xl);
--card-padding: 18px;
--card-gap: 10px;
--card-shadow: none;
--card-shadow-hover: var(--shadow-sm);
--card-transition: box-shadow 150ms ease-out;
--card-cursor: pointer;
```

### 배지 (Badge)
```css
--badge-padding: 3px 9px;
--badge-border-radius: var(--radius-full);
--badge-font-size: var(--font-size-xs);
--badge-font-weight: var(--font-weight-semibold);

/* 카테고리 배지 */
--badge-category-padding: 3px 9px;

/* D-Day 배지 */
--badge-dday-padding: 3px 9px;

/* 적합도 배지 */
--badge-fit-padding: 3px 9px;
```

### 프로필 박스 (Profile Box)
```css
--profile-bg: var(--color-bg-secondary);
--profile-border-radius: var(--radius-lg);
--profile-padding: 12px;
--profile-gap: 10px;
--profile-avatar-size: 36px;
--profile-avatar-border-radius: 50%;
--profile-avatar-bg: var(--color-primary);
```

### 아바타 (Avatar)
```css
--avatar-size-sm: 28px;
--avatar-size-md: 36px;
--avatar-size-lg: 32px;
--avatar-bg: var(--color-primary);
--avatar-text-color: var(--color-bg-primary);
--avatar-border-radius: 50%;
--avatar-display: flex;
--avatar-align-items: center;
--avatar-justify-content: center;
```

---

## 8. 애니메이션 (Animations)

```css
--animation-fade-in: fadeIn 200ms ease-out;
--animation-heart-pop: heartPop 150ms ease-out;

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes heartPop {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
}
```

---

## 9. 스크롤바 (Scrollbar)

```css
--scrollbar-width: 4px;
--scrollbar-track-bg: transparent;
--scrollbar-thumb-bg: var(--color-border);
--scrollbar-thumb-radius: 4px;
```

---

## 10. 호버 & 포커스 상태

```css
/* 링크 */
--link-color: var(--color-text-primary);
--link-text-decoration: none;
--link-hover-text-decoration: underline;

/* 아이콘 버튼 */
--icon-button-transition: transform 150ms;

/* 네비게이션 아이템 */
--nav-item-padding: 9px 10px;
--nav-item-border-radius: var(--radius-md);
--nav-item-cursor: pointer;
--nav-item-font-size: var(--font-size-md);
--nav-item-font-weight: var(--font-weight-medium);
--nav-item-transition: all 100ms;
--nav-item-hover-bg: var(--color-bg-tertiary);

/* 칼럼 호버 */
--column-hover-box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
```

---

## 11. 사용 예시

### CSS 변수 활용 시 (예: React + Tailwind)

```tsx
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'text-primary': 'var(--color-text-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        // ... 나머지 색상
      },
      spacing: {
        sidebar: 'var(--sidebar-width)',
        panel: 'var(--panel-width)',
        // ... 나머지 간격
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        // ... 나머지 반경
      },
    },
  },
};
```

```tsx
// 컴포넌트 예시
<div className="bg-white border border-gray-200 rounded-xl p-4.5 shadow-hover hover:shadow-sm">
  <h2 className="text-lg font-semibold text-black">제목</h2>
  <p className="text-sm text-gray-600 mt-1">설명</p>
</div>
```

---

## 참고사항

- **일관성:** 모든 새로운 색상/크기/간격은 위 변수를 기준으로 선택하세요.
- **확장:** 새로운 상태(disabled, loading 등)가 필요하면 여기에 추가하세요.
- **문서화:** 컴포넌트별 스타일 변형이 필요하면 추가 섹션을 만들어 기록하세요.
