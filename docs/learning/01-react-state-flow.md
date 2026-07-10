# React State Flow

## 키워드

- React component
- useState
- useEffect
- derived state
- event handler
- conditional rendering
- localStorage
- form controlled input
- list rendering
- type union
- interface

## 왜 공부하나

화면 전환, 창 열기/닫기, 퀘스트 상태, 매니저 EXP가 모두 React state로 움직인다.

## 코드 위치

- src/App.tsx
- src/main.tsx
- src/domain/types.ts
- src/layers/storage/localRepositories.ts

## 확인할 부분

- AppScreen: wizard / manager-created / desktop
- QuestStatus: draft / active / success / failed / recovery
- WindowId와 opened windows 관리
- localStorage key: profileKey, managerKey, logsKey

## ChatGPT 질문 예시

- React에서 useState로 화면 단계를 관리하는 패턴을 설명해줘.
- union type으로 화면 상태를 제한하면 어떤 장점이 있어?
- localStorage와 React state를 같이 쓸 때 주의할 점은?
