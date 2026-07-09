---
name: create-pr
description: Prepare commit, push, and pull request workflows for the MBTI study webapp repo. Use when Codex needs to verify branch state, stage only intended files, commit, push, check existing PR branch inclusion, decide between a new PR and an existing PR update, or provide gh/web PR creation commands.
---

# Create PR

## Read first

PR 작업 전 아래 문서를 읽는다.

1. `docs/pr-guide.md`
2. `docs/context.md`
3. `docs/plan.md`
4. `docs/checklist.md`

## Verify before commit or PR

먼저 읽기 전용 확인을 수행한다.

```bash
pwd
git status
git status --short --branch
git branch --show-current
git remote -v
git log --oneline -5
npm run build
npm run lint
```

확인할 내용:

- 현재 경로가 `/Users/bricepark/Documents/hub`인지 확인한다.
- 현재 브랜치가 의도한 브랜치인지 확인한다.
- 최근 커밋에 PR에 넣을 작업이 포함되어 있는지 확인한다.
- build/lint 결과를 보고한다.

## Stage rules

- 사용자가 승인한 파일만 stage한다.
- `node_modules`, `.DS_Store`, `dist`, 임시파일, 개인 환경 파일은 stage하지 않는다.
- 불필요한 `package.json`, `package-lock.json` 변경은 stage하지 않는다.
- 커밋 전 `git diff --cached --stat`와 `git diff --cached --name-only`를 확인한다.

## Commit rules

- 커밋 메시지는 변경 범위를 간결하게 설명한다.
- 예: `feat: MBTI 공부법 스트레스 관리 웹앱 가이드 보강`
- amend, rebase, squash는 사용자 요청이 있을 때만 진행한다.

## Push rules

- push는 커밋 후 사용자 승인이 있을 때만 진행한다.
- 현재 브랜치가 `work`라면 `git push origin work`를 사용한다.
- 현재 브랜치가 다르면 실제 브랜치명을 기준으로 push하되 사용자 확인을 먼저 받는다.
- force push는 사용자 명시 허가 없이 사용하지 않는다.

## PR branch checks

기존 PR에 특정 커밋이 포함되어 있는지 확인할 때는 먼저 읽기 전용 명령만 사용한다.

```bash
git ls-remote --heads origin
git merge-base --is-ancestor <commit> origin/work
git merge-base --is-ancestor <commit> origin/<branch>
```

반환 코드 `0`은 포함, `1`은 미포함으로 해석한다.

## GitHub CLI checks

GitHub CLI 사용 가능 여부와 인증 상태를 확인한다.

```bash
gh --version
gh auth status
```

`gh`가 없고 Homebrew가 있다면 사용자 승인 후 설치할 수 있다.

```bash
brew install gh
```

인증은 사용자가 요청한 경우에만 진행한다.

```bash
gh auth login
```

## PR body file

긴 PR 본문은 inline `--body` 대신 파일로 작성하고 `--body-file`로 전달한다. inline 본문은 줄바꿈, 따옴표, 한글 문자 때문에 깨질 수 있다.

예시:

```bash
gh pr create   --repo connect-AIAgentChallenge-26-1/hub   --base "N077_박병관"   --head "bricepark94:work"   --title "MBTI 기반 공부법 및 스트레스 관리 웹앱 가이드 보강"   --body-file /tmp/hub-pr-body.md
```

임시 PR 본문 파일은 커밋하지 않는다.

## Recommended PR target

- Base repository: `connect-AIAgentChallenge-26-1/hub`
- Base branch: `N077_박병관`
- Head repository/branch: `bricepark94:work`

## Web PR fallback

`gh`가 없거나 인증할 수 없으면 GitHub 웹 compare URL로 PR을 만든다.

https://github.com/connect-AIAgentChallenge-26-1/hub/compare/N077_%EB%B0%95%EB%B3%91%EA%B4%80...bricepark94:hub:work

웹에서 확인할 값:

- base repository: `connect-AIAgentChallenge-26-1/hub`
- base branch: `N077_박병관`
- head repository/branch: `bricepark94:work`

## Report after PR preparation

PR 준비 또는 생성 후 아래 항목을 보고한다.

- 현재 브랜치
- 원격 저장소 URL
- 저장소 URL
- 기획서 URL
- 체크리스트 URL
- build/lint 결과
- 커밋에 포함한 파일과 제외한 파일
- 새 PR인지 기존 PR 업데이트인지
