# One-Step 화면 단위 스펙

> 이 파일은 `one-step-design` Skill의 참고 문서다. 진입점은 `SKILL.md`.
> **특정 화면 조립** 스펙이다. 작업 중인 화면 항목만 확인하고, 관련 없는 화면은 읽지 않는다. 색상·간격·타이포는 `tokens.md`, 재사용 위젯은 `components.md` 참고.

## 캐릭터 카드 (홈)
- 흰 카드 안에 캐릭터 일러스트 + **하단 반원형 `primary-container` 그린 백드롭**.
- **캐릭터 이미지 플레이스홀더**: 도트아트 자산 완성 전까지 캐릭터는 **이모지 목업**으로 대체한다(진화 단계별 이모지 매핑 가능). 도트 자산이 준비되면 교체. → 구현 시 임의 이미지 대신 이모지 플레이스홀더를 사용한다.
- **레벨/진화명** "Level 12 Specter" (headline) + `XP 840 / 1000` 우측 정렬.
- **XP 바**: 두꺼운 pill 트랙(그린 10%) + 그린 그라디언트 필 + `xp-shimmer` 애니메이션.
- 아래 **코인 배너**: `surface-container` 배경 pill, 코인 아이콘 + "1,240 Coins".

## AI Quest Splitter 카드 (핵심 ★)
- 큰 흰 카드 + 그린 그라디언트 미세 배경.
- 좌상단 블루 아이콘 타일 + `AI Quest Splitter` headline.
- 설명문 → **입력 필드**(placeholder "e.g. Prepare for Final Exams…", 좌측 타깃 아이콘).
- **Split Goal →** solid 그린 버튼.
- 하단 `surface-container-high` 안내 박스: 분기 아이콘 + "AI analyzes your goal and creates a strategic quest path."

## 퀘스트 완료 / 인증 화면
- 중앙 **트로피 원형**(그린 배경 + 노랑 글로우) + `Quest Ready!` display.
- 대상 퀘스트명 안내문.
- **보상 표시 카드**: `+5 COINS`(노랑 코인) | `+10 XP`(그린 별). 2분할.
- **Verification 박스**(좌측 노랑 accent 보더): `Optional` 칩 + 우측 `+3 Bonus Coins`(노랑).
  - **Upload Photo Evidence**: dashed 테두리 업로더 + 카메라 아이콘.
  - **Add a Memo**: 텍스트영역.
- 하단 solid 그린 완료 버튼.

## 상점 (아이템 카드)
- 페이지 타이틀 `Item Shop` + 설명 + **Balance pill**(노랑, "1,450 Coins").
- **카테고리 칩 스크롤**: `All Items`(활성=블루 아웃라인) / Backgrounds / Effects…
- **아이템 카드**: 좌측 노랑 accent 보더. 상단 `EPIC` 뱃지(노랑) + `LVL` 배지. 일러스트 배너("ACHIEVEMENT UNLOCKED!", "COLLECT REWARD"). 제목 headline + 설명.

## 상점 (프리뷰/적용)
- 헤더에 코인 pill(2,450). **Preview 카드**: 큰 일러스트 배경 + 캐릭터 합성.
- 속성 리스트: `Background → Arcane Library`, `Aura → Scholar's Focus`.
- 하단 full-width solid 그린 **Apply {아이템}** 버튼(아이콘 동반).

## 성취 보관함 (Storage)
- 타이틀 `Storage` + 공유 아이콘.
- **Achievement Vault 카드**: `COMPLETIONS 142` | `CURRENT STREAK 14 days` (2분할 stat, 수치 display).
- **Rebirth 배너**: solid `primary-container` 그린 카드, `REBIRTH LEVEL` + **노랑 별 ★★★** + `Master Scholar` + 설명.
- **Timeline**: 좌측 노랑 accent 보더 카드들. `Milestone` 칩 + 날짜(달력 아이콘) + 제목 + 설명 + `🏆 +500 XP`(노랑 트로피).

## 프로토타입 반영 가이드

현재 `prototype/`의 색을 아래처럼 교체하면 이 디자인 시스템에 정렬된다.

| prototype 현재 | → 교체 |
|----------------|--------|
| `--green #1f7a3f` | `primary #006e2f` (+ 밝은 강조는 `#22c55e`) |
| `--navy #22355e` (탭바) | 탭바는 흰 배경 유지, **활성 탭만 그린 라운드** |
| `--orange #e08a2b` (AI) | AI 강조는 **블루**(`#0058be`)로, 노랑은 **코인/보상 전용**으로 분리 |
| 난이도 pill | `tokens.md` 난이도 매핑 색으로 |
| 폰트 | **Sora** 로 통일 |
| 코인 | 노랑 원형 + inner-glow |

> ⚠️ 색상 역할 규칙(노랑=코인·보상 전용 등)은 `SKILL.md`의 **색상 역할 불변 규칙**을 정본으로 따른다.
