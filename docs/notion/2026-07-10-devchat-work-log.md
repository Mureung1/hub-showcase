# 2026-07-10 DevChat / ICU 작업 로그

## 요약

오늘은 ICU/DevChat 프로젝트에서 제품 디자인 기준, 학습 화면 방향, Git 학습 시뮬레이터(`/git-lab`) 설계와 구현 범위, 문서/스킬 정리를 진행했다.

핵심 결론은 다음과 같다.

- GitHub fork는 보안 정책상 visibility 변경이 막힐 수 있으며, 조직 권한과 fork visibility는 별도 이슈로 봐야 한다.
- 디자인 방향은 AI스러운 장식보다 Workday 참고 이미지처럼 orange, pink, cyan, deep blue가 섞인 브랜드 배경을 제품 화면 뒤에 깔고, 실제 학습 화면은 차분한 업무형 SaaS 밀도로 유지한다.
- 온보딩 이후 메인 학습 화면으로 진입할 수 있게 흐름을 잡고, 온보딩 배경도 Learning 화면과 같은 브랜드 배경 계열로 맞춘다.
- 프로젝트 내부 font component를 전체 UI에 적용하는 방향으로 정리했다.
- Git 학습 시뮬레이터는 `Learn Git Branching`과 유사한 컨셉이지만, ICU 학습 워크스페이스에 맞춘 터미널 + SVG 커밋 그래프 + 목표 패널 구조로 설계했다.
- `SPEC.md`, `docs/features/git-branching-lab.md`, `skills/design/SKILL.md`를 현재 프로젝트 흐름에 맞게 정리했다.

## 진행한 큰 흐름

### 1. GitHub repository visibility 확인

초반에는 GitHub repository가 왜 비공개로만 보이는지, visibility 변경 메뉴가 왜 막혀 있는지 확인했다.

확인한 메시지:

> For security reasons, you cannot change the visibility of a fork.

정리한 내용:

- fork repository는 GitHub 보안 정책상 visibility 변경이 제한될 수 있다.
- organization 안의 멤버가 모두 볼 수 있는지 여부는 repository visibility, org/team 권한, fork의 upstream 정책에 따라 달라진다.
- 단순히 “organization에 있으니 모두 보인다”고 단정하면 안 되고, org role과 repo access를 따로 확인해야 한다.

### 2. 디자인 방향 재정리

초기에는 Dribbble CRM SaaS 레퍼런스를 참고해 제품 화면을 더 정돈된 SaaS 형태로 바꾸는 방향을 논의했다. 이후 사용자가 제공한 Workday 색감 이미지와 Learning 화면 스크린샷을 기준으로 방향을 다시 잡았다.

결정한 방향:

- 화면 전체 배경은 브랜드 색 조합을 적극 사용한다.
- orange, pink, cyan, deep blue가 섞인 Workday 참고 계열의 밝은 브랜드 배경을 사용한다.
- AI스럽고 과장된 장식, 불필요한 glow, 지나친 hero 느낌은 줄인다.
- 실제 학습 화면은 카드 남발보다 실사용 패널 중심으로 구성한다.
- 코드/터미널 영역은 어두운 editor surface를 유지한다.
- 목표, 힌트, 실행 결과 같은 보조 패널은 브랜드 색을 부드럽게 적용한다.

사용자 관점 평가에서 중요하게 본 점:

- 화면에 들어오자마자 “오늘 무엇을 해야 하는지” 보여야 한다.
- 온보딩만 보이고 학습 화면으로 못 가는 상태는 제품 흐름상 막힌 느낌을 준다.
- 배경과 패널 스타일은 온보딩과 Learning 화면에서 일관되어야 한다.
- 화면 폭은 고정된 1480px 기준보다 실제 viewport에 자연스럽게 반응해야 한다.

### 3. 온보딩과 Learning 화면 흐름

온보딩 화면만 뜨는 문제가 있었고, 온보딩 뒤에 메인 학습 화면으로 갈 수 있도록 흐름을 조정하는 방향을 잡았다.

정리한 요구:

- 온보딩 화면 뒤에 메인 학습 화면으로 진입할 수 있어야 한다.
- 온보딩 배경도 Learning 화면과 같은 브랜드 배경 색으로 맞춘다.
- 프로젝트 안에 있는 font component를 전체 화면에 적용한다.

### 4. Git 학습 시뮬레이터 설계

새 기능으로 Git 학습 시뮬레이터를 설계했다. 라우트 명은 `/git-lab`로 정리했다.

제품 컨셉:

- `Learn Git Branching`처럼 명령어를 입력하면 커밋 그래프가 바뀌는 학습 도구
- 게임 화면보다는 ICU의 학습 워크스페이스 안에 포함된 실습 도구
- 초보자가 Git 명령어와 그래프 변화를 동시에 이해하는 것이 목표

핵심 화면:

- 좌측 패널: 터미널 UI
- 우측 또는 중앙 패널: 현재 커밋 그래프 SVG 시각화
- 목표 패널: 레벨별 목표 커밋 그래프 미리보기
- 완료 상태: 현재 상태가 목표 상태와 일치하면 클리어 처리

### 5. Git 엔진 설계와 구현 범위

엔진은 React와 분리된 순수 TypeScript 함수로 설계했다.

상태 구조:

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

지원 명령어:

- `git commit`
- `git branch <name>`
- `git checkout <name>`
- `git checkout -b <name>`
- `git merge <name>`
- `git log`

UI 명령어:

- `level <id>`
- `hint`

MVP 제외:

- `git rebase`
- `git reset`
- `git cherry-pick`
- remote 관련 명령
- 실제 파일 변경
- 실제 `git` CLI 실행

### 6. SVG 커밋 그래프 컴포넌트

React + SVG 기반으로 커밋 그래프를 렌더링하는 컴포넌트 방향을 잡았다.

시각화 규칙:

- 커밋 노드는 원형
- 커밋 노드 배경은 `#90EE90`
- 커밋 ID 텍스트 표시
- 부모에서 자식 방향으로 검은색 화살표 연결
- 브랜치별 x좌표 lane을 둬서 겹침을 줄임
- 현재 checkout된 브랜치는 `main*`처럼 별표가 붙은 초록색 말풍선 라벨로 표시
- 새 커밋은 부드러운 transition으로 등장

관련 모듈:

- `CommitGraphSvg.tsx`
- `calculateCommitGraphLayout.ts`
- `gitGraphAdapter.ts`

### 7. 터미널 UI와 목표 패널

터미널 UI 요구:

- macOS 스타일 창 헤더
- 빨강/노랑/초록 창 버튼
- 명령어 입력 후 Enter 실행
- 실행 결과 로그 누적
- `level intro1`, `hint` 같은 학습용 명령 지원
- 레벨 제목 바와 목표 숨기기/보기 토글 제공

목표 패널 요구:

- 레벨별 목표 커밋 그래프를 JSON으로 정의
- 목표 그래프와 현재 그래프를 같은 SVG 컴포넌트로 렌더링
- 구조적으로 일치하면 클리어 처리
- 클리어 시 축하 모달 표시

레벨 예시:

- `intro1`: `git commit`을 두 번 입력해 `C0 -> C1` 만들기
- `branch1`: `git branch feature`
- `checkout1`: `git checkout -b feature` 후 `git commit`
- `merge1`: feature와 main에서 각각 커밋 후 `git merge feature`

### 8. 문서 정리

오늘 정리한 문서:

- `SPEC.md`
- `docs/features/git-branching-lab.md`
- `skills/design/SKILL.md`

`SPEC.md` 정리 내용:

- 기능 개발 체크리스트를 깨진 한글에서 정상 한글로 복구
- Issue 등록, 설계, 개발, 검증, PR, 승인/머지, Issue Close, 문서 정리 순서로 재구성
- MVP 범위와 큰 의존성 추가 제한 원칙 명시

`docs/features/git-branching-lab.md` 정리 내용:

- `/git-lab` 기능 목적과 현재 구현 범위 정리
- 지원 Git 명령어와 UI 명령어 명시
- 상태 구조, 파서/실행 흐름, SVG 레이아웃, 레벨 시스템, 목표 비교 로직 정리
- 실제 폴더 구조와 모듈 역할 문서화
- 브랜드/UI 기준 추가

`skills/design/SKILL.md` 정리 내용:

- 스킬 description에 `Git Branching Lab` 추가
- 참고 문서에 `docs/features/git-branching-lab.md` 추가
- Git Lab 전용 화면 패턴 추가
- Git Lab 색/톤 기준 추가
- 깨져 있던 한국어 라벨 예시 복구
- Git Lab 접근성 기준 추가

## 주요 결정

### Git Lab은 게임 UI가 아니라 학습 워크스페이스다

`Learn Git Branching`을 참고하되, 그대로 게임처럼 만들지 않는다. ICU 제품 안의 실습 화면으로 보이게 한다.

### Git 엔진은 React와 분리한다

명령어 파서와 상태 변경은 순수 JS/TS 함수로 유지한다. 그래야 테스트하기 쉽고, UI와 상관없이 엔진 동작을 검증할 수 있다.

### 목표 비교는 좌표가 아니라 구조를 비교한다

SVG 좌표는 렌더링 결과일 뿐이다. 레벨 클리어 판단은 커밋 개수, 부모 관계, 브랜치 포인터, HEAD 위치를 기준으로 한다.

### 디자인 스킬에도 Git Lab 기준을 넣는다

처음에는 design skill을 건드리지 않기로 했지만, Git Lab UI를 앞으로도 같은 기준으로 계속 수정하려면 스킬에 최소 기준을 넣는 것이 낫다고 판단했다.

스킬에는 상세 구현이 아니라 반복 적용할 디자인 기준만 넣었다.

## 검증 기록

오늘 진행 중 확인된 검증:

- Git Lab 구현 후 이전 검증에서 `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` 통과
- `/git-lab` 라우트가 dev server에서 200 응답한 것으로 확인
- `skills/design/SKILL.md` 수정 후 `quick_validate.py skills\design` 통과
- `SPEC.md`, `docs/features/git-branching-lab.md`는 UTF-8 코드포인트 기준으로 정상 한글 저장 확인

참고:

- PowerShell 출력 환경에서는 UTF-8 한글이 CP949처럼 깨져 보일 수 있다.
- 파일 자체는 UTF-8로 저장되어 있는지 코드포인트로 확인했다.

## 현재 관련 파일

Git Lab 기능:

- `src/features/git-lab/GitLabPage.tsx`
- `src/features/git-lab/components/CommitGraphSvg.tsx`
- `src/features/git-lab/components/GitTerminalPanel.tsx`
- `src/features/git-lab/components/GoalPanel.tsx`
- `src/features/git-lab/engine/gitEngine.ts`
- `src/features/git-lab/engine/gitGraphAdapter.ts`
- `src/features/git-lab/engine/compareGoalGraph.ts`
- `src/features/git-lab/layout/calculateCommitGraphLayout.ts`
- `src/features/git-lab/levels/gitLabLevels.json`

문서:

- `SPEC.md`
- `docs/features/git-branching-lab.md`
- `skills/design/SKILL.md`

## 남은 작업

우선순위가 높은 작업:

- `/git-lab` 화면을 실제 브라우저에서 다시 확인하고 스크린샷 기준으로 UI 겹침 점검
- Git Lab 레벨 JSON의 한글 표시가 실제 UI에서 깨지지 않는지 확인
- 현재 git worktree의 untracked/modified 파일 범위를 정리
- Git Lab 진입점을 Today Learning Hub 또는 Learning List에 연결
- goal mismatch 메시지를 더 사용자 친화적으로 다듬기
- 모바일에서 터미널, 그래프, 목표 패널을 탭 구조로 전환

후속으로 고려할 작업:

- `git rebase` 레벨 추가
- detached HEAD 설명 레벨 추가
- reset/cherry-pick은 MVP 이후 별도 레벨로 검토
- 실제 사용자의 명령어 실수 패턴에 맞춘 오류 메시지 개선
- 레벨 완료 기록 저장
- Git 학습 트랙을 Learning List에 정식 등록

## Notion 태그 제안

- `ICU`
- `DevChat`
- `Product Design`
- `Git Lab`
- `Learning UX`
- `Frontend`
- `Documentation`
- `Skill`

## 한 줄 회고

오늘 작업의 중심은 “ICU를 단순 AI 챗봇이 아니라 실제 학습 흐름이 있는 제품으로 보이게 만들고, Git 학습 시뮬레이터를 그 제품 안에 자연스럽게 넣기 위한 설계와 문서 기준을 세우는 것”이었다.
## 최종 업데이트

이 작업 로그 자체도 Notion으로 내보내기 위한 Markdown 문서로 추가했다.

추가된 파일:

- `docs/notion/2026-07-10-devchat-work-log.md`

현재 문서 정리 대상으로 확인한 파일:

- `SPEC.md`
- `docs/features/git-branching-lab.md`
- `skills/design/SKILL.md`
- `docs/notion/2026-07-10-devchat-work-log.md`

운영 메모:

- Windows PowerShell 출력에서는 UTF-8 한글이 CP949처럼 깨져 보일 수 있다.
- 파일 자체가 깨졌는지는 코드포인트 또는 UTF-8 모드로 확인한다.
- `skills/design/SKILL.md` 검증 시 `quick_validate.py`가 기본 인코딩으로 실패할 수 있으므로 `PYTHONUTF8=1`을 설정하고 실행한다.
- 이번 design skill 검증은 `PYTHONUTF8=1` 설정 후 `Skill is valid!`로 통과했다.
