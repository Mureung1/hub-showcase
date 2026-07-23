---
name: issue-workflow
description: >-
  hub 프로젝트에서 GitHub 이슈 단위 작업을 계획→구현→검증→커밋→PR 흐름으로 진행하는 워크플로우.
  계획 문서(docs/week2/) 작성, 묶음(bundle) 단위 사용자 승인, test/lint/수동 검증,
  관련 파일만 담은 Conventional Commit, main 브랜치로 PR 생성(본문 템플릿 + Closes #N)까지 안내한다.
  Use when starting or continuing a GitHub issue in this repo, planning a feature, splitting work
  into bundles, deciding what to commit, or opening a pull request to main. 이슈 작업, 계획 세우기,
  커밋 정리, PR 보내기 요청 시 사용.
---

# 이슈 작업 워크플로우 (hub)

`hub` 프로젝트에서 하나의 GitHub 이슈를 끝까지 진행하는 표준 흐름. 각 단계는 사용자 승인 지점을 존중한다.

## 전체 흐름

```
1. 다음 할 일 파악  →  2. 계획 문서화  →  3. 묶음별 승인·구현  →  4. 검증  →  5. 커밋  →  6. PR
```

체크리스트로 진행 상황을 추적한다 (todo 도구 사용).

```
- [ ] 1. 다음 할 일 파악 (이슈/계획 문서 확인)
- [ ] 2. 계획 문서 작성 (docs/weekN/dayN-*-plan.md)
- [ ] 3. 묶음별 승인받으며 구현
- [ ] 4. 검증 (build/test/lint/수동)
- [ ] 5. 관련 파일만 커밋
- [ ] 6. main으로 PR (Closes #N)
```

## 1. 다음 할 일 파악

- `docs/weekN_plan.md`의 진행 현황 표를 읽는다 (주차별 유일한 상태 소스).
- `gh issue list --state open`으로 열린 이슈를 우선순위(P0>P1>P2)·요일 순으로 확인한다.
- 완료된 `.cursor/plans/*.plan.md`는 참고만 (커밋 대상 아님).

### 작업 중 새 이슈가 필요할 때

다른 이슈를 진행하다가 별개의 작업 거리를 발견하는 경우(예: #31/#32 검증 중 크롤러 배치
크기 문제를 발견해 #40으로 등록한 사례) 아래 순서로 판단한다:

1. **완료 기준을 한 문장으로 말할 수 있는 코드/기능 작업인가?**
   - Yes → GitHub 이슈로 등록한다 (작아도 등록 — 추적·`Closes #N` 연결을 위해).
   - No(완료 기준 없는 잡다한 정리/청소) → 이슈 만들지 않고 "5. 커밋"의 **하루 단위 브랜치**로 처리.
2. **지금 하던 작업을 막는가(blocking)?**
   - 한 줄짜리 사소한 수정 → 지금 이슈에 포함해서 같이 고친다.
   - 범위가 있는 별개 작업 → 하던 작업은 계속 진행, 발견한 내용만 메모해두고 **지금 묶음/이슈가
     끝나는 자연스러운 지점**에 한 번에 이슈로 등록한다 (발견할 때마다 바로 만들어 작업 흐름을
     끊지 않는다).
3. **마일스톤**: 이번 주 범위면 현재 마일스톤에 등록, 다음 주/보류면 마일스톤 비워둔다.
4. **라벨**: 기존 패턴(`week-N`, `area:*`, `priority:*`, `agent-work`) 재사용. 특정 요일에 안
   묶이면 `day:*` 라벨은 생략.
5. 새 이슈의 상세 설계는 `docs/weekN/<slug>-plan.md`로 먼저 문서화하고, 이슈 본문에서 그 문서를
   링크한다 (이슈 본문 자체에 상세를 다 쓰지 않는다 — 아래 "문서 일관성 원칙" 참고).

## 2. 계획 문서화

`docs/week2/dayN-<slug>-plan.md`를 만든다. 반드시 포함할 섹션:

- **목표 (한 줄)** — 이슈가 무엇을 끝내는지
- **현재 상태** — 전환 전 코드 상태
- **범위 (포함 / 제외)** — 오늘 할 것과 다음 이슈로 미룰 것을 명시
- **실행 순서** — 작업을 **묶음(bundle) 단위**로 쪼갠 체크리스트
- **완료 기준** — 이슈 검증 항목과 매칭
- **리스크 / 결정 필요** — 판단이 갈리는 지점을 표로

템플릿은 [plan-template.md](plan-template.md) 참고.

### 문서 일관성 원칙 (중복 방지)

`docs/` 정리(2026-07-23) 때 확인된 중복 패턴을 반복하지 않기 위한 규칙. 새 문서를 쓰거나
기존 문서를 갱신할 때마다 적용한다.

**a) 사실(fact) 종류별 유일한 소스를 지킨다** — 다른 문서에서 언급할 땐 링크만, 절대 재서술하지 않는다.

| 정보 종류 | 유일한 소스 |
|---|---|
| 이슈 상태/진행 현황 | `docs/weekN_plan.md` |
| 제품 범위/MVP 제외 | `docs/plan.md` |
| 구현 세부(파일명, 코드 로직, 버그 수정 경위) | 해당 `docs/weekN/dayN-*.md` |
| 회고/배운 것 | `docs/weekN/retrospective.md` |

**b) 히스토리 로그 vs 살아있는 문서를 구분한다.**
- `docs/weekN/dayN-*.md`(계획·검증 문서)는 **한 번 쓰고 끝** — 이후 사실관계가 바뀌어도 본문을
  고치지 않고, "작성 시점: ..." 주석 + 최신 문서 링크만 추가한다 (`week3/retrospective.md` 사례 참고).
- `docs/weekN_plan.md`, `docs/plan.md`는 **항상 최신 유지** — 이슈 하나 끝날 때마다 여기 한 줄만 갱신.

**c) 초안은 최종본이 나오면 즉시 삭제한다** — "나중에 정리" 미루지 않는다 (`feature-dev-setup.md`
사례처럼 방치하면 나중에 몰아서 치워야 한다).

**d) 커밋 전 자문**: "이 변경이 `weekN_plan.md`의 이슈 상태표를 갱신해야 하나?" — 5번(커밋)
단계에서 매번 확인한다.

## 3. 묶음별 승인·구현

**핵심 규칙: 각 묶음을 시작하기 전에 무엇을 만들지 요약하고 사용자 승인을 받는다.** 한 번에 여러 묶음을 진행하지 않는다.

각 묶음마다:
1. 이 묶음에서 만들/바꿀 파일과 동작 변화를 3~5줄로 요약
2. "이대로 진행할까요?" 확인 → 승인 후 구현
3. 구현 직후 `ReadLints`로 린트 확인, todo 갱신
4. 판단이 갈리는 지점(예: 시드 개수, repo 분리 여부)은 `AskQuestion`으로 선택지 제시

이 프로젝트의 코드 컨벤션은 `CLAUDE.md` 참고. 요점:
- 코드·주석은 영어, **UI 카피는 한국어** (와이어프레임 문구 유지)
- 타입 변경은 `shared/` 먼저 → client/server 반영
- Express 요청 검증은 **zod**, 에러 응답은 `{ error: string }` + 적절한 status
- DB row ↔ 앱 타입 변환은 `server/src/db/mappers.ts` 재사용

## 4. 검증

작업 성격에 맞게 실행:

```bash
npm run build -w @hub/server   # 서버 타입 체크
npm test                       # vitest (엣지 케이스 위주)
npm run lint                   # oxlint
```

- **서버 라우트 테스트**는 DB/네트워크에 의존하지 않게 `vi.mock`으로 repo/데이터 레이어를 대체한다.
- **Supabase 연동 검증**: `npm run db:seed -w @hub/server` → `npm run db:check -w @hub/server`.
- **수동 API 검증**: 서버를 띄우고(`npm run dev:server`) `curl`로 정상/404/400 응답 확인 후 서버 종료.

## 5. 커밋

### 브랜치 전략 — 이슈 단위 + 하루 단위 병행

- **GitHub 이슈에 묶인 작업**(코드 변경, 이슈 완료 기준이 있는 것) → 이슈당 브랜치 1개:
  `feat/issue-<N>-<slug>` (main에서 분기). PR에 `Closes #N` 포함, 머지 후 브랜치 삭제.
- **이슈에 안 묶인 잡다한 변경**(계획서 추가, 문서 정리, 설정 조정 등 단일 이슈로 등록하기엔
  너무 작은 것) → **하루 단위 브랜치 하나**에 세부 커밋 여러 개를 쌓고, 하루 끝에 PR 한 번:
  `docs/<YYYY-MM-DD>` 또는 `chore/daily-<YYYY-MM-DD>` (main에서 분기).
  - 브랜치 안에서는 변경 단위별로 커밋을 잘게 쪼갠다 (한 커밋 = 한 가지 변경).
  - 그날 안에 이슈로 승격할 만큼 커지면(코드 구현이 필요해지면) 그 시점에 별도 이슈를 만들고
    이슈 브랜치로 옮긴다.
- 판단이 애매하면(이슈로 등록할지 하루 브랜치에 넣을지) 사용자에게 먼저 확인한다.

- **관련 파일만** `git add`. 제외 대상: `.cursor/plans/`, 이번 이슈와 무관한 문서.
- [Conventional Commits](https://www.conventionalcommits.org/) — 허용 type: `feat` `fix` `docs` `style` `refactor` `chore` `test`, scope 예: `client` `server` `shared` `crawler` `design`. 헤더 100자 이내, 끝 마침표 금지 (commitlint가 강제).
- 요약 끝에 `(#N)` 이슈 번호. 본문은 HEREDOC로 전달.

```bash
git commit -m "$(cat <<'EOF'
feat(server): 한 줄 요약 (#N)

[선택 본문 — 무엇을 왜 바꿨는지]
EOF
)"
```

사용자가 명시적으로 요청할 때만 커밋한다.

## 6. main으로 PR

```bash
git push -u origin feat/issue-<N>-<slug>
gh pr create --base main --title "[N100_실명] 요약" --body "$(cat <<'EOF'
... (아래 템플릿)
EOF
)"
```

- 타이틀: `작업 한 줄 요약` (최근 PR의 실명 패턴을 따름).
- 본문은 [pr-body-template.md](pr-body-template.md) 구조: 주요 작업 리스트 / 동작 확인 / 내가 설명할 수 있는 부분 / 아직 이해 못 한 부분 / 새로 알게 된 것 / 범위 외 / 테스트.
- 이슈 자동 종료를 위해 본문에 **`Closes #N`** 포함.
- 반환된 PR URL을 사용자에게 전달한다.

## 7. 캠퍼스 레포 동기화 (`syd348/hub` → `connect-AIAgentChallenge-26-1/hub`)

이 프로젝트는 캠퍼스 챌린지용 fork다. `syd348/hub`(개인 레포)에서 작업하고, 하루 한 번쯤
캠퍼스 조직 레포의 `N106_신서연` 브랜치로 PR을 보낸다.

**핵심 규칙: `.github/` 디렉토리는 캠퍼스 PR에 절대 포함하지 않는다.**
- `.github/workflows/*`는 `syd348/hub` 자체 운영(예: crawler cron)을 위한 것이라 캠퍼스 레포와
  무관하고, `workflows` 권한 없는 토큰으로는 push/PR 자체가 막힐 수 있으며 캠퍼스 쪽 자동화
  (`auto-merge.yml` 등)와 충돌할 수 있다.
- `syd348/hub`의 `main`엔 `.github/`를 정상적으로 커밋해 유지한다 (더 이상 `.gitignore` 대상 아님).
  캠퍼스로 보내는 브랜치에서만 아래처럼 제외한다:

```bash
git checkout -b campus-sync main
git rm -r --cached .github
git commit -m "chore: 캠퍼스 PR용 .github 제외"

git push campus campus-sync:N106_신서연-작업명
gh pr create -R connect-AIAgentChallenge-26-1/hub --base N106_신서연 --head N106_신서연-작업명

git checkout main
git branch -D campus-sync
```

- fork PR 자동 머지가 `Resource not accessible by integration`로 실패하면(`GITHUB_TOKEN`이
  cross-repo PR을 머지할 권한이 없어서 발생) 수동 머지하거나, 위처럼 `campus` 리모트에 직접
  push하는 방식으로 우회한다.

## 안전 규칙

- git config 수정 금지, force push 금지(요청 시 경고).
- 커밋·PR은 사용자가 명시적으로 요청할 때만.
- `.env` 등 비밀 파일 커밋 금지.
- 캠퍼스 PR에는 `.github/`를 포함하지 않는다 (위 7번 참고).
