# GradPlan 디자인 시스템

레퍼런스: 토스(Toss) 웹 — 흰색/하늘색 기반의 산뜻한 톤, 무거운 남색·보라색 지양

---

## 1. 컬러 토큰

```css
:root{
  /* 배경 */
  --bg: #FFFFFF;              /* 기본 배경: 순백 */
  --bg-subtle: #F7FAFC;       /* 섹션 구분용 아주 옅은 회청색 배경 */
  --bg-gradient: linear-gradient(180deg, #FFFFFF 0%, #F5F9FC 100%);

  /* 텍스트 — 남색 대신 무채색 계열 사용 */
  --text-primary: #191F28;    /* 헤드라인, 본문 강조 (거의 블랙, 남색 아님) */
  --text-secondary: #4E5968;  /* 서브텍스트, 설명문 */
  --text-tertiary: #8B95A1;   /* 캡션, 메타 정보 */

  /* 포인트 컬러 — 파랑은 "액션"에만 집중 사용 */
  --point: #3182F6;           /* 버튼, 링크, 강조 아이콘 */
  --point-light: #E8F3FF;     /* 포인트 배경 (카드, 뱃지 배경 등 옅게) */
  --point-dark: #1B64DA;      /* 버튼 hover/active */

  /* 카드 & 구분선 */
  --card: #FFFFFF;            /* 카드 배경: 흰색 유지 */
  --card-border: #F2F4F6;     /* 카드 테두리 (그림자 대신 얇은 보더로 구분) */
  --divider: #EEF1F4;

  /* 시맨틱 컬러 — 상태는 색상 톤 차이가 아니라 색상 종류로 구분 */
  --success: #00C880;         /* 요건 충족 */
  --success-bg: #E7FAF3;
  --warning: #FF9800;         /* 부족·주의 */
  --warning-bg: #FFF4E5;
  --danger: #F04452;          /* 심각한 미충족 */
  --danger-bg: #FDEDEE;

  /* 반경 & 그림자 — 그림자는 최소화, 보더 위주 */
  --radius-lg: 24px;
  --radius-md: 16px;
  --radius-sm: 10px;
  --shadow-sm: 0 1px 2px rgba(25,31,40,0.04);   /* 아주 옅게, 장식용 아님 */
  --shadow-md: 0 4px 12px rgba(25,31,40,0.06);
}
```

## 2. 타이포그래피

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');

:root{
  --font-primary: 'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif;
}

h1{ font-family:var(--font-primary); font-weight:800; font-size:36px; line-height:1.3; color:var(--text-primary); letter-spacing:-0.02em; }
h2{ font-family:var(--font-primary); font-weight:700; font-size:22px; color:var(--text-primary); letter-spacing:-0.01em; }
body{ font-family:var(--font-primary); font-weight:400; font-size:15px; color:var(--text-secondary); }

/* 숫자/데이터 강조 (학점, 퍼센트 등)는 800 weight + 살짝 큰 사이즈 */
.stat-number{ font-weight:800; font-size:32px; color:var(--text-primary); letter-spacing:-0.02em; }
```

**핵심 변경점**: 헤드라인 색을 `--navy` → `--text-primary`(#191F28, 블랙에 가까운 차콜)로 교체. 폰트는 Sora → Pretendard, weight는 700~800으로 두껍게 써서 토스 특유의 "두껍고 각진" 느낌을 냅니다.

## 3. 컴포넌트 규칙

- **카드**: 배경 흰색 + `--card-border` 1px 보더. 그림자는 hover 시에만 `--shadow-md` 추가 (기본 상태에서 그림자 남발 금지)
- **진행률 바**: 충족(success) / 부족(warning) / 심각(danger) 3색 체계로 상태 구분. 파랑(`--point`)은 진행률 바 색으로 쓰지 않음 — 액션 전용으로 예약
- **뱃지**: 배경색 채우기보다 `--point-light` 옅은 배경 + 테두리 없음 + 텍스트는 `--point-dark`
- **버튼(CTA)**: `--point` 배경 + 흰색 텍스트, hover 시 `--point-dark`
- **일러스트/장식**: 토스처럼 은은한 3D 오브젝트나 아이콘을 포인트로 쓰되, 배경에 큰 원형 그라디언트 같은 장식은 지양 (여백 자체로 여유를 표현)

## 4. Do / Don't

**Do**
- 헤드라인은 무채색(차콜), 포인트 컬러는 버튼·링크·강조 숫자에만
- 카드 구분은 그림자보다 보더 우선
- 여백을 넉넉하게 — 정보를 다 채우기보다 스크롤을 감수

**Don't**
- 남색/보라색을 텍스트 기본색으로 쓰지 않는다
- 상태(충족/부족)를 색의 짙기로만 구분하지 않는다 (반드시 success/warning/danger 별도 색상)
- 그림자와 파스텔 배경색을 카드마다 중첩해서 쓰지 않는다
