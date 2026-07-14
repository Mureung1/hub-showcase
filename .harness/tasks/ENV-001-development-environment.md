# Task Packet: ENV-001

## 1. Summary

```text
Task: LocalTwin 개발환경과 실행 가능한 web/api scaffold 구성
Type: chore
Owner: Codex
Status: done
```

## 2. Goal

```text
제품 기능 구현 전에 React와 FastAPI를 독립적으로 실행하고
format, lint, typecheck, test, build를 한 진입점에서 검증할 수 있게 한다.
```

## 3. Scope

포함:

```text
pnpm React/Vite/TypeScript web scaffold
uv FastAPI api scaffold
공통 환경변수와 ignore 규칙
format, lint, typecheck, test, build, CI
디렉터리, 라이브러리, 컨벤션과 사전 결정 문서
```

제외:

```text
상권 분석 제품 기능
MapLibre 지도 화면
실제 공공데이터 연동
Gaussian Splatting viewer
배포 환경
```

## 4. Related Documents

```text
docs/development/harness.md
docs/development/git-workflow.md
docs/development/environment.md
docs/development/conventions.md
docs/development/pre-development-decisions.md
docs/development/validation.md
docs/development/checklist.md
docs/design/design-system.md
docs/features/market-map-experience.md
```

## 5. Expected Changes

예상 변경 영역:

```text
api: FastAPI health endpoint와 test scaffold
web: React application shell과 smoke test
data: raw/processed/scenes placeholder
docs: environment, conventions, pre-development decisions
tests: web render test와 API health test
scripts: 전체 검증 진입점 확장
```

## 6. Acceptance Criteria

- [x] `product/apps/web`이 typecheck, test와 production build를 통과한다.
- [x] `product/apps/api`의 `/health` test가 통과한다.
- [x] 루트 검증 명령이 docs, web와 api를 모두 확인한다.
- [x] directory, dependency, convention과 사전 결정이 문서화된다.
- [x] 제품 prototype 또는 실제 데이터 연동이 포함되지 않는다.

## 7. Verification Plan

실행할 검증 명령:

```powershell
pnpm install --frozen-lockfile
uv sync --directory product/apps/api --frozen
powershell -ExecutionPolicy Bypass -File scripts/check.ps1
```

수동 확인:

```text
생성된 application shell에 prototype 기능이 포함되지 않았는지 확인한다.
untracked 사용자 prototype 파일이 커밋에 포함되지 않았는지 확인한다.
```

## 8. Documentation Updates

- [x] 코드/스크립트 변경 시 관련 문서 또는 `.harness` 기록을 같은 커밋에 포함
- [x] README와 Wiki Home에서 신규 개발문서 연결
- [x] 이번 환경 작업에서 기능 spec 갱신이 불필요함을 확인
- [x] 실제 데이터 연동이 없어 data mapping 갱신이 불필요함을 확인
- [x] 개발 체크리스트 갱신
- [x] 사전 결정 Gate 문서 추가, failure log 갱신은 불필요함을 확인

## 9. Commit Plan

예상 커밋 메시지:

```text
chore(web): scaffold the React application
chore(api): scaffold the FastAPI application
test(tooling): add repository validation
docs(development): document the development environment
docs: define development conventions
docs: record pre-development decision gates
docs: define the develop branch workflow
docs: link development environment guidance
```

## 10. Self-check

- [x] 한 기능/한 버그/한 문서 단위인가?
- [x] 관련 없는 파일을 변경하지 않았는가?
- [x] 검증 결과를 run report에 기록했는가?
- [x] 문서와 체크리스트가 실제 변경과 일치하는가?
- [x] local known limitation을 run report에 적었는가?
- [ ] 원격 CI 결과와 GitHub branch protection은 push 후 별도로 확인한다.
