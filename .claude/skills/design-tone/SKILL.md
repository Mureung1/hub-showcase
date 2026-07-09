---
name: design-tone
description: 챌린지로그의 확정된 디자인 톤(색·폰트·간격·카드 스타일)을 새 화면/컴포넌트에 일관되게 적용한다. 화면을 새로 만들거나, 기존 화면을 다듬거나, "우리 디자인 톤으로 만들어줘" 같은 요청을 받을 때 사용한다.
---

# design-tone — 챌린지로그 디자인 톤 Skill

챌린지로그의 UI 톤은 **심플·미니멀, 흰 배경 + 그레이 뉴트럴 + 단일 포인트 컬러**(토스 느낌)로 확정되어 있다.
새 화면이나 컴포넌트를 만들 때는 아래 규칙을 그대로 적용하고, 임의로 새 색상·폰트·radius 값을 만들지 않는다.

톤의 원본은 `src/index.css`(`@theme`, 실제 앱)와 `public/prototype/style.css`(정적 프로토타입) — 이 둘은 항상 같은 값으로 동기화되어 있어야 한다. 화면 명세·카피 전체와 확정된 Stitch 시안 이미지는 [design-guide.md](../../../design-guide.md), [design-assets/stitch/](../../../design-assets/stitch/) 참고.

## 1. 색상

라이트 모드 (기본):

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-accent` | `#ff355e` | 브랜드 강조색 — 버튼, 태그, 활성 탭, 포커스 |
| `--color-accent-bg` | `rgba(255, 53, 94, 0.1)` | 강조색 배경 (태그 칩) |
| `--color-card` | `#ffffff` | 카드 배경 |
| `--color-border` | `#ececec` | 카드 테두리·구분선 |
| `--color-muted` | `#8a8a8a` | 보조/설명 텍스트 |
| `--color-heading` | `#1a1a1a` | 제목·강조 텍스트 |
| `--color-surface` | `#ffffff` | 화면 배경 |
| `--color-done` | `#3fa66a` | 완료(O) 상태 |
| `--color-done-bg` | `rgba(63, 166, 106, 0.12)` | 완료 배지 배경 |

다크 모드 (`prefers-color-scheme: dark`):

| 토큰 | 값 |
|---|---|
| `--color-accent` | `#ff6e89` |
| `--color-accent-bg` | `rgba(255, 110, 137, 0.16)` |
| `--color-card` | `#201f1f` |
| `--color-border` | `#333131` |
| `--color-muted` | `#b9b3b3` |
| `--color-heading` | `#f5efee` |
| `--color-surface` | `#141313` |
| `--color-done` | `#7fd39a` |
| `--color-done-bg` | `rgba(127, 211, 154, 0.16)` |

미완료(X) 상태는 별도 색을 새로 만들지 말고 `border`/`muted` 톤의 중립 회색을 쓴다.

## 2. 타이포그래피

- 폰트: `'Pretendard', system-ui, 'Segoe UI', Roboto, sans-serif`
- 화면 타이틀(h1): 22px, `heading`
- 섹션 제목(h2): 17px, `heading`
- 본문: 14px, `muted`, line-height 1.5
- 캡션/보조 텍스트: 12px, `muted`
- 버튼 텍스트: 15px, 600 weight
- 하단 네비게이션 라벨: 11px

## 3. 형태 · 간격

- 화면 폭: 모바일 우선, 최대 420px 중앙 정렬
- 카드: `card` 배경, 1px `border`, radius 16px, 패딩 18px, 옅은 그림자 (`0 1px 3px rgba(0,0,0,0.04)`)
- 버튼(Primary): 가득 채움, pill radius(999px), `accent` 배경 + 흰 텍스트
- 버튼(Secondary): 가득 채움, pill radius, 투명 배경 + 1px `border` + `heading` 텍스트
- 태그 칩: pill radius(999px), `accent-bg` 배경 + `accent` 텍스트, 12px
- 입력창/텍스트영역: radius 12px, 1px `border`
- 업로드 박스: 점선 `border`, radius 14px, 중앙 정렬
- 원형 배지(O/X): 완료는 `done`/`done-bg`, 미완료는 중립 회색 — 배지 안에 숫자·횟수는 넣지 않는다 (절대 원칙 참고)
- 아바타: 원형 또는 radius 14px 사각형, `accent-bg` 배경 + 이니셜/이모지/사진
- 하단 네비게이션: 5탭 고정 (홈·기록·캘린더·친구 방·설정), 아이콘 + 라벨, 활성 탭만 `accent` + bold
- radius 스케일: 10 / 12 / 14 / 16 / 999(pill) — 이 외 임의 값 쓰지 않음
- 아이콘: 이모지 대신 라인 아이콘을 쓸 경우 `accent` 또는 `muted` 단색, 배경색 없는 형태 유지 (Stitch v2 시안 기준)

## 4. 적용 절차

새 화면·컴포넌트를 만들 때:

1. 위 색상·타이포·형태 토큰만 사용한다. hex를 새로 만들지 말고 토큰 이름(`accent`, `muted` 등)으로 지칭한다.
2. Tailwind에서는 `src/index.css`의 `@theme` 토큰이 `bg-accent`, `text-muted` 같은 유틸리티로 이미 노출되어 있으니 그대로 쓴다. 없는 값이 필요하면 `@theme`에 먼저 추가하고 이 Skill 문서도 함께 갱신한다.
3. 카드/버튼/배지/아바타 등은 위 "형태" 규칙의 기존 패턴을 재사용한다. 화면마다 스타일을 새로 발명하지 않는다.
4. 완료했으면 결과를 `design-assets/stitch/`의 확정 시안, `design-guide.md`의 화면 목록과 대조해 톤이 흔들리지 않았는지 확인한다.
5. 색상·radius·spacing 값 자체를 바꿔야 한다면, 이 Skill 파일과 `src/index.css`, `public/prototype/style.css`, `design-guide.md`를 **한 번에** 같이 수정한다 — 넷 중 하나만 바뀌면 프로토타입/실제 앱/디자인 문서/Skill이 서로 어긋난다.

## 5. 절대 원칙과의 관계

톤을 적용하더라도 `CLAUDE.md`의 절대 원칙(비교/순위/스트릭 UI 금지, 공부 인증류 패턴 금지)은 항상 우선한다. 예쁜 배지·카드를 만드는 것과 순위·점수를 매기는 것은 다르다 — 시각적 완성도를 이유로 금지된 UI 패턴(카운트 배지, 랭킹 리스트, 진행률 게이지형 스트릭 등)을 넣지 않는다.
