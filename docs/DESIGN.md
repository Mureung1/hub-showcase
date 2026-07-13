# Decision Log 디자인 시스템

## 1. 디자인 도구 선택

이번 프로젝트의 디자인 도구는 Figma로 선택한다.

## 2. 선택 이유

- 화면 구조를 빠르게 잡기 쉽다.
- 컴포넌트 단위로 반복 UI를 관리하기 좋다.
- 디자인 토큰을 정리해 개발 Agent에게 전달하기 좋다.
- 프로토타입 화면을 만들고 피드백 받기 쉽다.

---

## 3. 디자인 방향

Decision Log는 AI 답변을 비교하고 판단을 저장하는 도구다.  
따라서 화려한 디자인보다 정보가 잘 읽히고, 판단 상태가 명확히 보이는 디자인을 우선한다.

---

## 4. 화면 레이아웃 원칙

### 1) 3단 레이아웃

| 영역 | 역할 |
|---|---|
| Left | Project Context |
| Center | 질문 입력, AI 답변, Manager AI 카드 |
| Right | Decision Log |

### 2) 우선순위

1. 사용자가 질문을 입력할 수 있어야 한다.
2. 여러 AI 답변이 구분되어 보여야 한다.
3. Manager AI 카드가 판단하기 쉽게 보여야 한다.
4. Decision Log가 오른쪽에 계속 보여야 한다.

---

## 5. 컬러 토큰

| Token | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#F6F7F9` | 전체 배경 |
| `--color-surface` | `#FFFFFF` | 카드, 패널 배경 |
| `--color-border` | `#E5E7EB` | 테두리 |
| `--color-text` | `#111827` | 기본 텍스트 |
| `--color-muted` | `#6B7280` | 보조 텍스트 |
| `--color-primary` | `#2563EB` | 주요 버튼 |
| `--color-accepted` | `#DCFCE7` | Accepted 배경 |
| `--color-verify` | `#FEF3C7` | Verify 배경 |
| `--color-rejected` | `#FEE2E2` | Rejected 배경 |

---

## 6. 폰트

| 항목 | 값 |
|---|---|
| 기본 폰트 | Pretendard |
| 대체 폰트 | system-ui, sans-serif |
| 제목 굵기 | 700 |
| 본문 굵기 | 400 |
| 보조 텍스트 굵기 | 400 |

---

## 7. 간격 규칙

| Token | 값 | 용도 |
|---|---|---|
| `--space-xs` | `4px` | 작은 요소 간격 |
| `--space-sm` | `8px` | 버튼 내부, 라벨 간격 |
| `--space-md` | `16px` | 카드 내부 여백 |
| `--space-lg` | `24px` | 섹션 간격 |
| `--space-xl` | `32px` | 큰 구역 간격 |

---

## 8. Radius 규칙

| Token | 값 | 용도 |
|---|---|---|
| `--radius-sm` | `8px` | 작은 버튼 |
| `--radius-md` | `12px` | 카드 |
| `--radius-lg` | `20px` | 큰 패널 |

---

## 9. 주요 컴포넌트

### 1) Question Input

- 사용자가 질문을 입력하는 영역
- textarea 사용
- 하단에 모델 선택과 실행 버튼 배치

### 2) Model Answer Card

- AI별 답변을 보여주는 카드
- 모델명 라벨을 상단에 표시
- 답변은 짧은 문단 단위로 표시

### 3) Manager Decision Card

- Manager AI가 만든 비교 결과 카드
- 카드 타입 라벨 표시
- 원문 보기 버튼 제공
- Accepted / Verify / Rejected 버튼 제공

### 4) Decision Log Card

- 사용자가 저장한 판단 기록 카드
- 상태별로 구분
- 제목, 요약, 출처 AI 표시

### 5) Export Button

- 오른쪽 Decision Log 하단에 배치
- MD Zip 다운로드 기능으로 연결

---

## 10. 디자인 완료 기준

- 핵심 화면 1개가 완성되어야 한다.
- 3단 레이아웃이 명확히 보여야 한다.
- 질문 입력, AI 답변, Manager 카드, Decision Log가 모두 포함되어야 한다.
- 카드 상태가 Accepted, Verify, Rejected로 구분되어야 한다.
- 개발 Agent가 참고할 수 있는 색상, 폰트, 간격 규칙이 정리되어야 한다.
