# Claude Code 인수인계 — 2026-07-22 자기조절 회고 도구 재정의 · 회고 리포트 · LLM 근거 라이브 검증

> 이전 인수인계: [CODEX_HANDOFF_2026-07-21.md](./CODEX_HANDOFF_2026-07-21.md). 이 문서는 그 이후 오늘까지의 변경·검증·남은 착수점을 정리한다.

## 0. 저번 이후 달라진 점 (핵심 차이)

- **아키텍처 시각화 점검(이슈 #17):** README mermaid 다이어그램이 실제 코드와 부분적으로 어긋남을 발견(`/api/health`·`/api/analysis`·`AnalysisReport` 흐름 누락). **지금 당장 고치지 않고 백로그로만 남김(사용자 지시)** — §3 참고.
- **오늘의 "to do list & 아이디어" 피드백 4개 항목 중 2·3·4번 완료.** 1번(코드 정리)은 다음 세션으로 미룸.
- **제품 정체성 재정의(ADR-009):** "성격풀이"가 아니라 **자기조절 회고 도구**로 명시. MBTI 입구 → 행동·피로 신호 정리 → 오늘 시도할 방법·루틴 → 예측·결과 대조 자기검증 → **개인 회고 리포트**(로컬 전용)로 이어지는 흐름을 README·plan·context에 반영.
- **개인 회고 리포트 신설:** `frontend/src/components/RetrospectiveReport.jsx` — 오늘의 나 요약·AI 관찰 근거·실행 기록·예측 vs 실제·다음 행동·클립보드 복사. 기존 `AnalysisReport`는 "전체 경향(연구 집계)"로 라벨 분리해 개인 회고와 연구 집계 혼동 방지.
- **LLM 채팅 근거 표시(ADR-008 확장):** `backend/src/lib/llm.js`에 `observedSignals`(대화 속 일상 근거 → 우리 행동지표 키로 매핑) 추가. 결과·회고 화면에 "간이 추정·공식 아님" 근거 패널로 노출 — 판정을 **대체하지 않고 보완**.
- **GEMINI_API_KEY 라이브 E2E 검증 완료 + 실제 버그 2개 수정:**
  1. `MODEL_CHAIN`이 `gemini-2.5-flash`→`gemini-2.0-flash`였는데, 이 계정에서 전자는 404("신규 사용자에게 더 이상 미제공"), 후자는 429(무료 티어 쿼터 0)로 **둘 다 막혀 있었음**. `-latest` 별칭(`gemini-flash-latest`, `gemini-flash-lite-latest`)으로 교체해 정상 동작 확인.
  2. `isRetriable()`이 429/503만 인식해 404를 만나면 체인의 다음 모델을 시도하지도 않고 즉시 포기하던 버그 발견·수정(404 추가).
  3. **진단 팁(재발 방지):** 백엔드는 반드시 `backend/` 안에서 실행해야 `dotenv/config`가 `backend/.env`를 찾는다(`npm --prefix backend run dev`가 이미 이렇게 동작). repo root에서 `node backend/src/index.js`로 실행하면 조용히 키를 못 읽고 `available:false`만 반환한다 — 오늘 이걸로 한 번 헤맴.
- 실채팅 2턴 → 실제 Gemini 응답으로 `ISTJ` 추정 → `observedSignals` 3개 정상 매핑 → 결과·회고 화면 렌더까지 브라우저에서 라이브로 확인.

## 1. 오늘 커밋 (work 브랜치)

- `c131efa5` feat: 자기조절 회고 도구로 목적 재정의(ADR-009) + 개인 회고 리포트 신설 + LLM 근거 표시·모델체인 라이브 검증

## 2. 오늘 실제로 검증한 것

- `npm run lint` / `npm run build` 통과(루트에서 frontend로 위임).
- `/api/mbti-chat` curl 라이브 호출 — `available:true, estimated:true, mbti:"ISTJ"` + `observedSignals` 3개(indicator가 화이트리스트 키 `focusEnergy`·`planningStability`·`emotionImpact`/`selfUnderstanding`로 정상 매핑) 확인.
- 브라우저 E2E(로컬 5173) — 소개 → "AI와 짧게 대화해 추정" → 동의 → 2턴 대화 → 실제 Gemini 추정 → 공부/스트레스 설문 → 결과 화면 `.trust-observed` 패널에 실제 근거 렌더 → 회고 리포트에도 동일 근거 렌더. 콘솔 에러 없음.
- localStorage 스냅샷에 `mbtiSource:"ai-estimated"`, `estimatedMeta.observedSignals` 정상 저장 확인.

## 3. 남은 것 / 다음 착수점

**A. 항목1 — 코드 정리(다음 세션, 오늘 미착수):**
- `bricepark-intro/`·`guide7/` 등 미사용 자산이 실제로 죽은 코드인지 확인(참조 여부 grep) 후 정리.
- `frontend/src/ProjectIntro.jsx`(767줄)에서 더 분리할 수 있는 블록이 있는지 검토(이미 훅 3개는 분리돼 있음 — `useAssessmentFlow`·`useServerSync`·`useMetacognition`).
- 빙빙 둘러 쓴 코드·중복 로직 있는지 훑기.

**B. 2부 — UI/UX 디자인 수정(A단계 완료 `7d2854d1`, B~D 남음):**
- **[A] 완료:** 색 기반을 크림 에디토리얼 → **연 스카이블루 클린 SaaS 톤**으로 전면 교체(`app.css`). 배경색은 집중·몰입 근거로 크림 대신 스카이블루 채택(design.md 상단 노트에 결정 근거 기록). 세리프(Bookman)·스크립트·앱 장식테두리 제거(`--font-display`/`--font-script`를 산세리프로 재지정). 랜딩(`StepIntro.jsx`)을 **codeit식 좌측 사이드바(로고·진행 overview·버그신고 링크·데이터삭제) + 우측 콘텐츠(자작 일러스트 히어로 카드·타이틀·CTA·"얻는 것" 4카드·"원칙" 3열)**로 재구성. 모든 화면이 CSS 토큰을 공유하므로 **색감은 이미 전 화면 통일**됨.
- **[A2] 완료(`49ac3c23`) — 랜딩 보정:** 사이드바 배경을 연 스카이블루(`--tint-blue`)로·메인을 흰색으로 대비, 히어로 텍스트 가운데 정렬, 'Study & recover routine' eyebrow만 필기체(cursive) 유지, 결과 '얻는 것' 박스(`.meaning-frame`)를 흰 배경+스카이블루 테두리+검은 본문+굵은 강조로 개선.
- **⚠️ 시연 버그(해결됨, 재발주의):** 사용자가 "AI와 대화해 추정"을 했는데 결과에 "공식 MBTI 미입력"이 떴던 건 **로컬 백엔드가 꺼져 있어 추정 요청이 폴백(not-provided)된 것**. 백엔드(`npm --prefix backend run dev`)를 켜면 정상(ISTJ 추정 반영 재확인). **배포 백엔드(Render)는 아직 옛 MODEL_CHAIN이라 재배포 필요** — `7d2854d1` 이후 커밋을 main으로 올려 재배포해야 라이브에서도 추정이 됨. 추가 UX 개선거리(미착수): 추정 폴백 시 조용히 not-provided로 가지 말고 "AI 추정이 일시적으로 안 돼 규칙 설문으로 진행" 안내를 띄우기.
- **[D] 남음 — 보충 AI 대화 페이지(사용자 핵심 요청, 미착수):** MBTI를 **공식 입력하든 AI 추정하든**, 그 뒤에 **추가 페이지**를 넣어 AI와 짧게 대화해 MBTI 근거를 "설득력 있게 보충"하고 싶어함(원 피드백 항목4의 완성형). 참고 = **perplexity 검색창**(5번 사진) 톤. 제안 구현: `StepMbtiSource`에서 mbti 확정 후 study 설문 전에 옵셔널 스텝 삽입 → 기존 `/api/mbti-chat`·`StepMbtiChat` 인프라 재사용하되 **공식 유형은 유지하고 반환된 `observedSignals`/`rationale`만 "AI 보충 근거"로 붙임**(공식 유형을 덮어쓰지 않음). 결과·회고의 `trust-observed`에 이미 observedSignals 렌더 경로 있음(재사용). 가드레일: 공식 유형 사용자의 대화 원문 외부전송은 ADR-008 동의 surface를 이 스텝에도 적용, 연구 저장경로는 계속 비식별만. 퍼플렉시티식 단일 입력창 UI는 `StepMbtiChat` 스타일을 그 톤으로 다듬어 재사용.
- **[B] 남음 — 설문 화면(step 1~3):** 사용자 지정 참고 = **codeit 카드 스타일**(2번 사진). 현재 `StepMbtiSource`/`StepSurvey`는 `.shell` topbar 레이아웃 유지 중(색만 통일됨). 랜딩처럼 사이드바 셸로 통일할지, 카드 중심으로 재배치할지 결정 후 구현.
- **[C] 남음 — LLM 검색창(`StepMbtiChat.jsx`):** 참고 = **perplexity 검색창**(3번 사진) 구성·느낌. 첫 화면 색감·톤 그대로 이어가기.
- **[D] 남음 — 결과 화면(`ProjectIntro.jsx` step 4~6·`RetrospectiveReport.jsx`·`AnalysisReport.jsx`):** 참고 = **모각작**(4·5·6번 사진) — 스탯 타일(총 몰입시간류)·캘린더 히트맵·대시보드 탭 느낌. 앞 장들과 색·느낌 통일.
- 디자인 기준 문서 `docs/design.md` — 작업 전 반드시 먼저 읽는다(§2 토큰·§6 컴포넌트·§7 화면별·§9 자기점검, 상단 노트에 2부 방향·참고 매핑 있음).
- 사용자가 각 화면 스타일 참고 사진 6장을 이미 전달함(codeit×2, perplexity×1, 모각작×3) — 이 세션 대화에 있으나 다음 세션엔 없으므로, 필요하면 사용자에게 다시 요청.

**C. 백로그(오늘 발견, 처리 보류 — 사용자가 나중으로 미룸):**
- README mermaid 아키텍처 다이어그램이 `/api/health`·`/api/analysis`·`AnalysisReport` 흐름을 누락(이슈 #17은 코드상 부분 완료 상태인데 OPEN 유지 중).
- `useAssessmentFlow`·`useServerSync`·`useMetacognition` 세 훅이 `ProjectIntro.jsx` 안에서 어떻게 나뉘는지 별도 시각화 없음.
- `CLAUDE.md:148`의 "커밋 푸터에 Co-Authored-By 표기" 규칙이 최신 사용자 지시(AI 크레딧 미표기)와 모순 — 문서 갱신 필요.
- 미커밋 상태로 남아있는 예전 핸드오프류 문서들: `CODEX_HANDOFF_2026-07-13/15/16.md`, `PROJECT_HANDOFF.md`, `STUDY_NOTES_2026-07-13/14.md`, `.claude/launch.json` — 커밋할지 삭제할지 그대로 둘지 미정.
- `#19`(vitest 도입)도 계속 보류 중(사용자 지시, 2026-07-21).

**D. PR 계획:** 항목1(코드 정리)과 2부(UI/UX)가 각각 별도 세션에서 끝난 뒤, `work` 브랜치에 순서대로 커밋을 쌓고 **한 번에 모아서 PR**을 낸다. 세션마다 개별 PR을 만들지 않는다 — 지금처럼 `work`에 커밋만 계속 쌓을 것.

## 4. 다음 세션 시작 방법

새 대화를 열고 아래처럼 시작하면 이 문서를 자동으로 읽고 이어받는다(`hub-start` 스킬이 `docs/handoff/CODEX_HANDOFF_*.md` 최신 파일을 자동으로 찾음):

```
/hub-start
오늘은 항목1(코드 정리·dead code 확인)부터 이어서 하자.
```

또는 UI/UX부터 먼저 하고 싶다면:

```
/hub-start
오늘은 2부 UI/UX 디자인 수정부터 시작하자. 아이디어·투두는 지금 붙여넣을게: [여기에 스크린샷이나 텍스트]
```

`/hub-start`가 없어도(스킬 미인식 환경) 아래처럼 직접 지시해도 동일하게 동작한다 — 최신 handoff 문서를 스스로 찾아 읽도록 지시하는 것이 핵심:

```
/Users/bricepark/Documents/hub 프로젝트다. docs/handoff/ 안의 가장 최근 CODEX_HANDOFF 문서를 읽고
현재 상태를 파악한 뒤, [항목1 코드 정리 / 2부 UI·UX] 작업을 이어서 하자.
```

## 5. 하드룰 (재확인, 바뀐 것 없음)

- 커밋·PR에 AI 크레딧(Co-Authored-By/Generated with) 미표기. 관련 변경은 한 커밋으로.
- 시크릿 커밋 금지. `GEMINI_API_KEY`·Supabase 키는 `backend/.env`에만(이미 주입됨, 커밋 금지). 프론트(`VITE_`) 노출 금지.
- 외부 LLM은 반드시 backend 프록시 경유. 채팅 원문 허용은 동의 사용자·`/api/mbti-chat` 한정, 연구 저장 경로(ADR-001)는 비식별 파생값만 — 분리 유지.
- push·PR 생성 직전 사용자에게 알림.
- 디자인 작업 전 `docs/design.md` 먼저 읽기.
