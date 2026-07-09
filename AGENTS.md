# Development Guidelines

## 프로젝트 구조
- 현재 프로젝트는 React + Vite 구조를 유지한다.
- 루트에 server 폴더만 추가한다.
- React는 사용자 화면을 담당한다.
- Express는 서버 요청 처리를 담당한다.
- React 개발 서버는 5173 포트를 사용한다.
- Express 개발 서버는 4000 포트를 사용한다.
- 프런트엔드는 기본 fetch로 API를 요청한다.
- 개발 중에는 Vite proxy를 사용해 /api 요청을 Express로 전달한다.
- 백엔드는 Express와 dotenv만 우선 사용한다.
- axios, 상태 관리, UI 라이브러리, DB, 로그인, AI 연결은 아직 추가하지 않는다.
- API 요청과 응답은 JSON 형식으로 사용한다.
- 먼저 GET /api/health 테스트 API를 만든다.

## 개발 규칙
- React 컴포넌트 이름은 PascalCase를 사용한다.
- 함수와 변수 이름은 camelCase를 사용한다.
- 상수는 UPPER_SNAKE_CASE를 사용한다.
- 커밋 메시지는 feat, fix, style, refactor, docs, chore 중 하나로 작성한다.
- 요청하지 않은 파일은 수정하지 않는다.
- 새로운 라이브러리를 임의로 설치하지 않는다.
- 코드 작성 전에 구현 이유, 다른 선택지, 작동 원리를 설명한다.

## 참고 문서
- 기획서: docs/plan.md
- 디자인: docs/design.md
- 디자인 작업은 default-design-rule Skill을 따른다.

