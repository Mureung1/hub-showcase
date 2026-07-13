# One-Step 공통 컴포넌트 스펙

> 이 파일은 `one-step-design` Skill의 참고 문서다. 진입점은 `SKILL.md`.
> 여러 화면에서 **재사용되는 공통 위젯**의 스펙이다. 색상·간격·타이포 값은 `tokens.md`를 따른다. 특정 화면 조립은 `screens.md` 참고.

## 상단 헤더
- 좌: 원형 아바타(그린 링) + `EduQuest`(→ One-Step) 워드마크 headline, 그린 볼드.
- 우: 코인 pill(`#ffb95f` 틴트 배경 + 코인 아이콘 + 숫자) / 설정 톱니.
- 배경 `background`, 하단 1px 구분선.

## 하단 탭바 (5탭)
- Home · Quest · Shop · Storage · My.
- **활성 탭**: 라운드(12px) `primary-container` 그린 배경 + 흰 아이콘/라벨.
- 비활성: `on-surface-variant` 회색.

## 액션 버튼 쌍
- **Today's Quests**: solid `primary` 그린, 흰 텍스트+체크 아이콘, 12px 라운드, 아래쪽 2px 진한 그린 "pressable" 보더.
- **Rebirth**: 흰 배경 + `secondary` 블루 1.5px 아웃라인, 블루 텍스트+새로고침 아이콘.

## 퀘스트 카드
- 흰 카드, **좌측 accent 세로 보더**(난이도/카테고리 색).
- 상단 난이도 pill(`• Easy` 그린 틴트), 우측 `⋮` 더보기.
- 제목 body-lg, 메타(보상 🪙/XP) label-sm.
