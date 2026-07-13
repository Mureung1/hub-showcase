## 프로젝트
알바노트는 사장님과 알바생이 근무표, 공개 대타 요청, 근무 시간, 급여 계산, 알림을 한 곳에서 관리하는 React 기반 SPA 웹 서비스입니다.

## 기술 스택
- React + TypeScript (FE)
- Express (BE)
- Supabase(Postgres) (DB)

## 컨벤션
- 컴포넌트: PascalCase
- 커밋: feat / fix / refactor / docs
- 코드 작성 전: @docs/Architecture.md를 반드시 참고
- Architecture.md에 정의되지 않은 기능은 구현 전에 사용할 아키텍처 구조와 디자인 패턴을 먼저 지정
- 코드 작성과 커밋 전: @docs/Convention.md를 참고
- 개발 일정과 작업 우선순위는 @docs/DevelopmentBacklog.md를 참고
- 환경 변수, API Key, Secret 파일을 만들기 전: @docs/Security.md를 참고하고 필요한 제외 규칙을 .gitignore에 먼저 추가

## 하지 말 것
- any 타입 금지
- 외부 UI 라이브러리 금지 (별도 합의 전까지)

## 참고
- 기획서: @docs/mainplan.md
- 디자인: @docs/Design.md
- 아키텍처: @docs/Architecture.md
- 디렉토리/라이브러리: @docs/StructureAndLibraries.md
- 컨벤션/커밋: @docs/Convention.md
- 개발 백로그: @docs/DevelopmentBacklog.md
- 보안 규칙: @docs/Security.md
