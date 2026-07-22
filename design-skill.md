# 디자인 스킬 — 상권 스캐너

이 프로젝트의 화면을 만들 때 항상 참고하는 디자인 규칙입니다.
새 화면(로그인, 설정 등)을 만들 때 "우리 디자인 규칙대로 만들어줘"라고 요청하면
이 문서를 기준으로 작업합니다.

## 레퍼런스

다크 SaaS 대시보드 스타일 (카드 배치, 큰 숫자 강조, 다크 배경)을 참고하되,
포인트 컬러는 네이버 그린으로 대체.

## 컬러

```css
--color-bg-page: #0D0F0E;        /* 전체 페이지 배경 */
--color-bg-card: #1A1D1B;        /* 기본 카드 배경 */
--color-bg-card-alt: #16181A;    /* 헤더/리뷰 아이템 등 보조 카드 배경 */
--color-bg-report: #12241A;      /* AI 리포트 박스 배경 (그린 톤 다크) */
--color-border-report: #1E3A2A;  /* AI 리포트 박스 테두리 */
--color-border: #2A2E2B;         /* 카드 내부 구분선, 프로그레스바 트랙 */

--color-primary: #03C75A;        /* 네이버 그린 - 포인트, 버튼, 강조 텍스트 */
--color-primary-dark: #00A344;   /* 진한 그린 - 보조 강조 */

--color-text-primary: #FFFFFF;
--color-text-secondary: #9CA3AF; /* 라벨, 보조 설명 */
--color-text-muted: #6B7280;     /* 캡션, 카운트 */
--color-danger: #E24B4A;         /* 부정/에러 텍스트 */
--color-danger-bg: #2A1414;      /* 부정 배지 배경 */
```

## 타이포그래피

- 폰트: Pretendard
- 큰 숫자(통계 카드): 24px, bold
- 섹션 제목: 18px, bold
- 라벨/캡션: 12px, --color-text-secondary
- 본문: 14px, line-height 1.6~1.7

## 형태 / 간격

- 카드 모서리: 16px (rounded-2xl), 헤더는 24px (rounded-3xl)
- 버튼: 완전 pill 형태 (rounded-full)
- 카드 내부 패딩: 16~20px
- 카드 간 gap: 12px
- 그림자: 사용하지 않음 (다크 배경 위에서는 배경색 차이로 레이어 구분)

## 레이아웃 패턴

1. **헤더**: 보조 카드 배경(--color-bg-card-alt) 안에 타이틀 + 설명 + 검색 입력
2. **통계 카드 그룹**: 3~4개를 가로로 나란히, 각 카드는 라벨(위, 작게) + 숫자(아래, 크게)
3. **비교/상세 섹션**: 도넛 차트나 그래프 + 텍스트 설명을 한 카드 안에 나란히 배치
4. **강조 섹션(AI 리포트)**: 그린 톤의 다크 배경 + 테두리로 다른 카드와 구분
5. **리스트**: 카드 안에 아이템을 --color-bg-card-alt 배경의 하위 카드로 나열

## 색상 사용 원칙

- 포인트 컬러(네이버 그린)는 하나로 통일해서 사용 — 버튼, 활성 강조 텍스트, 프로그레스바, 긍정 배지에만
- 부정/에러는 danger 계열 하나만 사용
- 그 외 모든 텍스트는 흰색 또는 회색 계열(secondary/muted)로 제한 — 색을 늘리지 않음

## 컴포넌트 스니펫

**통계 카드**
```jsx
<div className="rounded-2xl p-4" style={{ backgroundColor: BG_CARD }}>
  <p className="text-xs" style={{ color: TEXT_SECONDARY }}>{label}</p>
  <p className="mt-2 text-2xl font-bold" style={{ color: color || "#fff" }}>{value}</p>
</div>
```

**pill 버튼**
```jsx
<button style={{ backgroundColor: GREEN, color: "#04342C" }} className="rounded-full px-6 py-3 text-sm font-bold">
  버튼 텍스트
</button>
```

## 적용 이력

- 2026-07: Dashboard.jsx에 최초 적용 (통계 카드 4개, 도넛+키워드 나란히 배치, AI 리포트 강조 박스)
