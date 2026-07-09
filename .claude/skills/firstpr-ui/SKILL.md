---
name: firstpr-ui
description: FirstPR 서비스의 토스(Toss) 스타일 디자인 시스템으로 UI를 만들 때 사용. 랜딩 페이지·화면·컴포넌트(버튼, 카드, 칩, 입력, 리스트, 금액 표기 등)를 만들거나, 기존 UI를 이 디자인 규칙에 맞게 정리할 때 항상 먼저 실행. docs/design.md의 CSS 변수(색·폰트·모서리·여백·카드)를 단일 진실 소스로 적용한다.
---

# FirstPR UI 스킬 (Toss 스타일)

`docs/design.md`를 **단일 진실 소스**로 삼아 토스풍 UI를 생성/정리하는 스킬.

## 실행 순서

1. **`docs/design.md`를 먼저 읽는다.** 토큰 값이 바뀌었을 수 있으므로 항상 최신 파일에서 CSS 변수를 가져온다. 이 문서와 값이 다르면 `docs/design.md`가 우선.
2. 아래 원칙과 컴포넌트 규칙에 맞춰 마크업/스타일을 작성한다.
3. 색·크기·여백·모서리는 **하드코딩하지 말고 반드시 CSS 변수**(`var(--color-primary)` 등)를 쓴다.
4. 새 화면/컴포넌트는 프로젝트 구조에 맞춰 배치한다 (React면 `src/components/`, 정적 페이지면 지정 폴더).

## 디자인 원칙 (요약)

- **화이트 기반**: 순백(`--color-bg`) 위에 옅은 회색 그룹 카드(`--color-surface-alt`)로 영역 분리. 그림자는 최소한(`--shadow-card`).
- **단일 강조색**: 파란색(`--color-primary`) 하나로 버튼·활성 탭·아이콘·완료 상태까지 통일.
- **둥근 모서리 + 넉넉한 여백**: 카드 `--radius-lg`(16px), 버튼 `--radius-md`(14px), 칩/아이콘 `--radius-full`. 여백은 8px 배수 스케일.
- **명확한 위계**: 진한 텍스트(`--color-text`, 제목/금액) ↔ 회색 텍스트(`--color-text-tertiary`, 보조 설명) 대비로 정보 계층 표현.
- **폰트**: Pretendard 우선(`--font-sans`). 한글 제목은 `letter-spacing: -0.02em` 권장, 금액/숫자는 `tabular-nums`.

## 컴포넌트 규칙

### 기본 버튼 (Primary)
- 높이 52~56px, `border-radius: var(--radius-md)`, `background: var(--color-primary)`, `color: #fff`, `font-weight: 700`.
- hover→`--color-primary-hover`, active→`--color-primary-pressed`, disabled→`--color-surface-sunken` + `--color-text-disabled`.
- 주요 액션은 화면 하단 고정 + 꽉 찬 너비. 보조 액션은 배경 없이 파란 텍스트만.

### 카드
- `background: var(--color-surface)`, `border-radius: var(--radius-lg)`, `padding: var(--space-4~6)`, `box-shadow: var(--shadow-card)` **또는** `border: 1px solid var(--color-border)`.
- 그룹형 회색 카드는 `--color-surface-alt` + 그림자 없음.
- 리스트 항목 구분은 테두리 대신 `--color-divider` 얇은 선 또는 여백.

### 칩 / 탭 (pill)
- `border-radius: var(--radius-full)`, 높이 32~36px, `font-weight: 600`.
- active→`--color-primary-weak` 배경 + `--color-primary-text` 글자 / inactive→투명 배경 + `--color-text-tertiary`.

### 원형 아이콘
- 정사각(40px 내외) + `--radius-full`, 배경 `--color-primary-weak`, 가운데 정렬(`display:grid; place-items:center`).

### 금액 / 숫자
- 큰 금액: `--text-display` + `700` + `font-variant-numeric: tabular-nums`.
- 마이너스(출금)는 `--color-danger`, 일반은 `--color-text`.

## 참고 산출물 (레포 내부)

- 화면 프로토타입: `public/prototype/index.html`, `public/prototype/styles.css` — 전체 화면 흐름/톤 참고용.
- 정적 HTML 산출물은 Pretendard를 jsDelivr CDN에서 로드한다.
- 참고 경로는 항상 레포 기준 상대경로만 사용한다 (특정 PC의 바탕화면 등 로컬 절대경로 참조 금지).

## 하지 말 것

- 색상 hex나 px 값을 컴포넌트에 직접 박아넣기 (→ 항상 CSS 변수).
- 강조색을 파란색 외 다른 색으로 추가하기 (상태색 danger/warning 제외).
- 진한 그림자·과한 테두리로 무겁게 만들기 (토스는 가볍고 여백 중심).
