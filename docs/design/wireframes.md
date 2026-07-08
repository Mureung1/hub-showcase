# DevChat Wireframes

## App Structure

```text
App Shell
├─ Left Navigation Rail
│  ├─ Today
│  ├─ Learning List
│  ├─ Review
│  └─ Settings
├─ Main Content
└─ Context Panel or Workspace Panels
```

The app opens on Today. The IDE workspace appears after the user starts or resumes a learning session.

## Screen 1: Today Learning Hub

Purpose: help the user understand today's learning workload and continue quickly.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ DevChat                                      Search / Command / Settings   │
├──────┬───────────────────────────────────────────────┬─────────────────────┤
│ Nav  │ Today Learning                                │ Learning Snapshot   │
│      │                                               │                     │
│ T    │ ┌ Today's Focus ────────────────────────────┐ │ ┌ React ──────────┐ │
│ L    │ │ React 입문: state와 이벤트                 │ │ │ 62% complete    │ │
│ R    │ │ Next: Counter 컴포넌트 실습                │ │ │ Review due: 2   │ │
│ S    │ │ [이어서 학습하기] [계획 조정]              │ │ │ Last: yesterday │ │
│      │ └───────────────────────────────────────────┘ │ └─────────────────┘ │
│      │                                               │                     │
│      │ ┌ Today Queue ──────────────────────────────┐ │ Recent Mistakes     │
│      │ │ 1. React state 개념 확인                   │ │ - setState timing   │
│      │ │ 2. Counter.jsx 실습                        │ │ - event handler     │
│      │ │ 3. 테스트 실행                             │ │                     │
│      │ │ 4. 코드 리뷰 받기                          │ │ Review Due          │
│      │ └───────────────────────────────────────────┘ │ - props vs state     │
│      │                                               │ - Python loop        │
│      │ ┌ Learning List Preview ────────────────────┐ │                     │
│      │ │ React        In progress   62%             │ │                     │
│      │ │ Python       Review due    41%             │ │                     │
│      │ │ FastAPI      Not started   0%              │ │                     │
│      │ │ BFS          Practice      28%             │ │                     │
│      │ └───────────────────────────────────────────┘ │                     │
└──────┴───────────────────────────────────────────────┴─────────────────────┘
```

Primary action: `이어서 학습하기`

Secondary actions:

- `계획 조정`
- `학습 목록 보기`
- `오늘 복습 시작`

## Screen 2: Learning Workspace IDE

Purpose: support the active learning session from explanation to code execution and review.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ React 입문 / Step 3 of 5           35분 남음        [학습 목록] [설정]      │
├───────────────┬─────────────────────────────┬──────────────────────────────┤
│ Curriculum    │ AI Tutor                    │ Editor                       │
│               │                             │                              │
│ ✓ Component   │ ┌ Explanation ────────────┐ │ Counter.jsx          [Run]   │
│ ✓ Props       │ │ state는 컴포넌트 내부에서 │ │ ┌────────────────────────┐ │
│ ● State       │ │ 바뀌는 값입니다...       │ │ │ 1 import { useState }   │ │
│ ○ Events      │ └─────────────────────────┘ │ │ 2                        │ │
│ ○ Review      │                             │ │ 3 function Counter() {   │ │
│               │ ┌ Mission ────────────────┐ │ │ 4   return <button>0...  │ │
│ Mission       │ │ 버튼 클릭 시 count를      │ │ └────────────────────────┘ │
│ Counter 실습  │ │ 1씩 증가시키세요.         │ │                              │
│               │ └─────────────────────────┘ │                              │
│ Pass Criteria │                             │                              │
│ - click +1    │ ┌ Official Sources ───────┐ │                              │
│ - render count│ │ React Docs: State        │ │                              │
│               │ │ React Docs: Events       │ │                              │
├───────────────┴─────────────────────────────┴──────────────────────────────┤
│ Test Results                                                                │
│ 2/3 passed | 실패: 클릭 이벤트는 연결됐지만 state 업데이트가 누락되었습니다. │
│ [힌트 보기] [코드 리뷰 요청] [다시 실행]                                    │
└────────────────────────────────────────────────────────────────────────────┘
```

Primary action: `실행`

Secondary actions:

- `힌트 보기`
- `코드 리뷰 요청`
- `다음 단계`
- `학습 목록`

## Screen Transition

```text
Today Learning Hub
-> 이어서 학습하기
-> Learning Workspace IDE
-> 실행
-> 테스트 결과 / 힌트
-> 코드 리뷰
-> 학습 저장
-> 다음 복습 일정 생성
```

## Mobile or Narrow Width

The desktop app is the primary target. For narrow widths:

- Left navigation collapses to icons.
- Workspace panels become tabs: `튜터`, `코드`, `결과`.
- Today Hub keeps the continue action at the top.

