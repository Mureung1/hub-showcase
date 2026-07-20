# C-Dict 최종 디자인 시스템

Google Stitch로 생성했던 두 초안(`DESIGN.md`, `stitch.md`)이 색상 팔레트·모서리 radius·에러 색상·그리드 시스템에서 서로 충돌해, 항목별로 검토 후 이 문서로 통합했다. 충돌 항목은 전부 우분투 터미널 컨셉에 부합하고 프로젝트 기존 팔레트(기획서 9장)와 일치하는 쪽(원본 `stitch.md`, 이하 "B안")으로 통일했다.

## 1. 색상 팔레트

| 변수명 | 값 | 용도 |
|---|---|---|
| `--bg` | `#300a24` | 메인 배경 (터미널 바탕) |
| `--bg-panel` | `#3b0f2e` | 상단바 / 카드 / 사이드바 |
| `--bg-inset` | `#22071a` | 검색창 / 코드블록 내부 (sunken 표현) |
| `--border` | `#5b2a49` | 기본 보더 |
| `--border-bright` | `#e95420` | 포커스 / hover 강조, 브랜드 오렌지 |
| `--text-bright` | `#8ae234` | 성공 상태 / 명령어 텍스트 (터미널 그린) |
| `--text-path` | `#729fcf` | 경로 텍스트 |
| `--error` | `#ef2929` | 에러 메시지 / 터미널 닷 |

DESIGN.md가 제안했던 Material 3 자동생성 토큰(`surface #1d100c`, `primary #ffb59e` 등)과 에러색(`#ffb4ab`/`#93000a`)은 DESIGN.md 자신의 본문 설명과도 맞지 않는 값이라 채택하지 않음.

## 2. 타이포그래피

두 초안 모두 제안했던 **이원화 폰트 시스템을 채택**한다. 기존 단일 모노스페이스 폰트 스택 대신, 용도에 따라 두 폰트를 구분해 사용한다.

| 구분 | 폰트 스택 | 적용 대상 |
|---|---|---|
| Mono (제목/코드) | `"JetBrains Mono", ui-monospace, "Fira Code", "Cascadia Code", "Noto Sans CJK KR", "Noto Sans KR", monospace` | 제목(app-title), 명령어 이름, 셸 프롬프트, 코드/예시 블록, 라벨 |
| Body (본문) | `"Noto Sans CJK KR", "Noto Sans KR", sans-serif` | 설명문, 요약, 힌트 등 인터페이스 본문 텍스트 |

- 폰트명 오탈자 수정 완료: "Noto Sans KR" 단독 표기 → `"Noto Sans CJK KR", "Noto Sans KR"` 순서로 통일.
- **중요**: `JetBrains Mono`에는 한글 글리프가 없다. Mono 스택 끝에 `"Noto Sans CJK KR", "Noto Sans KR"`를 한글 fallback으로 반드시 포함해야, 제목처럼 Mono가 적용된 요소 안의 한글 글자만 시스템 기본 폰트(Windows에서는 굴림체)로 새는 문제를 막을 수 있다 (2026-07-20 실제 발견된 버그, 수정 완료).
- **중요**: "Noto Sans CJK KR"은 Google Fonts CDN에 없는 폰트라 로컬 설치가 없으면 로드되지 않는다. 실제로 로드하려면 Google Fonts의 `Noto Sans KR` 패밀리를 `@import`/`<link>`로 함께 불러와야 한다 (마찬가지로 2026-07-20 발견, 수정 완료).
- 적용 완료: `docs/prototype/style.css`, `src/index.css`, `docs/design-system/style-guide.html` 전부 반영됨.

## 3. 모서리 radius

**10px로 통일.** 터미널 프레임, 카드, 검색창, 에러박스, 예시블록 등 라운드가 들어가는 요소에 동일하게 적용한다. 옵션 플래그/뱃지 같은 작은 칩(chip)류는 4px로 별도 유지 (카드와 다른 패턴으로 취급, 10px 강제 안 함).

> 적용 완료: `docs/prototype/style.css`, `src/index.css` 둘 다 반영됨.

## 4. 그리드 시스템

**사용하지 않음.** 화면 구성이 카테고리 선택 → 리스트형 검색결과 → 상세보기 → 에러, 전부 단일 컬럼 흐름이라 12/4-column 그리드가 필요한 복잡한 레이아웃이 없다. DESIGN.md가 제안한 12/4-column 그리드는 근거 없이 자동 삽입된 값으로 판단해 폐기.

## 5. 화면 구조 (기존 프로토타입 기준)

- 터미널 윈도우 프레임 — 좌상단 RGB 닷 3개 + 중앙 세션 정보 타이틀바
- 카테고리 선택 카드 그리드 (auto-fit)
- 검색 프롬프트형 인풋 — `user@c-dict:~$` 형태
- 리스트형 명령어 카드
- 상세 페이지 3단 구조 — 설명 / 옵션 / 실행 예시
- 에러 상태 — 터미널 `-bash` 에러 메시지 연출

## 5-1. 아이콘 버튼 (텍스트 없는 액션 버튼)

DESIGN.md 초안이 제안했던 "Bracket Style"(`[ 액션 ]`) 버튼은 흔한 웹 패턴이라 채택하지 않고, 대신 **텍스트 없는 아이콘 버튼**으로 결정했다. 배경/테두리 없이 아이콘(SVG, `currentColor`)만 표시하며, 기본 색상은 `--text-dim`, hover/focus 시 `--border-bright`(오렌지) + 배경 `--bg-panel`, 액션 완료 시 `--text-bright`(초록)로 전환된다. `aria-label`로 접근성 텍스트는 유지한다.

첫 적용 사례: 상세 페이지 터미널 예시의 **복사 버튼** — 클립보드 아이콘 → 클릭 시 체크 아이콘으로 1.5초간 전환 (`docs/checklist.md` "기능 B: 클립보드 복사" 구현, `src/pages/CommandDetailPage.jsx`의 `ClipboardIcon`/`CheckIcon`).

## 6. Elevation / 레이어

그림자 대신 색상 단계로만 깊이를 표현하는 tonal layering 3단 구조.

1. Base — `#300a24` (배경)
2. Panel — `#3b0f2e` (터미널 윈도우, 카드)
3. Inset — `#22071a` (검색창, 코드블록 — sunken 느낌)

## 폐기한 항목과 이유

| 항목 | 폐기된 값 (DESIGN.md) | 이유 |
|---|---|---|
| 색상 팔레트 | M3 자동생성 토큰 (`#1d100c`, `#ffb59e` 등) | DESIGN.md 본문 설명과 자체 모순, 프로젝트 기존 팔레트와 불일치 |
| 에러 색상 | `#ffb4ab` / `#93000a` | 팔레트 불일치 |
| 그리드 시스템 | 12/4-column | 화면 구조상 근거 없음, stitch.md에도 언급 없음 |

---
*이 문서는 `~/Downloads/stitch_c_dict_terminal_guide/DESIGN.md`, `stitch.md` 두 초안을 대체한다. 2026-07-20 확정.*
