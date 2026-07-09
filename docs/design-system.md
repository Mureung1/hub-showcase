# PtoP Design System

## 디자인 기준 이미지

PtoP의 디자인 시스템은 `Mascoat.png`에 정의된 마스코트 포피(Popy)의 색상과 분위기를 기준으로 한다.

포피는 검정색 본체, 흰색 얼굴, 민트 포인트, 부드러운 회색 그림자로 구성되어 있다. 따라서 서비스 UI도 강한 장식보다 흰 배경, 선명한 검정 텍스트, 민트 포인트, 부드러운 여백 중심으로 구성한다.

## 디자인 키워드

- 깔끔한
- 부드러운
- 친근한
- 정리된
- 포트폴리오에 어울리는
- 기능이 먼저 보이는

## 컬러 시스템

```css
:root {
  --color-ink: #151817;
  --color-muted: #565656;
  --color-paper: #ffffff;
  --color-soft-paper: #fbfffd;
  --color-mint: #62d6a5;
  --color-mint-dark: #26a875;
  --color-mint-soft: #e6fbf2;
  --color-mint-line: #a8d9c3;
  --color-line: #dce8e2;
  --color-gray-soft: #f4f5f4;
  --color-error-bg: #fff5f5;
  --color-error-line: #f0b2b2;
}
```

### 사용 기준

- `--color-ink`: 제목, 주요 본문, 핵심 수치에 사용한다.
- `--color-muted`: 보조 설명, 안내 문구, 비활성 텍스트에 사용한다.
- `--color-paper`: 기본 페이지 배경과 카드 배경에 사용한다.
- `--color-soft-paper`: 큰 섹션 배경에 사용한다.
- `--color-mint`: 주요 버튼, 진행 상태, 강조 포인트에 사용한다.
- `--color-mint-dark`: 링크, 작은 라벨, 강조 텍스트에 사용한다.
- `--color-mint-soft`: 분석 상태, 요약 박스, 부드러운 강조 배경에 사용한다.
- `--color-line`: 최소한의 구분선에만 사용한다.

## 타이포그래피

기본 폰트는 시스템 sans-serif를 사용한다. 별도 웹폰트는 추가하지 않는다.

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

### 크기 기준

- 페이지 대표 제목: `clamp(2.25rem, 7vw, 5.5rem)`
- 섹션 제목: `clamp(1.6rem, 4vw, 3rem)`
- 카드 제목: `1rem` ~ `1.25rem`
- 본문: `0.95rem` ~ `1rem`
- 보조 설명: `0.86rem` ~ `0.95rem`

### 문장 기준

- 제목은 짧고 명확하게 작성한다.
- 설명 문장은 2줄을 넘지 않도록 나눈다.
- 기능 설명은 긴 문단보다 카드, 리스트, 라벨로 나눈다.

## 레이아웃

### 페이지 폭

```css
.page {
  width: min(1080px, calc(100% - 40px));
  margin: 0 auto;
}
```

### 섹션 간격

- 데스크톱 섹션 padding: `72px 0`
- 모바일 섹션 padding: `48px 0`
- 카드 내부 padding: `20px` ~ `28px`
- 카드 간격: `14px` ~ `24px`

## 컴포넌트 규칙

### Repository 입력 영역

- 첫 화면에서 가장 먼저 보여야 한다.
- 로고 바로 아래에 배치한다.
- 입력창과 버튼은 하나의 pill 형태로 묶는다.
- 버튼 색상은 민트로 고정한다.
- 입력 아래에는 사용자가 무엇을 넣어야 하는지 안내 문구를 둔다.

### 버튼

```css
.primary-button {
  min-height: 48px;
  padding: 0 22px;
  color: var(--color-ink);
  font-weight: 850;
  border: 1px solid var(--color-mint-line);
  border-radius: 999px;
  background: var(--color-mint);
}
```

- 주요 행동 버튼은 민트 배경을 사용한다.
- 검정 배경 버튼은 기본으로 사용하지 않는다.
- hover 시 밝은 민트로 바꾼다.
- disabled 상태에서는 opacity를 낮추고 cursor를 `wait` 또는 `not-allowed`로 표현한다.

### 카드

- 검정 border를 두껍게 사용하지 않는다.
- 구분은 밝은 배경, 약한 border, 부드러운 shadow로 만든다.
- border-radius는 `8px`을 기본으로 사용한다.
- 카드 안에 카드가 중첩되지 않도록 한다.

```css
.soft-card {
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 48px rgba(38, 168, 117, 0.1);
}
```

### 분석 로딩 상태

- 로고 이미지를 spinner로 사용하지 않는다.
- 민트 컬러 기반의 원형 spinner를 사용한다.
- 문구는 “Repository를 분석하고 있어요”처럼 현재 동작을 설명한다.

### 분석 결과

- 결과 화면은 Repository 정보, 참여자, 기여도, 주요 작업 순서로 보여준다.
- 수치는 크게, 설명은 작게 보여준다.
- commit 수는 참고 지표임을 표현하고 절대적인 기여도처럼 보이지 않게 한다.

### 오류 상태

- 임의 결과를 만들지 않는다.
- 사용자가 다음에 무엇을 해야 하는지 알려준다.
- 색상은 강한 빨강보다 연한 오류 배경과 짧은 문구를 사용한다.

## 마스코트 사용 규칙

### 사용할 수 있는 경우

- 서비스 소개 섹션의 보조 이미지
- 빈 상태 안내
- 분석 완료 또는 응원 메시지
- 문서나 PR 설명의 시각 자료

### 피해야 하는 경우

- Repository 입력창보다 크게 배치하지 않는다.
- 분석 결과 숫자나 주요 작업 목록을 가리지 않는다.
- 모든 섹션에 반복해서 사용하지 않는다.
- 로딩 spinner로 직접 사용하지 않는다.

## 화면별 기준

### 메인 입력 화면

- 가장 중요한 UI는 Repository URL 입력창이다.
- `Project to Portfolio` 같은 설명 문구보다 입력 행동이 먼저 보여야 한다.
- 입력창 아래에는 “분석하고 싶은 프로젝트의 Git Repository 주소를 입력해보세요.” 정도의 짧은 안내를 둔다.

### 분석 진행 화면

- 사용자가 기다리는 이유를 알 수 있어야 한다.
- spinner, 상태 제목, 보조 설명을 함께 제공한다.
- 화면이 갑자기 크게 흔들리지 않도록 결과 영역의 최대 폭을 유지한다.

### 분석 결과 화면

- 참여자와 기여도가 한눈에 보여야 한다.
- 주요 작업은 commit message 기반이라는 점을 숨기지 않는다.
- GitHub 원문 링크를 제공해 사용자가 직접 확인할 수 있게 한다.

### 소개/랜딩 섹션

- 핵심 기능을 보조하는 역할만 한다.
- 큰 장식보다 문제, 대상, 해결 흐름을 간단히 보여준다.
- 과한 마스코트 반복을 피한다.

## 금지 사항

- 검정색 두꺼운 border로 섹션을 나누지 않는다.
- 보라색, 파란색, 베이지 계열로 전체 테마를 바꾸지 않는다.
- 카드 안에 카드를 중첩하지 않는다.
- 마스코트를 핵심 기능보다 크게 보여주지 않는다.
- 실제 분석 실패 상황에서 mock 데이터를 성공 결과처럼 보여주지 않는다.
- 사용자의 역할이나 기여도를 과장하는 문구를 쓰지 않는다.

## 디자인 점검 체크리스트

- [ ] 첫 화면에서 Repository 입력창이 가장 먼저 보이는가?
- [ ] 민트, 검정, 흰색 중심의 색상 규칙을 지켰는가?
- [ ] 검정 border 대신 여백, 밝은 배경, 약한 그림자로 구분했는가?
- [ ] 마스코트가 핵심 정보를 가리지 않는가?
- [ ] 입력, 로딩, 결과, 오류 상태가 모두 구분되는가?
- [ ] 모바일 화면에서 텍스트와 버튼이 잘리지 않는가?
- [ ] commit 수와 기여도를 절대적인 평가처럼 표현하지 않았는가?
