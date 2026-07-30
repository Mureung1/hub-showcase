---
name: specfit-design
description: SpecFit 프로젝트의 실제 시각 정체성(크림/더스티로즈 라이트 + "핑크-네이비 반전" 다크모드, Pretendard/JetBrains Mono, pill 버튼, 톤이 있는 그림자, 스테퍼/상태태그 컴포넌트)을 그대로 옮겨서 HTML/아티팩트를 만들 때 쓰는 프로젝트 전용 디자인 스킬. artifact-design 스킬의 원칙(양쪽 테마 설계, 실제 콘텐츠 기반) 위에 이 값들을 적용한다. "우리 사이트 디자인으로", "SpecFit 톤으로", "실제 서비스 느낌으로" 같은 요청에 사용.
---

# specfit-design

이 스킬은 새로 지어낸 팔레트가 아니라 `src/styles/tokens.css`와 `src/App.css`에 실제로 있는 값을 그대로 옮긴 것이다. 값이 최신인지 의심되면 반드시 그 두 파일을 다시 읽어서 확인하고, 여기 적힌 숫자를 신뢰해 그대로 베끼지 않는다 — 이 문서는 스냅샷이다.

이 스킬은 **SpecFit 관련 산출물**(발표 자료, 워크플로우 문서, 데모 페이지 등 아티팩트)에만 쓴다. 실제 앱 코드(`tokens.css`/`App.css` 자체)를 고칠 때는 이 스킬이 아니라 파일을 직접 수정한다.

## 색상 — 라이트 ("크림/더스티로즈" + 쿨톤 네이비)

| 변수 | 값 | 용도 |
|---|---|---|
| `--gray-50` | `#fbf5f8` | 페이지 배경 |
| `--gray-200` | `#f0e4ec` | 카드 테두리, 헤어라인 |
| `--gray-500` | `#948fa0` | 흐린 보조 텍스트 |
| `--gray-700` | `#5c5e7c` | 보조 텍스트 |
| `--gray-900` | `#22285e` | 본문/제목 텍스트 |
| `--card-bg` | `#ffffff` | 카드 표면 |
| `--accent` / `--accent-text` | `#2b3480` | 메인 액센트 — 쿨톤 네이비 |
| `--accent-dark` | `#1c2464` | 액센트 hover/active |
| `--accent-light` | `#f2dde8` | 히어로 그라디언트 시작색 |
| `--accent-bg` | `#fbeef4` | 액센트 배지/스탯카드 배경 |
| `--logo-spec-color` / `--logo-fit-color` | `#2b3480` / `#db2777` | "Spec"(네이비)+"Fit"(핑크) 워드마크 |

## 색상 — 다크 ("핑크-네이비 반전")

다크모드는 배경만 어두워지는 게 아니라 **액센트 색 자체가 네이비 → 핑크로 바뀐다** — 이게 이 프로덕트 다크모드의 핵심 아이덴티티. 절대 라이트 값을 단순 반전해서 만들지 않는다.

| 변수 | 값 | 용도 |
|---|---|---|
| `--gray-50` | `#17142c` | 페이지 배경 |
| `--gray-200` | `#3d3564` | 카드 테두리, 헤어라인 |
| `--gray-500` | `#b6a6c0` | 흐린 보조 텍스트 |
| `--gray-700` | `#cbb0c2` | 보조 텍스트 |
| `--gray-900` | `#f8ecf1` | 본문/제목 텍스트 |
| `--card-bg` | `#211c3d` | 카드 표면 |
| `--accent` / `--accent-dark` | `#db2777` / `#be185d` | 메인 액센트 — 비비드 핑크 |
| `--accent-light` | `#4a3660` | 히어로 그라디언트 시작색 |
| `--accent-bg` / `--accent-text` | `#3a2030` / `#f0a8c4` | 액센트 배지 배경/글자 |
| `--logo-spec-color` / `--logo-fit-color` | `#fbf5f8` / `#db2777` | 다크모드에서도 "Fit"은 핑크 그대로 |

## 상태 태그 (충족/미충족, TDD Red/Green 등에도 재사용)

| | bg (light) | text (light) | bg (dark) | text (dark) |
|---|---|---|---|---|
| green (충족/성공/Green) | `#e1f5ee` | `#1f8f6e` | `#153826` | `#4ade80` |
| red (실패/Red) | `#fde7e4` | `#c0392b` | `#3a1a1f` | `#f87171` |
| orange | `#fdece0` | `#c15a1c` | `#3a2712` | `#fb923c` |
| purple | `#ece9fb` | `#4b3fa0` | `#2a2350` | `#c9a6e0` |
| blue | `#e6edfb` | `#3355a8` | `#182a48` | `#7aa2f7` |

카테고리가 5색보다 많으면(실제 앱도 9개 직종 그룹을 5색에 재배분) 순환해서 재사용 — 새 색을 만들지 않는다.

## 타이포그래피

- 본문/제목: `--sans: 'Pretendard Variable', -apple-system, 'Malgun Gothic', sans-serif`
- 라벨/숫자/코드 일부: `--mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace` — 절제해서 사용(통계 숫자, 배지 라벨 정도. 본문 전체를 모노스페이스로 쓰지 않는다)

## 모양 언어

- **버튼**: 완전한 pill(`border-radius: 999px`). primary는 꽉 찬 `--accent` 배경 + 흰 글자, hover 시 `--accent-dark`. secondary는 흰 배경 + `--gray-200` 테두리, hover 시 배경만 `--gray-50`/`--btn-secondary-hover-bg`로 살짝.
- **카드**: 라운드 24px(`--radius-card`, 일반 카드) ~ 28px(`--radius-panel`, 폼/큰 패널). 흰 배경(다크는 `--card-bg`) + 옅은 `--gray-200` 테두리. 절대 그레이스케일 그림자를 쓰지 않고, 액센트 색을 아주 옅게 섞은 톤을 쓴다:
  - `--shadow-sm`(라이트): `0 4px 14px rgba(43,52,128,.07), 0 1px 2px rgba(43,52,128,.05)`
  - `--shadow-md`(라이트, hover): `0 16px 40px rgba(43,52,128,.14)`
  - 다크는 같은 구조에 순수 검정 톤(`rgba(0,0,0,.35~.45)`)으로 대체.
  - 카드 hover 시 `translateY(-1~2px)` + 그림자를 `--shadow-sm → --shadow-md`로 강하게.
- **칩/배지**: 라운드 14px(`--radius-chip`).

## 재사용 가능한 컴포넌트 패턴

- **스테퍼** (`step-circle` + `step-line`, 실제로 헤더에 쓰이는 컴포넌트): 순서가 있는 단계를 보여줄 때 그대로 가져다 쓴다.
  - 대기: 원 `--gray-200` 배경 + `--gray-700` 글자
  - 진행중: 원 `--accent-dark` 배경(라이트) / 다크모드 상응값 + 흰 글자
  - 완료: 원 `--accent-bg` 배경 + `--accent-text` 글자 (꽉 찬 색이 아니라 옅은 배지 톤 — "이미 지나온 단계"라는 느낌)
  - 원 사이 연결선은 기본 `--gray-200`, 완료 구간만 `--donut-ok`(라이트 `#2b3480`/다크 `#db2777`) 색으로 채운다.
- **스탯카드**: `--accent-bg` 배경의 라운드 카드, 작은 라벨(회색) 위 + 큰 숫자(`--gray-900`, 700 weight) 아래.
- **히어로 비주얼**: 대각선 그라디언트(`linear-gradient(160deg, var(--accent-light) 0%, var(--card-bg) 55%)`) 배경의 큰 라운드 패널 — 임팩트가 필요한 한 곳에만 아껴서 쓴다.
- **워드마크**: "Spec"은 `--logo-spec-color`, "Fit"은 항상 `--logo-fit-color`(라이트/다크 공통 핑크) — SpecFit 관련 문서 상단에 작게 브랜드 표시할 때 이 조합을 그대로 쓴다.

## 적용 체크리스트

1. 라이트/다크 값 세트를 각각 통째로 옮긴다 — 다크를 라이트의 단순 반전으로 만들지 않는다.
2. 그림자는 항상 액센트 색이 섞인 톤으로 — 무채색 그림자를 쓰면 이 디자인처럼 안 보인다.
3. 버튼은 pill, 카드는 24~28px 라운드 — 각지거나 살짝만 둥근(예: 8px) 모양은 이 브랜드와 안 맞는다.
4. 순서가 있는 콘텐츠(단계, 진행 상황)는 스테퍼 패턴을 우선 고려한다.
5. 본문은 Pretendard(가변 폭), 숫자/라벨만 JetBrains Mono로 포인트를 준다.
