# Today Learning Track Icons Design

## Goal

오늘 학습 허브의 학습 목록에서 텍스트 첫 글자로 표시하는 임시 배지를 Git, React, Docker 브랜드 아이콘으로 교체한다.

## Design

- `react-icons` 패키지의 Simple Icons 컴포넌트 `SiGit`, `SiReact`, `SiDocker`를 사용한다.
- 기존 원형 배지 크기, 행 정렬, 상태 배지, 기술명 텍스트는 유지한다.
- 아이콘은 장식 요소로 `aria-hidden="true"` 처리하고 기술명 텍스트가 접근 가능한 이름을 제공한다.
- 브랜드 인지성을 유지하되 ICU의 차분한 흰색 카드와 blue-gray 배경 안에서 과도하게 튀지 않는 색을 적용한다.
- 다른 화면이나 학습 데이터 구조는 변경하지 않는다.

## Validation

- 세 학습 트랙이 각각 올바른 아이콘을 렌더링하는 컴포넌트 테스트를 추가한다.
- 키보드 및 스크린 리더 사용 시 기존 기술명과 링크가 그대로 유지되는지 확인한다.
- `npm run lint`, `npm test`, `npm run build`를 실행한다.
