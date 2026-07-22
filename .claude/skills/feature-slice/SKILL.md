---
name: feature-slice
description: Given a feature/requirement description (or an existing weekly plan to re-check), break it into small, independently-committable work items with priority and label, sized so each item is finishable in a few hours — not a full day. Use when planning a new feature before writing code, or when validating an already-drafted weekly plan by re-deriving an independent breakdown and comparing.
---

이 Skill은 "요구사항 → 작업 단위 + 우선순위"를 만든다. 목적은 하루 단위 뭉치("Day 1: OO 기능 구현")가 아니라, **각 항목만 보고 바로 시작할 수 있을 만큼 잘게 쪼갠** GitHub 이슈 후보를 만드는 것이다. 하루짜리 덩어리는 "무엇을 언제 할지"는 정해주지만 "오늘 무슨 커밋부터 할지"는 여전히 애매하다 — 그 애매함을 없애는 게 이 Skill의 존재 이유다.

## 사용 시점

- 새 기능/화면을 만들기 전, 착수 단위로 쪼개고 싶을 때 (예: "장바구니 기능을 feature-slice로 나눠줘")
- 이미 짠 주간 계획/이슈 목록이 충분히 잘게 쪼개졌는지 검증하고 싶을 때 — 이 경우 기존 계획은 참고하지 않고 **요구사항만 보고 독립적으로 다시 쪼갠 뒤** 기존 것과 나란히 비교한다 (기존 쪼갬에 끌려가지 않기 위함)

## 절차

1. **핵심 시나리오부터 분리한다.** `docs/plan.md`의 원칙(핵심 기능을 서브 기능보다 먼저 탄탄히)을 따라, 요구사항에서 "이거 하나만 되면 기능이 동작한다고 할 수 있는 최소 경로"를 먼저 식별한다. 이 프로젝트의 course 정의상 수직슬라이스는 **화면 → 서버 → DB(or 인덱스) 저장/조회 → 응답 → 화면갱신** 한 사이클이다.
2. **그 최소 경로를 계층별로 쪼갠다.** FE/BE/DB/Docs/Test/Agent 중 어디에 속하는지 먼저 나누고, 각 계층 안에서 다시 "한 번의 커밋으로 끝낼 수 있는 크기"까지 내려간다. 기준: 손코딩 기준으로 1~3시간, 리뷰 없이 바로 커밋해도 이해 가능한 diff 크기.
   - 나쁜 예(너무 큼): "CommandListPage useState/useEffect 전환" (여러 결정이 뒤섞여 있음)
   - 좋은 예(적정): "useState 3개(commands/isLoading/error) 선언" / "mock fetch 흉내내는 useEffect 작성" / "로딩 중 렌더링 분기 추가" / "에러 렌더링 분기 추가" — 각각 독립적으로 커밋 가능
3. **부가 기능은 핵심 경로 뒤로 미룬다.** 서브 기능(꾸미기, 엣지케이스, 최적화)은 핵심 수직슬라이스가 끝난 뒤 순번으로 배치하고, 별도 항목으로 P1/P2에 둔다.
4. **각 항목에 우선순위를 매긴다.** 이 프로젝트에서 이미 쓰는 기준(`docs/tasks.md`)을 그대로 따른다: **P0** = 이번 주 안에 끝내야 함 · **P1** = 다음 1~2주 내 · **P2** = 여유 있을 때/결정 필요.
5. **각 항목에 라벨을 붙인다.** 레포에 이미 있는 라벨(`FE`/`BE`/`DB`/`Docs`/`Test`/`Agent`) 중 하나를 고른다. 애매하면 실제로 손대는 파일 위치 기준으로 정한다 (`src/`→FE, `server/`→BE, DB 스키마/쿼리→DB).
6. **결과를 표로 출력한다.** 컬럼: `항목(제목) | 할 일 한 줄 | 완료 기준 | 우선순위 | 라벨`. GitHub 이슈로 그대로 옮길 수 있는 수준으로 구체적으로 쓴다 (제목만 보고 뭘 할지 알 수 있어야 함).
7. **비교 모드일 경우**, 4번 표 아래에 "기존 계획과의 차이" 섹션을 추가해 어느 항목이 더 쪼개졌는지/합쳐졌는지, 빠진 항목이 있는지 짚는다. 어느 쪽이 맞다고 단정하지 않고 사용자가 고를 수 있게 차이만 보여준다.

## 스킬 업데이트 방법

사용자가 쪼갠 결과에 "이건 아직도 크다"/"이건 너무 잘게 쪼갰다"고 피드백을 주면, 2번 절차의 "적정 크기" 기준(현재: 손코딩 1~3시간)을 그 피드백에 맞게 이 파일에서 직접 수정한다. 우선순위 기준(P0/P1/P2)이나 라벨 목록이 프로젝트에서 바뀌면 3~5번도 함께 갱신한다.
