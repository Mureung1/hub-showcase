# Codex 인수인계 — 2026-07-23 기획·구조·FE/BE/DB·컴포넌트 점검 + UI/UX 후속 작업 준비

> 이전 인수인계: [CODEX_HANDOFF_2026-07-22.md](./CODEX_HANDOFF_2026-07-22.md). 이 문서는 오늘 세션(Claude Code)에서 한 작업을 정리하고, **다음 세션(Codex)이 프로젝트 전체(아이디어·구조·기획, FE/BE/DB, 컴포넌트 구성)를 점검하고 UI/UX를 손볼 수 있도록 준비**하는 브리핑 문서다. 오늘은 이 점검/UI·UX 작업 자체를 진행하지 않았다 — 다음 세션이 이어받을 시작점만 만들어둔 것이다.

## 0. 오늘(2026-07-23) Claude Code 세션에서 한 일

- `work` 브랜치(43개 커밋 앞섬)를 `main`으로 fast-forward push(`git push origin work:main`, PR 없이 직접 반영). Vercel(`hub-theta-brown.vercel.app`)·Render(`hub-backend-kymx.onrender.com`)가 이 커밋들로 재배포되도록 트리거함.
- `CLAUDE.md`의 "커밋 푸터에 Co-Authored-By 남긴다" 규칙을 최신 지시(AI 크레딧 미표기)에 맞게 수정.
- vitest 테스트 환경 설치: `frontend/`에 `vitest`+`@testing-library/react`+`@testing-library/jest-dom`+`jsdom` 추가, `vite.config.js`에 `test` 설정, `src/setupTests.js` 신설(`@testing-library/jest-dom/vitest` — 일반 진입점 말고 vitest 전용 서브패스를 써야 `expect` 전역이 없어도 동작함), `package.json`에 `"test": "vitest run"`.
- `frontend/src/data/mbtiMethodMatching.test.js` 작성 — `matchMethods()` 정상/빈 값/경계값/실패 케이스 17개, 전부 통과. 이 과정에서 실제 동작 불일치 하나 발견: early return 경로(`{temperament:null,...}`)엔 `temperamentLabel` 키가 아예 없고, 정상 매칭 실패 경로(`"ZZZZ"`류)엔 `temperamentLabel: ""`로 키가 존재함 — 버그 여부 판단 안 하고 현재 동작 그대로 테스트에 고정만 해둠.
- **아직 커밋 안 함** — 위 변경들(CLAUDE.md, vitest 설치·설정, 테스트 파일)은 워킹트리에만 있음. 다음 세션 시작 시 `git status`로 먼저 확인할 것.

## 1. 오늘 부탁받은 새 작업의 목적 (다음 세션 = Codex)

사용자가 원하는 것: **이 프로젝트의 현재 만들어진 웹앱**에 대해

1. 아이디어·기획이 지금 코드/문서와 맞는지 점검
2. 전체 구조 점검 (FE/BE/DB, 컴포넌트 구성)
3. 위 점검을 바탕으로 **UI/UX를 손볼 수 있는 상태**로 준비

즉 "점검 → (필요하면 승인받고) UI/UX 개선"의 2단계다. 점검 없이 바로 UI/UX를 고치지 않는다.

**오늘 작업은 이 2부작(1부=기획·구조 점검, 2부=UI/UX)로 범위가 한정된다.** Codex는 이 문서에서 1부·2부와 직접 관련된 내용만 이해하고 진행하면 된다 — 백엔드 신규 기능 개발, DB 마이그레이션 실행, GitHub 이슈 정리, vitest 단위테스트 확충(#19) 등 이 두 가지와 무관한 작업은 오늘 범위 밖이다(발견하면 §3처럼 기록만 하고 손대지 않는다).

## 2. 점검 시 읽을 문서 지도 (영역별)

Codex는 `AGENTS.md`의 "Read first" 순서(`context.md`→`plan.md`→`checklist.md`→필요시 `evidence-data-roadmap.md`→`design.md`)를 기본으로 따르되, 이번 점검 목적에 맞춰 아래를 추가로 본다.

**기획/아이디어**
- `docs/context.md`, `docs/plan.md`, `docs/checklist.md` — 기획 원문
- `docs/decisions.md` — ADR-001~009. 특히 **ADR-007(제품 정체성: MBTI 입구+자기조절 무게중심)**, **ADR-008(외부 LLM 간이 MBTI 추정 채팅 허용)**, **ADR-009(결과 재정의: 회고 가능한 산출물)**가 최신 방향
- `docs/evidence-catalog.md` + `docs/reference.md` — 학습법 근거·불변원칙(P-A/P-B/P-C)
- `README.md` — 현재 요약 (단, §3 참고: mermaid 다이어그램이 실제 흐름과 어긋나 있음)

**FE 구조**
- `frontend/src/ProjectIntro.jsx` (767줄, 전체 화면 오케스트레이션)
- `frontend/src/hooks/{useAssessmentFlow,useServerSync,useMetacognition}.js`
- `frontend/src/components/steps/{StepIntro,StepMbtiSource,StepMbtiChat,StepSurvey,StepTaskState}.jsx`
- `frontend/src/components/{AnalysisReport,RetrospectiveReport,ConsentNotice}.jsx`, `ui.jsx`
- `frontend/src/lib/{scoring,recommendations,schedule,storage,api}.js`, `frontend/src/data/{questions,mbtiMethodMatching,taskState}.js`

**BE 구조**
- `backend/src/index.js` (Express 라우팅, `/api` prefix, ALLOWED_FIELDS 화이트리스트)
- `backend/src/lib/llm.js` (Gemini 프록시, `MODEL_CHAIN`, `observedSignals` 매핑 — 어제 라이브 검증됨)
- `backend/src/store.js` + `store.memory.js` + `store.supabase.js` (env 스위치 어댑터 구조)

**DB**
- `backend/db/schema.sql`, `docs/db-notes.md`, `docs/supabase-setup.md`
- ADR-001(localStorage 1차)·ADR-002(in-memory→Supabase)·ADR-006(성인 가명 파일럿 저장 허용)

**컴포넌트 구성 체크**
- 위 FE 컴포넌트 목록에서 실제 사용 여부(참조 grep) — 특히 저장소 루트의 `bricepark-intro/`, `guide7/`가 죽은 코드인지 아직 미확인 상태(어제 핸드오프 §3-A에서 다음 세션으로 미뤄둔 항목)

**UI/UX**
- `docs/design.md` — 필수 선독. 색·타이포·스페이싱 토큰(§2~4), 컴포넌트 패턴(§6), 화면별 가이드(§7), 작업 후 자기점검 체크리스트(§9)
- 미완료 단계(어제 핸드오프 §3-B 그대로 유효):
  - **[B] 설문 화면(step 1~3)** — codeit 카드 스타일 참고, 아직 미착수
  - **[C] `StepMbtiChat.jsx`** — perplexity 검색창 톤 참고, 아직 미착수
  - **[D] 결과 화면(`ProjectIntro.jsx` step4~6·`RetrospectiveReport.jsx`·`AnalysisReport.jsx`)** — 모각작 스타일(스탯 타일·히트맵·대시보드 탭) 참고, 아직 미착수
  - 참고 사진(codeit×2, perplexity×1, 모각작×3)은 세션 대화에만 있었고 파일로 저장되지 않음 — **사용자에게 다시 요청 필요**

## 3. 문서-코드 불일치 주의 (점검 중 다시 만날 것들)

- `README.md`의 mermaid 아키텍처 다이어그램이 `/api/health`·`/api/analysis`·`AnalysisReport` 흐름을 누락(이슈 #17, 아직 OPEN).
- **`docs/prompt-guide.md`의 "Review Prompt"가 "회원가입, AI 챗봇, 외부 AI API... 기능이 들어가지 않았는지 확인하세요"라고 되어 있는데, 이는 2026-07-20 ADR-008 이후 실제로 `/api/mbti-chat` + Gemini 연동이 정식 허용·구현된 것과 모순한다.** 오늘 처음 발견함, 아직 수정 안 함 — 점검 중 이 문서를 곧이곧대로 따르면 이미 승인된 기능을 "위반"으로 오판할 수 있으니 주의.
- `CLAUDE.md`의 Co-Authored-By 규칙은 오늘 고쳤지만 **아직 커밋 전**.
- `#19`(vitest 도입)는 환경만 오늘 설치됐고 실제 단위테스트는 `matchMethods` 하나뿐 — "테스트 있음"으로 과대평가하지 말 것.
- 이슈 #12(Supabase 키 대기)·#16(LLM 게이트 대기)의 현재 실제 상태(LLM은 이미 게이트 통과·라이브 동작 중)와 GitHub 이슈 라벨이 맞는지도 점검 대상.

## 4. 하드룰 (변경 없음, 재확인)

- MBTI를 고정 판단 도구처럼 표현 금지, 성적 예측/정신건강 진단/비교·랭킹 기능 금지.
- 새 프레임워크(Next.js 등) 도입 금지, 외부 UI 라이브러리는 사용자 승인 전 추가 금지.
- 커밋·PR에 AI 크레딧 미표기.
- push·PR 생성 직전 사용자에게 반드시 알리고 승인받는다 — **특히 오늘 main에 직접 push한 전례가 있다고 매 세션 자동으로 반복하지 말 것. 세션마다 다시 확인.**
- 디자인 작업 전 `docs/design.md` 먼저 읽기.
- 사용자 응답·자유의견은 Git/GitHub에 저장 금지.

## 5. UI/UX 작업 롤백 계획 (2부 시작 전 필수)

UI/UX는 눈으로 보고 판단하는 작업이라 "고쳤는데 별로다"가 자주 나온다. 되돌리기 쉽게 미리 규칙을 정해둔다.

- **작업 시작 전 기준점 기록:** UI/UX를 건드리기 전 `git log --oneline -1`로 현재 `work` HEAD 커밋 해시를 확인하고 보고한다. 이게 "문제 생기면 여기로 돌아간다"의 기준점이다.
- **화면 단위로 커밋을 쪼갠다:** `[B]설문화면`, `[C]LLM검색창`처럼 화면(또는 컴포넌트) 하나가 끝날 때마다 커밋한다. 여러 화면을 한 커밋에 몰지 않는다 — 그래야 특정 화면만 롤백할 때 다른 화면 작업이 같이 날아가지 않는다.
- **공유 토큰과 화면별 변경을 분리한다:** `docs/design.md` 기준 CSS 토큰(`app.css`의 `--primary`/`--accent`/`--tint-*` 등)은 모든 화면이 공유한다. 토큰 자체를 바꾸는 커밋과 특정 화면 레이아웃을 바꾸는 커밋을 섞지 않는다 — 섞이면 화면 하나만 되돌리려다 전체 색감이 같이 되돌아가는 사고가 난다.
- **되돌릴 땐 `git revert`, `reset --hard`/force push 금지:** 이미 `origin/work`·`origin/main`에 올라간 커밋을 되돌려야 하면 해당 커밋을 `git revert <hash>`로 되돌리는 새 커밋을 만든다. 히스토리를 지우는 `git reset --hard`나 `git push --force`는 하드룰상 사용자 명시 허가 없이 금지 — 필요하다고 판단되면 실행하지 말고 먼저 사용자에게 물어본다.
- **확인 전에는 main에 올리지 않는다:** 지금 `main`은 Vercel(`hub-theta-brown.vercel.app`)·Render(`hub-backend-kymx.onrender.com`)와 연결돼 push 즉시 라이브에 배포된다. 화면 하나를 고치면 브라우저로 직접 확인(§0 Read first에 이미 있는 `npm run dev`/빌드 검증 포함)하고 사용자 승인을 받은 뒤에만 `work`→`main` push를 진행한다. 확인 안 된 화면을 바로 main에 올리면, 문제 발생 시 "라이브에 이미 배포된 것"을 되돌려야 해서 롤백 비용이 커진다. 커밋은 계속 `work`에 쌓아두고, main 반영은 사용자에게 물어본 뒤 진행.
- **완료 기준:** `docs/design.md` §9 "의도 일치 자기점검 체크리스트"를 통과한 화면만 "완료"로 보고한다. 통과 못 하면 롤백하거나 다음 시도로 넘긴다.

## 6. 다음 세션(Codex) 시작 프롬프트

```
/Users/bricepark/Documents/hub 저장소다. 먼저 현재 경로, 브랜치, git status를 확인해.
AGENTS.md를 읽고, docs/handoff/CODEX_HANDOFF_2026-07-23.md(이 문서)를 읽어서 오늘까지의 상태를 파악해.

오늘 작업은 1부(기획·구조 점검)와 2부(UI/UX)로 범위가 한정된 2부작이야. 이 문서에서
이 두 가지와 관련된 내용만 이해하면 되고, 그 외(백엔드 신규 기능, DB 마이그레이션,
이슈 정리, vitest 확충 등)는 오늘 손대지 마. 발견해도 기록만 하고 넘어가.

1) 점검: 이 웹앱의 아이디어·기획(docs/context.md, plan.md, decisions.md)이 실제 코드와 맞는지,
   FE(frontend/src)·BE(backend/src)·DB(backend/db, docs/db-notes.md) 구조와 컴포넌트 구성이
   기획과 일치하는지 확인해줘. 이 핸드오프 문서 §2 문서 지도, §3 불일치 목록을 참고해.
   점검 결과를 "기획-코드 일치/불일치", "구조상 정리할 점", "컴포넌트 중복·죽은 코드 후보"로 나눠서 보고해.

2) 점검 결과를 나에게 먼저 보여주고, 내가 승인한 범위 안에서만 UI/UX를 손봐줘.
   미완료 UI/UX 단계는 §2 UI/UX 섹션의 [B]설문화면/[C]LLM검색창/[D]결과화면이야.
   참고 사진(codeit/perplexity/모각작 스타일)은 지금 다시 첨부할게.
   UI/UX 작업은 이 문서 §5 롤백 계획을 그대로 따라줘 — 시작 전 현재 work HEAD 커밋 해시 보고,
   화면 단위로 커밋 분리, 토큰 변경과 화면별 변경 분리, 확인·승인 전 main push 금지,
   되돌릴 땐 reset --hard/force push 말고 revert.

작업 전 반드시: 수정할 파일 목록을 먼저 제안하고 내 승인을 받아줘.
git add/commit은 화면 단위로 해도 되지만, work→main push는 내가 명시적으로 지시하기 전까지 하지 마.
```

## 7. 진행 방식 제안 (사용자용 참고)

1. 위 프롬프트를 Codex 새 세션에 붙여넣고, 참고 스타일 사진(codeit×2, perplexity×1, 모각작×3)을 함께 첨부한다.
2. Codex가 1단계(점검) 보고를 마치면, 어떤 불일치를 먼저 고칠지·UI/UX 어느 화면부터 손댈지 결정해서 알려준다.
3. 2단계(UI/UX)는 화면 단위로 나눠서(설문→LLM검색창→결과화면 순, 어제 정한 순서 유지) 진행하는 걸 권장 — 한 번에 다 바꾸면 리뷰가 어려워진다.
4. 오늘 Claude Code 세션에서 만든 미커밋 변경(CLAUDE.md, vitest 설정, 테스트 파일)은 Codex 세션에서도 `git status`로 보일 것 — 삭제하지 말고 그대로 두거나, 커밋 여부는 사용자가 결정.
