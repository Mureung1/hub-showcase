# Git Lab Pro Git 커리큘럼 PR 요약

## 주요 작업 리스트

- Pro Git 기준 Git 시뮬레이터 개발 계획을 정리하고, RAG는 v1 제외가 아니라 이후 AI 개인화 추천/Tutor 단계에서 도입하는 것으로 문서화했습니다.
- 기존 4개 Git Lab 레벨에 Pro Git 섹션, 개념 요약, 허용 명령, 시각화 모드, 다음 레슨 정보를 추가했습니다.
- `levels.json`의 3개 모듈, 28개 커리큘럼 레벨을 `gitLabLevels.json`의 `curriculumModules`로 통합했습니다.
- 커리큘럼 네비게이션을 추가해 28개 레벨을 화면에서 확인하고, 현재 엔진으로 실행 가능한 레벨과 준비가 필요한 레벨을 구분했습니다.
- 화면 배치를 좌측 커리큘럼, 우측 실습 영역으로 정리하고 긴 목록/로그/설명은 각 패널 내부에서 스크롤되도록 수정했습니다.
- Git 엔진에 `config`, `repoExists`, `files` 상태를 추가하고 `git config`, `git init`, `git status`, `git add`, `git commit -m`을 지원했습니다.
- `1-0`, `1-1`, `1-2`, `1-3` 초반 레슨을 실제 playable 상태로 전환했습니다.
- Repository State 패널을 추가해 repo 초기화 여부, global config, Working Tree, Staging Area, Repository 파일 상태를 시각화했습니다.
- graph 목표 외에 `configState`, `repoState`, `fileStatus` 목표 판정을 추가했습니다.
- 테스트를 추가/갱신해 엔진 명령, 커리큘럼 adapter, 목표 판정 동작을 검증했습니다.

### 스크린샷

![Git Lab 커리큘럼 화면](../design/screenshots/git-lab-curriculum.png)

## 내가 설명할 수 있는 부분

제가 설명할 수 있는 부분은 `gitLabLevels.json` 데이터를 화면에서 가져다 쓰는 흐름입니다.

Git Lab 레슨 데이터는 `src/features/git-lab/levels/gitLabLevels.json`에 모아뒀습니다. 이 파일에는 기존에 바로 실행하던 `levels`와 Pro Git 기준으로 정리한 `curriculumModules`가 함께 들어 있습니다. `levels`는 기존 커밋/브랜치 실습처럼 바로 실행 가능한 기본 레벨이고, `curriculumModules`는 모듈 제목, Pro Git 기준 위치, 레슨 설명, 허용 명령어, 초기 상태, 목표 조건을 담은 커리큘럼 데이터입니다.

화면에서는 JSON을 그대로 직접 쓰지 않고 `gitLabCurriculumAdapter.ts`를 거칩니다. `createPlayableLevels(levelsData)`는 JSON 데이터 중 현재 엔진으로 실행 가능한 레슨만 `PlayableGitLabLevel` 형태로 바꿉니다. 이때 `initialState`는 엔진이 이해하는 `GitEngineState`로 변환하고, `goal.type`에 따라 `graph`, `configState`, `repoState`, `fileStatus` 같은 목표 종류도 정리합니다.

또 `createCurriculumNavigation(levelsData)`는 왼쪽 커리큘럼 목록에 필요한 데이터로 바꿉니다. 실행 가능한 레슨은 `playable`로 표시하고, 아직 엔진 구현이 부족한 레슨은 `locked`로 표시해서 사용자가 전체 커리큘럼은 볼 수 있지만 지금 실습 가능한 범위도 구분할 수 있게 했습니다.

마지막으로 `GitLabPage.tsx`에서 `gitLabLevels.json`을 import한 뒤, adapter가 만든 `levels`와 `curriculumModules`를 사용합니다. 사용자가 왼쪽 레슨을 클릭하면 `playableLevel`이 있는 경우 `loadLevel`로 해당 레슨을 불러오고, 준비 중인 레슨이면 터미널 로그에 아직 준비가 필요하다는 메시지를 보여줍니다. 이렇게 JSON 원본, 변환 adapter, 화면 컴포넌트 역할을 나눠서 데이터가 커져도 화면 코드가 너무 복잡해지지 않게 했습니다.

## 아직 이해 못 한 부분

- `rebase`, `reset`, `reflog`, `stash`처럼 히스토리를 재작성하거나 복구하는 기능은 아직 코드로 완전히 설명하기 어렵습니다. 데이터는 들어왔지만 실제 엔진 상태 전환은 다음 단계에서 더 공부하면서 구현해야 합니다.
- 현재 `git merge`는 항상 merge commit을 만드는 단순 모델입니다. Pro Git의 fast-forward merge와 3-way merge 차이를 UI와 엔진에서 정확히 나누는 부분은 아직 남아 있습니다.
- 실제 Git 내부의 object/tree/blob/reference 모델은 문서로는 어느 정도 이해했지만, 학습자가 이해하기 쉬운 시각화로 어떻게 풀어낼지는 더 고민이 필요합니다.

## 새로 알게 된 것

- Git branch는 별도 복사본이 아니라 commit을 가리키는 pointer라서, 시뮬레이터에서도 branch를 `{ name, commitId }`로 표현하면 설명하기 쉽다는 것을 알게 됐습니다.
- Pro Git 초반 학습은 커밋 그래프보다 `working tree -> staging area -> repository` 흐름을 먼저 보여주는 것이 중요하다는 것을 알게 됐습니다.
- 커리큘럼 데이터를 바로 실행 가능한 레벨로 쓰기보다, adapter를 둬서 현재 엔진이 처리할 수 있는 레벨과 아직 준비가 필요한 레벨을 분리하는 편이 안전하다는 것을 알게 됐습니다.
- 화면에 많은 패널을 한 번에 넣을 때는 단순히 grid 칸을 늘리는 것보다, 주요 흐름별로 묶고 각 박스 내부 스크롤을 명확히 잡는 것이 사용자 친화적이라는 것을 알게 됐습니다.