---
name: bridge-design
description: Bridge 프로젝트(편지 기반 익명 연결 플랫폼)의 디자인 시스템. Bridge 프로젝트에서 색상·폰트·컴포넌트 스타일을 정하거나 새 화면/컴포넌트를 만들 때 반드시 참고. 프로토타입에서 추출한 "확정 규칙"(그대로 지킬 값)과 "지향점"(아직 미확정, 사용 전 사용자 확인 필요)을 구분해 담는다. UI/CSS/토큰/타이포/화면 흐름 관련 작업이면 코드 작성 전에 이 스킬을 먼저 읽을 것.
---

# Bridge 디자인 시스템

출처: `frontend/prototype/Bridge_proto_v2.html` (Claude 아티팩트 번들에서 추출).
전체 정제 소스·마크업·CSS는 [`references/extracted-source.md`](references/extracted-source.md) 참고.

이 문서는 두 섹션으로 나뉜다:
- **확정 규칙 (Established)** — 프로토타입에서 그대로 추출한 값. **임의로 바꾸지 말 것.**
- **지향점 (Target)** — 아직 확정되지 않음. **지어내지 말고, 사용 전 반드시 사용자에게 확인.**

---

## ✅ 확정 규칙 (Established — 그대로 지킬 것)

> 아래 값은 모두 `Bridge_proto_v2.html`에서 추출한 실제 값이다. 새 색·폰트·간격을 발명하지 말고 이 팔레트/스택 안에서 조합할 것.

### 색상 (역할별)

| 토큰 | hex | 역할 |
|------|-----|------|
| primary-teal (딥틸) | `#11434c` | **주색.** 워드마크, 주요 버튼, 활성 탭/사이드바, 링크 hover, 카운트다운, 강조 테두리 |
| accent-terracotta (테라코타) | `#964735` | **강조.** 밀랍 인장(seal) 기본, 링크 기본색, 미읽음 배지, "도착 중" |
| teal-mid (미드 틸) | `#2d5a64` | 활성 사이드바 항목 bg, "이어진 편지" 배지 |
| teal-light (라이트 틸) | `#a2d0db` | 활성 사이드바 항목 fg |
| ink (잉크) | `#1b1c1a` | 최상위 텍스트/기본 글자색 |
| body-slate | `#40484a` | 편지 본문·보조 텍스트 |
| muted-gray | `#71787b` | 캡션·라벨·플레이스홀더(@45%) |
| heading-brown | `#463b2d` | 화면 제목 h1 |
| cool-gray | `#c0c8ca` | 비활성 봉투 테두리, 괘선, 구분선 |
| border-warm | `#e4e2de` | 카드 테두리·디바이더 |
| paper-bg (웜 페이퍼) | `#fbf9f5` | 앱 배경 |
| paper-white | `#ffffff` | 편지지·카드 표면 |
| cream | `#f5f3ef` | 라인 봉투 bg, 사유 칩 기본 |
| tan-dot | `#d5c4b1` | 배경 점 그리드, 장식 아치 |
| warn-rust | `#772f1f` | 경고 텍스트("수정할 수 없습니다") |
| toast-bg / toast-fg | `#30312e` / `#f2f0ed` | 토스트 |
| selection | `#bceaf6` | 텍스트 선택 배경 |

보조 그레이: `#9a9a9a`(스쳐간 편지/힌트), `#a9adad`(캡션), `#a1ced9`(토스트 아이콘).
사이드바 bg는 `rgba(239,238,234,.82)` + `backdrop-filter:blur(6px)`.

**사용자 커스터마이즈 값 (props):**
- `sealColor` (밀랍 인장 색) — 기본 `#964735`, 옵션 `#964735` / `#11434c` / `#463b2d`
- `letterFont` (편지 글씨체) — 기본 `Literata`, 옵션 `Literata` / `Bricolage Grotesque`
- `lined` (편지지 줄) — 기본 `true`

**배경 (앱 루트):** `#fbf9f5` 위에 20px 간격 점 그리드 (`#d5c4b1` 점, radial-gradient). 플랫한 페이퍼 톤이며 텍스처 이미지가 아니다.

### 타이포그래피

폰트 스택 (모두 Google Fonts, 실제 번들에 woff2 포함):

| 폰트 | 용도 |
|------|------|
| **Work Sans** | 기본 body·UI. `body{font-family:'Work Sans',system-ui,sans-serif}`. 버튼·캡션·문단·입력 |
| **Source Serif 4** | 화면 제목(h1), 인용구(italic 600), poolCount 큰 숫자(700), 제목 입력·리스트 제목(600) |
| **Literata** | 편지 본문 읽기 폰트(letterFont 기본), 리스트 미리보기 |
| **Bricolage Grotesque** | 앱 화면 "Bridge" 워드마크(700·uppercase·`letter-spacing:.20em`), Serial No., 대기 카운트다운 숫자 |
| **Material Symbols Outlined** | 아이콘 (`.msym` outline / `.msymf` filled, wght 300) |

- 편지 본문: `18px / line-height:32px / letter-spacing:-.01em / #40484a`.
- 편지지 괘선(lined): `linear-gradient(rgba(192,200,202,.55) 1px, transparent 1px)`, `background-size:100% 32px`.
- ⚠️ **워드마크 폰트 불일치(프로토타입 내 실재):** 시작 화면 "BRIDGE"는 `Source Serif 4 700`, 앱 화면 "Bridge"는 `Bricolage Grotesque 700 uppercase`. 둘 다 실제 값이므로 병기함 — 통일할지는 사용자에게 확인.

### 화면 흐름 (screen 상태 6종)

`screen ∈ { start, main, send, sent, recommend, storage }`

```
start ──login()──▶ main ──toSend()──▶ send ──askConfirm▶[확인 모달]──reallySend▶[도착 모달]──closeArrived▶ sent(대기)
sent(waiting) ──fastForward(데모)──▶ sent(arrived) ──openRecommend──▶ recommend
recommend ──unfold──▶ (열림) ──startReply──▶ main(답장 모드) / ──passBy──▶ [피드백 모달]
사이드바: goMain▶main · openStorage▶storage(탭: mine/received/linked)
```

| 화면 | 핵심 인터랙션 |
|------|----------------|
| **start** | BRIDGE 워드마크 랜딩. 로그인/회원가입 → `main` |
| **main** | 편지지에 제목·본문 작성. 자동 저장, 글자수. 원형 밀랍 send 버튼(sealColor). 답장 모드(`replying`)도 이 화면 |
| **send** | 봉투 3종(기본/라인/밀랍) 선택. "보내면 수정 불가" 경고 → 확인 모달 |
| **sent** | `phase:waiting` 24h 카운트다운(+데모 빨리감기) → `phase:arrived` 추천 편지 도착 봉투(펄스) |
| **recommend** | 봉투 unfold → 낯선 이의 편지 + AI 주제 판단 배너. [답장 쓰기]/[스쳐 가기] |
| **storage** | 탭 3개 — 내가 쓴 편지 / 받은 편지 / 이어진 편지 |

**확정된 서비스 규칙:** 편지 발송 후 수정 불가 · 발송 24h 뒤 AI 추천 편지 도착 · 답장 8h 뒤 전달 · "스쳐 가기"는 저장소에 흔적만 + 피드백 수집 · 완전 익명("모음소의 누군가") · 자동 저장 · "모음소"=편지 풀 · Serial No. `BR-2024-XXXX` · 슬로건 "The Art of Slow Correspondence".

컴포넌트별 인라인 스타일·SVG·모달 상세는 `references/extracted-source.md`의 §5 참고.

---

## 🎯 지향점 (Target — 아직 미확정)

> 아래 항목은 프로토타입에 **존재하지 않거나 방향만 있는** 것들이다.
> **확정되지 않음 — 사용 전 반드시 사용자에게 확인할 것.** 임의의 색상·텍스처·폰트·SVG를 지어내지 말 것.

- **종이 질감 / 원목 책상 배경** — TBD.
  현재 프로토타입 배경은 `#fbf9f5` + 점 그리드의 **플랫 톤**이며, 실제 종이 질감이나 원목 책상 텍스처는 없다. 질감/책상 컨셉을 구현하려면 색·텍스처 에셋을 사용자와 먼저 확정해야 함.

- **손글씨체 (한글)** — TBD.
  현재 편지 글씨체는 `Literata` / `Bricolage Grotesque`(둘 다 라틴 중심)뿐이다. 한글 손글씨 폰트는 정해진 바 없음. 임의 지정 금지.

- **다리 로고 SVG 컨셉** (아치 / 현수교 / 징검다리 등) — TBD.
  프로토타입에 다리 로고 SVG는 **없다**(존재하는 SVG는 봉투와 장식용 원형 아치뿐). 브랜드는 텍스트 워드마크 "Bridge"로만 표현됨. 로고 컨셉·형태는 사용자와 확정 후 제작.

---

## 사용 지침

1. **확정 규칙 섹션의 값은 그대로 사용**한다. 새 색/폰트/토큰을 추가하지 말고 위 팔레트·스택 안에서 조합.
2. **지향점 섹션 항목이 필요한 작업**(배경 질감, 한글 손글씨체, 로고)이면 코드 작성 전에 **사용자에게 확인**한다.
3. 값이 모호하거나 프로토타입에 근거가 없으면 지어내지 말고 물어본다.
4. 상세 마크업·SVG·모달 구조는 `references/extracted-source.md`를 참조.
