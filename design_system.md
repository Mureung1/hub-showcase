# GNU Course AI Navigator - Design System (v1.0)

이 디자인 시스템은 Figma 및 현대적인 대시보드 인터페이스 설계 철학에 기반하여 일관성 있고 미려한 사용자 경험을 유지하기 위해 정의되었습니다.

---

## 1. Color Palette

다크 모드를 디폴트로 하며, 프리미엄 글라스모피즘(Glassmorphism)과 네온 포인트를 활용한 현대적 컬러 스키마를 구성합니다.

| 분류 | 토큰명 | 대표 색상 코드 | 설명 |
| :--- | :--- | :--- | :--- |
| **Backgrounds** | `--bg-deep` | `#0B0F19` | 메인 앱 백그라운드 (가장 어두운 배경) |
| | `--bg-card` | `rgba(22, 28, 45, 0.6)` | 카드 컴포넌트, 유리 효과(Glassmorphism) 배경 |
| | `--bg-card-hover`| `rgba(30, 41, 59, 0.8)` | 카드 호버 상태 배경 |
| **Brand Colors** | `--color-primary` | `#6366F1` | Indigo (주요 인터랙티브 요소, 강조텍스트) |
| | `--color-secondary`| `#3B82F6` | Blue (보조 포인트, 진행 게이지) |
| | `--color-accent` | `#8B5CF6` | Purple (다전공 등 특수 상태 태그) |
| **State Alerts** | `--color-success` | `#10B981` | Emerald (이수 완료, 조건 충족 상태) |
| | `--color-warning` | `#F59E0B` | Amber (수강 누락, 진단 필요 상태) |
| | `--color-danger` | `#EF4444` | Red (심각한 수강 실패 및 필수 누락) |
| **Text Colors** | `--text-main` | `#F3F4F6` | 주 텍스트 (밝은 그레이/화이트) |
| | `--text-muted` | `#9CA3AF` | 설명 텍스트 및 메타데이터용 그레이 |
| **Borders** | `--border-light` | `rgba(255, 255, 255, 0.08)`| 미세한 테두리 및 구분선 |
| | `--border-focus` | `rgba(99, 102, 241, 0.4)` | 포커스 및 강조 테두리 |

---

## 2. Typography

고유한 디지털 아이덴티티와 가독성을 동시에 만족하기 위해 영문 헤더와 한글 텍스트용 웹폰트를 병용합니다.

- **Primary Font Family**: `'Noto Sans KR', sans-serif` (한글 본문 및 메타 설명)
- **Accent/Header Font Family**: `'Outfit', sans-serif` (로고, 숫자, 카드 헤더, 학점 비율 등)

### Type Scale
- **H1 (Logo)**: `24px / Bold (700) / tracking -0.02em`
- **H2 (Section Header)**: `18px / SemiBold (600)`
- **H3 (Card Title)**: `15px / Medium (500) / LineHeight 1.4`
- **Body Regular**: `13px / Regular (400) / LineHeight 1.6`
- **Caption/Badge**: `11px / Medium (500)`

---

## 3. Layout & Spacing (Grid System)

Figma의 8pt Grid 규칙을 엄격히 준수합니다.

- **Grid Spacing Units**: `8px`, `16px`, `24px`, `32px`
- **Layout Margins**:
  - 패널 내 여백: `24px` (`padding: 24px`)
  - 요소 간 간격: `16px` (`gap: 16px` 또는 `margin-bottom: 16px`)
- **Border Radius**:
  - 카드 및 패널: `16px` (`border-radius: 16px`)
  - 버튼 및 칩스: `8px` (`border-radius: 8px`)
  - 배지 및 아바타: `50%` 또는 `6px`

---

## 4. UI Component Specifications

### 4.1 Glassmorphism Cards
모든 주요 컨테이너 카드는 반투명 배경과 미세 테두리, 그리고 배경 블러 효과를 적용합니다.
```css
.card-glass {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}
```

### 4.2 Timetable Course Block
시간표 상의 각 과목 블록은 카테고리별 테마 컬러를 반영합니다.
- **전공 필수 (`major-req`)**: Indigo 테마 좌측 포인트 보더 및 파스텔톤 배경
- **전공 선택 (`major-opt`)**: Blue 테마 보더 및 반투명 배경
- **균형/기초교양 (`balance-edu`/`core-edu`)**: Emerald 테마 포인트
- **융합교양 (`converge-edu`)**: Amber/Purple 테마 포인트

### 4.3 Chat Message Bubble
- **User Message**: 우측 정렬, Indigo 단색 배경 (`background: var(--color-primary)`), 라운드 코너.
- **AI (Bot) Message**: 좌측 정렬, 반투명 그레이시 블루 배경 (`background: rgba(255, 255, 255, 0.05)`), 테두리 강조.

---

## 5. Micro-Animations & Interactivity

정적인 느낌을 탈피하고 premium한 인터페이스를 완성하기 위해 아래의 애니메이션 효과를 의무 적용합니다.

1. **Card Hover Lift**: 마우스 호버 시 위로 2px 리프트 및 그림자 확장
   `transform: translateY(-2px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);`
2. **Pulsing Indicator**: 진단 필요(Warning) 혹은 라이브 챗봇 상태에 미세한 펄스(확장) 애니메이션 부여
3. **Smooth Slide-In**: 채팅 메시지 추가 시 하단에서 부드럽게 위로 솟아오르는 효과 적용 (`fade-in-up`)
4. **Interactive Conic Gradient**: 졸업 달성도 원형 게이지 로딩 시 부드럽게 돌아가며 차오르는 트랜지션
