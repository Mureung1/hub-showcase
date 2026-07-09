---
name: new-component
description: Use this skill whenever the user asks to create a new React component or screen for the exam-cram-scheduler project — phrases like "새 컴포넌트 만들어줘", "새 화면 만들어줘", "컴포넌트 스캐폴딩해줘", "OO 카드/버튼/배너 컴포넌트 만들어줘", or when they name a specific UI piece (card, list row, segmented control, toggle, input field, slider, badge, warning banner, bottom sheet, chart area) that needs a .tsx + .module.css pair. Always trigger this instead of hand-writing a component from scratch, since this project's design tokens and conventions live in CLAUDE.md and docs/디자인.md rather than in the model's memory.
---

# 새 컴포넌트 스캐폴딩

이 프로젝트(exam-cram-scheduler)의 컬러·타이포그래피·간격·컴포넌트 패턴은 이미 `docs/디자인.md`에, 파일 네이밍·커밋 컨벤션은 `CLAUDE.md`에 정리되어 있다. 새 컴포넌트를 만들 때마다 이걸 다시 설명받지 않고, 이 문서들을 직접 읽어서 그대로 적용하는 게 이 스킬의 목적이다.

## 절차

### 1. 문서를 먼저 읽는다
`CLAUDE.md`와 `docs/디자인.md`를 코드를 쓰기 전에 반드시 읽는다. 색상 코드나 폰트 크기를 기억이나 추측으로 채우지 않는다 — 두 문서에 이미 정답이 있다.

### 2. 기존 패턴에 매핑되는지 확인한다
`docs/디자인.md`의 "5. 공통 컴포넌트 목록"과 "8. 화면별 컴포넌트 매핑"을 보고, 요청받은 컴포넌트가 이미 있는 패턴(카드, 리스트 로우, 세그먼트 컨트롤, 토글, 입력 필드, 슬라이더, 뱃지, 경고 배너, 버튼, 바텀시트, 차트 영역 등)에 해당하는지 판단한다. 해당하면 그 패턴이 쓰는 CSS 변수·여백·모서리 값을 그대로 재사용한다.

### 3. 매핑이 안 되면 스스로 판단하지 말고 질문한다
요청받은 컴포넌트가 문서에 없는 새로운 색 조합, 새로운 레이아웃, 새로운 상태(로딩/에러/빈 상태 등)를 필요로 한다면, 임의로 지어내지 말고 사용자에게 먼저 물어본다. 이건 `CLAUDE.md`의 "하지 말 것" 규칙("프롬프트에 빈틈이 있으면 임의로 판단해서 채우지 말고, 사용자에게 다시 질문해서 함께 결정한다")과 같은 원칙이다. 애매한 디자인 결정을 스킬이 대신 내려버리면, 나중에 화면마다 스타일이 미묘하게 달라지는 문제가 생긴다.

### 4. 파일을 만든다
- 이름은 PascalCase (`CLAUDE.md` 컨벤션): 예) `ExamCard`
- 같은 폴더에 짝 파일 두 개 생성
  - `ComponentName.tsx` — 최소한의 함수형 컴포넌트 뼈대. 요청 내용에서 유추 가능한 props만 넣고, 라우팅 연결·상태 관리·데이터 요청 같은 로직은 넣지 않는다 (요청받지 않은 작업은 하지 않는다).
  - `ComponentName.module.css` — 값을 하드코딩하지 않고 `docs/디자인.md`에 정리된 CSS 변수(`var(--brand)`, `var(--r-lg)` 등)를 그대로 참조한다.
- 컴포넌트를 어느 폴더(`src/components/` 등)에 둘지 프로젝트에 아직 정해진 구조가 없다면, 합리적인 기본값을 쓰되 어디에 뒀는지 사용자에게 알린다.

### 5. 결과를 짧게 요약한다
`docs/디자인.md`의 어떤 패턴을 참고했는지, 애매해서 질문한 부분이 있었는지 2~3문장으로 설명한다.

## 예시

**요청**: "시험 카드 컴포넌트 만들어줘, 과목명이랑 날짜·시간 보여주는 거"

**적용**: `디자인.md` 5번의 "리스트 로우"(`.row`, `.row-icon`, `.row-title`, `.row-sub`) 패턴에 매핑됨 → `ExamCard.tsx` + `ExamCard.module.css` 생성, `row-title`은 14.5px/600, `row-sub`는 12.5px/400 스타일 그대로 사용, 배경은 `var(--surface-muted)`, 모서리는 `var(--r-lg)`.

**요청받았지만 문서에 없는 경우 예**: "시험 카드에 D-day 배지를 눈에 띄는 빨간색으로 넣어줘" → `디자인.md`엔 D-day 배지 패턴도 빨간색 토큰도 없음 → 색을 임의로 고르지 않고 "빨간색 계열이 `danger` 색상 토큰(`--danger-bg` 등, 경고용)뿐인데 이걸 D-day 배지에 써도 될지, 아니면 새 색을 하나 정할지" 사용자에게 확인 후 진행.

## 전제 조건

이 스킬은 이 프로젝트의 `CLAUDE.md`와 `docs/디자인.md`가 존재한다는 걸 전제로 한다. 둘 중 하나라도 없으면 먼저 사용자에게 알리고, 대신 참고할 문서가 있는지 물어본다.
