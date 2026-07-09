---
name: design-guide
description: UniBoard 대시보드 디자인 시스템 — 색상, 타이포그래피, 간격, 컴포넌트 스타일 CSS 변수 참조
---

# UniBoard 디자인 가이드

**`docs/design.md`에서 정의한 완전한 디자인 시스템입니다.**

---

## 🎨 색상 빠른 참조

| 분류 | CSS 변수 | 값 | 용도 |
|-----|---------|-----|------|
| **주색** | `--color-primary` | #6366f1 | 액션, 강조 |
| **텍스트** | `--color-text-primary` | #111 | 주요 텍스트 |
| **텍스트** | `--color-text-secondary` | #6b7280 | 보조 텍스트 |
| **배경** | `--color-bg-primary` | #fff | 카드, 사이드바 |
| **배경** | `--color-bg-secondary` | #f8f9fa | 페이지 배경 |
| **보더** | `--color-border` | #e5e7eb | 기본 보더 |
| **성공** | `--color-success` | #10b981 | 적합도 높음 |
| **경고** | `--color-warning` | #f59e0b | 주의 |
| **위험** | `--color-danger` | #ef4444 | 긴급, 마감 임박 |

---

## 📝 타이포그래피

```css
/* 폰트 */
font-family: 'Inter', 'Pretendard', -apple-system, sans-serif;

/* 크기 레벨 */
--font-size-xs:   10px;  /* 배지, 작은 라벨 */
--font-size-sm:   11px;  /* 보조 텍스트 */
--font-size-base: 12px;  /* 본문 기본 */
--font-size-md:   13px;  /* 일반 텍스트 */
--font-size-lg:   14px;  /* 카드 제목 */
--font-size-xl:   15px;  /* 내비 아이템 */
--font-size-3xl:  22px;  /* 페이지 제목 */
--font-size-4xl:  28px;  /* 큰 숫자 */

/* 굵기 */
--font-weight-regular:   400;  /* 기본 */
--font-weight-medium:    500;  /* 탭, 필터 */
--font-weight-semibold:  600;  /* 제목, 배지 */
--font-weight-bold:      700;  /* 강조 제목 */
```

---

## 📏 간격 (Spacing)

| 변수 | 크기 | 사용처 |
|-----|------|--------|
| `--spacing-2` | 4px | 태그 간 갭 |
| `--spacing-3` | 6px | 아이콘·텍스트 |
| `--spacing-4` | 8px | 일반 갭 |
| `--spacing-5` | 10px | 열 간 갭 |
| `--spacing-6` | 12px | 섹션 갭 |
| `--spacing-7` | 14px | 카드 그리드 갭 |
| `--spacing-8` | 16px | 기본 갭 |
| `--spacing-9` | 18px | 카드 패딩 |
| `--spacing-10` | 20px | 사이드바 패딩 |
| `--spacing-12` | 24px | 주요 콘텐츠 패딩 |

---

## 🛢️ 보더 반경

```css
--radius-sm:   6px;        /* 배지 내부 */
--radius-md:   8px;        /* 입력, 필터, 내비 */
--radius-lg:   10px;       /* 프로필 박스 */
--radius-xl:   12px;       /* 카드 */
--radius-full: 9999px;     /* 완전 원형 (배지, 버튼) */
```

---

## 🎯 컴포넌트 스타일

### 카드
```css
background: #fff;
border: 1px solid #e5e7eb;
border-radius: 12px;
padding: 18px;
gap: 10px;
box-shadow: none;
/* hover: */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
```

### 입력 필드
```css
height: 38px;
padding: 0 14px;
border: 1px solid #e5e7eb;
border-radius: 8px;
background: #f8f9fa;
font-size: 13px;
```

### 배지
```css
padding: 3px 9px;
border-radius: 9999px;
font-size: 10px;
font-weight: 600;
```

### 버튼 (탭, 필터)
```css
padding: 7px 16px;           /* 탭 */
padding: 5px 14px;           /* 필터 */
border-radius: 9999px;
font-weight: 500;
transition: all 120ms;
/* 기본: 투명 배경 */
/* 활성: 검은 배경, 흰 텍스트 */
```

### 프로필 박스
```css
background: #f8f9fa;
border-radius: 10px;
padding: 12px;
gap: 10px;
```

---

## 📐 레이아웃

| 요소 | 너비 | 패딩 |
|------|------|------|
| 사이드바 | 220px | 20px 14px |
| 우측 패널 | 272px | 20px 18px |
| 상단바 | - | 14px 24px |
| 메인 콘텐츠 | - | 24px |

---

## ✨ 애니메이션

```css
/* Fade-in 효과 */
animation: fadeIn 200ms ease-out;

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Heart pop 효과 (스크랩) */
animation: heartPop 150ms ease-out;

@keyframes heartPop {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}
```

---

## 🎲 카테고리 색상

| 카테고리 | 배경 | 텍스트 |
|---------|------|--------|
| 공모전 | #fef3c7 | #d97706 |
| 대외활동 | #ede9fe | #6366f1 |
| 정책·지원금 | #d1fae5 | #059669 |
| 교내행사 | #dbeafe | #2563eb |

---

## 📚 전체 규칙

전체 디자인 시스템 (각 변수 포함)은 **`docs/design.md`** 참조.

---

## 💡 팁

- **색상:** 새 색상을 추가하지 말고, 기존 팔레트에서 선택하기
- **크기:** spacing/font-size 변수를 조합해서 사용하기
- **확장:** 새 컴포넌트는 기존 변수로 구성 후, 필요하면 `docs/design.md`에 추가
