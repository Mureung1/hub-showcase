---
name: design-check
description: Review a UI screen (HTML/CSS, or a React component once dev starts) in the C-Dict project against the confirmed design system in docs/design-system/DESIGN.md — color palette, corner radius, typography split, layout, elevation — and report concrete mismatches with expected vs actual values and a fix. Use whenever a new screen is created or an existing one is changed, before considering it done.
---

이 Skill은 `docs/design-system/DESIGN.md`에서 확정한 규칙을 기준으로, 새로 만들거나 수정한 화면이 그 규칙과 실제로 맞는지 검증한다. "내 의도(=DESIGN.md에 적어둔 결정)와 결과물이 일치하는가"만 판단하며, 미학적 취향 판단은 하지 않는다.

## 검증 절차

1. `docs/design-system/DESIGN.md`를 먼저 읽어 현재 확정된 규칙을 확인한다 (이 문서가 항상 최신 기준이며, 아래 체크리스트는 그 요약일 뿐이다 — 둘이 어긋나면 DESIGN.md가 맞다).
2. 검토 대상 화면의 실제 CSS/스타일(색상값, border-radius, font-family 등)을 읽는다.
3. 아래 체크리스트 항목별로 하나씩 대조한다.
4. 어긋난 항목마다: **위치(파일:줄) → 기대값 → 실제값 → 수정 제안**을 표 형식으로 보고한다.
5. 전부 일치하면 "전 항목 일치"라고 명시하고 넘어간다. 문제를 억지로 만들어내지 않는다.

## 체크리스트

### 색상 (docs/prototype/style.css의 CSS 변수 기준)
- `--bg` #300a24 / `--bg-panel` #3b0f2e / `--bg-inset` #22071a
- `--border` #5b2a49 / `--border-bright` #e95420
- `--text-bright` #8ae234 (성공/명령어) / `--text-path` #729fcf (경로) / `--error` #ef2929
- 새 색상값을 하드코딩하지 않았는지 확인 — 반드시 위 CSS 변수를 참조해야 함

### 모서리 radius
- 카드, 터미널 프레임, 검색창, 에러박스, 예시블록: **10px 통일**
- 작은 칩/뱃지류(옵션 플래그, 배지 등): 4px (카드와 다른 별도 패턴이므로 10px 강제 안 함)

### 타이포그래피 (이원화)
- 제목/명령어이름/프롬프트/섹션제목/라벨/뱃지 → `--font-mono` (JetBrains Mono 계열)
- 설명/본문/힌트 텍스트 → `--font-body` (Noto Sans CJK KR, Noto Sans KR)
- 폰트명에 "CJK"가 빠진 "Noto Sans KR" 단독 표기가 남아있으면 오탈자로 간주
- **`--font-mono`에 한글 fallback(`"Noto Sans CJK KR", "Noto Sans KR"`)이 반드시 포함돼야 함** — JetBrains Mono는 한글 글리프가 없어서, 없으면 제목 등 Mono가 적용된 요소의 한글만 시스템 기본 폰트(굴림체)로 샌다 (2026-07-20 실제 발생한 버그)
- **CSS의 `font-family`에 이름만 적어놓고 실제로 로드(`@import`/`<link>`)하지 않은 폰트가 있는지 확인** — 특히 `Noto Sans CJK KR`은 Google Fonts CDN에 없어 로컬 미설치 시 조용히 무시되고 fallback으로 샌다. 실사용 로드는 Google Fonts의 `Noto Sans KR` 패밀리로 한다.

### 레이아웃
- 다중 컬럼 그리드 시스템(12/4-column 등) 사용 금지 — 화면은 전부 단일 컬럼 흐름(카테고리 선택 → 리스트 → 상세 → 에러)
- 검색 결과는 grid 카드형이 아니라 **리스트형**이어야 함 (이미 확정된 결정, 되돌리지 않기)

### Elevation
- 그림자 남용 없이 tonal layering 3단(base → panel → inset)으로만 깊이 표현되는지 확인

## 스킬 업데이트 방법 (스킬화 취지)

사용자가 이 Skill의 검증 결과에 동의하지 않거나("이 판단은 아닌 것 같은데"), 새로운 규칙이 `docs/design-system/DESIGN.md`에 추가/변경되면, 이 파일의 체크리스트를 그에 맞게 직접 수정한다. 이 파일이 곧 "내 디자인 판단 기준"이므로, 기준 자체가 바뀌면 코드가 아니라 이 문서를 먼저 고친다.
