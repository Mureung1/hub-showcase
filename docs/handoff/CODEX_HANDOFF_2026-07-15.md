# Codex 인수인계 — 2026-07-15 커밋·이슈 등록 완료 → push + PR만 남음

이 문서는 `work` 브랜치에서 오늘 진행한 작업을 Codex가 이어받아 **push + PR 생성만** 하면 되도록 정리한 것이다. 코드·문서 작업, 커밋, GitHub 이슈 등록은 **이미 전부 끝났다.** 이전 인수인계는 `PROJECT_HANDOFF.md`(구조 총람)·`CODEX_HANDOFF_2026-07-13.md`(이전 커밋 가이드) 참고.

## 0. 한 줄 요약

오늘 한 일: ①[A9] 교차학습 메타분석 근거 반영 → ②ProjectIntro 훅·컴포넌트 분리 → ③성인 대상 가명 파일럿 게이트(ADR-006) + 제품 정체성 확정(ADR-007) → ④task/state(오늘 과제) 입력으로 baseline 진짜 개인화 → ⑤주간 분산 스케줄(v1.5) → ⑥커밋 시크릿 유출 방지 가드레일 → ⑦Supabase 연동 스캐폴딩 + 재사용 검증 스크립트 → ⑧GitHub 이슈 6개 등록·정리.

**전부 브라우저/API 실측 검증됨, lint·build 클린, `work` 브랜치에 6개 커밋으로 이미 올라가 있다. Codex가 할 일은 push + PR 생성뿐이다.**

## 1. 시작 전 확인 (그대로 실행, 문서와 실제가 일치하는지만 재확인)

```bash
cd /Users/bricepark/Documents/hub
git log --oneline -7          # 아래 §2의 6개 커밋 해시와 일치해야 함
git status --short --branch   # work 브랜치, 아래 §3의 예외 파일 외엔 clean이어야 함
npm run lint && npm run build # 둘 다 통과해야 함
npm run verify:backend        # 6/6 통과해야 함(백엔드가 떠 있어야 함: npm --prefix backend run dev)
```

## 2. 이미 완료된 커밋 (work 브랜치, 순서대로)

```
fec44d8 docs: 참고 패턴 문서 + backlog·이슈 등록 정리 반영
4c92efe feat: Supabase 연동 스캐폴딩 + 재사용 가능한 저장소 검증 스크립트
25247f6 chore: 커밋 시크릿 유출 방지 가드레일 + 저장소 검증 스크립트 진입점
c72af2b docs: 성인 대상 가명 파일럿 게이트 허용 + 제품 정체성 확정 (ADR-006·ADR-007)
49f83a2 refactor: ProjectIntro 훅·컴포넌트 분리 + 오늘 계획(task/state) 입력 + 파일럿 동의 고지 + 정체성 카피
5eaeff2 docs: 교차학습 메타분석([A9] Brunmair·Richter 2019) 근거 반영
```

**Codex는 이 커밋들을 다시 만들거나 amend/rebase하지 않는다.** 그대로 push한다.

## 3. 커밋에서 의도적으로 제외한 것 (그대로 두면 됨)

```
?? .claude/          # 로컬 dev-server launch 설정. 제품 산출물 아님.
?? docs/handoff/      # 이 문서 포함, 과정 기록. 제품 산출물 아님.
```
이 둘은 커밋하지 않는다(핸드오프 문서 자체가 세션 인수인계용이라 저장소 이력에 남길 필요 없음). Codex가 새로 만든 자기 인수인계 문서를 여기 추가해도 무방하나, 그것도 커밋 대상은 아니다.

## 4. GitHub 이슈 등록 완료 (`bricepark94/hub`)

| 이슈 | 제목 | 상태 |
|---|---|---|
| [#11](https://github.com/bricepark94/hub/issues/11) | 익명 연구 데이터 수집 한 사이클 완성 | Closed |
| [#12](https://github.com/bricepark94/hub/issues/12) | Supabase 실제 연동 | **Open** (사용자 키 입력 대기) |
| [#13](https://github.com/bricepark94/hub/issues/13) | task/state 입력 → baseline | Closed |
| [#14](https://github.com/bricepark94/hub/issues/14) | 주간 분산 스케줄(v1.5) | Closed |
| [#15](https://github.com/bricepark94/hub/issues/15) | 커밋 시크릿 유출 방지 가드레일 | Closed |
| [#16](https://github.com/bricepark94/hub/issues/16) | 제품 내 LLM 설명 에이전트 | **Open** (게이트 G6 대기) |

기존 QA 이슈 [#3](https://github.com/bricepark94/hub/issues/3)·[#4](https://github.com/bricepark94/hub/issues/4)(7/13 작성)에는 오늘 작업 결과를 코멘트로 연결해 뒀다(재작성하지 않음). 새 영역 라벨 3개(`area: db`, `area: security`, `area: llm`)를 저장소에 추가했다. 상세: `docs/issue-drafts.md`.

**PR 본문에 `Closes #11, #13, #14, #15` 를 넣고, `#12`·`#16`은 "관련(related)"으로만 언급한다** (아직 열려 있으므로 자동 종료 금지).

## 5. 검증 완료 항목 (다시 안 해도 되지만 재확인 권장)

- `npm run lint`·`npm run build`: 매 커밋 단위로 통과 확인.
- 브라우저 E2E(신규 탭, localStorage 초기화): step0→1→2→3→4→5(오늘 계획)→6(실천카드) 전 구간 완주, 콘솔 에러 0.
- task/state baseline 재계산 실측: 과제유형=암기+마감=오늘 선택 시 baseline이 "분산→환경→인출"→"인출→분산→환경"으로 변경 확인.
- 주간 분산 계획: deadline=today→압축 안내, deadline=flexible→3일 체크포인트 정상 렌더.
- `npm run verify:backend`: consent거부→저장→조회→삭제→재조회 6단계, in-memory 대상 반복 실행 통과.
- pre-commit 훅: 가짜 API 키·개인키 차단 확인 + `<placeholder>` 형태 오탐 2건 발견·수정(회귀 테스트로 재확인).
- "React Hooks 순서" 콘솔 에러는 다른 브라우저 탭의 CDP 콘솔 버퍼 잔재였음을 새 탭 재현으로 확정(코드 문제 아님).

## 6. Codex가 할 일 — push + PR 생성만

1. `git push origin work` (이미 있는 6개 커밋을 그대로 push. force push 아님, 일반 push).
2. PR 생성: head `bricepark94:work` → base `connect-AIAgentChallenge-26-1/hub`의 `N077_박병관`.
3. PR 전 시크릿 점검(`docs/security-secrets.md` §4) — 이미 pre-commit 훅으로 커밋 시점에 걸러졌지만, `git diff origin/work...work`로 최종 한 번 더 눈으로 확인.
4. PR 본문 초안:

   > **무엇을**: 교차학습 근거 정밀화([A9]), UI 컴포넌트/훅 분리, task/state 입력으로 baseline 실질화, 주간 분산 스케줄(v1.5), 성인 대상 가명 파일럿 게이트(ADR-006/007), 커밋 시크릿 가드레일, Supabase 연동 스캐폴딩 + 재사용 검증 스크립트(`npm run verify:backend`).
   >
   > **검증**: lint/build 통과, 브라우저 전 구간 완주(콘솔 에러 0), task/state baseline 재계산 실측, `npm run verify:backend` 6/6 통과, pre-commit 훅 차단·오탐수정 테스트 통과.
   >
   > **이슈**: Closes #11, #13, #14, #15. Related #3, #4, #12, #16.
   >
   > **범위 밖(유지)**: 로그인·계정 기능 미도입. LLM 실제 호출 미도입(게이트 G6 대기, #16). Supabase 실제 연결은 사용자 키 입력 대기(#12). 사용자 응답 원문 미커밋.

5. **push·PR 생성 직전, 실행 전에 사용자에게 한 번 더 알리고 진행한다** (하드룰: 원격·공개 작업은 사전 확인).

## 7. 하지 말아야 할 것 (Hard rules)

- **force push 금지.** amend/rebase 금지 — 이미 있는 6개 커밋을 건드리지 않는다.
- 로그인·회원가입·JWT·실제 LLM 호출을 새로 추가하지 않는다(게이트 G6 이후, §8-2 참고).
- 사용자 설문 응답 원문·자유의견·개인정보를 저장소·Issue에 넣지 않는다.
- `.env`(예시 아님)·API 키·개인키를 절대 커밋하지 않는다 — `.githooks/pre-commit`이 차단하지만, `--no-verify`로 우회하지 않는다.
- `package.json` 의존성 변경(오늘 추가한 `@supabase/supabase-js` 제외 — 이미 승인됨)은 추가 승인 후에만.
- **커밋 메시지·PR 본문·이슈 본문에 AI 생성 크레딧(Co-Authored-By, "Generated with..." 등)을 넣지 않는다.**
- 이미 등록된 이슈(#11~#16, #3·#4 코멘트)를 중복 재등록하지 않는다.

## 8. 남은 작업 (PR과 무관, 다음 단계)

### 8-1. Supabase 실제 연동 (사용자 액션 필요, 코드는 완료) — Issue #12
1. Supabase 프로젝트에서 `backend/db/schema.sql` 실행(SQL Editor).
2. `backend/.env`에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 입력(커밋 금지).
3. `npm --prefix backend install` (`@supabase/supabase-js` 실제 설치).
4. `npm --prefix backend run dev` 재시작 → 로그 `[store] 저장소 어댑터: supabase` 확인.
5. `npm run verify:backend` → `backend="supabase"`로 전체 통과 확인.
6. 절차 상세: `docs/supabase-setup.md`.

### 8-2. 제품 내 LLM 연동 (게이트 G6, 착수 전 사용자 승인 필요) — Issue #16
- 설계: `docs/llm-agent-plan.md`. 첫 도입점은 "설명 에이전트"(닫힌 기준을 풀어 말하기만, 환각위험 낮음).
- 순서: `openai`/`@google/genai` 의존성 승인 → `backend/src/lib/llm.js` → `POST /api/explain`(비식별 입력만, JSON 강제 출력) → 프론트 동의 토글.
- 키는 `backend/.env`에만. **절대 `VITE_` 프리픽스로 프론트에 노출하지 않는다.**

### 8-3. 근거 보강 (자료 확보 시)
- Bisra, K., Liu, Q., Nesbit, J. C., Salimi, F., & Winne, P. H. (2018). *Inducing Self-Explanation: a Meta-Analysis.* Educational Psychology Review, 30(3), 703–725. DOI 10.1007/s10648-018-9434-x — 확보되면 `evidence-catalog.md`의 `selfExplanation` strength를 정밀화.

### 8-4. 여유 작업
- 분석 리포트 심화(기질×방법 교차표, 시계열 보정오차) — 파일럿 데이터가 실제로 쌓인 뒤.
- 스케줄 "에브리타임식" 확장 여부 — v1.5(주간 분산) 완주 후 재논의(하드룰 저촉 아님, 사용자 확인 완료).

## 9. 새 Codex 세션에 붙일 프롬프트

```text
/Users/bricepark/Documents/hub (브랜치 work)에서 작업한다.
먼저 docs/handoff/CODEX_HANDOFF_2026-07-15.md 를 처음부터 끝까지 읽어라.

오늘 작업(코드·문서·커밋 6개·GitHub 이슈 등록)은 이미 전부 끝났다. §2의 커밋 로그와
git log --oneline -7 이 일치하는지, §1의 lint/build/verify:backend가 통과하는지만
먼저 확인하라. 문서와 실제가 다르면 나에게 먼저 보고하고, 절대 스스로 판단해 재작업하지 마라.

확인이 끝나면 §6대로 push + PR 생성만 진행하되, 실제 push·PR 생성 직전에는
반드시 나에게 알리고 진행하라(원격·공개 작업이므로).

§7(하드룰)을 반드시 지켜라 — 특히 force push·amend·rebase 금지, AI 크레딧 미표기,
이미 등록된 이슈 중복 재등록 금지.

§8(남은 작업)은 내가 지정하기 전에는 착수하지 마라 — 특히 Supabase 키 입력이나
LLM 의존성 설치처럼 승인이 필요한 작업은 파악만 하고 진행하지 마라.
```
