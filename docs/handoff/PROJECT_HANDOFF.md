# PROJECT_HANDOFF.md — 다른 창/에이전트가 이어받기 위한 인수인계

> 이 문서 하나로 다른 Codex/Claude Code 창에서 이 프로젝트를 **이해하고 이어서 작업**할 수 있게 하는 것이 목적이다. 날짜별 학습 노트는 `STUDY_NOTES_2026-07-13.md`·`STUDY_NOTES_2026-07-14.md`, 어제 커밋 인수인계는 `CODEX_HANDOFF_2026-07-13.md` 참고.
> 최종 갱신: 2026-07-14.

## 0. 30초 요약

`/Users/bricepark/Documents/hub` (브랜치 `work`)의 **MBTI × 인지과학 공부법·스트레스 관리 웹앱**. 개인 연구·비배포. 목적은 **① MBTI 개인화 매칭으로 실제 학습을 돕고 → ② 만족·효과를 측정 → ③ DB·문서로 축적·분석**. 메인 시스템은 **3-에이전트 파이프라인(규칙 기반 우선, LLM은 게이트 후)**: (a)매칭 → (b)스케줄 → (c)데이터 수집·분석. React(Vite)+Express+localStorage/in-memory. **커밋·PR에 AI 크레딧 미표기, 한 파일에 얽힌 변경은 합쳐서 커밋.**

## 1. 반드시 먼저 읽을 파일 (순서)

1. `CLAUDE.md`, `AGENTS.md` — 역할·하드룰·구조
2. `docs/context.md` — 목적(①②③)·3-에이전트·경계
3. `docs/plan.md` — 기획·North Star·로드맵
4. `docs/backlog.md` — 지금 뭐부터(압축 보드)
5. `docs/matching-criteria.md` + `docs/evidence-catalog.md` + `docs/reference.md` — 매칭 기준·근거·출처·불변원칙(P-A~P-D)
6. `docs/decisions.md` — 주요 기술 결정(ADR)
7. `docs/llm-agent-plan.md` — 제품 내 LLM 설계(구현 전)
8. 코드: `frontend/src/ProjectIntro.jsx`(화면 컨테이너), `frontend/src/{data/mbtiMethodMatching.js, lib/{scoring,recommendations,schedule,api,storage}.js, components/*}`, `backend/src/{index,store}.js`

## 2. 아키텍처·파일 지도

```
hub/
├─ package.json            # 루트: dev:frontend/dev:backend/build/lint 위임
├─ frontend/               # React + Vite
│  ├─ .env.example         # VITE_API_BASE_URL
│  └─ src/
│     ├─ ProjectIntro.jsx  # 화면 컨테이너(단계 0~5 + 분석 진입). 상태·핸들러 집중
│     ├─ components/       # AnalysisReport.jsx, ui.jsx(Progress/OptionCard/QuestionGroup/ScoreBar)
│     ├─ data/             # questions.js, mbtiMethodMatching.js(매칭 기준 코드)
│     ├─ lib/              # scoring, recommendations, schedule, api, storage
│     └─ styles/app.css    # 디자인 토큰·클래스(인라인 <style>에서 분리)
├─ backend/                # Express
│  ├─ .env.example         # PORT, CORS_ORIGIN
│  └─ src/{index.js, store.js}   # /api/health, /api/results(POST/GET/DELETE), /api/analysis, in-memory
├─ .agents/skills/         # Codex 스킬(feature-planner, feature-verifier 등)
├─ scripts/                # audit-scoring-order.mjs(순서 독립성 감사)
└─ docs/                   # 위 문서들 + handoff/
```

- **3-에이전트 = 코드 위치:** (a)매칭 `mbtiMethodMatching.js`+`recommendations.js`, (b)스케줄 `schedule.js`, (c)데이터 `backend/*`+`api.js`+`AnalysisReport.jsx`.
- 저장: **localStorage 1차**, 서버는 **동의 후 비식별 요약만**. 서버 꺼져도 앱 유지.

## 3. 지금까지의 요청·작업 흐름 (요약)

| 사용자가 원한 것 | 대응/결과 |
|---|---|
| Codex 작업 인수받아 검토·개선 | 저장소 감사, 문서-코드 불일치 표, P0 발견 |
| 목적 구체화(빅데이터·에이전트) | 목적 ①②③ + 3-에이전트 프레임 확정. 과도한 게이트/저작권 프레임 교정 |
| 신뢰성 문제 수정 | 점수 순서 결정론화(rules-v3), 결과 스냅샷 수명, dead code 제거 |
| 논문 반영 | reference·evidence-catalog 구축(논문 28편+웹5), 메타인지 보정 루프 |
| 디자인 개선 | 크림 배경+블루 세리프(Bookman)+스크립트 악센트+프레임 |
| 매칭을 실제로 만들기 | 논문 기반 MBTI×인지법 매칭 기준·엔진(a), 스케줄 시드(b) |
| 과제(FE·BE·DB) | frontend/backend 분리, Express+in-memory 수집 API(c), 동의·삭제 |
| 데이터 분석 | `/api/analysis` 집계 + AnalysisReport 화면 |
| 참고 자료 패턴 도입 | backlog·ADR·North Star·PR 4섹션·LLM 설계 문서 |
| 컴포넌트 분리·문서 정합 | CSS·UI 컴포넌트 분리(회귀 없음), 문서 보강 |

**작업 방식:** 큰 변경은 plan mode로 선택지 제시 → 사용자 승인 → 구현 → 브라우저/lint/build 검증 → 커밋은 사용자 요청 시. 크레딧 미표기.

## 4. 진행 상태

- **완료(커밋됨):** 기획 재정의, P0 신뢰성, 메타인지 보정, 디자인, 근거 카탈로그, frontend/backend 분리, 매칭 엔진, 스케줄 시드, 수집 백엔드, 개발 에이전트 스킬.
- **완료(미커밋, 작업트리):** 분석 리포트(`/api/analysis`+AnalysisReport), CORS 다중 origin, 참고 패턴 문서(backlog·decisions·plan North Star/로드맵·pr-guide·evidence-catalog P-D·llm-agent-plan), 컴포넌트 분리(styles/app.css, components/ui.jsx). → `git status`로 확인. 커밋 예: `feat: 분석 리포트` / `docs: 참고 패턴 반영` / `refactor: CSS·UI 컴포넌트 분리`.
- **백로그:** Supabase 영속화, 과제(task/state) 입력, 스케줄 고도화, LLM 실제 연동(게이트 후), 자기설명·교차 메타분석 근거, 문서 terminology sweep(일부 `task/state-only`·`rules-v2` 잔존).

## 5. 불변 원칙 (지켜야 함)

- **P-A** 만족도≠정확도≠학습효과 / **P-B** 선호≠효과(learning-styles) / **P-C** 빅데이터≠타당도 / **P-D** 기준=방어막·AI 생성/사용자 승인. (`evidence-catalog.md`)
- 하드룰: 로그인·회원가입·JWT·제품 내 외부 LLM은 게이트 후. 서버엔 비식별만(이름·자유응답 금지). 공식 MBTI 문항 응용가능. 진단·성적예측 금지.
- 운영: **AI 크레딧 미표기**, force push 금지, `.env` 커밋 금지, 한 파일 얽힌 변경은 **합쳐서 커밋**. PR은 저장소 4섹션 템플릿.

## 6. 실행·검증

```bash
# 설치
npm --prefix frontend install && npm --prefix backend install
# 실행(두 개 터미널)
npm run dev:frontend        # http://localhost:5173 (Safari면 127.0.0.1도 허용됨)
npm --prefix backend run dev # http://localhost:3001
# 검증
npm run build && npm run lint
curl -s localhost:3001/api/health
```
- 순서 독립성 감사: dev 서버 콘솔에서 `scripts/audit-scoring-order.mjs` import 실행(기대 0).
- **주의:** 백엔드는 in-memory라 재시작 시 수집 데이터 소실(정상). 로컬호스트가 안 열리면 dev 서버가 꺼진 것 — 다시 실행.

## 7. 앞으로 고민해보면 좋을 점 (열린 조언 · 정답/지침 아님)

> 아래는 강요가 아니라 방향 후보다. 상황과 취향에 따라 고르거나 버려도 된다.

- **과제(task/state) 입력을 넣을까?** 오늘 무엇을(암기/이해/문제풀이)·마감·가용시간을 받으면 baseline이 진짜 "task/state"가 되고 효과 검증이 정밀해진다. 대신 문항·UX가 늘어난다 — 어디까지 물을지 트레이드오프.
- **스케줄 에이전트의 야망 수준.** 지금은 블록 목록. 하루 타임라인 → 주간(분산 원칙 활용) → (아주 나중) 에브리타임식. 어디서 멈출지.
- **제품 정체성: MBTI 전면 vs 자기조절 전면.** 근거(H-SRL-1)는 "성과는 MBTI보다 자기조절로 더 설명"을 시사한다. MBTI를 입구로 두되 무게중심을 메타인지·자기조절 루프로 옮기는 선택지도 열려 있다.
- **LLM을 언제·어디부터.** `llm-agent-plan.md`대로면 "매칭 설명" 에이전트가 가장 안전한 첫 도입점(닫힌 기준을 풀어 말할 뿐). 분석 요약은 JSON 강제로. 단 PII·동의·비용 게이트 먼저.
- **데이터가 쌓이면 분석을 어떻게.** 기질×방법 교차표, 시계열(보정오차 추이), 매칭군 vs baseline군 비교. 표본이 작을 때 과잉해석 경계.
- **근거의 빈틈.** 자기설명·교차학습의 직접 메타분석(Bisra 2018, Brunmair·Richter 2019 등) 확보 시 매칭 strength가 단단해진다.
- **연구 윤리.** 실제 사용자 파일럿을 하면 동의·삭제·보존·미성년 고려가 필요(evidence-data-roadmap §7). 지금은 익명·비식별로 안전.
- **컴포넌트 분리를 더 할지.** 화면(step) 컴포넌트까지 나눌 수 있으나 상태 결합이 커 props 드릴링 위험 — "과분리 금지" 원칙과 저울질.

## 8. 새 창에서 시작할 때 붙일 프롬프트(예)

```text
/Users/bricepark/Documents/hub (브랜치 work)에서 작업한다.
먼저 docs/handoff/PROJECT_HANDOFF.md 를 읽고, 이어서 §1의 파일들을 읽어 프로젝트를 파악하라.
불변 원칙(P-A~P-D)·하드룰·운영 규칙(AI 크레딧 미표기, 한 파일 얽힌 변경은 합쳐 커밋)을 지킨다.
현재 미커밋 변경이 있으니 git status로 확인하고, 큰 변경은 먼저 선택지를 제시해 내 승인을 받은 뒤 진행하라.
오늘 할 일은 내가 지정한다. 지정 전에는 파악·요약만 하라.
```
