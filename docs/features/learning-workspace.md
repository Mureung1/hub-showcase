# Learning Workspace IDE

## 목적

Learning Workspace IDE는 사용자가 실제 학습을 진행하는 화면입니다. 커리큘럼, AI 튜터 설명, 코드 에디터, 실행 결과를 한 화면에서 연결해 학습 흐름이 끊기지 않게 합니다.

이 화면은 VS Code 같은 개발 도구의 구조를 참고하되, 파일 탐색기보다 현재 학습 단계와 미션을 더 중요하게 보여줍니다.

## 주요 사용자 액션

- 실행: 현재 에디터 코드를 실행하고 테스트 결과를 확인합니다.
- 힌트 보기: 실패 원인을 바탕으로 단계별 힌트를 표시합니다.
- 코드 리뷰 요청: 현재 코드를 AI 튜터에게 리뷰 요청합니다.
- 다음 단계: 현재 단계를 완료하고 다음 커리큘럼 단계로 이동합니다.
- 학습 목록: Today Learning Hub 또는 전체 학습 목록으로 돌아갑니다.
- 미션 진입: Today Learning Hub에서 전달한 `mission` 쿼리에 맞는 학습 미션을 표시합니다.

## 화면 구성

- Top Bar: 현재 트랙, 현재 단계, 오늘 진행률, 학습 목록, 오늘 학습
- Curriculum Panel: 오늘 커리큘럼 단계, 현재 미션, 통과 조건
- AI Tutor Panel: 공식 문서 기반 설명, 현재 미션, 힌트, 코드 리뷰, 참고 문서
- Code Editor Panel: 파일 탭, 언어 표시, 실행 버튼, 코드 에디터
- Test Results Panel: 실행 상태, 테스트 결과, 실패 이유, 힌트, 리뷰, 재실행 액션

## 표시 데이터

- selectedMissionId: URL의 `mission` 쿼리 값입니다. 값이 없으면 `generated-first-mission`을 사용합니다.
- currentTrack: 트랙 id, 제목, 진행률, 남은 예상 시간
- curriculumSteps: 커리큘럼 단계 목록과 각 단계 상태
- activeStep: 현재 단계 제목, 미션, 통과 조건
- editorSession: 파일명, 언어, 현재 코드
- testResult: 실행 상태, 통과 개수, 전체 테스트 개수, 결과 메시지
- sourceReferences: 공식 문서 제목과 원본 URL

## 기본 상태 예시

- currentTrack: React 입문, 62%, 35분 남음
- curriculumSteps:
  - 컴포넌트 구조: 완료
  - props 전달: 완료
  - state와 이벤트: 현재
  - 테스트 실행: 대기
  - 코드 리뷰: 대기
- activeStep:
  - 제목: Counter 컴포넌트 실습
  - 미션: 버튼을 클릭할 때마다 count가 1씩 증가하도록 구현합니다.
  - 통과 조건: 숫자 표시, 클릭마다 1 증가, 테스트 3개 통과
- editorSession:
  - 파일명: Counter.jsx
  - 언어: jsx
  - 코드: React useState 기반 Counter 스타터 코드
- testResult:
  - 상태: failed
  - 결과: 2/3 통과
  - 메시지: 클릭 이벤트는 연결되었지만 state 업데이트가 누락되었습니다.
- sourceReferences:
  - React Docs: State: A Component Memory
  - React Docs: Responding to Events

## 실행 결과 상태

- idle: 아직 실행하지 않았습니다. CTA는 실행입니다.
- running: 실행 중입니다. 실행 버튼은 비활성화하고 진행 상태를 표시합니다.
- passed: 모든 테스트를 통과했습니다. 코드 리뷰 요청과 다음 단계를 강조합니다.
- failed: 일부 테스트가 실패했습니다. 실패 이유와 힌트 보기, 다시 실행을 표시합니다.
- timeout: 실행 제한 시간을 초과했습니다. timeout 5초 기준을 안내하고 코드 구조를 확인하게 합니다.

## 미션 선택 규칙

- `/workspace`처럼 `mission` 쿼리가 없으면 `generated-first-mission`을 기본 미션으로 사용합니다.
- `generated-first-mission`은 현재 프로필 목표로 생성된 커리큘럼의 오늘 미션을 표시합니다.
- 그 외 `mission` 값은 `todayQueue`의 item id와 매칭해 큐 기반 미션으로 표시합니다.
- 매칭되는 큐 항목이 없으면 첫 번째 `todayQueue` 항목을 fallback으로 사용합니다.
- `ai-review`는 복습/코드 리뷰 성격의 선택 미션으로 표시합니다.

## AI 튜터 패널 규칙

- 개념 설명은 현재 단계와 직접 관련된 내용만 먼저 보여줍니다.
- 공식 문서 출처가 있는 경우 참고 문서를 하단에 표시합니다.
- 실패 상태에서는 정답을 바로 보여주지 않고 접근 방향, 필요한 개념, 코드 구조 순서로 힌트를 제공합니다.
- 코드 리뷰는 통과 여부와 별개로 가독성, 간결성, 권장 사용 방식 중심으로 제공합니다.

## 코드 에디터 규칙

- MVP 구현 전에는 Monaco Editor 대신 정적 코드 프리뷰 또는 textarea로 시작할 수 있습니다.
- Monaco Editor를 붙일 때도 editorSession 데이터 구조는 유지합니다.
- 채팅의 코드 블록을 에디터로 보내거나 에디터 코드를 튜터에게 인용하는 기능은 후속 단계로 둡니다.

## 구현 우선순위

1. 정적 mock 데이터 기반 워크스페이스 레이아웃을 구현합니다.
2. Today Hub의 이어서 학습하기, 학습 큐, 복습 시작에서 전달한 `mission` 쿼리로 현재 미션을 선택합니다.
3. 실행 버튼은 우선 mock 상태 전환으로 idle, running, failed, passed를 보여줍니다.
4. 실제 코드 실행, Judge Service, AI 코드 리뷰는 후속 Electron/Main Process 단계에서 연결합니다.
## 테마 기준

- 라이트모드와 다크모드를 모두 지원합니다.
- 에디터 영역은 두 테마 모두 어두운 코드 표면을 기본으로 유지합니다.
- 다크모드에서는 앱 배경을 순수 검정 대신 네이비/차콜 계열로 두고, 패널 구분은 border와 surface 차이로 처리합니다.
- Workday 이미지의 밝은 시안과 딥블루는 포커스, 실행 버튼, 진행률, 현재 단계 표시에 사용합니다.
- 오렌지 계열은 성공/완료 또는 친근한 안내에 제한적으로 사용합니다.
