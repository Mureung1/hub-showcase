# Today Learning Hub

## 목적

Today Learning Hub는 ICU의 첫 화면입니다. 사용자가 앱을 열었을 때 오늘 무엇을 이어서 공부해야 하는지, 어떤 복습이 남았는지, 전체 학습 트랙이 어떤 상태인지 바로 이해하게 합니다.

이 화면은 채팅보다 먼저 나옵니다. AI 튜터와 코드 에디터는 사용자가 학습을 시작하거나 이어서 진행할 때 Learning Workspace IDE에서 중심 역할을 합니다.

## 주요 사용자 액션

- 이어서 학습하기: 현재 생성된 오늘 미션을 `generated-first-mission`으로 넘겨 Learning Workspace IDE로 이동합니다.
- 새 목표 만들기: 배우고 싶은 기술이나 목표를 입력하는 흐름을 시작합니다.
- 계획 조정: 오늘의 학습 순서나 난이도를 조정합니다.
- 전체 학습 목록 보기: 모든 학습 트랙 목록으로 이동합니다.
- 오늘 복습 시작: 복습 미션인 `ai-review`를 넘겨 Learning Workspace IDE로 이동합니다.

## 화면 구성

- Left Navigation: Today, Learning List, Review, Settings
- Header: 오늘 학습, 날짜, 오늘 예정 요약
- Today's Focus: 진행 중인 트랙, 현재 단계, 오늘 미션, 진행률, 이어서 학습하기
- Today Queue: 개념 설명, 퀴즈, 실습, 실행, 리뷰 순서와 각 단계별 워크스페이스 진입 링크
- Learning List Preview: 트랙별 상태와 진행률
- Review And Mistakes: 오늘 복습할 항목과 최근 오답

## 표시 데이터

- todayGoal: 오늘 학습 목표 문장
- activeTrack: 현재 진행 중인 트랙 id, 제목, 상태, 진행률, 마지막 학습일, 다음 액션
- todayQueue: 오늘 진행할 단계 목록, 각 단계의 id, 상태, 예상 시간
- learningTracks: React, Python, FastAPI, BFS 등 학습 트랙 목록
- reviewItems: 오늘 복습할 개념 목록
- recentMistakes: 최근 오답과 취약 개념 목록

## 기본 상태 예시

- todayGoal: React state와 이벤트 이해하기
- activeTrack: React 입문, 진행 중, 62%, 다음 액션은 Counter.jsx 실습 이어하기
- todayQueue:
  - React state 개념 확인: 완료, 8분
  - Counter.jsx 실습: 현재, 18분
  - 테스트 실행: 대기, 5분
  - AI 코드 리뷰 받기: 대기, 7분
- learningTracks:
  - React: 진행 중, 62%
  - Python: 복습 필요, 41%
  - FastAPI: 시작 전, 0%
  - BFS: 연습 중, 28%
- reviewItems:
  - props와 state 구분
  - 이벤트 핸들러 위치
- recentMistakes:
  - state 업데이트 누락, Counter 실습

## 상태 규칙

- in_progress: 진행 중인 학습입니다. 기본 CTA는 이어서 학습하기입니다.
- review_due: 복습이 필요한 학습입니다. 상태 배지는 주의 색상으로 표시합니다.
- completed: 완료한 학습입니다. 다음 복습 일정이나 다음 추천 주제를 표시합니다.
- not_started: 아직 시작하지 않은 학습입니다. CTA는 시작하기입니다.

## Workspace 연결 규칙

- 기본 CTA인 `학습 시작`과 `워크스페이스로 이동`은 `/workspace?mission=generated-first-mission`으로 이동합니다.
- Today Queue의 각 단계는 `/workspace?mission=<todayQueue item id>` 형식으로 이동합니다.
- `ai-review`는 복습과 코드 리뷰 미션으로 사용합니다.
- Workspace는 전달받은 `mission` 값으로 현재 미션, 파일명, 커리큘럼 단계, 테스트 케이스 mock 상태를 결정합니다.

## 빈 상태

진행 중인 학습이 없을 때는 Today's Focus에 목표 입력을 보여줍니다.

문구:

- 오늘 학습 목표가 없습니다.
- 배우고 싶은 기술을 입력하면 오늘의 학습 순서를 만들어드릴게요.
- 입력 예시: React, Python, FastAPI
- CTA: 커리큘럼 만들기

## 완료 상태

오늘의 학습 큐가 모두 완료되면 Today's Focus는 완료 요약으로 바뀝니다.

문구:

- 오늘 학습을 완료했습니다.
- React state와 이벤트 실습을 마쳤고, 다음 복습은 1일 뒤로 예약되었습니다.
- CTA: 오늘 기록 보기, 다음 학습 추천

## 구현 우선순위

1. 정적 mock 데이터 기반 Today Hub 화면을 구현합니다.
2. 이어서 학습하기와 학습 큐 항목 클릭 시 `mission` 쿼리를 포함해 Learning Workspace IDE로 전환합니다.
3. 학습 목록과 복습 항목은 mock 데이터를 기반으로 보여주되, 복습 시작은 `ai-review` 미션으로 연결합니다.
4. 실제 저장소, DB, AI 호출은 후속 단계에서 연결합니다.
## 테마 기준

- 라이트모드와 다크모드를 모두 지원합니다.
- 오늘 학습 허브는 Workday 이미지처럼 오렌지, 시안, 딥블루가 조화되는 브랜드 색감을 사용할 수 있습니다.
- 단, 학습 목록과 복습 리스트는 반복 사용 화면이므로 중립 표면과 명확한 대비를 우선합니다.
- 오렌지는 강조/완료/환영 상태에 제한적으로 사용하고, 주요 CTA와 선택 상태는 시안 또는 딥블루 계열을 우선합니다.
## Mock 진행 상태 저장

React mock 화면 단계에서는 실제 DB 대신 `icu.learningProgress` localStorage 값을 사용합니다.

- Today Queue는 기본 mock data를 먼저 만들고, mission별 저장 상태가 있으면 화면 표시 상태를 덮어씁니다.
- 저장된 mission이 `passed`이거나 `completedAt`이 있으면 해당 항목을 완료로 표시합니다.
- 저장된 mission이 실패 또는 진행 중이면 해당 항목을 현재 학습으로 표시합니다.
- 완료율 stat은 Today Queue의 완료 항목 비율로 계산합니다.
- 이 저장 상태는 브라우저 새로고침과 `/today` ↔ `/workspace` 이동 사이에서만 유지되는 mock persistence입니다.
