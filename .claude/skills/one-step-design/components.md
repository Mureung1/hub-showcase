# One-Step 공통 컴포넌트 스펙

> 이 파일은 `one-step-design` Skill의 참고 문서다. 진입점은 `SKILL.md`.
> 여러 화면에서 **재사용되는 공통 위젯**의 스펙이다. 특정 화면 조립은 `screens.md` 참고.
>
> ⚠️ **치수·색의 정본은 Figma `10:15` Redesign 페이지다.** 이 문서는 컴포넌트가 **무슨 역할을 하고 왜 그렇게 생겼는지**를 설명한다 — 값이 갈리면 Figma가 이긴다. 구현할 때는 Figma에서 직접 실측을 뽑고, 여기 적힌 숫자를 근거로 삼지 않는다. (색 역할 규칙 자체는 `SKILL.md`, 토큰 이름은 `tokens.md`가 정본이다.)

## 상단 헤더
- 좌: `One-Step` 워드마크 headline, 그린 볼드.
- 우: 코인 pill(노랑 틴트 배경 + 코인 아이콘 + 숫자) / 설정 톱니.
- 배경 `background`, 하단 1px 구분선.

## 하단 탭바 (5탭)
- Home · Quest · Shop · Storage · My.
- **활성 탭**: **스타디움(full)** `primary` 그린 배경 + 흰 아이콘 + `primary` 그린 라벨.
  - 라벨이 배경 밖으로 나와 흰 배경 위에 앉으므로 그린이다. 아이콘만 그린 알약 안이라 흰색이다.
- 비활성: `on-surface-variant` 회색.

## 액션 버튼 쌍
- **Today's Quests**: 그린 **그라디언트** + 그린 틴트 드롭섀도, 흰 텍스트+체크 아이콘, 표준 라운드.
  - 화면에서 가장 먼저 보여야 하는 자리라 평평한 solid 버튼과 구분한다(`GradientButtonStyle.growth`).
- **Rebirth**: 블루 **그라디언트** + 블루 틴트 드롭섀도, 흰 텍스트+새로고침 아이콘(`GradientButtonStyle.rebirth`).
  - 정본에는 **비활성 상태만** 그려져 있다. 활성 형태는 사용자 결정(2026-07-29)이다.

## 퀘스트 카드
- 흰 카드, **좌측 accent 세로 보더**(난이도/카테고리 색).
- 상단 난이도 pill(`• Easy` 그린 틴트), 우측 `⋮` 더보기.
- 제목 body-lg, 메타(보상 🪙/XP) label-sm.
