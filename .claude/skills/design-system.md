---
name: design-system
description: ShortsGen 디자인 시스템 및 UI/UX 규칙 준수 가이드 - Dabang 테마 기반
enabled: true
---

# ShortsGen 디자인 시스템 스킬

새로운 React 컴포넌트나 화면을 작성할 때, 아래의 디자인 규칙을 **반드시** 적용하세요.

## 🎯 1. AI 행동 지침 (Action Instruction)

_"화면을 만들어줘"_ 또는 _"새로운 컴포넌트를 짜줘"_ 요청이 들어오면:

1. ✅ 이 문서의 Tailwind 클래스 맵핑과 규격을 **정확히** 적용
2. ✅ `padding`, `gap`, `border-radius` 규격을 변경하지 말 것 (넉넉한 24px 패딩 유지)
3. ✅ **순수 Tailwind CSS**로만 구현 (Shadcn, MUI, Ant Design 절대 금지)
4. ✅ 컴포넌트는 `src/components/` 디렉토리에 저장
5. ✅ 화면은 React Router를 사용해 라우팅

---

## 📐 2. 기본 레이아웃 규칙 (Layout Rules)

### 전체 페이지 구조
```jsx
// 페이지 전체 래퍼
<div className="min-h-screen flex bg-[#F4F7FE] text-[#151D48]">
  {/* 사이드바 */}
  <aside className="w-[260px] bg-white p-8 shadow-sm">
    {/* 사이드바 콘텐츠 */}
  </aside>
  
  {/* 메인 콘텐츠 */}
  <main className="flex-1 p-8">
    <div className="max-w-[1600px] mx-auto">
      {/* 페이지 콘텐츠 */}
    </div>
  </main>
</div>
```

### 핵심 레이아웃 클래스
- **전체 화면:** `min-h-screen flex bg-[#F4F7FE] text-[#151D48]`
- **사이드바:** 고정 너비 `w-[260px]`, 배경 `bg-white`, 여백 `p-8`
- **메인 콘텐츠:** `flex-1 p-8`
- **최대 너비 (메인 콘텐츠 영역):** `max-w-[1600px] mx-auto w-full`

---

## 🎨 3. 색상 팔레트 (Color Tokens)

### 기본 색상
| 용도 | 색상값 | Tailwind 클래스 |
|------|--------|-----------------|
| 앱 배경 (연한 쿨그레이) | `#F4F7FE` | `bg-[#F4F7FE]` |
| 카드/표면 (순백색) | `#FFFFFF` | `bg-white` |
| 메인 텍스트 | `#151D48` | `text-[#151D48]` |
| 서브 텍스트 (비활성) | `#737791` | `text-[#737791]` |
| 메인 브랜드 (보라빛 블루) | `#5D5FEF` | `bg-[#5D5FEF] text-[#5D5FEF]` |
| 브랜드 호버 | `#4B4CE0` | `hover:bg-[#4B4CE0]` |
| 구분선/테두리 | `#F1F3F9` | `border-[#F1F3F9]` |

### 파스텔 포인트 컬러 (강조 블록 및 통계 카드용)
- **Pink:** 배경 `bg-[#FFE2E5]`, 텍스트 `text-[#FF5B5B]`
- **Orange:** 배경 `bg-[#FFF4DE]`, 텍스트 `text-[#FFAA00]`
- **Green:** 배경 `bg-[#DCFCE7]`, 텍스트 `text-[#00B074]`
- **Purple:** 배경 `bg-[#F3E8FF]`, 텍스트 `text-[#A064FA]`

---

## 📏 4. 크기, 여백 및 특수 효과 (Sizes & Effects)

### 카드 및 블록 (Cards)
카드는 **큰 모서리(20px)** 로 둥글게, **은은한 그림자** 적용

```jsx
// 일반 카드 (컨테이너 역할)
className="bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]"

// 카드 간 간격 (항상 유지)
gap-6  // 24px
```

### 버튼 및 입력 필드 (Button/Input)
카드 내 요소는 **덜 둥글게(12px)** 하여 시각적 계층감 표현

```jsx
// 버튼/입력
className="rounded-xl px-5 py-4"

// 뱃지/태그 (Pill 스타일)
className="rounded-full px-4 py-2 text-sm font-semibold"
```

### Primary 섀도우 (Glow Effect)
주조색(`#5D5FEF`) 버튼과 활성 메뉴는 **블루 톤 그림자** 적용

```jsx
className="shadow-[0_4px_10px_rgba(93,95,239,0.3)]"
```

---

## 🧱 5. 페이지 구조 (Page Architecture)

앱은 React Router를 사용해 4개의 독립적인 뷰로 구성됩니다.

### 1️⃣ Dashboard.jsx (대시보드 홈)
- **구성:** 프로필 카드 + 실시간 트렌드 위젯
- **레이아웃:** 다단 Grid 구조
- **경로:** `/dashboard`

### 2️⃣ Setup.jsx (내 가게 정보 관리)
- **구성:** 매장 정보 및 AI 기획 변수 입력 폼
- **레이아웃:** 가운데 정렬 폼 스타일
- **경로:** `/setup`

### 3️⃣ Generate.jsx (릴스 생성하기)
- **구성:** 기획 방향성(좌측) + 9:16 비디오 미리보기(우측)
- **레이아웃:** 2-Column 구조
- **경로:** `/generate`

### 4️⃣ Archive.jsx (내 보관함)
- **구성:** 필터 탭 + 비디오 카드 Grid
- **레이아웃:** 4열 바둑판식 배치 (9:16 썸네일)
- **경로:** `/archive`

---

## 🎨 6. Typography (폰트)

- **영문:** `Inter` (Google Fonts)
- **국문:** `Pretendard` (Google Fonts)
- **기본 사이즈:** `text-base` (16px)
- **제목:** `text-2xl font-bold` 이상
- **버튼:** `font-semibold`

### 폰트 적용 예시
```jsx
// index.css에 임포트
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700&display=swap');

// JSX에서 사용
<h1 className="text-2xl font-bold text-[#151D48]">제목</h1>
<p className="text-base text-[#737791]">본문</p>
```

---

## ✅ 체크리스트 (Before Commit)

새 화면이나 컴포넌트를 만든 후:

- [ ] 모든 배경색이 지정된 색상 팔레트에서만 사용됨
- [ ] 카드는 `rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]` 적용
- [ ] 버튼/입력은 `rounded-xl` 사용
- [ ] 여백(`padding`, `gap`)이 규격과 일치함 (6, 8 등 기본값 사용)
- [ ] Shadcn, MUI, Ant Design 등의 UI 라이브러리 미사용
- [ ] 폰트는 Inter(영문), Pretendard(국문) 사용
- [ ] 반응형 디자인 적용 (`md:`, `lg:` 등 Tailwind 반응형 클래스)
- [ ] 모든 대화형 요소는 적절한 `hover:` 또는 `focus:` 상태 포함

---

## 🚫 금지 사항 (Do NOT)

❌ UI 라이브러리 import (Shadcn, MUI, Ant Design, Bootstrap 등)  
❌ 임의의 색상 변경 또는 규격 위반  
❌ `padding`, `gap` 규격을 다르게 설정  
❌ `any` 타입 사용 (TypeScript/JSDoc 사용 시)  
❌ 글로벌 CSS 파일에서 Tailwind 클래스 정의  

---

## 📚 참고 리소스

- [Tailwind CSS 공식 문서](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev) - 아이콘 라이브러리
- [React Router 가이드](https://reactrouter.com)
- [Inter 폰트](https://fonts.google.com/specimen/Inter)
- [Pretendard 폰트](https://github.com/orioncactus/pretendard)
