# Development

## 설치 방법

```bash
npm install
```

CI나 깨끗한 설치가 필요할 때는 lockfile을 기준으로 설치합니다.

```bash
npm ci
```

## 개발 서버 실행 방법

```bash
npm run dev
```

Windows PowerShell에서 `npm.ps1` 실행 정책 오류가 나면 다음처럼 실행합니다.

```powershell
cmd /c npm run dev
```

## 기본 명령

```bash
npm run lint
npm run build
npm run verify
```

현재 테스트 스크립트는 없습니다. `npm run verify`는 지금 실제로 지원되는 `lint`와 `build`만 실행합니다.

## 브랜치 생성 방법

브랜치는 한 가지 주요 목적만 담습니다.

```bash
git switch -c codex/작업-이름
```

이미 브랜치가 있다면 현재 브랜치와 작업 트리를 먼저 확인합니다.

```bash
git status --short --branch
```

## 작업 후 검증 방법

구현 또는 문서 하네스 변경 후 다음 명령을 실행합니다.

```bash
npm run verify
```

PowerShell에서 막히면 다음 명령을 사용합니다.

```powershell
cmd /c npm run verify
```

개발 서버 시작 가능 여부는 다음 명령으로 확인합니다.

```powershell
cmd /c npm run dev
```

서버가 정상적으로 시작되면 종료해도 됩니다.

## Pull Request 전 확인 사항

- 브랜치 목적이 하나인지 확인합니다.
- 제품 기능, 문서, 도구 설정이 불필요하게 섞이지 않았는지 확인합니다.
- `npm run verify`가 통과했는지 확인합니다.
- 새 의존성을 추가했다면 이유와 영향을 설명합니다.
- 사용자가 요청하지 않았다면 commit, push, Pull Request 생성, merge를 하지 않습니다.

## Windows PowerShell에서 사용하는 명령

PowerShell 실행 정책 때문에 `npm` 대신 `cmd /c npm ...`가 필요할 수 있습니다.

```powershell
cmd /c npm install
cmd /c npm run dev
cmd /c npm run lint
cmd /c npm run build
cmd /c npm run verify
```

## 일반적인 작업 흐름

1. `AGENTS.md`, `docs/PRODUCT.md`, `ARCHITECTURE.md`, `docs/DEVELOPMENT.md`를 확인합니다.
2. 관련 기획 문서와 현재 코드를 읽습니다.
3. 필요한 범위만 작게 수정합니다.
4. 새 라이브러리는 실제 필요가 있을 때만 추가합니다.
5. `npm run verify`를 실행합니다.
6. 개발 서버 시작 가능 여부가 필요한 작업이면 `npm run dev`로 확인합니다.
7. 변경 파일과 검증 결과를 보고합니다.
