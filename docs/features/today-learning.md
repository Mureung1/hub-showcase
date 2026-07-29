# Today Learning Hub

## 목적

Today Learning Hub는 Intro와 Profile Setup 이후 진입하는 ICU의 중심 학습 화면입니다. 사용자가 오늘 무엇을 이어서 공부해야 하는지, 어떤 복습이 남았는지, 전체 학습 트랙이 어떤 상태인지 바로 이해하게 합니다.

이 화면은 채팅보다 먼저 나옵니다. AI 튜터와 코드 에디터는 사용자가 학습을 시작하거나 이어서 진행할 때 Learning Workspace IDE에서 중심 역할을 합니다.

## 주요 사용자 액션

- 이어서 학습하기: 현재 생성된 오늘 미션을 `generated-first-mission`으로 넘겨 Learning Workspace IDE로 이동합니다.
- 새 목표 만들기: 배우고 싶은 기술이나 목표를 입력하는 흐름을 시작합니다.
- 계획 조정: 오늘의 학습 순서나 난이도를 조정합니다.
- 전체 학습 목록 보기: 모든 학습 트랙 목록으로 이동합니다.
- 오늘 복습 시작: 복습 미션인 `ai-review`를 넘겨 Learning Workspace IDE로 이동합니다.
- 오답노트 보기: 최근 오답 요약에서 `/mistake-notes`로 이동해 전체 오답을 확인합니다.

## 화면 구성

- AppShell Navigation: `AppShell` 내부의 공통 `ResizableNavigator`를 유지하며 Today Hub는 `Outlet` 영역에 렌더링
- Header: 오늘 학습, 날짜, 오늘 예정 요약
- Today's Focus: 진행 중인 트랙, 현재 단계, 오늘 미션, 진행률, 이어서 학습하기
- Today Queue: 현재 생성 커리큘럼의 오늘 미션을 `핵심 개념 → 실습 → 실행 결과 정리` 3단계로 표시하고 같은 Workspace 미션으로 연결
- Learning List Preview: 트랙별 상태와 진행률
- Review And Mistakes: 대시보드형 요약 카드로 오늘 복습할 항목, 최근 오답, 오답노트 `전체보기` 이동 링크를 보여줍니다.

## 표시 데이터

- todayGoal: 오늘 학습 목표 문장
- activeTrack: 현재 진행 중인 트랙 id, 제목, 상태, 진행률, 마지막 학습일, 다음 액션
- todayQueue: 활성 생성 커리큘럼의 오늘 미션 단계 목록, 단계 offset, 상태, 예상 시간
- learningTracks: React, Python, FastAPI, BFS 등 학습 트랙 목록
- reviewItems: 오늘 복습할 개념 목록
- recentMistakes: 오답노트 store가 비어 있을 때 보여주는 fallback 최근 오답과 취약 개념 목록

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
- Today Queue의 세 단계는 모두 현재 생성 계획의 `/workspace?mission=generated-mission-<planId>`로 이동하고, 저장된 `activeStepOffset`으로 해당 단계를 복원합니다.
- `ai-review`는 복습과 코드 리뷰 미션으로 사용합니다.
- Workspace는 전달받은 `mission` 값과 서버에서 불러온 생성 커리큘럼·진도 상태로 현재 미션, 파일명, 단계, 실행 상태를 결정합니다.

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

## 오답노트 연결 규칙

Today Hub는 오답을 관리하는 전체 화면이 아니라, 최근 상태를 빠르게 보여주는 대시보드형 요약 진입점입니다. 사용자가 더 많은 오답을 확인하거나 상태를 관리하려면 `전체보기`로 `/mistake-notes`에 진입합니다.

- `복습과 오답` 카드는 server mode에서 API로 불러온 최근 미해결 오답을 우선 표시합니다.
- 저장된 오답이 있으면 최신 미해결 오답을 최대 3개 보여줍니다.
- mock mode에서는 저장된 오답이 없을 때 정적 `recentMistakes`를 fallback으로 보여줍니다.
- 카드의 주요 CTA는 `전체보기`이며 `/mistake-notes`로 이동합니다.
- 개별 오답의 다시 풀기 액션은 오답노트 화면에서 제공합니다.

## 현재 데이터 로딩

Today Hub는 server mode 진입 시 다음 데이터를 병렬로 불러옵니다.

- 학습 프로필
- 최신 생성 커리큘럼과 보관 이력
- 오늘의 mission progress
- 오답노트
- Git Lab attempts

각 API 응답은 대응하는 Zustand store를 hydrate합니다. 일부 요청이 실패해도 전체 화면을 비우지 않고 해당 영역의 오류 안내와 재시도 동작을 제공합니다.

## 테마 기준

- 라이트모드와 다크모드를 모두 지원합니다.

<!-- Previous Today Hub brand direction kept for audit:
- 오늘 학습 허브는 Workday 이미지처럼 오렌지, 시안, 딥블루가 조화되는 브랜드 색감을 사용할 수 있습니다.
- 오렌지는 강조/완료/환영 상태에 제한적으로 사용하고, 주요 CTA와 선택 상태는 시안 또는 딥블루 계열을 우선합니다.
-->

- 오늘 학습 허브는 흰색 네비게이터를 유지하고, 본문 배경은 #ffecd2 warm corner와 #e8f1fa to #d7e8fb blue-gray gradient를 사용합니다.
- 학습 목록, 복습 리스트, 워크스페이스 미리보기는 흰색 카드 표면과 #d5deea 경계를 사용해 반복 사용 화면의 대비를 우선합니다.
- 현재 학습 행과 선택 상태는 #e8f2ff, 주요 CTA는 강한 blue 계열을 사용합니다.

## 진행 상태 저장

기본 server mode에서는 `/api/progress/today`와 mission progress API를 사용합니다. configured repository는 in-memory, SQLite, Supabase 중 하나입니다.

- Today Queue는 활성 생성 커리큘럼의 오늘 미션만 사용합니다. 이전 정적 미션이나 다른 계획의 진행 기록을 현재 큐에 섞지 않습니다.
- `activeStepOffset`보다 앞선 단계만 완료로 표시하고, 현재 offset은 현재 학습, 이후 단계는 대기로 표시합니다.
- 실행 성공(`passed`)은 현재 단계의 실행 결과이며 전체 미션 완료가 아닙니다. 최종 단계 완료로 저장된 `completedAt`이 있을 때만 전체 큐를 완료로 표시합니다.
- 완료율 stat은 Today Queue의 완료 항목 비율로 계산합니다.
- mock mode에서만 `icu.learningProgress` localStorage 값을 fallback으로 사용합니다.

## 반복 사용 화면 기준

- 활성 학습이 없으면 목표 입력과 커리큘럼 생성 행동을 먼저 보여줍니다.
- 일시 중지 상태는 마지막 mission, 마지막 활동 시각, 이어서 학습하기를 함께 보여줍니다.
- 오늘 학습을 모두 마치면 완료 요약, 다음 복습 일정, 기록 보기 행동을 제공합니다.
- Header, Today's Focus, Today Queue, 학습 목록, 복습 요약의 정보 순서를 유지합니다.

## 접근성 및 좁은 화면

- 진행 상태는 색상과 함께 `진행 중`, `복습 필요`, `완료`, `시작 전`처럼 텍스트로 표시합니다.
- 주요 이어서 학습하기 버튼은 가능한 경우 높이 `44px` 이상을 유지합니다.
- 좁은 화면에서도 현재 목표와 이어서 학습하기가 목록보다 먼저 표시됩니다.
- navigation을 축소하더라도 현재 위치와 메뉴 이름을 접근 가능한 label로 제공합니다.
