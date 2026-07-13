# 알바노트 디자인 규칙

## 1. 디자인 방향

알바노트는 사장님과 알바생이 함께 사용하는 근무 관리 웹 서비스이므로, 전체 UI는 밝고 부드러운 업무 도구 느낌을 기준으로 한다.

- 기본 톤은 밝은 아이보리와 흰색을 사용한다.
- 포인트 컬러는 단일 연두색이 아니라 연두색 계열 팔레트로 나누어 사용한다.
- 큰 면적은 아주 옅은 연두나 아이보리로 처리하고, 중요한 행동만 선명한 라임으로 강조한다.
- 텍스트는 완전한 검정보다 부드러운 짙은 남색 계열을 사용한다.
- 화면은 PC 웹 기준으로 넓게 사용하며, 정보가 카드 단위로 정돈되어 보이도록 구성한다.
- 설명 문장보다 상태, 날짜, 시간, 숫자 중심으로 정보를 보여준다.

## 2. CSS 변수

아래 변수는 프로젝트 전반의 기본 디자인 토큰으로 사용한다.

```css
:root {
  /* Brand */
  --color-primary: #d9ff5f;
  --color-primary-hover: #c9f044;
  --color-primary-soft: #f0ffbd;
  --color-primary-deep: #b6df4f;
  --color-primary-text: #202316;

  /* Green accents */
  --color-lime-request: #e6ff8f;
  --color-mint-success: #b8f2c2;
  --color-mint-success-text: #174329;
  --color-olive: #8fbf3f;
  --color-olive-soft: #eef7d9;
  --color-green-surface: #f6fbeb;

  /* Background */
  --color-page-bg: #fbfaf3;
  --color-app-bg: #f7f7f2;
  --color-surface: #ffffff;
  --color-surface-soft: #f3f4ee;

  /* Text */
  --color-text-main: #15151f;
  --color-text-sub: #5f5f68;
  --color-text-muted: #9a9aa3;

  /* Border */
  --color-border: #e9eadf;
  --color-border-strong: #d9dccf;
  --color-green-border: #dfecc8;

  /* Font */
  --font-family-base: "Pretendard Variable", "Pretendard", "Inter", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 15px;
  --font-size-lg: 17px;
  --font-size-xl: 23px;
  --font-size-2xl: 34px;
  --font-size-3xl: 42px;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-black: 800;

  /* Radius */
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 28px;
  --radius-pill: 999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Card */
  --card-bg: var(--color-surface);
  --card-border: 1px solid var(--color-border);
  --card-radius: var(--radius-md);
  --card-padding: 20px;
  --card-shadow: 0 14px 34px rgba(28, 28, 35, 0.055);

  /* App container */
  --app-radius: 28px;
  --app-shadow: 0 18px 50px rgba(50, 48, 35, 0.08);
}
```

## 3. 색상 사용 규칙

- `--color-primary`: 로그인, 등록, 대타 신청 같은 핵심 CTA와 활성 탭에만 사용한다.
- `--color-primary-soft`: 선택된 날짜나 약한 강조 배경에 사용한다.
- `--color-lime-request`: 공개 대타 요청, 신청 가능 상태처럼 행동 유도가 필요한 상태에 사용한다.
- `--color-mint-success`: 승인, 완료, 매칭됨처럼 긍정 상태에 사용한다.
- `--color-olive`: 보조 강조선, 테두리, 낮은 강도의 상태 구분에 사용한다.
- `--color-green-surface`: 히어로 영역이나 큰 패널처럼 넓은 면적에 사용하는 옅은 연두 배경이다.
- 큰 영역 전체를 선명한 라임으로 채우지 않는다. 선명한 색은 버튼, 배지, 선택 상태처럼 작은 면적에 사용한다.

## 4. 포인트 색 우선순위

포인트 색은 중요도에 따라 엄격하게 나누어 사용한다.

1. 1순위 CTA: 로그인, 대타 신청, 대타 요청 등록, 활성 탭에만 `--color-primary`를 사용한다.
2. 2순위 요청/주의 상태: 공개 요청, 신청 가능, 승인 대기는 `--color-lime-request`를 사용한다.
3. 3순위 선택/현재 위치: 오늘 날짜, 현재 근무중은 면을 채우기보다 `--color-primary-deep` 테두리와 얇은 강조선으로 표현한다.
4. 4순위 완료/긍정 상태: 매칭됨, 승인됨, 완료는 `--color-mint-success`를 사용한다.
5. 5순위 보조 정보: 사람 이름, 매장 근무, 필터 비활성 상태는 `--color-olive-soft`나 `--color-surface-soft`를 사용한다.

한 화면에서 선명한 라임 CTA는 1~2개를 넘지 않도록 한다. 상태 의미는 색만으로 전달하지 않고, 반드시 짧은 텍스트 라벨을 함께 사용한다.

반복 리스트 안에 같은 액션 버튼이 여러 개 등장할 때는 `--color-primary` 대신 `--color-lime-request`를 사용해 메인 CTA보다 한 단계 낮게 표현한다.

## 5. 폰트 규칙

- 기본 폰트는 `Pretendard Variable`을 사용한다.
- 영문/숫자는 `Inter`가 fallback으로 이어지도록 둔다.
- 한글 가독성을 위해 `900` 이상의 굵기는 사용하지 않는다.
- 기본 본문은 `14px` 이상을 사용한다.
- 작은 라벨도 `12px` 아래로 낮추지 않는다.
- 화면 전체에 `letter-spacing`은 적용하지 않는다.

```css
body {
  font-family: var(--font-family-base);
  line-height: 1.45;
  word-break: keep-all;
  font-feature-settings: "tnum" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  letter-spacing: 0;
}
```

## 6. 모서리와 여백

- 일반 카드: `16px`
- 작은 버튼/입력/달력 셀: `12px`
- 앱 컨테이너: `24px`에서 `28px`
- 칩, 탭, 상태 배지: `999px`
- 앱 외부 여백은 `20px`을 기준으로 한다.
- 상단바 높이는 약 `78px`을 기준으로 한다.
- 대시보드 내부 여백은 `32px 36px 38px`을 기준으로 한다.
- 카드 내부 여백은 기본 `20px`, 넓은 카드에서는 `23px`에서 `24px`을 사용한다.

## 7. 카드 스타일

```css
.card {
  border: var(--card-border);
  border-radius: var(--card-radius);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
}
```

- 카드 그림자는 아주 약하게 사용한다.
- 카드 테두리는 `--color-border`를 사용한다.
- 강조 카드도 큰 면적일 경우 `--color-green-surface`나 `--color-lime-request`처럼 낮은 강도의 배경을 우선 사용한다.
- 한 카드 안에는 하나의 목적만 담는다.
- 카드 안에 다시 큰 카드를 중첩하지 않는다.

## 8. 버튼과 탭

- 상단 탭은 pill 형태를 사용한다.
- 활성 탭은 `--color-primary`를 사용한다.
- 기본 버튼 높이는 `40px` 전후를 사용한다.
- 버튼 텍스트는 `14px`, `600~700` 굵기를 기준으로 한다.
- 주요 액션 버튼은 선명한 라임 배경, 보조 버튼은 흰색 배경과 테두리를 사용한다.

## 9. 레이아웃 규칙

- PC 웹 기준으로 넓은 대시보드 레이아웃을 사용한다.
- 메인 근무표는 왼쪽의 넓은 영역에 배치한다.
- 요약, 알림, 공개 요청 등 보조 정보는 오른쪽 패널에 배치한다.
- 기본 콘텐츠 그리드는 `메인 영역 + 350px 사이드 영역` 구조를 사용한다.
- 앱 컨테이너는 화면을 넓게 사용하되, 외부 아이보리 배경이 얇게 보이도록 한다.
- 페이지마다 가장 중요한 메인 콘텐츠 하나만 강하게 강조한다.
- 사이드 패널은 보조 정보 영역이므로 강조 색과 그림자 사용을 최소화한다.

## 10. 달력 스타일

- 월간 근무표는 7열 그리드로 구성한다.
- 날짜 셀은 최소 높이 `105px`을 기준으로 한다.
- 내 근무는 `--color-green-surface`, 매장 근무는 `--color-surface-soft`, 공개 요청은 `--color-lime-request`로 구분한다.
- 선택된 날짜는 `--color-primary-deep` 테두리와 내부 강조선으로 표시한다.
- 달력 셀 안의 보조 텍스트도 `12px` 이상을 유지한다.
- 월간 달력 셀은 `내 근무`, `요청 2건`, `3명 근무`, `마감`, `오픈`처럼 상태 라벨을 우선 표시한다.
- 구체적인 시간은 일간 상세나 오른쪽 요약 카드에서 보여준다.

## 11. 문구 규칙

- 화면에는 긴 설명 문장을 많이 넣지 않는다.
- 상태, 날짜, 시간, 금액, 건수처럼 행동에 필요한 정보 중심으로 표시한다.
- 대타 기능은 `공개 요청`, `대타 신청`, `승인 대기`, `마감됨` 등의 용어를 사용한다.
- `대타 가능 ON/OFF` 표현은 사용하지 않는다.
