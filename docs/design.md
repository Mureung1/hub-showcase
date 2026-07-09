# Design System

이미지 레퍼런스 기반으로 일반화한 디자인 가이드입니다.
대시보드/관리 UI 스타일 — 미니멀, 클린, 카드 기반.

---

## Color Palette

| 역할 | 값 | 용도 |
|------|-----|------|
| Background | `#F7F8FA` | 전체 페이지 배경 |
| Surface | `#FFFFFF` | 카드, 패널 배경 |
| Sidebar BG | `#111111` | 좌측 내비게이션 배경 |
| Sidebar Icon | `#FFFFFF` | 사이드바 아이콘/텍스트 |
| Sidebar Active | `#2D2D2D` | 선택된 메뉴 항목 |
| Text Primary | `#1A1A1A` | 본문 제목, 강조 텍스트 |
| Text Secondary | `#6B7280` | 서브 라벨, 설명 텍스트 |
| Text Muted | `#9CA3AF` | 힌트, placeholder |
| Border | `#E5E7EB` | 카드 테두리, 구분선 |
| Accent Gradient Start | `#C7B8F5` | 강조 카드 그라디언트 시작 (연보라) |
| Accent Gradient End | `#F9CDD5` | 강조 카드 그라디언트 끝 (연핑크) |
| Badge In-Transit | `#D1FAE5` / `#059669` | 진행중 상태 배지 배경/텍스트 |
| Badge Packed | `#FDE8E8` / `#E53E3E` | 완료 상태 배지 배경/텍스트 |
| Map BG | `#EFEFEF` | 지도/보조 영역 배경 |

### 그라디언트 (강조 카드용)
```css
background: linear-gradient(135deg, #C7B8F5 0%, #F9CDD5 100%);
```

---

## Typography

| 레벨 | 크기 | 굵기 | 용도 |
|------|------|------|------|
| Heading L | `20px` | `600` | 카드 섹션 제목 |
| Heading M | `16px` | `600` | 항목 제목, 트래킹 번호 |
| Body | `14px` | `400` | 일반 본문 |
| Label | `12px` | `500` | 필드 라벨, 태그 |
| Caption | `11px` | `400` | 보조 설명, 날짜 |

- **Font Family**: `'Inter', 'Pretendard', -apple-system, sans-serif`
- **Line Height**: `1.5` (body), `1.2` (heading)
- **Letter Spacing**: `0` (body), `-0.02em` (heading)

---

## Spacing & Sizing

| 항목 | 값 |
|------|----|
| 기본 단위 | `4px` |
| 컴포넌트 내부 패딩 (S) | `8px 12px` |
| 컴포넌트 내부 패딩 (M) | `16px 20px` |
| 컴포넌트 내부 패딩 (L) | `24px` |
| 카드 간격 | `12px` |
| 섹션 간격 | `24px` |
| 사이드바 너비 | `64px` (아이콘만) |
| 상단 헤더 높이 | `64px` |

---

## Border Radius

| 컴포넌트 | 값 |
|----------|----|
| 카드 | `16px` |
| 버튼 (기본) | `10px` |
| 버튼 (둥근) | `50px` |
| 배지/태그 | `20px` |
| 입력 필드 | `10px` |
| 아바타 | `50%` |
| 사이드바 아이콘 영역 | `12px` |

---

## Shadows

```css
/* 카드 기본 그림자 */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

/* 카드 호버 그림자 */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10);

/* 팝오버/드롭다운 그림자 */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
```

---

## Layout

### 전체 구조
```
┌──────────┬──────────────────────────────────┐
│          │  Header (Search + Profile)        │
│ Sidebar  ├──────────────────────────┬────────┤
│ (icons)  │  Main Content (카드/목록) │  Map   │
│          │                          │  Panel │
└──────────┴──────────────────────────┴────────┘
```

### 비율 (데스크탑 기준)
- Sidebar: `64px` 고정
- Main Content: `flex: 1` (약 55%)
- Map/보조 Panel: 약 40% (`min-width: 300px`)

### 반응형
- `1024px` 이상: 3컬럼 (사이드바 + 컨텐츠 + 맵)
- `768px` ~ `1023px`: 사이드바 + 컨텐츠 (맵 숨김)
- `767px` 이하: 단일 컬럼 스택

---

## Components

### 카드 (Card)
```css
background: #FFFFFF;
border-radius: 16px;
padding: 20px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
border: 1px solid #E5E7EB;
```

### 강조 카드 (Hero Card)
```css
background: linear-gradient(135deg, #C7B8F5 0%, #F9CDD5 100%);
border-radius: 16px;
padding: 24px;
border: none;
color: #1A1A1A;
```

### 입력 필드
```css
background: rgba(255, 255, 255, 0.6);
border: 1px solid rgba(255, 255, 255, 0.8);
border-radius: 10px;
padding: 12px 16px;
font-size: 14px;
backdrop-filter: blur(4px);
```

### 상태 배지
```css
/* In Transit */
background: #D1FAE5;
color: #059669;
border-radius: 20px;
padding: 4px 10px;
font-size: 11px;
font-weight: 500;

/* Packed */
background: #FDE8E8;
color: #E53E3E;
```

### 사이드바 아이콘 버튼
```css
width: 40px;
height: 40px;
border-radius: 12px;
display: flex;
align-items: center;
justify-content: center;
color: #9CA3AF;
/* active */
background: #2D2D2D;
color: #FFFFFF;
```

### 검색 바
```css
background: #F3F4F6;
border: none;
border-radius: 10px;
padding: 10px 16px;
font-size: 14px;
color: #6B7280;
```

---

## Design Principles

1. **미니멀**: 불필요한 장식 없이 정보 중심
2. **카드 기반**: 모든 정보 블록을 카드로 그룹화
3. **명확한 계층**: 배경 → 카드 → 컨텐츠 순서로 명도 차이
4. **부드러운 강조**: 강렬한 색상 대신 파스텔 그라디언트로 포인트
5. **일관된 라운딩**: 모든 요소에 둥근 모서리 적용
6. **여백 충분**: 밀집되지 않은 넉넉한 내부 여백
