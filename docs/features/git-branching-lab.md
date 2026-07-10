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