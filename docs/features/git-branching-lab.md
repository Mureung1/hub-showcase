# Git Branching Lab

## 목적

Git Branching Lab은 ICU 안에서 Git 커밋, 브랜치, 체크아웃, 머지를 명령어로 실습하는 학습 시뮬레이터입니다. 사용자는 터미널에 Git 명령어를 입력하고, 오른쪽 SVG 커밋 그래프에서 상태 변화를 즉시 확인합니다.

컨셉은 `Learn Git Branching`과 비슷하지만, 화면 톤은 게임보다 ICU 학습 워크스페이스에 맞춥니다. 터미널, 현재 그래프, 목표 그래프, 레벨 상태를 한 화면에 두어 초보자가 명령어와 그래프 변화를 같이 이해하도록 설계합니다.

- 라우트: `/git-lab`
- route component: `GitLabPage`
- export entry: `src/features/git-lab/index.ts`

## 현재 구현 범위

지원하는 Git 명령어:

- `git commit`
- `git branch <name>`
- `git checkout <name>`
- `git checkout -b <name>`
- `git merge <name>`
- `git log`

지원하는 UI 명령어:

- `level <id>`: 레벨 로드
- `hint`: 현재 레벨 힌트 출력

현재 MVP에는 `rebase`, `reset`, `cherry-pick`, `tag`, remote 명령, 실제 파일 변경, 실제 `git` CLI 실행을 포함하지 않습니다.

## 화면 구성

### 레벨 타이틀 바

- 현재 레벨 제목과 상태를 보여줍니다.
- 목표 패널 숨기기/보기 토글을 제공합니다.
- 완료 시 클리어 상태와 다음 행동을 보여줍니다.

### 좌측 터미널 패널

- macOS 스타일 헤더와 명령어 입력창을 사용합니다.
- Enter 입력 시 명령어를 실행하고 로그 히스토리에 결과를 누적합니다.
- 성공, 실패, 힌트, 시스템 메시지를 텍스트로 구분합니다.
- 로그 영역은 `aria-live`로 업데이트되도록 유지합니다.

### 중앙/우측 현재 그래프 패널

- React + SVG로 현재 커밋 그래프를 렌더링합니다.
- 커밋 노드는 원형, 기본 배경은 `#90EE90`, 텍스트는 커밋 ID입니다.
- 부모에서 자식 방향으로 검은색 화살표를 그립니다.
- 브랜치는 lane 단위 x좌표로 분기해 겹침을 줄입니다.
- 현재 체크아웃된 브랜치는 `main*`처럼 별표가 붙은 초록색 말풍선 라벨로 표시합니다.
- 새 커밋은 CSS transition으로 부드럽게 등장합니다.

### 목표 패널

- 레벨별 목표 그래프를 JSON 데이터로 정의하고 같은 SVG 컴포넌트로 미리 보여줍니다.
- 현재 그래프와 목표 그래프가 구조적으로 같으면 클리어 처리합니다.
- 클리어 시 축하 모달을 표시합니다.

## 상태 관리 설계

Git 엔진은 React에 의존하지 않는 순수 TypeScript 함수로 유지합니다. UI는 엔진 결과를 받아 화면 상태와 로그만 갱신합니다.

```ts
type GitEngineState = {
  commits: Array<{ id: string; parents: string[] }>
  branches: Array<{ name: string; commitId: string | null }>
  head:
    | { type: 'branch'; branchName: string }
    | { type: 'detached'; commitId: string | null }
  nextCommitIndex: number
}
```

이 구조를 선택한 이유:

- `commits` 배열은 생성 순서와 테스트 스냅샷을 확인하기 쉽습니다.
- `parents` 배열은 일반 커밋과 merge commit을 같은 구조로 표현합니다.
- `branches` 배열은 브랜치 이름과 현재 가리키는 커밋을 명확히 분리합니다.
- `head`는 현재 checkout 상태를 별도 포인터로 관리합니다.
- `nextCommitIndex`는 `C0`, `C1`, `C2` 같은 학습용 커밋 ID를 안정적으로 생성합니다.

## 명령어 처리 흐름

명령어 처리는 `parse -> execute -> result` 흐름입니다.

1. 입력 문자열을 trim하고 공백 기준으로 토큰화합니다.
2. `git` 접두어와 명령어 이름을 검사합니다.
3. 지원하지 않는 명령어는 실패 결과를 반환합니다.
4. 성공한 명령어는 새 `GitEngineState`와 사용자 로그 메시지를 반환합니다.
5. UI 명령어인 `level`, `hint`는 React 화면 계층에서 처리합니다.

명령별 상태 변화:

- `git commit`: 현재 HEAD 커밋을 parent로 하는 새 커밋을 만들고, 현재 브랜치가 있으면 그 브랜치를 새 커밋으로 이동합니다.
- `git branch <name>`: 현재 HEAD 커밋을 가리키는 새 브랜치를 만듭니다.
- `git checkout <name>`: 존재하는 브랜치로 HEAD를 이동합니다.
- `git checkout -b <name>`: 현재 HEAD 위치에서 새 브랜치를 만들고 즉시 checkout합니다.
- `git merge <name>`: 현재 브랜치 head와 대상 브랜치 head를 부모로 갖는 merge commit을 만듭니다.
- `git log`: 현재 커밋 목록과 브랜치 포인터를 로그 문자열로 반환합니다.

## 그래프 어댑터와 시각화

엔진 상태는 시각화 컴포넌트가 바로 쓰는 형태와 다르므로 adapter를 둡니다.

- `createGraphSnapshotFromEngineState(state)`: 엔진 상태를 SVG 그래프 snapshot으로 변환합니다.
- `createEngineStateFromSnapshot(snapshot)`: 레벨 초기 상태를 엔진 상태로 변환합니다.
- 빈 브랜치 또는 커밋을 가리키지 않는 브랜치는 그래프 라벨에서 제외합니다.

SVG 좌표 계산은 `layout/calculateCommitGraphLayout.ts`에서 담당합니다.

레이아웃 규칙:

- 브랜치 이름별로 lane을 할당합니다.
- `main`은 기본 lane에 둡니다.
- 다른 브랜치는 별도 x좌표 lane으로 배치합니다.
- y좌표는 커밋 생성 순서 또는 그래프 순서를 기준으로 아래 방향으로 진행합니다.
- merge edge는 부모가 여러 개인 경우 각각 화살표로 연결합니다.

## 레벨 시스템

레벨 데이터는 `src/features/git-lab/levels/gitLabLevels.json`에 둡니다.

현재 레벨 예시:

- `intro1`: `git commit`을 두 번 실행해 `C0 -> C1`을 만듭니다.
- `branch1`: `git branch feature`로 `main`과 `feature`가 같은 커밋을 가리키게 합니다.
- `checkout1`: `git checkout -b feature` 후 `git commit`으로 feature 브랜치만 전진시킵니다.
- `merge1`: feature와 main에서 각각 커밋한 뒤 `git merge feature`로 merge commit을 만듭니다.

레벨 데이터는 다음 정보를 포함합니다.

```ts
type GitLabLevel = {
  id: string
  title: string
  description: string
  goalDescription: string
  initialGraph: GraphSnapshot
  targetGraph: GraphSnapshot
  hints: string[]
}
```

## 목표 비교 로직

목표 비교는 좌표가 아니라 구조를 비교합니다.

비교 기준:

- 커밋 개수
- 각 커밋의 부모 관계
- 브랜치 이름과 브랜치가 가리키는 커밋
- 현재 checkout된 브랜치 또는 HEAD 위치

비교 결과는 단순 boolean이 아니라 UI 메시지를 만들 수 있는 세부 결과를 반환합니다.

```ts
type GoalCheckResult = {
  cleared: boolean
  message: string
  missingBranches: string[]
  unexpectedBranches: string[]
  structureMismatch: boolean
  headMismatch: boolean
}
```

## 현재 폴더 구조

```txt
src/features/git-lab/
  GitLabPage.tsx
  GitLabPage.module.css
  index.ts

  components/
    CommitGraphSvg.tsx
    CommitGraphSvg.module.css
    GitTerminalPanel.tsx
    GitTerminalPanel.module.css
    GoalPanel.tsx
    GoalPanel.module.css

  engine/
    compareGoalGraph.ts
    gitEngine.ts
    gitEngine.test.ts
    gitGraphAdapter.ts
    gitGraphAdapter.test.ts

  layout/
    calculateCommitGraphLayout.ts

  levels/
    gitLabLevels.json
```

## 모듈 역할

- `GitLabPage.tsx`: 레벨 선택, 엔진 상태, 터미널 로그, 목표 비교, 클리어 모달을 조립합니다.
- `GitTerminalPanel.tsx`: 명령어 입력, 로그 히스토리, 힌트/레벨 명령 UI를 담당합니다.
- `CommitGraphSvg.tsx`: 현재 또는 목표 커밋 그래프를 SVG로 렌더링합니다.
- `GoalPanel.tsx`: 목표 설명, 목표 그래프, 현재 일치 여부를 보여줍니다.
- `gitEngine.ts`: React 의존 없는 순수 Git 명령어 파서와 상태 변경 로직입니다.
- `gitGraphAdapter.ts`: 엔진 상태와 화면 그래프 snapshot 사이를 변환합니다.
- `compareGoalGraph.ts`: 현재 그래프와 목표 그래프의 구조적 일치 여부를 계산합니다.
- `calculateCommitGraphLayout.ts`: 브랜치 lane 기반 SVG 좌표를 계산합니다.
- `gitLabLevels.json`: 레벨별 초기 그래프, 목표 그래프, 힌트, 설명을 정의합니다.

## 브랜드 및 UI 기준

Git Lab은 기존 Learning 화면의 브랜드 배경을 따릅니다.

- 전체 배경은 orange, pink, cyan, deep blue가 섞인 Workday 참고 계열의 브랜드 그라데이션을 사용합니다.
- 터미널은 dark editor surface를 사용해 학습 화면의 코드 영역과 연결합니다.
- 그래프 패널은 흰색 또는 밝은 surface를 사용해 노드와 화살표를 읽기 쉽게 둡니다.
- 목표 패널은 부드러운 pink surface를 사용하되 텍스트 대비를 유지합니다.
- radius는 8px 이하를 기본으로 합니다.
- 명령어, 커밋 ID, 로그는 monospace를 사용합니다.
- 설명 문구는 AI 느낌을 줄이고, 학습자가 지금 해야 할 행동을 직접 안내하는 톤으로 작성합니다.

## 검증 기준

코드 변경 시 다음을 확인합니다.

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `/git-lab` 라우트가 정상 렌더링되는지 확인
- 작은 화면에서 터미널, 현재 그래프, 목표 패널이 겹치지 않는지 확인

문서 변경만 있을 때는 빌드 검증 대신 변경된 문서가 깨지지 않는지 UTF-8로 확인합니다.

## Pro Git 기반 완성 방향

Git Lab의 다음 목표는 단순한 브랜치 레벨 게임이 아니라 `progit.pdf`를 처음부터 따라가며 Git을 차근차근 배우는 시각 학습 시뮬레이터입니다. 사용자는 설명을 읽고, 명령을 입력하고, 그래프와 파일 상태가 어떻게 바뀌는지 바로 보면서 Pro Git의 핵심 모델을 익힙니다.

기준 자료:

- 로컬 기준 문서: `C:\Users\ning\Downloads\DevChat Product Design (2)\progit.pdf`
- 공식 온라인 기준: `https://git-scm.com/book/en/v2`

핵심 학습 흐름:

1. 설명: 지금 배우는 Pro Git 개념을 초보자용 한국어로 짧게 안내합니다.
2. 시각화: 파일 상태, staging area, commit graph, HEAD, branch pointer 변화를 보여줍니다.
3. 명령 입력: 사용자가 터미널에 Git 명령을 입력합니다.
4. 변화 설명: 명령 실행 후 무엇이 바뀌었고 왜 바뀌었는지 설명합니다.
5. 목표 비교: 현재 상태와 목표 상태를 비교하고 다음 행동을 제안합니다.

## 기존 구현 기준

현재 구현된 기능은 다음 범위입니다.

### 지원 Git 명령

- `git commit`
- `git branch <name>`
- `git checkout <name>`
- `git checkout -b <name>`
- `git merge <name>`
- `git log`

### 지원 UI 명령

- `level <id>`: 특정 레벨을 로드합니다.
- `hint`: 현재 레벨 힌트를 출력합니다.

### 구현된 화면과 로직

- `GitLabPage`: 레벨 선택, 엔진 상태, 레슨 안내 로그, 목표 비교, clear modal, 다음 레슨 이동을 조립합니다.
- `GitTerminalPanel`: 명령 입력과 로그 히스토리를 담당합니다.
- `CommitGraphSvg`: 현재 그래프와 목표 그래프를 SVG로 렌더링합니다.
- `GoalPanel`: 목표 설명, Pro Git 근거, 개념 요약, 허용 명령, 목표 그래프, 현재 일치 여부를 보여줍니다.
- `gitEngine`: commit, branch, checkout, merge, log 명령을 순수 TypeScript 상태 전환으로 처리합니다.
- `gitGraphAdapter`: 엔진 상태와 화면 그래프 snapshot을 변환합니다.
- `compareGoalGraph`: 현재 그래프와 목표 그래프의 구조적 일치 여부를 비교합니다.
- `gitLabLevels.json`: `intro1`, `branch1`, `checkout1`, `merge1` 네 playable 레벨과 `chapterTitle`, `proGitSection`, `conceptSummary`, `acceptedCommands`, `visualMode`, `nextLessonId` 기반 Pro Git 레슨 메타데이터를 정의합니다. 또한 `curriculumModules`에 Pro Git 전체 커리큘럼 후보 3개 모듈, 28개 레벨 원본 내용을 보존합니다.

### 현재 한계

- 파일 상태, staging area, working tree, repository 모델이 없습니다.
- `git add`, `git status`, `git diff`, `git restore`가 없습니다.
- `git merge`는 fast-forward와 three-way merge를 구분하지 않습니다.
- `git switch`, `git rebase`, `git reset`, `git tag`, remote 관련 명령이 없습니다.
- HEAD, tag, remote-tracking branch, reflog, Git object/reference 내부 모델을 시각화하지 않습니다.
- Pro Git 전체 커리큘럼 후보 데이터는 `curriculumModules`로 이동됐지만, staging, reset, rebase, tag, remote 레슨은 아직 현재 엔진에서 playable 상태가 아닙니다.

## 추가 및 변경 요약

| 영역 | 현재 구현 | 추가/변경 방향 |
| --- | --- | --- |
| 학습 구조 | Pro Git 메타데이터가 붙은 4개 playable 레슨과 28개 커리큘럼 후보 데이터 | Pro Git 목차 전체를 따라가는 커리큘럼형 시뮬레이터 |
| 설명 방식 | 목표, 힌트, 개념 요약, Pro Git 근거, 허용 명령 표시 | 설명 -> 시각화 -> 명령 입력 -> 변화 설명 -> 목표 비교 |
| 상태 모델 | commit, branch, HEAD | working tree, index, repository, tag, remote, reflog 추가 |
| 그래프 | commit/branch 중심 | HEAD, tag, remote branch, rewritten commit 표시 추가 |
| 파일 상태 | 없음 | untracked, modified, staged, committed 보드 추가 |
| merge | 항상 merge commit 생성 | fast-forward merge와 three-way merge 구분 |
| reset/rebase | 없음 | soft/mixed/hard reset, rebase rewrite 시각화 |
| remote | 없음 | `origin/*`, fetch, pull, push 기본 흐름 추가 |
| 목표 비교 | commit/branch/currentBranch 비교 | 파일 상태, tag, remote, HEAD 상태까지 비교 확장 |

## Pro Git 학습 커리큘럼

### 1단계: Git의 스냅샷 모델

Pro Git 1장과 2장 초반을 기준으로 Git이 파일 차이만 저장하는 도구가 아니라 시점별 snapshot을 저장한다는 개념을 설명합니다.

필요 시각화:

- 시간 순서 snapshot 카드
- commit이 이전 commit을 parent로 가리키는 기본 그래프
- `git init`, `git status`의 초기 상태

### 2단계: working tree, staging area, repository

Pro Git 2장의 recording changes 흐름을 기준으로 파일이 `untracked -> modified -> staged -> committed`로 이동하는 과정을 보여줍니다.

지원 명령 후보:

- `git status`
- `git add <file>`
- `git commit`
- `git diff`
- `git diff --staged`
- `git restore <file>`
- `git restore --staged <file>`

필요 시각화:

- working tree / index / repository 3영역 보드
- 파일별 상태 badge
- diff preview panel

### 3단계: commit history 보기

Pro Git 2장의 viewing history 흐름을 기준으로 commit history와 그래프 읽는 법을 알려줍니다.

지원 명령 후보:

- `git log`
- `git log --oneline`
- `git log --oneline --graph --decorate --all`

필요 시각화:

- commit graph
- HEAD와 branch label
- log 출력과 그래프의 대응 표시

### 4단계: branch pointer와 HEAD

Pro Git 3장의 branching 기본 모델을 기준으로 branch가 commit을 가리키는 pointer이고 HEAD가 현재 위치를 뜻한다는 점을 설명합니다.

지원 명령 후보:

- `git branch <name>`
- `git branch`
- `git checkout <name>`
- `git checkout -b <name>`
- `git switch <name>`
- `git switch -c <name>`

필요 시각화:

- branch pointer label
- HEAD pointer
- checkout/switch 시 현재 branch 강조
- detached HEAD 상태 표시

### 5단계: merge

Pro Git 3장의 basic branching and merging을 기준으로 fast-forward merge와 three-way merge를 구분합니다.

지원 명령 후보:

- `git merge <branch>`

필요 시각화:

- fast-forward일 때 branch pointer만 이동하는 장면
- divergent history일 때 두 parent를 가진 merge commit 생성 장면
- merge 전/후 비교 패널

### 6단계: remote branch와 협업 기본

Pro Git 2장 working with remotes와 3장 remote branches를 기준으로 local branch와 remote-tracking branch를 구분합니다.

지원 명령 후보:

- `git remote -v`
- `git fetch origin`
- `git pull`
- `git push origin <branch>`

필요 시각화:

- local graph와 origin graph
- `origin/main` remote-tracking label
- fetch는 remote-tracking branch만 갱신한다는 설명
- pull은 fetch 후 merge 또는 fast-forward라는 설명

### 7단계: tag

Pro Git 2장의 tagging을 기준으로 tag가 특정 commit에 붙는 이름표라는 점을 설명합니다.

지원 명령 후보:

- `git tag`
- `git tag <name>`
- `git tag <name> <commit>`

필요 시각화:

- tag label
- branch pointer와 tag의 차이
- release marker panel

### 8단계: undo와 reset

Pro Git 2장의 undoing things와 7장의 reset demystified를 기준으로 reset이 HEAD, index, working tree에 미치는 차이를 설명합니다.

지원 명령 후보:

- `git reset --soft <target>`
- `git reset --mixed <target>`
- `git reset --hard <target>`

필요 시각화:

- HEAD 이동
- index 유지/변경
- working tree 유지/변경
- soft/mixed/hard 차이 비교표

### 9단계: rebase와 히스토리 재작성

Pro Git 3장의 rebasing과 7장의 rewriting history를 기준으로 rebase가 commit을 새 base 위에 다시 쓰는 동작임을 설명합니다.

지원 명령 후보:

- `git rebase <branch>`

필요 시각화:

- 기존 commit과 rewritten commit 연결
- 기존 commit은 남아 있지만 branch pointer가 새 commit으로 이동한다는 설명
- shared history에서 rebase를 조심해야 하는 이유 카드

### 10단계: Git 내부 모델

Pro Git 10장의 object, reference, HEAD 개념을 초보자 수준으로 요약합니다. v1에서는 읽기 중심으로 두고, 그래프와 reference viewer를 통해 내부 모델을 이해시키는 데 집중합니다.

필요 시각화:

- commit object 카드
- tree/blob 개념 카드
- `refs/heads/main`, `refs/tags/v1.0`, `HEAD` reference viewer
- reflog timeline

## 시각화 요구사항

Git Lab은 명령 결과를 텍스트 로그로만 보여주지 않습니다. 각 레슨은 최소 하나 이상의 시각화 모드를 가져야 합니다.

필수 시각화 모드:

- 파일 상태 보드: untracked, modified, staged, committed
- 3영역 모델: working tree, index, repository
- 커밋 그래프: commit, parent edge, branch, HEAD, merge parent
- 원격 그래프: local branch, remote-tracking branch, origin state
- 내부 모델: object, reference, tag, reflog

각 명령 실행 후 반드시 보여줄 내용:

- 무엇이 바뀌었는지
- 왜 그렇게 바뀌었는지
- 지금 Pro Git의 어느 개념과 연결되는지
- 다음에 실행해볼 명령은 무엇인지

## 구현 단계

### Phase 1: 문서와 레슨 schema 정리

- 기존 `gitLabLevels.json`을 Pro Git lesson schema로 확장합니다.
- 기존 4개 레벨은 새 커리큘럼 안의 branch/merge 레슨으로 흡수합니다.
- 각 레슨에 `proGitSection`, `conceptSummary`, `acceptedCommands`, `visualMode`, `hints`를 추가합니다.

### Phase 2: 파일 상태와 staging 모델 추가

- `GitEngineState`에 working tree, index, repository 상태를 추가합니다.
- `git status`, `git add`, `git diff`, `git restore`, `git commit`을 파일 상태 기반으로 확장합니다.
- 파일 상태 보드와 3영역 모델 UI를 추가합니다.

### Phase 3: branch/merge 모델 정교화

- `git switch`와 `git checkout`을 함께 지원합니다.
- fast-forward merge와 three-way merge를 구분합니다.
- detached HEAD 상태와 branch pointer 이동을 시각화합니다.

### Phase 4: reset/rebase/tag/remote 추가

- reset soft/mixed/hard 상태 변화를 구현합니다.
- rebase commit rewrite를 구현합니다.
- tag와 remote-tracking branch를 graph snapshot에 포함합니다.
- fetch/pull/push 기본 흐름을 mock remote state로 시뮬레이션합니다.

### Phase 5: Pro Git 학습 UX 완성

- 챕터/레슨 네비게이션을 추가합니다.
- 설명, 힌트, Pro Git 근거, 목표 비교를 탭 또는 패널로 구성합니다.
- 완료 modal에 다음 레슨 이동 CTA를 추가합니다.
- 잘못된 명령은 상태를 바꾸지 않고 초보자용 오류와 추천 명령을 보여줍니다.

### Phase 6: AI 개인화 추천과 RAG Tutor

Git Lab v1은 고정 커리큘럼과 deterministic 시뮬레이터를 먼저 완성합니다. 이후 AI 기반 추천 단계에서는 RAG를 핵심 기능으로 도입합니다.

- Pro Git, 내부 커리큘럼 문서, 사용자의 학습 기록을 검색 가능한 지식 소스로 구성합니다.
- 완료 레슨, 오답 명령, 힌트 사용, 복습 기록을 바탕으로 다음 레슨과 복습 경로를 추천합니다.
- 추천 이유를 Pro Git 근거와 사용자의 실제 학습 상태에 연결해 설명합니다.
- 사용자가 질문하면 현재 레슨, 시뮬레이터 상태, 관련 문서 근거를 함께 참고해 답변합니다.
- Notion 학습 기록 연동 이후에는 기록된 회고와 복습 이력도 추천 근거에 포함합니다.

## 완료 기준

- `/git-lab`에서 Pro Git 순서대로 첫 레슨부터 진행할 수 있습니다.
- 각 레슨은 설명, 목표, 힌트, Pro Git 근거, accepted command를 가집니다.
- 명령 실행 후 그래프나 상태 보드가 즉시 갱신됩니다.
- 사용자가 틀린 명령을 입력해도 상태가 망가지지 않고 복구 가능한 안내를 받습니다.
- 기존 4개 레벨은 새 커리큘럼 안에서 계속 플레이할 수 있습니다.
- `rebase`, `reset`, `tag`, `remote`는 최소 1개 이상의 인터랙티브 레슨을 가집니다.

## 검증 기준

- `npm run typecheck`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run docs:priority`
- `/git-lab` 수동 QA: 첫 레슨부터 branch/merge/rebase/reset/tag/remote 레슨까지 순서대로 진행 가능 여부 확인

## v1 제외 범위

아래 Pro Git 주제는 v1에서는 읽기 카드 또는 추후 확장으로 둡니다.

- 실제 Git CLI 실행
- 실제 파일 시스템 변경
- merge conflict 파일 편집
- stash, rerere, bisect, submodule
- hooks, packfile, transfer protocol 상세
- GitHub 조직 관리, 서버 운영, 인증/권한 설정
- Electron, Monaco, backend
- RAG 연동은 영구 제외가 아니라 v1 Git 시뮬레이터 이후 AI 개인화 추천과 Tutor 단계에서 도입합니다.
