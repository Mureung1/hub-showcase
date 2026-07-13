## 프로젝트
온라인 초단기 모임 매칭 서비스

## 기술 스택
- React + TypeScript (FE)
- Express (BE)
- Supabase(Postgres) (DB)

## 컨벤션
- 컴포넌트: PascalCase
- 커밋: feat / fix / refactor / docs

## 하지 말 것
- any 타입 금지
- 외부 UI 라이브러리 금지 (별도 합의 전까지)
- .env 등 민감 정보/시크릿 파일 커밋 금지
- console.log 등 디버그 코드 커밋 금지
- 별도 합의 없이 새로운 패키지(의존성) 추가 금지
- 마이그레이션 없이 Supabase 스키마 직접 변경 금지
- main 브랜치 직접 푸시 금지 (PR 없이)

## 참고
- [기획서](./docs/plan.md)
- [디자인 시스템](./prompts/designsystem.md)
