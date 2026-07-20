# Codex 인수인계 — 2026-07-20 UI/UX 개편 배포 · 이해도 개선 + 하루 스케줄 생성기 · LLM 게이트 개정

> 이전 인수인계: [CODEX_HANDOFF_2026-07-16.md](./CODEX_HANDOFF_2026-07-16.md). 이 문서는 그 이후 오늘까지의 변경·확정 결정·남은 이슈·다음 착수점을 정리한다.

## 0. 저번 이후 달라진 점 (핵심 차이)

- **랜딩 UI/UX 전면 개편 + 공개 배포 완료.** 720px 세로 칼럼 → 1180px 와이드, 첫 화면을 풀블리드 히어로(사용자 자작 배경 `frontend/src/assets/study-hero.jpg`, 원본 `그림그린것.tiff` 보존)로. 제목 국소 frosted 블러 + 타이포 강조. 각 단계에 "처음 화면"(히어로 복귀) 버튼 추가. → 커밋 `8fd55018`, `work`→`main` 푸시로 https://hub-theta-brown.vercel.app 반영 확인.
- **오늘 추가 작업(이 PR):** ② 결과 추천 카드에 쉬운 정의(`plain`)+일상 예시(`dailyExample`) 노출, ③ 하루 스케줄 생성기 최소 슬라이스(`buildDayPlan`).
- **LLM 게이트 개정(ADR-008):** 외부 LLM 간이 MBTI 추정 채팅을 동의 기반으로 허용하기로 결정(구현은 이번 주 이슈).

## 1. 오늘 만든/만들 커밋 (work 브랜치)

- `8fd55018` feat(ui): 랜딩 풀블리드 히어로 + 16:9 와이드 개편 (배포됨)
- (이 PR) feat: 결과 쉬운말+일상 예시 · 하루 스케줄 생성기 최소 슬라이스 + 문서(ADR-008/plan/llm-agent/matching) + 인수인계

## 2. 오늘 실제로 검증한 것

- `npm run build` / `npm run lint` 통과.
- 결과 추천 카드: `plain`·`dailyExample`·"오늘 할 일"·근거가 모두 렌더됨(DOM 확인).
- 하루 스케줄 생성기(`buildDayPlan`): 필수 16h → 자유 8h → 3블록×25분+회복3분=78분 제안. 경계(필수 ≥24h)에서 "남는 시간 없음" 안내로 전환. 슬라이더 반응성 정상.
- 스크린샷 주의: 이 환경 브라우저 페인은 **프로그래매틱 스크롤 후 캡처가 blank로 나오는 quirk**가 있어, 결과 하단 검증은 DOM 텍스트 추출로 확인함. 시각 증빙은 배포 후 공개 URL에서 잡는다.

## 3. 확정된 이번 주 방향 (사용자와 상의해 확정)

1. **이해도 개선** — 결과 쉬운말+예시(오늘) / 설문 쉬운 재작성+예시·툴팁 / 판정 근거·한계 신뢰 패널.
2. **핵심 기능 = 하루 스케줄 생성기** — 오늘 최소 슬라이스 → 완성 + 주간 타임테이블 골격.
3. **LLM 간이 MBTI 추정 채팅** — 외부 Gemini, 동의 후 대화 ≈2회 → 간이 추정 MBTI를 `matchMethods`로 연결. **공식 판정 아님(P-B)**. backend 프록시 `POST /api/mbti-chat`, 폴백, 키(`GEMINI_API_KEY`) 사용자 제공.
4. **MBTI 방어 + 매칭 근거 보강** — 신뢰도 한계는 투명 고지, 기질↔공부법 연결고리 근거를 유형·기질별로 명확화(예: ENTJ=계획→`spacing`·`environment`). 논문 보강은 인지과학 공부법 쪽.

관련 문서: [decisions.md ADR-008](../decisions.md) · [plan.md §0.1](../plan.md) · [llm-agent-plan.md](../llm-agent-plan.md) · [matching-criteria.md](../matching-criteria.md).

## 4. 다음 착수점 (Codex가 이어받을 것)

- **LLM 채팅 구현**: `backend/src/lib/llm.js`(제공자 클라이언트+JSON 강제+폴백) → `POST /api/mbti-chat`(대화 원문 허용은 이 경로만, 연구 저장 경로와 분리) → 프론트 채팅 페이지 + 동의 UI. 키 없으면 비활성·규칙 설문 폴백. 세부는 llm-agent-plan §4~5 + ADR-008.
- **설문 쉬운 재작성 + 예시·툴팁**: `data/questions.js` 문구/선택지(채점 `scores`/`methodHints`/`preferenceSignals`는 **불변**), `ui.jsx` QuestionGroup에 예시·툴팁 슬롯.
- **판정 근거·한계 신뢰 패널**: 이미 있는 `basedOn`·`preferenceProfile`·`match.reason`을 "설문답→지표→추천" 흐름으로 시각화(결과 화면). MBTI 한계 고지 강화.
- **하루 스케줄 생성기 완성 + 주간 골격**: `buildDayPlan`을 요일/시간대 배치·저장까지 확장, 주간 타임테이블 뷰 골격.
- **매칭 근거 보강**: `mbtiMethodMatching.js`의 `reason`/`sources`를 유형·기질별 한 줄 근거로 명확화 + UI 노출.
- 기존 이슈 연계: [#17 아키텍처 mermaid], [#19 TDD/vitest — `buildDayPlan`·`scoring` 단위 테스트부터], [#22 UI/UX].

## 5. 하드룰 (재확인)

- 커밋·PR에 AI 크레딧(Co-Authored-By/Generated with) **미표기**. 한 파일에 얽힌 변경은 **한 커밋**으로.
- 시크릿 커밋 금지(`.githooks/pre-commit` 스캔, `--no-verify` 금지). API 키는 backend `.env`에만.
- 알림·캘린더 연동 안 함. 연구 저장 경로는 비식별 파생값만(ADR-001). 채팅 원문 허용은 동의한 사용자·`/api/mbti-chat` 경로 한정(ADR-008).
- push·PR 생성 직전 사용자에게 알리고 진행.

## 6. 배포 절차 (재확인)

- 프론트(Vercel)=`main`, 백엔드(Render)=`work`. 커밋 후 `git push origin work` → `git push origin work:main`(fast-forward)로 Vercel 재배포. Render 무료 티어는 15분 미사용 시 슬립(첫 호출 지연).
