# Git PR Workflow

## Keywords

- fork
- upstream
- origin
- branch
- git status
- git add
- git commit
- git push
- safe.directory
- pull request
- base repository
- compare branch
- GitHub Wiki
- GitHub Issues
- GitHub Project
- showcase.json

## Why It Matters

코드 변경, 문서 갱신, Wiki 반영, Project 이슈 관리는 서로 다른 흐름이다. PR에는 저장소 파일 변경을 담고, Wiki나 Project 상태는 별도로 확인해야 한다.

## Reference Code Paths

- `docs/status.md`
- `docs/tasks.md`
- `docs/github-project-guide.md`
- `docs/project-knowledge-map.md`
- `showcase/showcase.json`
- `.github/`
- `AGENTS.md`

## Parts To Check

- `git -c safe.directory=D:/2026.1/AIAgentChallenge/hub status --short`
- modified와 untracked 파일의 차이
- PR 본문에 넣을 주요 작업, 설명 가능한 코드, 아직 이해 못 한 부분
- GitHub Project의 Priority, Week, Type, Status 필드
- showcase thumbnail과 screenshots 역할 차이
- Wiki 갱신은 PR diff와 별도라는 점

## ChatGPT Questions

- fork 기반 PR에서 base repository와 head repository 차이를 설명해줘.
- `safe.directory`가 필요한 상황을 Windows 로컬 저장소 기준으로 설명해줘.
- GitHub Issue와 GitHub Project의 역할 차이를 이 프로젝트 작업 흐름으로 설명해줘.
- PR 본문에서 “내가 설명할 수 있는 부분”을 코드 기준으로 쓰는 방법을 알려줘.
