# CI/CD

마지막 업데이트: 2026-07-27

## 이 문서의 목적

저장소에 있는 GitHub Actions와 로컬 검증 명령을 설명한다.

## 빠른 요약

`ci.yml`은 push와 pull request에서 lint → API typecheck → build → test를 수행하도록 정의되어 있으나 `.gitignore`가 이 파일을 제외한다. 따라서 원격에서 현재 실제로 실행 중인지는 코드만으로 단정할 수 없다.

## CI 파이프라인

```mermaid
flowchart LR
  Trigger[push 또는 pull_request] --> Checkout[actions/checkout@v4]
  Checkout --> Node[setup-node: .nvmrc, npm cache]
  Node --> Install[npm ci]
  Install --> Lint[npm run lint]
  Lint --> Types[npm run typecheck:api]
  Types --> Build[npm run build]
  Build --> Test[npm test]
```

|항목|구현|
|---|---|
|workflow|`.github/workflows/ci.yml`|
|trigger|모든 `push`, `pull_request`|
|동시 실행 제어|`ci-${{ github.ref }}`, 이전 실행 취소|
|Node|`.nvmrc`|
|검증|`npm ci`, lint, API typecheck, build, test|
|자동 병합|`.github/workflows/auto-merge.yml`가 매일 13:00 UTC 및 수동 실행에서 열린 PR을 처리|

## 배포 전략

`docs/CICD.md`에는 Vercel Git 연동, preview/production, Instant Rollback 계획이 기술돼 있으나, `vercel.json` 또는 Vercel 프로젝트 설정은 저장소에 없다. blue/green, rolling deployment의 구현 근거는 없다.

## 근거

- CI: `.github/workflows/ci.yml`
- 자동 병합: `.github/workflows/auto-merge.yml`
- workflow ignore: `.gitignore`
- 문서화된 배포 계획: `docs/CICD.md`

## 주의사항/함정

자동 병합 workflow는 `main` 대상 PR을 merge하지 않고 코멘트만 남기는 조건을 포함한다. 실제 보호 규칙/권한은 GitHub 설정에서 별도 확인해야 한다.

## TODO/확인 필요

- 원격 workflow 추적 여부, required check, Vercel 프로젝트/Production Branch/롤백 권한은 확인 필요.
