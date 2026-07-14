## 프로젝트

CareerSignal은 채용공고의 반복 요구사항을 분석해 대학생의 취업 준비 우선순위와 학습 로드맵을 정리하는 프로젝트다.

- 정적 프로토타입 데모: https://careersignal-prototype.vercel.app/
- 현재 프로토타입 데이터는 주니어 프론트엔드 공고 24건을 가정한 mock 리서치다.

## 기술 스택과 영역

- `prototype/`: HTML/CSS 전용 정적 프로토타입. JavaScript와 React를 사용하지 않으며 독립적으로 배포한다.
- `project-intro/`: 프로젝트 소개 페이지 React 화면. 실제 서비스와 별개 산출물이며, 자체 `package.json`·`vite.config.js`를 갖는 독립 실행 환경이다.
- `product/`: 실제 서비스 React 코드. 마찬가지로 자체 `package.json`·`vite.config.js`를 갖는 독립 실행 환경이다.
- `server/`: product 전용 Express 백엔드. 역시 별도의 실행 환경·`package.json`을 유지한다.
- `prototype/`, `project-intro/`, `product/`, `server/`는 서로 다른 실행 환경이라 코드를 공유하지 않는다. 두 개 이상에서 실제 재사용이 필요해지면 그때 공유 방법(예: 워크스페이스, 패키지 추출)을 별도로 검토한다.
- 향후 검토: Agent 오케스트레이션(LangGraph/LangChain 후보), DB(SQLite/Postgres 후보).

## 프로토타입 배포

- Vercel 프로젝트는 `prototype/`을 Root Directory로 사용한다.
- 프로토타입 수정은 `day/YYMMDD` 작업 브랜치에 커밋하고 `origin`에 push한 뒤 배포 결과를 확인한다.
- 각 프로젝트는 실행과 배포에서 서로 의존하지 않는다.

## 컨벤션

- 커밋: 영어 Conventional Commit 메시지(`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)를 사용한다.
- 브랜치: `day/YYMMDD`. 그날 작업 전체를 담고 설명 접미사는 붙이지 않는다.
- PR: upstream의 `N086_박주현` 브랜치로 보낸다. PR 타이틀은 `[N086_박주현] - 요약` 형식이다.
- 업스트림 기준 브랜치: 이 교육 프로그램은 학생마다 upstream에 개인 브랜치를 두고 그 브랜치를 `main`처럼 사용한다. 나의 기준 브랜치는 `upstream/N086_박주현`이다. `day/YYMMDD` 브랜치를 새로 만들 때도, 최신화(`fetch`·`merge`)할 때도, PR을 보낼 때도 전부 `upstream/main`이 아니라 `upstream/N086_박주현`을 기준으로 한다.

## 작업 방식

- 사용자는 웹 개발이 처음이다. 새 파일·폴더의 위치와 이유를 짧게 설명한다.
- Git·터미널 명령어는 사용자가 직접 실행한다. 제시할 때는 실행 순서, 짧은 설명, 예상 결과를 함께 제공한다.
- 파일 수정은 작업 범위 안에서 직접 수행한다. 삭제·이동·rename은 사용자의 명시적 요청과 대상 경로 확인 후 진행한다.
- 정적 프로토타입은 기능 확장 없이 정보·스타일 수정만 허용한다. 실제 동적 기능은 `product/`와 `server/`에서 구현한다.

## 참고

- 기획서: docs/plan.md
- 설계: docs/architecture.md
- 디자인 컨셉: docs/design-concept.md
- 디자인 토큰: docs/design-tokens.md
- 체크리스트: docs/checklist.md
