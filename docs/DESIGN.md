# Decision Log 디자인 시스템

> Astryx 기반 디자인 시스템의 기준 문서다.
> 이 문서는 모든 화면에 공통인 규칙(토큰, 컴포넌트 사용, 레이아웃·상태 표현 원칙)만 다룬다.
> 페이지·기능별 화면 구성과 동작은 `docs/specs/`의 해당 Spec에서 정의한다.
> 디자인 점검 기준은 `docs/design-skill.md`를 따른다.

---

## 1. 디자인 시스템 선택

- 디자인 시스템: Astryx (`facebook/astryx`)
- 선택 근거: `docs/decisions/ADR-004-astryx-design-system.md`
- 패키지: `@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@astryxdesign/cli`(dev)
- 설치와 초기 설정은 `docs/dev-setup.md`를 따른다.

---

## 2. 디자인 방향

- 화려한 디자인보다 정보가 잘 읽히고, 판단 상태가 명확히 보이는 디자인을 우선한다.
- 화려한 AI 랜딩페이지가 아니라 실제 작업 도구처럼 보여야 한다.
- 보라색 AI 그라데이션, 의미 없는 로봇 아이콘, 과한 애니메이션을 지양한다.
- 기능보다 홍보 문구가 큰 화면을 만들지 않는다.

---

## 3. 적용 원칙

- UI는 Astryx 컴포넌트를 우선 사용한다.
- 색·간격·모서리 변경은 Astryx 테마의 CSS custom property 오버라이드로만 한다.
- Astryx 컴포넌트를 fork하거나 내부 구조를 복사하지 않는다.
- Astryx에 없는 도메인 전용 UI만 직접 만들고, 그 안에서도 Astryx 기본 요소를 조합한다.
- 보조 스타일은 일반 CSS(className)로 작성한다. Tailwind, styled-components는 사용하지 않는다.
- 기본 테마는 neutral 계열을 사용하고, 다크모드는 Astryx 테마 기능을 사용한다.

---

## 4. 브랜드 토큰 (테마 오버라이드 값)

기존 디자인 토큰 값을 승계하며, Astryx 테마의 custom property 오버라이드로 적용한다.
오버라이드는 `apps/web/src/theme.ts`에서 `defineTheme({ extends: neutralTheme, tokens })`로 관리한다 (2026-07-16 확정, Astryx 0.1.6 기준).

| 용도 | 값 | Astryx 변수명 |
|---|---|---|
| 전체 배경 | `#F6F7F9` | `--color-background-body` |
| 카드·패널 배경 | `#FFFFFF` | `--color-background-surface`, `--color-background-card` |
| 테두리 | `#E5E7EB` | `--color-border` |
| 기본 텍스트 | `#111827` | `--color-text-primary` |
| 보조 텍스트 | `#6B7280` | `--color-text-secondary` |
| Primary | `#2563EB` | `--color-accent` |
| passed(통과·채택) 배경 | `#DCFCE7` | `--color-success-muted` |
| conflicted(미해소 충돌) 배경 | `#FEF3C7` | `--color-warning-muted` |
| rejected(제외) 배경 | `#FEE2E2` | `--color-error-muted` |

- 간격 스케일: `4 / 8 / 16 / 24 / 32px` — Astryx 기본 `--spacing-N`(4px 단위: 1/2/4/6/8)과 일치하므로 별도 오버라이드 없이 그대로 사용한다.
- Radius 스케일: 작은 버튼 `8px` = `--radius-element`, 카드 `12px` = `--radius-container`, 큰 패널 `20px` = `--radius-page`
- 폰트: Pretendard → system-ui, sans-serif (제목 700 / 본문 400) — `--font-family-body`, `--font-family-heading`
- 모델 표시 라벨은 **Claude · ChatGPT · Gemini**를 사용한다. 내부 provider 식별자(`claude`/`openai`/`gemini`)는 표시 라벨과 분리해 유지한다.
- 모델 식별 색(점 표시용): Gemini `#1A73E8`, Claude `#D97757`, ChatGPT `#10A37F` — Astryx 토큰이 아닌 도메인 전용 값으로, `apps/web/src/index.css`의 `--model-*` custom property로 관리한다.
- 브랜드 토큰은 현재 라이트 값만 확정되어 `<Theme mode="light">`로 고정한다. 다크모드는 다크 값 확정 후 활성화한다.

---

## 5. 레이아웃 원칙

3단 레이아웃을 기본으로 한다.

| 영역 | 역할 |
|---|---|
| Left | Chat List, 새 채팅 버튼 |
| Center | 질문 입력(컴포저), 충돌 Agenda 리스트, 답변·FinalAnswer 영역 |
| Right | Decision Notes 누적, MD Zip 다운로드 |

우선순위:

1. 사용자가 질문을 입력할 곳이 즉시 보여야 한다.
2. 충돌 Agenda 리스트와 남은 개수 카운터가 명확히 보여야 한다.
3. FinalAnswer가 충돌 해소에 따라 자연스럽게 드러나야 한다.
4. Decision Notes가 오른쪽에 계속 보여야 한다.

---

## 6. 컴포넌트 매핑

| 화면 요소 | 구현 방식 |
|---|---|
| 버튼, 입력창, 텍스트영역 | `Button`, `TextArea`, `TextInput` |
| 질문 컴포저(입력창+전송), 트랜스크립트 말풍선 | `ChatComposer`, `ChatLayout`, `ChatMessageList`, `ChatMessage`, `ChatMessageBubble` |
| 모델 뱃지(Claude·ChatGPT·Gemini), 상태 뱃지 | `Badge` (+ 도메인 색 점은 보조 CSS) |
| AI 답변 전문 팝업, 충돌 해소 팝업, 다운로드 안내 | `Dialog`, `DialogHeader` |
| 로딩 표시 | `Spinner` |
| Chat List | `SideNav`, `SideNavHeading`, `SideNavSection`, `SideNavItem`, `StatusDot` |
| 3단 레이아웃 뼈대 | `Layout`, `LayoutPanel`, `LayoutContent` |
| 빈 상태 표시 | `EmptyState` |
| Agenda 카드, FinalAnswer 카드, Decision Note 카드 | 직접 제작 (Astryx 기본 요소 조합) |

아직 구현하지 않은 화면 요소의 컴포넌트 이름은 확정되는 대로 이 표를 갱신한다.
컴포넌트 API는 `npx astryx component <Name>` 또는 `node node_modules/@astryxdesign/core/docs.mjs <Name>`으로 확인한다.

---

## 7. 상태 표현 규칙

- Agenda 상태는 색상과 라벨을 함께 사용해 구분한다: `conflicted`(노랑 계열), `passed`(초록 계열), `rejected`(빨강 계열).
- 상태 배경색은 연하게 사용한다. 색상만으로 상태를 전달하지 않는다.
- 충돌 리스트에는 미해소 Agenda만 남기고, 해소되면 리스트에서 제거하며 카운터를 갱신한다.
- 비동기 화면은 필요에 따라 `idle / loading / success / empty / error` 상태를 구분해 표현한다.

---

## 8. 문서 경계

- 이 문서: 모든 화면에 공통인 규칙 (토큰, 컴포넌트 사용, 레이아웃·상태 원칙)
- `docs/specs/`의 각 Spec: 페이지·기능별 화면 구성, 상태별 UI, 인터랙션, Acceptance Criteria
- 여러 Spec에서 같은 UI 패턴이 반복되면 이 문서로 승격한다.
