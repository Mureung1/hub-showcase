# 코드 리뷰: 프로토타입 기반 UI 리디자인

**날짜**: 2026-07-29
**작업자**: Claude Opus 4.5
**브랜치**: `work`

---

## 1. 변경 요약

| 파일 | 변경 | 설명 |
|------|------|------|
| `apps/web/src/design/tokens.css` | +72/-24 | 프로토타입 색상 체계 및 레이아웃 토큰 추가 |
| `apps/web/src/design/global.css` | +74/-45 | 애니메이션, 배경 패턴, 리셋 스타일 개선 |
| `apps/web/src/App.jsx` | +1296/-558 | 2컬럼 레이아웃 + 프로토타입 UI 완전 적용 |

**총 변경**: 1,442 추가 / 627 삭제

---

## 2. 주요 변경사항

### 2.1 디자인 토큰 (`tokens.css`)

**추가된 색상 변수:**
```css
/* 프로토타입 기반 팔레트 */
--color-mint-soft: #e3f5f1;      /* 연한 민트 배경 */
--color-dark: #0f2a2e;           /* 다크 버튼/말풍선 */
--color-dark-text: #eafcf8;      /* 다크 위 텍스트 */
--color-sidebar: linear-gradient(180deg, #fbfdfc, #f4faf8);
```

**추가된 레이아웃 토큰:**
```css
--width-container: 1160px;       /* 최대 너비 */
--width-sidebar: 300px;          /* 사이드바 너비 */
--shadow-hero: 0 18px 50px -24px rgba(15,42,46,.4);
```

**평가**:
- 프로토타입 색상을 정확히 추출함
- 시맨틱 네이밍 일관성 유지 (`--color-{역할}`)
- 그라데이션 변수 도입은 좋으나, CSS 변수로 그라데이션 사용 시 일부 브라우저 호환성 주의 필요

---

### 2.2 글로벌 스타일 (`global.css`)

**추가된 애니메이션:**
```css
@keyframes riseIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**유틸리티 클래스:**
```css
.animate-rise { animation: riseIn var(--transition-slow); }
.animate-fade { animation: fadeIn var(--transition-normal); }
```

**평가**:
- `prefers-reduced-motion` 미디어 쿼리로 접근성 고려됨
- 애니메이션 토큰화로 일관성 확보
- 스크롤바 커스텀 스타일은 WebKit 전용 (Firefox 미지원)

---

### 2.3 앱 컴포넌트 (`App.jsx`)

#### 새로 추가된 컴포넌트 (15개)

| 컴포넌트 | 역할 | LOC |
|----------|------|-----|
| `BackgroundPattern` | 배경 그라데이션 + 블롭 장식 | 40 |
| `Nav` | 네비게이션 바 | 55 |
| `Hero` | 히어로 섹션 | 60 |
| `SpaceCard` | 사이드바 공간 선택 카드 | 45 |
| `StageHeader` | 진단 단계 헤더 | 50 |
| `ProbeButton` | 빠른확인 버튼 (👍/👀/🔧) | 35 |
| `QuickCheckCard` | 빠른확인하기 카드 | 50 |
| `ChatBubble` | 대화 말풍선 | 30 |
| `AssumeBox` | 가정 알림 박스 | 20 |
| `HypothesisCard` | 가설 카드 | 70 |
| `QuestionCard` | 질문 카드 | 55 |
| `HistoryItem` | 대화 히스토리 항목 | 25 |
| `CompletionScreen` | 완료 화면 | 80 |
| `HistoryDeck` | 이전 기록 화면 | 70 |
| `Toast` | 알림 토스트 | 40 |

#### 화면 구조

```
App
├── BackgroundPattern (배경)
├── Nav (네비게이션)
├── screen === 'home'
│   ├── Hero
│   └── MainCard (2컬럼)
│       ├── Sidebar (SpaceCard[])
│       └── Main (QuickCheckCard)
├── screen === 'probe' → QuickCheckCard
├── screen === 'diagnosis'
│   ├── ChatBubble[]
│   ├── AssumeBox?
│   ├── QuestionCard | HypothesisCard
│   └── Footer (완료 버튼)
├── screen === 'done' → CompletionScreen
└── screen === 'history' → HistoryDeck
```

#### 상태 관리

```javascript
const [screen, setScreen] = useState('home')
// 'home' | 'probe' | 'diagnosis' | 'history' | 'done'

const [response, setResponse] = useState(null)
// BE 응답: { needMoreInfo, hypotheses, assumed, ... }

const [history, setHistory] = useState([])
// 대화 히스토리: [{ question, answer }]
```

**평가**:
- 컴포넌트 분리가 잘 되어 있음
- 인라인 스타일이 많아 유지보수 어려움 (개선점 #1)
- BE API 연결은 기존 로직 그대로 유지 (좋음)
- 화면 전환 로직이 명확함

---

## 3. 잘된 점

1. **프로토타입 충실 재현**: 색상, 레이아웃, 애니메이션 모두 프로토타입과 일치
2. **BE 연결 유지**: 기존 API 호출 로직 변경 없이 UI만 개선
3. **컴포넌트 분리**: 15개 컴포넌트로 관심사 분리
4. **접근성 고려**: `prefers-reduced-motion`, `aria-label`, `role="alert"`
5. **에러 처리**: Toast로 사용자 친화적 에러 메시지

---

## 4. 개선 필요사항

### 4.1 인라인 스타일 과다 (우선순위: 높음)

**현재:**
```jsx
<div style={{
  maxWidth: 'var(--width-container)',
  margin: '26px auto 0',
  padding: '0 32px 60px',
}}>
```

**문제:**
- 동일한 스타일 블록이 5번 이상 반복됨
- 런타임 객체 생성으로 성능 저하 가능
- 호버 상태를 `onMouseEnter/Leave`로 처리 (비효율)

**제안:**
- CSS Modules 또는 컴포넌트 CSS 파일로 분리
- 공통 레이아웃 컴포넌트 추출

---

### 4.2 중복 레이아웃 코드 (우선순위: 중간)

`screen === 'probe' | 'diagnosis' | 'done' | 'history'` 화면들이 모두 동일한 2컬럼 레이아웃 구조를 반복함.

**제안:**
```jsx
function MainLayout({ children, sidebar }) {
  return (
    <div className="main-card">
      <aside className="sidebar">{sidebar}</aside>
      <main className="stage">{children}</main>
    </div>
  )
}
```

---

### 4.3 호버 효과 JS 처리 (우선순위: 중간)

**현재:**
```jsx
onMouseEnter={(e) => {
  e.currentTarget.style.borderColor = c.hoverBorder
  e.currentTarget.style.transform = 'translateY(-3px)'
}}
```

**문제:**
- CSS `:hover`로 처리하면 더 깔끔하고 성능 좋음
- JS로 처리 시 상태 충돌 가능

---

### 4.4 타입 안전성 (우선순위: 낮음)

- PropTypes 또는 TypeScript 미사용
- BE 응답 타입 체크 없음

---

## 5. 테스트 현황

| 항목 | 상태 |
|------|------|
| 빌드 | ✅ 성공 (`npm run build`) |
| 백엔드 연결 | ✅ 정상 (`/api/spaces`, `/api/sessions`) |
| 프론트엔드 렌더링 | ✅ 정상 |
| 유닛 테스트 | ⚠️ 미실행 (기존 테스트 파일 존재) |

---

## 6. 다음 단계 제안

### 즉시 개선 가능 (이번 PR)
1. **공통 레이아웃 컴포넌트 추출** - `MainLayout.jsx` 분리로 코드 중복 50% 감소

### 후속 작업
2. CSS Modules 도입
3. 호버 효과 CSS로 이전
4. 유닛 테스트 업데이트

---

## 7. 커밋 메시지 제안

```
feat: 프로토타입 기반 UI 리디자인

- 2컬럼 레이아웃 (사이드바 + 메인 스테이지)
- 빠른확인하기 카드 (👍/👀/🔧 버튼)
- 프로토타입 색상 체계 적용
- 애니메이션 추가 (riseIn, fadeIn)
- 15개 컴포넌트 분리
```
