---
name: design-review
description: Use when designing, building, or reviewing any screen, component, or CSS for this project (진로 에이전트 서비스) — e.g. "이 화면 만들어줘", "스타일/디자인 입혀줘", "이 컴포넌트 디자인 확인해줘", new React screens, CSS/style changes, or picking colors/spacing/fonts. Ensures new UI follows the confirmed design system instead of inventing new values.
---

# Design Review — 진로 에이전트 서비스

이 스킬은 새 화면·컴포넌트를 만들거나 스타일을 입힐 때, 그리고 이미 만든 UI를 검토할 때 적용한다.

## 소스 오브 트루스 (이 순서로 참고)

1. [`docs/design-skill.md`](../../../docs/design-skill.md) — 디자인 목표, 색상/버튼/입력창/카드 사용 원칙, 새 화면 만들 때 규칙, 피해야 할 디자인, 일관성 체크리스트. **새 화면을 시작하기 전에 먼저 읽는다.**
2. [`docs/design-system.md`](../../../docs/design-system.md) — 색상표, 버튼/입력창/카드/스텝퍼 스펙, 폰트·여백·radius 규칙, React 컴포넌트 매핑 제안.
3. [`docs/variables.css`](../../../docs/variables.css) — 실제 CSS 변수 값. **색상·폰트 크기·여백·radius는 항상 이 파일의 변수를 그대로 쓰고, 새 hex/px 값을 만들지 않는다.**

세 문서가 서로 참조하므로, 값이 헷갈리면 반드시 `variables.css`를 최종 기준으로 삼는다(문서 설명과 실제 변수 값이 다르면 변수 값이 맞다).

## 핵심 규칙 (요약)

- 그린(`--color-primary`)은 행동/브랜드 전용, 블루(`--color-accent`)는 정보/설명 전용. 둘 다 한 화면에 함께 쓰되 비중은 그린 > 블루.
- 에러는 레드(`--color-error`) 하나로만 표현. 다른 시맨틱 컬러를 새로 만들지 않는다.
- 화면당 Primary 버튼은 하나만.
- 컨테이너 폭은 720px 고정, 화면 하나 = 핵심 정보 1그룹 + CTA 1개.
- 색상·폰트 크기(`--font-size-*`, 10종)·여백(`--space-*`, 4px 스케일)·radius(`--radius-*`, 7종) 모두 `variables.css`에 정의된 값 안에서만 고른다.
- AI가 생성/추천한 값(추천 공고, 자소서 초안)은 항상 "왜 그런지" 근거 텍스트와 함께 보여준다.
- 이전 화면으로 돌아갈 수 있는 링크를 항상 남긴다.
- 그라디언트, 글래스모피즘, 과한 블러, 이모지 남용, 그린/블루 외 임의 강조색은 쓰지 않는다.

## 사용 방법

1. 새 화면/컴포넌트 작업 시작 전, 어떤 화면(정보입력/추천목록/공고상세/자소서초안 중 하나 또는 그 사이 보조 화면)인지 먼저 정한다.
2. 스타일 값은 항상 `variables.css`의 변수명을 그대로 사용한다(`#03C75A` 같은 리터럴 hex를 새로 타이핑하지 않는다).
3. 작업을 마치면 [`docs/design-skill.md`](../../../docs/design-skill.md) 7장의 일관성 체크리스트 전 항목을 확인한다.
4. 체크리스트에 걸리는 항목이 있으면 임의로 새 값을 추가하지 말고, 사용자에게 토큰 추가 여부를 먼저 확인한다.
