# 이슈 기반 구현 싸이클 스킬 구현 계획

> **작업 에이전트용:** 필수 하위 스킬로 `superpowers:subagent-driven-development` 또는 `superpowers:executing-plans`를 사용해 체크박스 단위로 실행한다.

**목표:** 아맞다 저장소에서 이슈 선택부터 한국어 PR 생성, 리뷰 반영과 병합 후 추적 정보 정리까지 반복 절차를 상태 기반으로 수행하는 레포 전용 Codex 스킬을 만든다.

**구조:** `.agents/skills/issue-driven-implementation-cycle` 아래의 지침 중심 스킬로 구현한다. 실행 시 Git·GitHub와 저장소 문서를 조회하며 Project 필드 ID는 하드코딩하지 않고, 제품 판단과 PR 최종 승인·병합에서만 사람에게 멈춘다.

**기술 스택:** Agent Skills, Markdown, YAML, Git, GitHub CLI

---

### 작업 1: 레포 전용 스킬 골격 생성

**파일:**

- 생성: `.agents/skills/issue-driven-implementation-cycle/SKILL.md`
- 생성: `.agents/skills/issue-driven-implementation-cycle/agents/openai.yaml`

- [ ] **1단계: 공식 생성 도구로 스킬 골격 생성**

```powershell
python C:\Users\cjh51\.codex\skills\.system\skill-creator\scripts\init_skill.py issue-driven-implementation-cycle `
  --path .agents/skills `
  --interface 'display_name=이슈 기반 구현 싸이클' `
  --interface 'short_description=이슈 선택부터 PR과 병합 후 정리까지 반복 작업 자동화' `
  --interface 'default_prompt=$issue-driven-implementation-cycle을 사용해 아맞다의 다음 이슈를 시작하고 PR 생성까지 진행해 주세요.'
```

예상 결과: `.agents/skills/issue-driven-implementation-cycle`이 생성되고 `SKILL.md`와 `agents/openai.yaml`이 존재한다.

- [ ] **2단계: 메타데이터를 암시적 호출 가능 상태로 완성**

`agents/openai.yaml`을 다음 내용으로 맞춘다.

```yaml
interface:
  display_name: '이슈 기반 구현 싸이클'
  short_description: '이슈 선택부터 PR과 병합 후 정리까지 반복 작업 자동화'
  default_prompt: '$issue-driven-implementation-cycle을 사용해 아맞다의 다음 이슈를 시작하고 PR 생성까지 진행해 주세요.'
policy:
  allow_implicit_invocation: true
```

- [ ] **3단계: 골격 상태 확인**

```powershell
Get-ChildItem -Recurse .agents/skills/issue-driven-implementation-cycle
```

예상 결과: 계획에 없는 `scripts`, `references`, `assets`와 예제 파일이 없어야 한다.

### 작업 2: 상태 기반 작업 순환 지침 작성

**파일:**

- 수정: `.agents/skills/issue-driven-implementation-cycle/SKILL.md`

- [ ] **1단계: 트리거와 범위 정의**

frontmatter를 다음과 같이 작성한다.

```yaml
---
name: issue-driven-implementation-cycle
description: 아맞다(ppre1ude/hub) 저장소에서 이슈 기반 구현 싸이클을 시작하거나 재개할 때 사용한다. 백로그의 다음 작업 선택, 지정 이슈 시작, 브랜치·커밋·한국어 PR 생성, 리뷰 반영, 병합 후 Issues와 Project 정리를 요청하면 적용한다. 단순 조회나 자동 병합 요청에는 사용하지 않는다.
---
```

- [ ] **2단계: 공통 방향 설정과 자동화 경계 작성**

`SKILL.md`에 다음 계약을 명시한다.

```markdown
## 공통 방향 설정

1. 저장소 루트와 `origin`이 `ppre1ude/hub`인지 확인한다.
2. `AGENTS.md`, 이슈 본문과 `docs/`의 Markdown 문서를 읽는다.
3. 현재 브랜치, 작업 트리, 연결 PR, 이슈와 Project 상태를 함께 확인한다.
4. 현재 단계가 분명하면 완료된 앞 단계를 반복하지 않는다.

## 사람에게 멈추는 조건

- 제품·디자인·보안·마이그레이션·호환성 결정을 새로 내려야 한다.
- 이슈 완료 기준과 코드 또는 문서가 충돌한다.
- 사용자 변경과 작업 범위가 겹친다.
- PR 최종 승인과 병합이 필요하다.

위 조건이 아니면 승인된 범위의 반복 작업을 중간 질문 없이 이어간다.
```

- [ ] **3단계: 다음 작업과 지정 이슈 시작 흐름 작성**

다음 규칙을 구체적으로 포함한다.

```markdown
## 다음 작업

- Project #3의 `시작 가능`이면서 제품 단계가 `현재 MVP` 또는 `후속 후보`인 열린 이슈만 후보로 삼는다.
- 제품 단계 `보류`, `제외`와 `blocked`, `needs-info`, `ready-for-human` 라벨은 자동 대상에서 제외한다.
- 제품 단계, 우선순위, 주차, 완료 목표일, 선행 관계, 이슈 번호 순으로 비교한다.
- 명확한 후보는 근거와 논의 사항을 알리고 바로 시작한다.
- 제품 판단이 갈릴 때만 추천안과 선택지를 제시하고 멈춘다.

## 작업 시작

- `main`을 fetch·prune하고 fast-forward로 동기화한다.
- Project 상태를 `진행 중`으로 변경하고 비어 있는 시작일을 기록한다.
- `<type>/<이슈번호>-<영문-키워드>` 브랜치를 만든다.
- 이슈의 완료 기준과 검증 방법을 구현 범위로 고정한다.
```

- [ ] **4단계: 구현·검증·커밋·PR 흐름 작성**

다음 검증 예산과 게시 계약을 포함한다.

```markdown
## 구현과 검증 예산

- 구현 중에는 변경 범위 테스트와 정적 검사만 실행한다.
- PR 직전 저장소가 요구하는 전체 검증을 한 번 실행한다.
- 리뷰 뒤에는 영향 범위만 재검증한다. 공통 계약이나 빌드 구성이 바뀐 경우에만 전체 검증을 반복한다.
- 문서·스킬만 바뀌면 해당 형식과 스킬 검증만 수행하고 제품 테스트를 실행하지 않는다.

## 커밋과 Pull Request

- 커밋은 `<type>: <한글 명사형 요약>` 형식을 사용한다.
- 사용자 파일과 작업 범위 밖 파일을 stage하지 않는다.
- 푸시 전 diff와 검증 결과를 다시 확인한다.
- PR 제목과 본문은 한국어로 작성하고 `Closes #<이슈번호>`를 포함한다.
- PR 생성 후 Project 상태를 `검토 중`으로 바꾸고 자동 병합하지 않는다.
```

- [ ] **5단계: 리뷰와 병합 후 마무리 흐름 작성**

다음 상태 전이를 포함한다.

```markdown
## 리뷰 반영

- 미해결 리뷰와 실패한 검사를 먼저 확인한다.
- 제안을 코드와 계약에 대조해 타당한 경우에만 반영한다.
- 명확한 변경은 구현, 영향 범위 검증, 커밋과 푸시까지 이어간다.
- 제품 동작이나 안전 경계가 바뀌면 근거와 선택지를 제시하고 멈춘다.

## 병합 후 마무리

- GitHub에서 PR의 `mergedAt`을 확인한 뒤에만 시작한다.
- fetch·prune 후 `main`을 fast-forward하고, 깨끗하며 병합된 로컬 브랜치만 삭제한다.
- 이슈를 닫고 `ready-for-agent` 같은 실행 대기 라벨을 제거한다.
- Project 상태를 `완료`로 변경한다.
- 상위 체크리스트와 선행 관계를 갱신하고 새로 실행 가능한 이슈를 `시작 가능`으로 바꾼다.
- 원격 브랜치는 삭제하지 않는다.
```

- [ ] **6단계: 금지 동작과 결과 보고 정의**

```markdown
## 금지 동작

- 자동 병합, 강제 푸시, 원격 브랜치 삭제, `reset --hard`, `clean -fd`
- Project 필드 ID와 선택지 ID 하드코딩
- `blocked`, `needs-info`, `ready-for-human` 이슈의 추측성 구현
- 사용자 변경의 stage·덮어쓰기·삭제

## 결과 보고

모든 처리 메시지와 최종 응답은 한국어로 작성한다. 완료한 자동화, 검증 결과, 사람 검수가 필요한 항목과 다음 재개 명령을 짧게 보고한다.
```

### 작업 3: 구조와 시나리오 검증

**파일:**

- 검증: `.agents/skills/issue-driven-implementation-cycle/SKILL.md`
- 검증: `.agents/skills/issue-driven-implementation-cycle/agents/openai.yaml`

- [ ] **1단계: 공식 구조 검증 실행**

```powershell
python C:\Users\cjh51\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/issue-driven-implementation-cycle
```

예상 결과: `Skill is valid!`

- [ ] **2단계: 메타데이터와 금지 동작 점검**

```powershell
rg -n "issue-driven-implementation-cycle|allow_implicit_invocation|자동 병합|원격 브랜치|검증 예산|검토 중|완료" .agents/skills/issue-driven-implementation-cycle
```

예상 결과: 호출 이름, 암시적 호출, 사람 병합 경계, 검증 예산과 Project 상태 전이가 모두 검색된다.

- [ ] **3단계: 시나리오를 읽기 전용으로 대입**

다음 네 요청을 기준으로 필요한 단계와 중단 조건이 하나로 결정되는지 확인한다.

```text
$issue-driven-implementation-cycle 다음 작업
$issue-driven-implementation-cycle #39 시작
$issue-driven-implementation-cycle 리뷰 반영
$issue-driven-implementation-cycle 마무리
```

예상 결과: 각각 다음 작업 선택, 지정 이슈 시작, 현재 PR 리뷰 반영, 병합 확인 후 정리로 연결된다.

- [ ] **4단계: 형식과 diff 검증**

```powershell
npm exec prettier -- --check .agents/skills/issue-driven-implementation-cycle docs/superpowers/plans/2026-07-17-issue-driven-implementation-cycle-skill.md
git diff --check
```

예상 결과: 두 명령이 종료 코드 0으로 끝난다.

- [ ] **5단계: 구현 커밋**

```powershell
git add .agents/skills/issue-driven-implementation-cycle docs/superpowers/plans/2026-07-17-issue-driven-implementation-cycle-skill.md
git commit -m "feat: 이슈 기반 구현 싸이클 구성"
```

예상 결과: 사용자 소유 미추적 파일은 포함되지 않고 스킬과 구현 계획만 커밋된다.
