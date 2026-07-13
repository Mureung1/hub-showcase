# ShortsGen 디자인 시스템 가이드 & AI Skill (Design System)

이 문서는 새롭게 채택된 **Dabang 대시보드 UI 테마**를 기준으로 ShortsGen 웹 대시보드의 일관된 UI/UX를 유지하기 위한 디자인 원칙과, AI가 React + Tailwind CSS로 화면을 구현할 때 반드시 지켜야 하는 **스킬(Skill) 지침**을 통합한 문서입니다.

## 🎯 1. AI 행동 지침 (Action Instruction)

AI 에이전트(Claude 등)가 _"화면을 만들어줘"_ 또는 *"새로운 컴포넌트를 짜줘"*라는 요청을 받으면:

1. 무조건 이 문서에 정의된 Tailwind 클래스 맵핑과 규격을 적용하여 JSX 코드를 출력하세요.
2. `padding`, `gap`, `border-radius` 규격을 마음대로 축소하거나 변경하지 마세요. (넉넉한 24px 패딩 유지)
3. UI 컴포넌트 라이브러리(Shadcn, MUI 등)를 절대 import 하지 말고, **순수 Tailwind CSS**로만 구현하세요.

---

## 📐 2. 기본 레이아웃 (Layout Rules)

시각적인 안정감을 위해 카드를 넉넉하게 배치하는 **2-Column 레이아웃**을 사용합니다.

- **전체 화면:** `min-h-screen flex bg-[#F4F7FE] text-[#151D48]`
- **좌측 사이드바 (Sidebar):** 고정 너비 `w-[260px]`, 배경색 `bg-white`, 안쪽 여백 `p-8`
- **우측 메인 캔버스 (Main Content):** 남은 공간 차지 `flex-1`, 안쪽 여백 `p-8`, 화면 중앙 정렬
- **최대 너비:** `max-w-[1600px] mx-auto`로 메인 콘텐츠 영역을 넓게 확보하여, 정보가 꽉 차 있으면서도 시원한 대시보드 환경 구축.

---

## 🎨 3. 색상 팔레트 & Tailwind 매핑 (Colors)

새로운 컴포넌트를 만들 때 아래의 색상 코드(Arbitrary values)를 Tailwind 클래스에 매핑하여 사용하세요.

| 분류 및 목적 | Tailwind 클래스 적용 예시 |
| :--- | :--- |
| 🔲 **[배경색]** 앱 전체 배경 (연한 쿨그레이) | `bg-[#F4F7FE]` |
| 🔲 **[배경색]** 카드 및 표면 (순백색) | `bg-white` |
| 🎨 **[주조색]** 메인 브랜드 (보라빛 블루) | `bg-[#5D5FEF] text-[#5D5FEF]` |
| 🎨 **[주조색]** 버튼 호버 액션 | `hover:bg-[#4B4CE0]` |
| 📝 **[텍스트]** 메인 제목, 강조 글자 | `text-[#151D48]` |
| 📝 **[텍스트]** 서브 텍스트, 비활성 메뉴 | `text-[#737791]` |
| ➖ **[구분선]** 연한 테두리 및 경계선 | `border-[#F1F3F9]` |

### 💡 파스텔 포인트 컬러 (통계 카드 및 강조 블록용)

무거운 선이나 박스 대신, 파스텔 배경을 깔아 시각적 즐거움을 제공합니다.

- **Pink:** 배경 `bg-[#FFE2E5]`, 글자 `text-[#FF5B5B]`
- **Orange:** 배경 `bg-[#FFF4DE]`, 글자 `text-[#FFAA00]`
- **Green:** 배경 `bg-[#DCFCE7]`, 글자 `text-[#00B074]`
- **Purple:** 배경 `bg-[#F3E8FF]`, 글자 `text-[#A064FA]`

---

## 📏 4. 크기, 여백 및 특수 효과 (Sizes & Effects)

카드와 버튼을 만들 때 반드시 아래의 규격을 준수하세요.

### 카드 및 블록 (Cards / Blocks)

큰 컨테이너 역할을 하는 카드는 모서리를 크게(`20px`) 둥글게 깎고, 아주 은은하게 퍼지는 플랫한 그림자를 사용합니다.

- **Tailwind 클래스:** `bg-white p-6 rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.04)]`
- **카드 간 간격 (Gap):** 항상 `gap-6` (24px) 유지.

### 버튼 및 폼 (Button/Input)

카드 안의 요소들은 덜 둥글게(`12px`) 깎아 시각적인 안정감(Hierarchy)을 줍니다.

- **일반 폼/버튼:** `rounded-xl px-5 py-4`
- **뱃지 및 태그 (Pill):** `rounded-full px-4 py-2 text-sm font-semibold`

### 🌟 Primary 섀도우 (Glow Effect)

주조색(`#5D5FEF`)이 들어간 주요 액션 버튼(예: 릴스 생성 시작)이나 활성 메뉴에는 단순 검은 그림자가 아닌 **동일한 블루 톤의 그림자**를 주어 고급스럽게 빛나는 효과를 줍니다.

- **Tailwind 클래스:** `shadow-[0_4px_10px_rgba(93,95,239,0.3)]`

---

## 🧱 5. 구조화 규칙 (Page Architecture)

앱은 크게 4개의 독립적인 페이지 뷰를 가집니다. (React Router 활용)

1. **`Dashboard.jsx` (대시보드 홈):** 프로필 카드(가게 정보 요약)와 실시간 트렌드 차트 위젯들이 꽉 차게 배치된 다단 Grid 구조.
2. **`Setup.jsx` (내 가게 정보 관리):** 매장 정보 및 AI 기획 변수(시그니처 메뉴 등)를 디테일하게 입력받는 가운데 정렬된 폼 스타일.
3. **`Generate.jsx` (릴스 생성하기):** 기획 방향성 및 사진 업로드(좌측) + 9:16 모바일 미리보기(우측)로 구성된 2-Column 구조.
4. **`Archive.jsx` (내 보관함):** 상단 필터 탭 + 4열 바둑판식 비디오 카드(9:16 썸네일) Grid 구조.

---

_※ 폰트는 영문 `Inter`, 국문 `Pretendard`를 기본으로 사용합니다._
