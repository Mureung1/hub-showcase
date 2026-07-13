---
name: design-tone
description: 자격증 취득 경로 플래너 프로젝트의 색상·폰트·컴포넌트 톤 규칙. 새 화면/컴포넌트를 만들거나 기존 화면 스타일을 다듬을 때, 또는 "우리 디자인 스킬 적용해서 만들어줘"라는 요청을 받았을 때 사용.
---

# Design Tone Skill

이 프로젝트의 화면을 새로 만들거나 수정할 때 이 규칙을 적용한다.
`docs/prototype.html`에서 확정된 톤을 기준으로 함.

## 언제 사용하나
- 새 화면/컴포넌트를 만들 때
- 기존 화면 스타일을 다듬을 때
- "우리 디자인 스킬 적용해서 만들어줘" 요청을 받았을 때

## 색상
```css
--bg: #12161f;           /* 배경, 짙은 네이비 */
--surface: #1a2030;      /* 카드 배경 */
--surface-2: #212939;    /* 카드 내부 강조 배경 (선택된 상태 등) */
--border: rgba(255,255,255,0.08);
--text: #e7ebf2;
--text-muted: #8891a3;
--accent: #4fd1c5;       /* 주 강조색 (틸) - CTA, 긍정적 신호 */
--accent-warn: #f0a868;  /* 주의/우대 신호 (앰버) */
--accent-danger: #e5707a;/* 필수/경고 신호 (코럴) */
```

## 폰트
```css
--font-display: 'Space Grotesk', system-ui, sans-serif;  /* 제목 */
--font-body: system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif; /* 본문 */
--font-mono: 'IBM Plex Mono', 'SFMono-Regular', Menlo, monospace; /* 라벨/수치/코드성 텍스트 */
```
- 외부 CDN 폰트 로드하지 않음 — 시스템 폰트 폴백만 사용 (의존성 최소화)
- 라벨, eyebrow 텍스트, 통계 수치, 태그는 항상 모노스페이스로 구분

## 카드/컴포넌트 스타일
- border-radius: 카드 10~12px, 버튼/태그 6~7px
- border: 1px solid var(--border) — 그림자보다 얇은 테두리 선호
- 카드 padding: 14~28px (내용 밀도에 따라)
- hover 시 border-color를 accent 계열로 살짝 밝힘 (배경은 크게 안 바꿈)

## 상태 표현 규칙
- 태그(tag)는 배경 15% 투명도 + 해당 색상 텍스트로 표현 (예: `rgba(79,209,197,0.15)` 배경 + `--accent` 텍스트)
- 3단계 신호 체계 고정: accent(긍정/양호) → accent-warn(주의) → accent-danger(위험/필수)

## 인터랙션
- 별도 JS 프레임워크 없이 만들 경우, 화면/탭 전환은 순수 CSS(`radio` + `:checked` 선택자)로 구현
- 애니메이션은 은은하게: fade-in 0.2~0.3s, 과한 모션 지양
- `prefers-reduced-motion` 대응 필수

## 여백/레이아웃
- 최대 폭: 콘텐츠 중심 화면은 880~920px, 폼 카드는 520px 내외
- 2단 레이아웃 시 `grid-template-columns`로 좌측 고정폭(320~340px) + 우측 가변

## 하지 말 것
- 과도한 그라데이션/그림자 남발
- 화려한 아이콘 라이브러리 의존 (필요 시 인라인 SVG로 최소화)
- 색상 팔레트 임의 추가 — 위 5개 색상 내에서 조합
