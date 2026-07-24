# PR #1635 충돌 사건 정리 (포스트모템)

> 목적: 학습 + 재발 방지. "무엇이 왜 터졌고, 어떻게 확인했고, 어떻게 고쳤고, 어떻게 검증했는가"를 남긴다.
> 대상 PR: [connect-AIAgentChallenge-26-1/hub#1635](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/1635) — `leekwanhak:agent-service` → `N121_이관학`

---

## 1. 무엇이 일어났나 (한 줄 요약)

fork의 `agent-service`(v2 에이전트 서비스, `main`에서 새로 분기)를 institutional 저장소의 `N121_이관학`(v1 정적 MVP 히스토리가 그대로 남아있는 브랜치)으로 PR했더니, **같은 파일 경로에 서로 다른 두 프로젝트 버전이 들어있어 충돌**했다.

---

## 2. 원인 — 왜 충돌이 났는가

### 2.1 두 브랜치가 서로 다른 지점에서 갈라졌다

```
a44ede9 (공통 조상, merge-base)
   │
   ├── N121_이관학 (institutional) ── work 브랜치의 PR들이 계속 머지됨 (v1 정적 MVP 그대로 축적)
   │
   └── main → agent-service (fork) ── 이번 세션에서 v1을 버리고 v2로 처음부터 재작성
```

- `agent-service`는 **`main`에서 새로 분기**해 v1 흔적이 전혀 없는 상태로 v2(에이전트 SSE 서비스)를 처음부터 짰다.
- 반면 `N121_이관학`은 그동안 fork의 `work` 브랜치(v1 정적 MVP)를 계속 머지해왔기 때문에, v1 파일이 그대로 살아있었다.
- 즉 **"v1을 버리고 v2로 간다"는 결정을 fork에서만 적용했고, PR 대상이 되는 institutional 브랜치에는 반영하지 않았다.** 이게 근본 원인이다.

### 2.2 같은 경로, 다른 내용 — 진짜 충돌 5개

두 히스토리가 같은 파일 경로를 각자 다르게 바꿔서, git이 자동으로 하나를 고를 수 없었다.

| 파일 | 무엇이 달랐나 |
|---|---|
| `.gitignore` | v2가 v1의 상위집합(캐시·에디터·OS·`data/` 산출물 무시 항목 추가) |
| `.env.example` | 문구만 다름(기능은 동일) |
| `requirements.txt` | v2가 `fastapi`·`uvicorn`·`pypdf`·`pytest` 추가 |
| `docs/plan.md` | **완전히 다른 문서** — v1(정적 MVP 기획) vs v2(에이전트 서비스 기획) |
| `docs/spec/checklist.md` | **완전히 다른 문서** — v1(F1~F4 체크리스트) vs v2(Week 0~4 체크리스트) |

### 2.3 조용한 함정 — "충돌 없음"이 곧 "안전"은 아니었다

`README.md`는 한쪽(N121)만 바뀌어서 git이 **충돌 없이 자동으로 그쪽 버전을 채택**했다. 문제는 그 버전이 v1 아키텍처(정적 사이트+cron)를 설명하고, 이번에 삭제한 v1 문서들(`docs/user-scenarios.md`, `docs/tracking/` 등)을 링크하고 있었다는 것. **"충돌이 안 났다"와 "내용이 맞다"는 다른 이야기**라는 게 이번 사건의 핵심 교훈 중 하나다.

---

## 3. 어떻게 확인했는가 (단계별)

1. **PR 상태 조회** — `gh pr view 1635 --repo <upstream> --json mergeable,mergeStateStatus,headRefName,baseRefName`
   → `mergeable: CONFLICTING`, `mergeStateStatus: DIRTY` 확인. head/base 브랜치 파악.

2. **PR diff 파일 목록 확인** — `gh pr view --json files`
   → 이상한 점 발견: **diff엔 추가(+)만 있는데 상태는 CONFLICTING.** 이게 "base 브랜치에 같은 경로의 다른 버전이 이미 있다"는 신호였다.

3. **base 브랜치를 로컬로 fetch** — upstream 원격 추가 후 `git fetch upstream 'refs/heads/N121_이관학:refs/remotes/upstream/N121_이관학'`
   (전체 fetch가 아니라 필요한 브랜치만 정확히 지정 — 브랜치명에 한글이 섞여 있어 전체 fetch보다 안전)

4. **base 브랜치의 전체 파일 트리 확인** — `git ls-tree -r --name-only upstream/N121_이관학`
   → v1 전용 파일(`.claude/CLAUDE.md`, `web/app.js`, `data/2026-07-09.json` 등)이 그대로 있는 걸 발견.

5. **base 브랜치의 커밋 로그 확인** — `git log --oneline upstream/N121_이관학`
   → `Merge pull request #1151 from leekwanhak/work` 같은 커밋 발견 → "v1 `work` 브랜치가 계속 머지돼왔다"는 사실 확인.

6. **공통 조상(merge-base) 찾기** — `git merge-base upstream/N121_이관학 origin/agent-service`

7. **양쪽에 공통으로 존재하는 경로만 추출** — `comm -12 <(ls-tree ... | sort) <(ls-tree ... | sort)`

8. **"진짜 충돌" vs "한쪽만 바뀜" 구분** — 공통 경로마다 `merge-base`/`ours`/`theirs` 3개 blob 해시를 비교:
   - `ours == theirs` → 동일, 문제없음
   - `base == theirs` → 우리 쪽만 바뀜, 충돌 아님
   - `base == ours` → 저쪽만 바뀜, 충돌 아님(자동병합됨 — **여기가 README.md 함정 지점**)
   - **셋 다 다름** → 진짜 충돌
   → 이 방법으로 21개 겹치는 경로 중 진짜 충돌 5개를 정확히 추려냈다.

9. **충돌 파일 각각 실제 내용 diff** — `diff <(git show base:$f) <(git show ours:$f)`
   → v2가 상위집합인지, 아예 다른 문서인지 파일별로 판단 근거 확보.

---

## 4. 어떻게 해결했는가 (단계별)

1. **해결 방향을 먼저 사람에게 확인** — 충돌 5개는 "v2 채택"으로 판단 근거와 함께 제시, v1 전용 파일(자동병합될 것들)은 "삭제 vs 유지"를 별도로 질문해 결정을 받았다. (기계적으로 밀어붙이지 않고, 판단이 필요한 지점은 반드시 확인)

2. **미커밋 변경 보존** — 로컬에 이미 있던 미커밋 편집을 건드리지 않도록, merge를 `--no-commit --no-ff`로 실행해 자동 커밋되지 않게 멈춰둠.

3. **충돌 5개 해결** — 전부 `git checkout --ours -- <file> && git add <file>` (v2 버전 채택).

4. **v1 전용 파일 정리** — 자동병합으로 딸려 들어온 v1 전용 파일 19개를 `git rm --cached --ignore-unmatch`로 인덱스에서 제거 + 워킹트리에서도 삭제.

5. **README.md 재점검** — `git status`에 조용히 "M README.md"로 남아있는 걸 놓치지 않고 열어봄 → v1 내용으로 자동병합된 것 발견 → `checkout --ours`가 이 경우엔 안 먹힌다는 것도 확인(충돌 스테이지가 없는 파일이라 무동작) → `git show HEAD:README.md > README.md`로 직접 복구.

6. **병합 커밋 생성** — 무엇을 v2로 택했고, 무엇을 왜 지웠는지 커밋 메시지에 전부 남김(나중에 "왜 이 파일들이 사라졌는지" 이력으로 추적 가능하게).

7. **push** — `git push origin agent-service` → PR은 브랜치를 실시간 참조하므로 별도 조작 없이 자동 갱신.

---

## 5. 어떻게 검증했는가

| 검증 | 명령 | 기준 |
|---|---|---|
| 미해결 충돌 없음 | `git status --short \| grep -E "^(UU\|AA\|DD)"` | 결과 없음 |
| 충돌 마커 잔존 없음 | 스테이징된 파일 전체 grep `^<<<<<<<` 등 | 매치 없음 |
| **내용이 병합 전과 순수 동일한지** | `git diff --cached --stat` | **빈 결과** (v1 잔재 없이 딱 병합 전 v2 상태로 돌아왔는지 확인하는 핵심 검증) |
| 병합 커밋 구조 정상 | `git log -1 --pretty=%P <merge-commit>` | 부모 커밋 2개 |
| **push 후 실제 PR 상태** | `gh pr view --json mergeable,mergeStateStatus` | `MERGEABLE` / `CLEAN` |

마지막 항목이 최종 확인 — 로컬 검증을 아무리 통과해도, **실제로 push한 뒤 PR API로 재조회해 GitHub이 인정한 상태**를 봐야 끝난 것이다.

---

## 6. 재발 방지 체크리스트

- [ ] **fork에서 브랜치를 크게 재구성(reset/재작성)하기 전, PR 대상이 될 institutional 브랜치의 현재 상태를 먼저 본다.** 이번 사건은 이 확인을 건너뛰어서 발생했다.
- [ ] **"diff엔 추가만 있는데 상태가 CONFLICTING"** 같은 신호를 보면 즉시 의심한다 — base 쪽에 같은 경로의 다른 버전이 있다는 뜻이다.
- [ ] **git이 "충돌 없음"으로 자동병합한 파일도 반드시 리뷰한다.** 충돌 안 남 ≠ 내용이 맞음(README.md 사례).
- [ ] 겹치는 경로가 많을 땐 감으로 판단하지 말고 **merge-base/ours/theirs 3방향 해시 비교**로 기계적으로 "진짜 충돌"만 골라낸다.
- [ ] 되돌리기(reset --hard)나 대규모 삭제처럼 되돌리기 어려운 작업 전엔 **태그로 백업**해둔다(이번엔 `week1-first-pass` 태그 덕분에 안전하게 진행할 수 있었다).
- [ ] 충돌 해결 방향이 애매하면(특히 어느 쪽을 지울지) **판단을 임의로 하지 않고 사람에게 묻는다.**

---

## 참고
- 관련 커밋: `998b88b` (병합 커밋), 백업 태그 `week1-first-pass`
- 관련 문서: [`docs/dev/task-planning-devide.md`](./task-planning-devide.md) §4(계획 점검), §7(구현 전 전략 검토) — 이번 사건도 "확인 없이 밀어붙이지 않는다"는 같은 원칙이 적용됐다.
