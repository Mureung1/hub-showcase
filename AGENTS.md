# 오늘의 냉장고 Agent 개발 규칙

이 문서는 사람과 AI Agent가 저장소를 수정할 때 따라야 하는 기술 기준이다. UI는 `DESIGN.md`, 환경 설정과 결정 배경은 `docs/DEVELOPMENT_GUIDE.md`를 함께 참고한다.

## 프로젝트 원칙

- 프런트엔드는 React + Vite, API 서버는 Express를 사용한다.
- 패키지 관리자는 npm으로 통일하고 `package-lock.json`을 커밋한다.
- 새 라이브러리는 기존 기능으로 해결하기 어려운 명확한 이유가 있을 때만 추가한다.
- 비밀값, 개인 정보, 인증 토큰은 코드·로그·커밋에 남기지 않는다.

## 디렉터리 기준

```text
frontend/
  public/       정적 파일
  src/
    assets/     정적 이미지와 아이콘
    components/ 재사용 UI
    pages/      화면 단위 컴포넌트
    services/   API 요청 모듈
    hooks/      재사용 React 훅
    utils/      순수 유틸리티
backend/
  config/       환경변수와 실행 설정
  controllers/  HTTP 요청·응답 처리
  routes/       Express 라우트
  services/     비즈니스 로직
  repositories/ 데이터 접근
  middleware/   공통 요청 처리
  lib/          로거 등 기반 모듈
shared/         프런트엔드·백엔드 공통 규칙
tests/          단위·통합 테스트
docs/           Notion으로 옮길 수 있는 문서
```

- 폴더는 실제 파일이 생길 때 생성한다.
- React 컴포넌트는 `PascalCase.jsx`, 그 외 JavaScript는 `camelCase.js`를 사용한다.

## 라이브러리 기준

- UI: `react`, `react-dom`
- 빌드: `vite`, `@vitejs/plugin-react`
- API: `express`, `cors`
- 설정과 검증: `dotenv`, `zod`
- 로그: `pino`, `pino-http`
- 도구: `concurrently`, `oxlint`

추가 전 표준 API나 기존 의존성으로 해결 가능한지 확인한다. 유지보수 상태, 라이선스, 번들 크기와 보안을 검토하고 같은 목적의 라이브러리를 중복 도입하지 않는다. DB는 영속 저장 요구가 확정된 뒤 SQLite부터 검토한다.

## 코드 컨벤션

- ESM의 `import`/`export`만 사용한다.
- 문자열은 큰따옴표, 문장 끝에는 세미콜론을 사용한다.
- 이름은 역할을 드러내는 영어로 작성하고 불명확한 축약을 피한다.
- React API 호출은 `frontend/src/services/`에 둔다.
- 라우트는 경로 연결만 맡고 복잡한 로직은 service로 옮긴다.
- 입력값과 환경변수는 사용 전에 Zod로 검증한다.
- 주석은 결정 이유와 제약을 설명할 때만 작성한다.

## API 규칙

- 모든 경로는 `/api`로 시작하고 리소스는 복수 명사를 사용한다.
- 오류는 `{ "error": { "code": "CODE", "message": "설명" } }` 형식으로 반환한다.
- 상태 코드는 의미에 맞게 사용한다: 200 조회/수정, 201 생성, 204 삭제, 400 입력 오류, 404 없음, 409 충돌, 500 서버 오류.
- 비밀번호, 토큰, 내부 오류 스택을 응답에 노출하지 않는다.

## 환경변수 규칙

- 로컬 값은 `.env`에 저장하고 커밋하지 않는다.
- 안전한 예시는 `.env.example`에 유지한다.
- 변수를 추가하면 `.env.example`과 개발 가이드를 함께 수정한다.
- 서버 비밀값에 `VITE_`를 붙이지 않는다. 이 접두사의 값은 브라우저에 공개될 수 있다.
- 앱 시작 시 설정을 검증하고 잘못된 설정이면 즉시 종료한다.

## 로그 규칙

- 서버는 Pino JSON 로그를 사용한다. 로거 생성 전 치명적 오류 외에는 `console`을 사용하지 않는다.
- `debug`: 개발 진단, `info`: 정상 시작·종료와 상태 변화, `warn`: 복구 가능한 이상, `error`: 실패와 예외, `fatal`: 서비스 지속 불가.
- 메시지는 짧은 영어 문장으로 쓰고 검색할 필드는 객체로 전달한다.
- 요청 본문 전체, 인증 헤더, 쿠키, 비밀번호, 토큰, 개인 정보는 기록하지 않는다.
- 오류는 `logger.error({ err, requestId }, "...")`처럼 스택을 보존한다.

## Git 및 커밋 규칙

- 커밋 하나에는 논리적 변경 하나만 포함한다.
- 형식은 `<type>: <summary>`, type은 `feat`, `fix`, `docs`, `refactor`, `test`, `chore` 중 선택한다.
- 커밋 메시지의 type과 summary는 모두 영어로 작성한다.
- `dist/`, `node_modules/`, `.env`는 커밋하지 않는다.
- 커밋 전 `npm run lint`와 `npm run build`를 실행한다.
- 사용자 변경을 삭제하거나 관련 없는 파일을 함께 커밋하지 않는다.

## Agent 작업 절차와 완료 조건

1. `git status`와 관련 문서를 확인한다.
2. 요청 범위와 기존 변경을 구분하고 가장 작은 단위로 구현한다.
3. 환경변수, 오류 처리와 민감 정보 노출을 점검한다.
4. lint와 build를 실행한다.
5. 변경 파일과 검증 결과를 보고한다.
6. 명시적 요청이 있을 때만 커밋, 푸시, PR 생성 등 외부 변경을 수행한다.

완료 시 기능의 정상·실패 상태가 처리되고 lint와 build가 통과해야 한다. 설정이 바뀌면 문서와 `.env.example`을 갱신하고, UI 변경은 `DESIGN.md`를 따른다.
