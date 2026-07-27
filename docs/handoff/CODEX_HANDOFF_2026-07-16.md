# Codex 인수인계 — 2026-07-16 (최종) 실동작 검증·공개 배포 완료·LLM 가이드라인

이 문서는 **저번 PR(2026-07-15, 이미 병합됨) 이후** 오늘 하루 진행한 작업 전체를 정리한다. 저번 인수인계는 "코드가 준비됐다"는 상태였고, 오늘은 **그 코드를 실제 Supabase에 붙여 검증 → 오늘의 미션(서버·DB연결, 수직슬라이스, 검증 Agent) 점검 → 실제로 인터넷에 공개 배포**까지 끝냈다. **PR 제출 시점 기준 최신 상태가 이 문서다** — 이전 버전(같은 파일명, 배포 "미완료"라고 적혀 있던 버전)은 무시한다.

## 0. 저번 PR과 달라진 점 (핵심 차이)

| | 저번 PR (2026-07-15) | 오늘 (2026-07-16) |
|---|---|---|
| Supabase | 코드만 준비(어댑터·DDL·env스위치), **키 없이 in-memory로만 검증** | **실제 Supabase 프로젝트(Seoul 리전)에 연결, 저장→조회→삭제 라운드트립을 진짜 Postgres로 검증** |
| 버그 | — | **RLS와 별개로 service_role 권한 미부여(403) 실전 발견·수정** + **main 브랜치가 20+ 커밋 뒤처져 배포가 막힌 문제 발견·수정** |
| GitHub 이슈 | #11~#16 등록, #12(Supabase)는 열어둠 | **#12를 실제 검증 완료로 닫음** |
| 배포 | 없음 | **✅ 완료 — 실제 공개 링크 살아있음**(https://hub-theta-brown.vercel.app) |
| LLM | 설계 문서(`llm-agent-plan.md`)만 존재 | 실행 가능한 요약 가이드라인 추가(§5, 변경 없음 유지) |
| 오늘의 미션 점검 | — | **3개 미션 항목별 점검 결과 기록**(§2) |

**한 줄 요약: 저번엔 "이론상 되는 코드", 오늘은 "실제로 검증되고 인터넷에 공개된 서비스".**

## 1. 오늘 만든 커밋 (work 브랜치, 저번 PR 이후 순서대로)

```
a322e3eb fix: schema.sql에 service_role GRANT 명시 (실제 연동 중 403 발견·수정)
36078e62 chore: backend package-lock.json 갱신 (@supabase/supabase-js 실제 설치 반영)
25fcd236 docs: 공개 배포 절차(Render+Vercel) 추가
948079d7 docs: 배포 완료 — 실제 공개 주소 기록 (Vercel+Render)
```
(4c92efe8·fec44d89는 그 이전 커밋이라 저번 PR 대상 — 이미 병합됐으면 무시)

**주의(브랜치 상태, 중요)**: `origin/main`은 현재 `25fcd236`까지만 반영돼 있고 `948079d7`(배포 주소 기록)은 아직 `work`에만 있다. 이건 **docs-only 커밋이라 앱 동작엔 영향 없음** — 급하게 main에 올릴 필요는 없다. 다만 Codex가 PR을 만들 때 **base를 work 기준으로**(또는 팀 규칙에 맞게) 잡을 것. **main과 work가 원래 20개 이상 커밋 차이가 나던 걸 오늘 `git push origin work:main`(fast-forward)으로 동기화했다** — 이 사실을 모르고 "왜 main이 이렇게 크게 바뀌었지"라고 착각하지 말 것(강제 push 아님, 순수 fast-forward, 커밋 손실 없음).

## 2. 오늘의 미션 점검 결과 (사용자 요청으로 실제 코드 대조 확인)

| 미션 | 상태 | 근거 |
|---|---|---|
| **1. 서버·DB 연결** | ✅ 완료 | `backend/src/index.js`에 Express 라우트 5개(health/results GET·POST·DELETE/analysis), `store.supabase.js`에 CRUD 5함수, `frontend/src/lib/api.js`로 FE-BE 연결. 오늘 **실제 배포 환경에서도 재검증**(§4). |
| **2. 첫 수직슬라이스 기능 완성** | ✅ 완료 | 화면→요청→서버→DB저장→응답→화면갱신 한 사이클이 로컬·원격 모두에서 `npm run verify:backend` 6/6 통과로 실증됨. |
| **3. 기능 검증 Agent 만들기** | 🟡 부분 완료 — **오늘 신규 제작 안 함, 갱신 필요 상태로 남김** | `.agents/skills/feature-verifier/SKILL.md`가 **이미 존재**(이전 세션 산출물)하지만, 오늘 추가된 기능(task/state 입력, 주간 분산 스케줄, 실제 Supabase 배포)이 체크리스트에 반영 안 됨. 아래 §2-1 "갱신 계획"만 세우고 실행은 보류함(사용자가 배포를 먼저 하자고 결정). **Codex가 이어서 할 수 있는 가장 안전한 다음 작업 후보.** |

### 2-1. 기능 검증 Agent — 갱신 계획 (실행 안 됨, Codex가 이어받을 수 있음)

**원칙**: 검증 전용(새 기능 추가 안 함), 요구사항 기반(임의 항목 금지), 근거 필수(명령 출력·payload 첨부), 자동+수동 2층 분리.

**갱신할 내용** (`.agents/skills/feature-verifier/SKILL.md`에 추가):
- 자동 검증 섹션에 `npm run verify:backend` 추가(현재는 curl 헬스체크만 있음)
- 수동 체크에 task/state 입력(Step5) → baseline 재계산 검증 추가
- 수동 체크에 주간 분산 스케줄(deadline별 분기: today=압축안내, 그외=3일 체크포인트) 추가
- `in-memory` vs `supabase` 구분 검증 문구 추가(health의 `backend` 필드 확인 — 착각 방지)
- (선택) 배포된 공개 URL(§4)을 대상으로 한 원격 스모크테스트 항목 추가

## 3. 오늘 실제로 검증한 것 — 로컬

```bash
cd /Users/bricepark/Documents/hub
npm --prefix backend run dev      # backend/.env에 SUPABASE_* 키 필요
npm run verify:backend
```
기대 결과: `backend="supabase"`로 6단계 전부 통과.

**주의**: `backend/.env`는 저장소에 없다(`.gitignore`+pre-commit 훅으로 보호). 없으면 `backend="in-memory"`로 폴백하며 이건 정상(앱이 죽지 않음) — 다만 그 상태에선 API 계약만 검증되고 Supabase 검증은 아니다.

### 발견한 버그 1 — service_role 권한 누락
Supabase 프로젝트 생성 시 **"Automatically expose new tables"를 끄면**(보안 권장 설정) RLS와는 **별개 계층**으로 `service_role`에도 테이블 권한이 자동으로 안 붙는다. `permission denied for table`(42501) 403 에러 발생 — RLS 정책 문제로 착각하기 쉽다. `backend/db/schema.sql`에 `grant all on public.research_results to service_role;`을 명시해 해결. **다른 테이블을 새로 추가할 때도 이 GRANT를 빼먹지 않는다.**

## 4. 공개 배포 — ✅ 완료 (오늘 실제로 끝냄)

| 구성 | 공개 주소 | 상태 |
|---|---|---|
| 프론트엔드(Vercel) | https://hub-theta-brown.vercel.app | ✅ Live |
| 백엔드(Render) | https://hub-backend-kymx.onrender.com | ✅ Live, Supabase 연결 확인됨 |

절차 문서: `docs/deployment.md`(실제 주소 반영 완료). **이 작업은 처음부터 끝까지 사용자가 브라우저에서 직접 진행**했고(Codex/에이전트는 계정 생성·대시보드 조작을 대신 할 수 없음), 나(에이전트)는 단계별 안내 + 결과 검증만 수행했다.

### 발견한 버그 2 — main 브랜치가 배포를 막음
Vercel이 처음에 `main` 브랜치를 기준으로 저장소를 스캔했는데, **`main`이 20개 넘는 커밋만큼 뒤처져 있어서 `frontend`/`backend` 폴더 자체가 없었다**(폴더 분리 이전 버전). Root Directory 선택 모달에 `frontend`가 아예 안 보이는 증상으로 나타남. `git push origin work:main`(fast-forward, 충돌 없음)으로 main을 work와 동일하게 맞춰서 해결. **교훈: 배포 플랫폼은 보통 `main`을 기본으로 본다 — 실제 작업 브랜치가 다르면 반드시 사전에 동기화할 것.**

### 배포 후 마무리 — CORS
Render의 `CORS_ORIGIN`을 처음엔 `http://localhost:5173`(임시값)으로 뒀다가, Vercel 배포 URL이 나온 뒤 `https://hub-theta-brown.vercel.app`로 갱신. `curl -H "Origin: https://hub-theta-brown.vercel.app"`로 `access-control-allow-origin` 헤더가 정확히 돌아오는 것까지 확인함.

### 원격 최종 검증
```bash
API_BASE=https://hub-backend-kymx.onrender.com npm run verify:backend
```
→ 6/6 통과(`backend="supabase"`).

### 남은 배포 관련 주의사항
- **Render 무료 티어는 15분 미사용 시 슬립** — 첫 방문자는 ~50초 대기할 수 있음. 데모/발표 전엔 미리 한 번 열어 깨워둘 것.
- 향후 코드 변경을 배포에 반영하려면: `work`에 커밋 → `git push origin work:main`(fast-forward) → Vercel이 자동 재배포. Render(`work` 브랜치 추적)는 `work`에 push만 해도 자동 반영.

## 5. LLM(Gemini/ChatGPT) 도입 가이드라인 — 실행용 요약

> 전체 설계는 `docs/llm-agent-plan.md`(원본)다. 이 절은 **바로 실행 가능한 체크리스트**로 압축한 것. 게이트(§5-1)를 통과하기 전에는 코드를 작성하지 않는다.

### 5-1. 게이트 (전부 충족돼야 착수)
- [x] PII 최소화 설계 완료(비식별 필드만 프롬프트에 넣는 구조 — §5-3 참고)
- [x] 동의 인프라 완료(`ConsentNotice.jsx`, ADR-006 파일럿) — LLM 호출도 이 동의 흐름을 재사용
- [x] **공개 배포 완료** — 파일럿을 실제로 돌릴 수 있는 환경이 생김(오늘 §4)
- [ ] **의존성 설치 승인**(`openai` 또는 `@google/genai`) — 사용자 승인 필요, 임의 추가 금지
- [ ] **API 키 확보**(OpenAI 또는 Gemini) — 사용자가 `backend/.env`(로컬)와 Render 대시보드(배포본) 양쪽에 직접 입력. 채팅에 값 노출 금지.
- [ ] 제공자 선택 확정(사용자에게 "Gemini vs ChatGPT 중 뭐로 시작할지" 확인)

### 5-2. 어디부터 붙이나 — 순서 고정
**1순위: 설명 에이전트**만 먼저 만든다(환각 위험 낮음 — 이미 정해진 규칙기반 결과를 "설명"만 함, 새로 창작하지 않음). 분석 요약·페르소나 등은 그다음.

### 5-3. 구현 체크리스트 (게이트 통과 후 순서대로)
1. `backend/.env.example`에 이미 플레이스홀더 있음(`OPENAI_API_KEY`, `GEMINI_API_KEY` 키 이름만, 값은 비어 있고 주석 처리) — 그대로 사용.
2. `backend/src/lib/llm.js` 신규: 제공자 클라이언트 초기화 + **JSON 스키마 강제 출력** + 실패 시 규칙 기반 문구로 폴백(예외를 던지지 않고 항상 사용 가능한 응답 반환).
3. `POST /api/explain` 라우트 신규: 입력을 **화이트리스트로 재검증**(`temperament`, `matchedMethods`, `baselineMethods`, 라벨 수준 행동지표, `calibrationError`, `fitScore`, 근거 id — **이름·자유응답·원문 절대 금지**, `backend/src/index.js`의 기존 `ALLOWED_FIELDS` 패턴을 그대로 재사용).
4. 출력 계약(고정):
   ```json
   { "summary": "2~3문장, 가능성 표현", "citations": ["E3","F1"], "uncertainty": "...", "disallowed_check": true }
   ```
   - `citations`는 `docs/reference.md`에 실재하는 id만 허용, 없는 id 인용 시 응답 폐기 후 폴백.
   - `disallowed_check`가 false거나 진단·성적예측·유형우열 표현이 감지되면 규칙 기반 문구로 대체.
5. 프론트: 결과 화면에 "AI 설명 보기"(선택, 기본 꺼짐) 토글 추가. 미동의/실패 시 지금처럼 규칙 기반 문구를 그대로 보여준다.
6. 배포 반영: Render 대시보드에 `OPENAI_API_KEY`/`GEMINI_API_KEY` 추가 후 재배포(§4와 동일한 방식 — 값은 대시보드에서 사용자가 직접).
7. **절대 하지 않는 것**: 프론트에서 LLM API 직접 호출(키 노출), `VITE_` 프리픽스에 LLM 키, 원문 응답 전송, LLM에 최종 판정 위임.
8. 최소 eval: 매칭 결과 5~10쌍에 대한 "기대 설명"을 미리 적어두고, 구현 후 회귀 확인(수치 왜곡·환각 검출용). 코드 없이 사람이 먼저 작성해 둘 수 있다.

### 5-4. 이 프로젝트가 이미 LLM 도입을 쉽게 만들어 둔 이유
- `data/taskState.js`·`mbtiMethodMatching.js`가 이미 "닫힌 규칙 → 근거 id 포함 결과"를 산출하므로, LLM은 **이 결과를 자연어로 풀어 말하기만** 하면 된다(창작 금지 = 환각 방어).
- `useAssessmentFlow.js`의 `result` 객체에 이미 `match.sources`/`taskState.sources`(근거 id 배열)가 들어있어, `POST /api/explain`에 그대로 넘기면 된다.

## 6. GitHub 이슈 상태 (오늘 갱신)

- [#12](https://github.com/bricepark94/hub/issues/12) **Closed** — 실제 Supabase 검증 완료, GRANT 버그도 코멘트에 기록.
- [#16](https://github.com/bricepark94/hub/issues/16) **Open** — LLM, §5 게이트 통과 후 착수.
- 나머지(#3·#4·#11·#13·#14·#15)는 저번 PR 때 이미 정리됨(`docs/issue-drafts.md` 참고).
- **오늘 신규로 열 만한 이슈 후보**(아직 안 만듦, Codex가 판단): "[검증] feature-verifier Agent 오늘 기능 반영"(§2-1), "[배포] 향후 자동 배포 파이프라인 정리".

## 7. 하드룰 (재확인)

- force push·amend·rebase 금지. 오늘 한 `git push origin work:main`은 **fast-forward**였지 force가 아니다 — 이 구분을 흐리지 말 것.
- `.env`(예시 아님)·API 키·개인키 절대 커밋 금지 — pre-commit 훅이 차단하되 `--no-verify` 우회 금지.
- 커밋·PR·이슈 본문에 AI 생성 크레딧 미표기.
- `package.json` 의존성 변경은 승인 후에만(LLM SDK는 §5-1에서 아직 미승인).
- 로그인·회원가입·JWT는 여전히 게이트 뒤(파일럿은 가명 anonId로 충분, ADR-006).
- 배포·LLM 관련 계정 생성·키 입력을 사용자 대신 하지 않는다.

## 8. 새 Codex 세션에 붙일 프롬프트

```text
/Users/bricepark/Documents/hub (브랜치 work)에서 작업한다.
먼저 docs/handoff/CODEX_HANDOFF_2026-07-16.md 를 처음부터 끝까지 읽어라(이 파일이
최종·최신 버전이다 — 배포는 이미 완료된 상태다, "미완료"라고 적힌 옛 버전을 봤다면 무시).

§0~§1로 오늘 무엇이 새로 생겼는지, §2로 오늘의 미션 3개 중 무엇이 됐고 무엇이
남았는지(3번 검증 Agent 갱신) 파악하라. §4의 공개 링크가 실제로 살아있는지
curl https://hub-backend-kymx.onrender.com/api/health 로 확인하고 나에게 보고하라.

§2-1(검증 Agent 갱신)은 낮은 리스크의 다음 작업 후보다 — 원하면 내가 지정하는 대로
진행하되, 먼저 나에게 확인받아라. §5(LLM)는 게이트가 남아있으니 착수하지 마라.

§7(하드룰)을 지켜라. push·PR 생성 직전에는 반드시 나에게 알리고 진행하라.
```
