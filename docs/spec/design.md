# 오늘의 브리핑 — 디자인 컨셉 (1c 기준)

> `MVP Feed Mockups.dc.html`의 옵션 1c(2열 그리드형)를 기준으로 정리한 디자인 가이드.
> 이후 상세 화면, 저장 목록 등 다른 화면도 이 컨셉을 따른다.
>
> **이 문서가 hub 프로젝트의 디자인 정본(canonical)이다.** UI 작업 시 반드시 준수한다 — [`.claude/skills/default-design-rule`](../../.claude/skills/default-design-rule/SKILL.md) 참고.

---

## 1. 색상 (Color)

| 용도 | 색상 | 비고 |
|---|---|---|
| 배경 (페이지/카드 컨테이너) | `#f3efe8` | 따뜻한 크림톤 |
| 카드 배경 | `#ffffff` | 흰색, 은은한 그림자 |
| 카드 그림자 | `0 1px 2px rgba(43,38,32,.05)` | 아주 옅게 |
| 본문 제목 텍스트 | `#2b2620` | 진한 웜 브라운-블랙 |
| 보조/메타 텍스트 | `#8c8478` | 중간 톤 그레이-브라운 |
| 연한 보조 텍스트 (날짜 등) | `#a39a89` | |
| 강조(포인트) 색상 | `#c26b3f` | 테라코타/오렌지 — "중요" 배지, 활성 탭, 강조 숫자 |
| 태그 배경 | `#f6ece4` | 연한 살구색 |
| 태그 텍스트 | `#a37b58` | |
| 비활성 표시(북마크 아이콘 등) | `#c9c1b3` | |
| 중요도 낮음 dot | `#d8d1c4` | |
| 탭 테두리(비활성) | `rgba(43,38,32,.08)` | |

**원칙**: 채도 낮은 웜 뉴트럴 위에 오렌지 계열 단일 강조색만 사용. 색은 "중요도"와 "액션(강조 숫자)" 표시에만 씀 — 장식용으로 남발하지 않음.

---

## 2. 폰트 (Typography)

- **서체**: Pretendard (한글 고딕), fallback `system-ui, sans-serif`
- **날짜/라벨 (최상단)**: 13px / 400 / `#a39a89` / letter-spacing .06em
- **타이틀 ("오늘의 브리핑")**: 26px / 700 / `#2b2620`
- **서브카피 (수집 건수 안내)**: 13px / 400 / `#a39a89` (숫자만 `#c26b3f` bold)
- **탭 라벨**: 13px / 활성 600·비활성 400
- **카드 제목**: 14.5px / 600 / `#2b2620` / line-height 1.35
- **카드 요약문**: 12.5px / 400 / `#8c8478` / line-height 1.4
- **태그**: 11px / 400
- **중요 배지 텍스트**: 11px / 600 / `#c26b3f`

---

## 3. 레이아웃 (Layout)

- **컨테이너 폭**: 760px (데스크톱 웹 기준 고정폭)
- **컨테이너 배경**: `#f3efe8` (카드 컨테이너 자체는 border/shadow 없음)
- **컨테이너 패딩**: 32px 36px
- **헤더**: 가운데 정렬 (텍스트 센터), margin-bottom 26px
  - 날짜 → 타이틀 → 서브카피 순, 각 줄 간격 6~8px
- **카테고리 탭**: 가운데 정렬, `display:flex; gap:8px; flex-wrap:wrap`, margin-bottom 24px
- **카드 목록**: `display:grid; grid-template-columns: 1fr 1fr; gap:14px` (2열 그리드)

---

## 4. 카드 스타일 (Paper Card)

- 배경: `#fff`, border-radius `10px`, padding `16px`
- 그림자: `0 1px 2px rgba(43,38,32,.05)` (테두리선 없음)
- 카드 내부 구조 (세로 순서):
  1. 상태 줄: 중요도 dot(7px, 원형) + "중요" 라벨(오렌지, 중요할 때만 표시) + 북마크 아이콘(오른쪽 정렬, `margin-left:auto`) — margin-bottom 8px
  2. 논문 제목 (영문) — margin-bottom 4px
  3. 한줄 요약 (한글) — margin-bottom 8px
  4. 태그 그룹: `display:flex; gap:6px`, 각 태그는 배경 `#f6ece4` / 텍스트 `#a37b58` / padding `3px 9px` / border-radius `6px`

**중요도 표시 규칙**: 중요 논문 → dot `#c26b3f` + "중요" 텍스트 라벨. 일반 논문 → dot `#d8d1c4`만, 텍스트 라벨 없음 (여백은 유지해 정렬이 흐트러지지 않게).

---

## 5. 카테고리 탭 (Pill Tabs)

- 모양: 완전한 알약형 (`border-radius:20px`)
- 활성 탭: 배경 `#c26b3f`, 텍스트 `#fff`, font-weight 600, padding `7px 16px`
- 비활성 탭: 배경 `#fff`, 텍스트 `#8c8478`, border `1px solid rgba(43,38,32,.08)`, padding `7px 16px`

---

## 6. 간격 스케일 (Spacing)

공통으로 쓰는 간격 값: `4px · 6px · 8px · 14px · 16px · 18px · 24px · 26px · 32px · 36px`
— 카드 내부는 좁게(4~8px), 섹션 사이는 넓게(18~36px) 사용.

---

## 참고
- 원본 목업: `MVP Feed Mockups.dc.html`의 `#1c` 옵션 — Claude Design 프로젝트(`3cb9fbe9…`)에 있음(repo 미포함). 변경 시 DesignSync로 재import.
- 기획 원문: [mvp-plan.md](./mvp-plan.md)
- 구현: 이 팔레트는 [`web/style.css`](../../web/style.css)의 `:root` CSS 변수로 이식되어 있다. UI 작업 시 값을 하드코딩하지 말고 그 변수를 재사용한다.
