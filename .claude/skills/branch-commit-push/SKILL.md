---
name: branch-commit-push
description: 이 레포의 브랜치 생성 · 커밋 분리 · 푸시 규약을 따라 작업을 정리한다. "커밋해줘", "브랜치 만들어줘", "푸시해줘", "PR 준비해줘" 같은 요청에 사용한다.
---

# 브랜치 · 커밋 · 푸시 워크플로

이 레포(`naruv0134/hub`, upstream `connect-AIAgentChallenge-26-1/hub`)의 기존 관행을 그대로 따른다. 새 규칙을 발명하지 않는다.

## 1. 브랜치

- 이름 규칙: `feature/<slug>` (예: `feature/backend-analysis-api`, `feature/showcase-and-fixes`). `git log`·`git branch`로 확인된 실제 패턴.
- **`main`에서 직접 작업하지 않는다.** `main`은 `.github/workflows/auto-merge.yml`이 base로 감지하면 자동 머지 대상에서 **제외**하므로, 작업 브랜치가 실수로 `main`이면 이후 PR 자동화가 조용히 멈춘다.
- 이미 알맞은 feature 브랜치 위에 있고 변경 내용이 그 브랜치의 목적과 맞으면 **새 브랜치를 만들지 않고 그대로 이어서 커밋한다.** 브랜치를 매번 새로 파는 것이 목적이 아니라, 변경 성격에 맞는 브랜치 위에 있는 것이 목적이다.
- 새로 팔 때: `git checkout -b feature/<slug>` (base는 보통 `main`이지만, 이어서 작업 중인 브랜치가 있으면 그 위에서 분기할지 확인).

## 2. 커밋 — 반드시 분리한다

`git status`로 스테이징/미스테이징/추적 안 됨을 전부 확인한 뒤, **성격이 다른 변경을 하나의 커밋에 섞지 않는다.** `git add -A`/`git add .` 금지 — 파일을 이름으로 지정해서 add 한다.

커밋 메시지 접두사 (이 레포 `git log` 기준 확정 관행):

| 접두사 | 용도 |
|---|---|
| `feat:` | 새 기능. WBS Task 번호가 있으면 `feat: 요약 (Task N)` |
| `test:` | 테스트 추가/보강 |
| `fix:` | 버그 수정 |
| `docs:` | 문서 전용 변경 |
| `style:` | 디자인 토큰·CSS·포맷팅 (로직 변경 없음) |
| `chore:` | 설정 파일, 도구 설치, 빌드 스크립트 등 |

분리 판단 기준: "이 커밋 하나만 리버트했을 때 다른 의도가 같이 사라지는가?" 그렇다면 아직 안 쪼개진 것이다.

## 3. 푸시 — 항상 확인받는다

- `main`에는 절대 직접 푸시하지 않는다.
- **로컬 커밋까지는 자율적으로 진행해도 되지만, `git push`는 실행 직전에 반드시 사용자에게 브랜치명·커밋 목록을 보여주고 확인받는다.** 푸시는 원격(공유 상태)에 영향을 주는 되돌리기 어려운 동작이기 때문이다.
- 첫 푸시는 `git push -u origin <branch>`.
- `gh` CLI가 이 환경에 설치되어 있지 않다(확인됨, `winget install GitHub.cli`로 설치 가능). 따라서 PR은 **직접 만들지 않고**, 푸시 후 GitHub compare URL(`https://github.com/naruv0134/hub/compare/main...<branch>`)을 안내해 사람이 만들게 한다.
- PR을 만들 때는 `.github/pull_request_template.md`의 4섹션(주요 작업 리스트 / 내가 설명할 수 있는 부분 / 아직 이해 못 한 부분 / 새로 알게 된 것)을 그대로 채운다. 타이틀 형식은 `[루카스ID_실명] 한 문장 요약` — 이 값은 아직 `CLAUDE.md`에 고정되어 있지 않으므로 **첫 실행 시 사용자에게 확인**한 뒤 기록해 재사용한다.

## 4. 안전 원칙

- `git status` 없이 `add`/`commit`/`push`를 진행하지 않는다.
- 스테이징 후 `git diff --cached`로 실제 내용을 확인하고, `.env`·키·토큰처럼 보이는 내용이 있으면 파일명이 무해해 보여도 커밋하지 않는다.
- `--force`, `reset --hard`, `-i`(interactive) 옵션은 사용하지 않는다.
- 커밋은 새로 쌓는 것이 기본이다. `--amend`는 사용자가 명시적으로 요청했을 때만.
