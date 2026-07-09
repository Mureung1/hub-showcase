# PR Guide

## 1. PR 전 확인

PR 작업 전에는 반드시 저장소 위치, 브랜치, 변경 파일, 최근 커밋, 빌드 상태를 확인한다.

```bash
pwd
git status
git branch --show-current
git log --oneline -5
npm run build
npm run lint
```

확인 기준:

- 현재 경로가 `/Users/bricepark/Documents/hub`인지 확인한다.
- 현재 브랜치가 의도한 브랜치인지 확인한다. 일반적으로 새 PR은 `work` 기준으로 만든다.
- `git status`에서 PR에 포함할 파일과 제외할 파일을 구분한다.
- `package.json`, `package-lock.json`이 불필요하게 변경되지 않았는지 확인한다.
- `node_modules`, `.DS_Store`, `dist`, 임시파일, 개인 환경 파일은 포함하지 않는다.

## 2. Build and lint

`package.json`에 정의된 명령을 기준으로 검증한다.

```bash
npm run build
npm run lint
```

`npm run lint`가 없거나 기존 문제로 실패하면, 실패 이유와 현재 PR 범위와의 관련 여부를 보고한다.

## 3. Stage and commit

커밋 전에는 사용자에게 승인된 파일만 stage한다.

```bash
git add <approved-files>
git diff --cached --stat
git diff --cached --name-only
git commit -m "feat: MBTI 공부법 스트레스 관리 웹앱 기획서 및 프로토타입 구현"
```

규칙:

- stage 파일 목록을 커밋 전 확인한다.
- `node_modules`, `.DS_Store`, `dist`, 임시파일은 stage하지 않는다.
- 불필요한 `package.json`, `package-lock.json` 변경은 stage하지 않는다.
- amend, rebase, force push는 사용자 명시 허가 없이는 사용하지 않는다.

## 4. Push

push 전에는 현재 브랜치를 다시 확인한다.

```bash
git branch --show-current
git push origin work
```

현재 브랜치가 `work`가 아니라면, 실제 브랜치명을 기준으로 push하되 사용자 확인을 먼저 받는다. force push는 사용자 명시 허가 없이 사용하지 않는다.

## 5. GitHub CLI 준비

GitHub CLI가 있는지 확인한다.

```bash
gh --version
gh auth status
```

`gh`가 없고 Homebrew가 있다면 설치할 수 있다.

```bash
brew install gh
```

인증은 사용자가 요청했을 때만 진행한다.

```bash
gh auth login
```

## 6. PR 본문 파일 만들기

긴 PR 본문을 `gh pr create --body`에 직접 넣으면 줄바꿈, 따옴표, 한글 문자가 깨지거나 쉘에서 의도치 않게 해석될 수 있다. 긴 본문은 파일로 만든 뒤 `--body-file`로 전달한다.

예시 본문 파일:

```markdown
## 요약
- AGENTS.md와 CLAUDE.md의 프로젝트 원칙을 한국어로 명확히 보강했습니다.
- docs/pr-guide.md에 gh 자동화와 수동 PR 생성 절차를 정리했습니다.
- create-pr Skill에 stage, commit, push, gh 인증, PR 생성 규칙을 보강했습니다.

## 검증
- npm run build 성공
- npm run lint 성공
- git status 확인

## 제외
- README.md, docs/plan.md, docs/checklist.md는 수정하지 않았습니다.
- src/, package.json, package-lock.json은 수정하지 않았습니다.
```

파일 경로는 작업 목적에 맞게 정하되, 임시 본문 파일을 커밋하지 않는다.

## 7. gh로 PR 생성

아직 사용자가 명시적으로 요청하지 않았다면 실행하지 않는다.

```bash
gh pr create   --repo connect-AIAgentChallenge-26-1/hub   --base "N077_박병관"   --head "bricepark94:work"   --title "MBTI 기반 공부법 및 스트레스 관리 웹앱 가이드 보강"   --body-file /tmp/hub-pr-body.md
```

권장 기준:

- base repository: `connect-AIAgentChallenge-26-1/hub`
- base branch: `N077_박병관`
- head repository/branch: `bricepark94:work`

## 8. gh 없이 웹에서 PR 만들기

`gh`가 없거나 인증이 불가능하면 GitHub 웹에서 PR을 만든다.

1. 아래 compare URL을 연다.
2. base repository와 base branch를 확인한다.
3. head repository와 head branch를 확인한다.
4. 제목과 본문을 입력한다.
5. 변경 파일 목록과 검증 결과를 확인한 뒤 PR을 생성한다.

Compare URL:

https://github.com/connect-AIAgentChallenge-26-1/hub/compare/N077_%EB%B0%95%EB%B3%91%EA%B4%80...bricepark94:hub:work

확인값:

- base repository: `connect-AIAgentChallenge-26-1/hub`
- base branch: `N077_박병관`
- head repository/branch: `bricepark94:work`

## 9. 기존 PR 업데이트 vs 새 PR

새 PR을 권장하는 경우:

- 기존 PR head 브랜치에 최신 작업 커밋이 포함되어 있지 않다.
- 기존 PR 브랜치명에 hidden character 경고가 있다.
- `bricepark94:work` 기준으로 깨끗한 PR을 만들 수 있다.

기존 PR 업데이트를 고려하는 경우:

- 사용자가 기존 PR 업데이트를 명시적으로 요청한다.
- 기존 PR 브랜치명을 정확히 확인했다.
- fast-forward 또는 안전한 방식으로 업데이트할 수 있다.

## 10. Hidden-character branch names

브랜치명에 한글이 있거나 GitHub가 hidden character를 경고하면 다음을 지킨다.

- `git ls-remote --heads origin`으로 실제 브랜치명을 확인한다.
- 쉘 명령에서는 브랜치명을 따옴표로 감싼다.
- force push를 피한다.
- 가능하면 `work`처럼 ASCII 브랜치를 head로 사용해 새 PR을 만든다.

## 11. 보고할 URL

PR 준비 또는 생성 후에는 아래 URL을 보고한다.

- 저장소 URL: https://github.com/bricepark94/hub
- GitHub에서 확인할 저장소 URL: https://github.com/bricepark94/hub/tree/work
- 기획서 URL: https://github.com/bricepark94/hub/blob/work/docs/plan.md
- 체크리스트 URL: https://github.com/bricepark94/hub/blob/work/docs/checklist.md
