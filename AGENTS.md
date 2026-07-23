## 프로젝트

CareerSignal은 채용공고의 기준선과 편차를 해석해, 직무·기업군이 실제로 원하는 수준과 준비 방법을 알려주는 대학생 진로탐색 리서치 에이전트다.

- 정적 프로토타입 데모: https://careersignal-prototype.vercel.app/
- 프로토타입 데이터는 백엔드 신입·주니어 공고 30건을 가정한 mock 리서치다.

## 기술 스택과 영역

- `prototype/`: HTML/CSS 전용 정적 프로토타입. JavaScript와 React를 사용하지 않으며 독립적으로 배포한다.
- `project-intro/`: 프로젝트 소개 페이지 React 화면. 실제 서비스와 별개 산출물이며, 자체 `package.json`·`vite.config.js`를 갖는 독립 실행 환경이다.
- `product/`: 실제 서비스 React 코드. 마찬가지로 자체 `package.json`·`vite.config.js`를 갖는 독립 실행 환경이다.
- `server/`: product 전용 Express 백엔드. 역시 별도의 실행 환경·`package.json`을 유지한다.
- `prototype/`, `project-intro/`, `product/`, `server/`는 서로 다른 실행 환경이라 코드를 공유하지 않는다. 두 개 이상에서 실제 재사용이 필요해지면 그때 공유 방법(예: 워크스페이스, 패키지 추출)을 별도로 검토한다.
- `agent/`: AI 에이전트용 Python·FastAPI 서비스. LangChain·LangGraph로 오케스트레이션하며, Express가 내부 HTTP로 호출한다.
- DB: Supabase(Postgres + pgvector). 일반 화면은 사전 생성된 활성 분석 결과를 조회하고, 에이전트는 데이터 갱신과 사용자 공고 직접 입력 때 실행한다. `server/data/`의 JSON 파일은 샘플 데이터의 원본 fixture다.

## 프로토타입 배포

- Vercel 프로젝트는 `prototype/`을 Root Directory로 사용한다.
- 프로토타입 수정은 `day/YYMMDD` 작업 브랜치에 커밋하고 `origin`에 push한 뒤 배포 결과를 확인한다.
- 각 프로젝트는 실행과 배포에서 서로 의존하지 않는다.

## 컨벤션

- 커밋: 영어 Conventional Commit 메시지(`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)를 사용한다.
- 브랜치: `day/YYMMDD`. 그날 작업 전체를 담고 설명 접미사는 붙이지 않는다.
- PR: upstream의 `N086_박주현` 브랜치로 보낸다. PR 타이틀은 `[N086_박주현] - 요약` 형식이다. 교육 과정 규칙상 **하루에 PR은 한 번만** 보낸다.
- 업스트림 기준 브랜치: 이 교육 프로그램은 학생마다 upstream에 개인 브랜치를 두고 그 브랜치를 `main`처럼 사용한다. 나의 기준 브랜치는 `upstream/N086_박주현`이다. `day/YYMMDD` 브랜치를 새로 만들 때도, 최신화(`fetch`·`merge`)할 때도, PR을 보낼 때도 전부 `upstream/main`이 아니라 `upstream/N086_박주현`을 기준으로 한다.
- 오리진 기준 브랜치: 오리진(개인 GitHub 포크)의 기준 브랜치도 동일하게 `N086_박주현`이다. `day/YYMMDD` 브랜치를 새로 만들기 전에 로컬 `N086_박주현`을 `upstream/N086_박주현`으로 최신화하고, `origin`에도 push해 두 원격을 같은 상태로 맞춘다.
- 로컬 작업 브랜치: 하루 안에서도 성격이 다른 작업을 나눠 커밋하고 싶으면 `day/YYMMDD`에서 커밋 타입과 맞춘 이름(`feat/<설명>`, `fix/<설명>`, `docs/<설명>`, `chore/<설명>`, `refactor/<설명>`)으로 로컬 브랜치를 만들어 작업한다. 이 브랜치는 원격에 push하지 않는다. 작업이 끝나면 `git merge --no-ff`로 `day/YYMMDD`에 병합해 작업 단위 경계를 커밋 그래프에 남기고, 병합 후 로컬 브랜치는 삭제한다. 하루 PR이 한 번이므로 원격에는 병합이 끝난 `day/YYMMDD`만 push하고, 그 브랜치로 PR을 연다.
- git 명령어: 브랜치 전환·생성은 `git switch`(`git switch -c`), 파일 복원은 `git restore`를 쓴다. `git checkout`은 다른 브랜치의 파일 하나만 가져오는 것처럼 switch/restore로 표현이 안 되는 경우에만 쓴다.

### 하루 작업 흐름

1. `git switch N086_박주현` — 로컬 기준 브랜치로 전환한다.
2. `git pull upstream N086_박주현` — 로컬 기준 브랜치를 upstream 최신 상태로 맞춘다.
3. `git push origin N086_박주현` — 오리진(포크)도 같은 상태로 동기화한다.
4. `git switch -c day/YYMMDD` — 오늘 작업 브랜치를 로컬 `N086_박주현`에서 만든다.
5. 성격이 다른 작업 단위마다 `git switch -c <type>/<설명>`으로 로컬 브랜치를 만들어 커밋한다.
6. 작업이 끝난 로컬 브랜치는 `git switch day/YYMMDD`, `git merge --no-ff <type>/<설명>`, `git branch -d <type>/<설명>` 순서로 병합·삭제한다.
7. 하루 작업이 끝나면 `git push origin day/YYMMDD` 후 upstream의 `N086_박주현`으로 PR을 연다.

## 작업 방식

- 답변은 항상 존댓말로 한다.
- 사용자는 웹 개발이 처음이다. 새 파일·폴더의 위치와 이유를 짧게 설명한다.
- 브랜치 생성·전환, pull·push·merge·commit·rebase·reset 등 저장소 상태를 바꾸는 Git 명령은 사용자가 직접 실행한다. 제시할 때는 실행 순서, 짧은 설명, 예상 결과를 함께 제공하고, PowerShell 기준으로 한 줄씩 제시한다(`&&` 미지원).
- AI 도구는 `git status`·`git diff`·`git log`·`git show`·`git branch`·`git remote` 등 저장소를 변경하지 않는 읽기 전용 Git 명령으로 상태를 확인할 수 있다.
- 화면 구성은 판단용 HTML 시안(레포 밖, 커밋하지 않음)으로 사용자 확정을 받은 뒤 구현한다. `server/`·`agent/` 코드 변경 후에는 재시작이 필요함을 함께 안내한다.
- 파일 수정은 작업 범위 안에서 직접 수행한다. 삭제·이동·rename은 사용자의 명시적 요청과 대상 경로 확인 후 진행한다.
- 파일 작업은 커밋 가능한 단위로 나누고, 각 단위가 끝날 때 변경 범위와 권장 커밋 메시지를 사용자에게 안내한다.
- 정적 프로토타입은 JavaScript·동적 기능 없이 정보·스타일·화면 구성만 다룬다. 실제 동적 기능은 `product/`와 `server/`에서 구현한다.

## 문서 작성 규칙

`docs/`의 기획서·설계서 등 공식 문서에 적용한다.

- 공식 문서는 확정된 설계를 무시제·선언형으로만 기술한다. 작업 일지, 시행착오, 정정 과정, 해명("~가 아니라 ~", "예외 하나", "~를 완료했다", "남은 것은")을 쓰지 않는다.
- 진행 상태 표기(완료·진행 중·예정·확정·유력)는 `backlog.md`와 `checklist.md`에서만 쓴다. 다른 문서에서 상태가 필요하면 백로그를 링크한다.
- 편집자 논평과 수사("정직하게", "제대로", "깊이 있게")를 쓰지 않는다. 설계 근거가 필요하면 한 문장 이내로 남긴다.
- 문서는 작업한 시간 순서가 아니라 구조의 논리 순서(사용자 → 화면 → 백엔드 → 에이전트 → 데이터)로 조직한다.
- 문서를 수정하면 수정본 전체를 다시 읽고, 위 규칙 위반과 옛 용어 잔재를 점검한 뒤 마친다.

## 참고

- 기획서: docs/plan.md
- 설계: docs/architecture.md
- 에이전트 설계: docs/agent-design.md
- 데이터 전략: docs/data-strategy.md
- 디자인 컨셉: docs/design-concept.md
- 디자인 토큰: docs/design-tokens.md
- 개발 백로그: docs/backlog.md
- 체크리스트: docs/checklist.md
