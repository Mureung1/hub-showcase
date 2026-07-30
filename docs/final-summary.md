# final-summary.md — 프로젝트 의미·목적 정리 + 4주 회고

> 구현 워크플로우와 Agent 협업 과정은 [`docs/ai-workflow.md`](./ai-workflow.md)에 정리돼 있다. 이 문서는 그 위에서 **"결국 무엇을 왜 만들었나"**만 압축한다.

## 1. 한 줄 정의와 문제

**MBTI 기반 공부법 및 스트레스 관리 웹앱**은 사용자가 보유한 공식 MBTI 결과와 짧은 공부습관·스트레스 자체 점검을 분리해 입력받고, 과업·상태 중심 baseline과 MBTI 힌트 추가 모델을 비교해 학습 전략과 회복 루틴을 제안·검증하는 적응형 학습 지원 웹앱이다([plan.md](./plan.md)).

풀려는 문제는 "공부법 정보 부족"이 아니라, 사용자가 실패를 "의지 부족·성격 문제"로 잘못 귀인하는 것이었다 — 자신이 어떤 환경에서 집중하고, 어떤 상황에서 피로가 쌓이는지 모르는 채로 유명한 공부법을 그대로 따라 하다 무너지는 패턴([plan.md](./plan.md) §1). MBTI는 여기서 "정답"이 아니라 **초기 선호 가설**이고, 실제 추천은 설문·스트레스 반응으로 보정된다.

## 2. 제품 의미의 진화

프로젝트를 진행하며 제품의 무게중심이 두 차례 명시적으로 재정의됐다([decisions.md](./decisions.md)).

| ADR | 시점 | 핵심 결정 |
|---|---|---|
| **ADR-007** 제품 정체성: MBTI 입구 + 자기조절 무게중심 | 2026-07-15 | 근거(H-SRL-1: 성과는 MBTI 유형보다 자기조절학습으로 더 잘 설명됨)와 진입장벽(친숙한 MBTI로 시작) 사이에서, **입구는 MBTI, 설명·근거는 자기조절**로 층위를 분리하기로 결정. "MBTI가 방법을 결정한다"는 표현은 쓰지 않는다(P-B 원칙 유지). |
| **ADR-009** 결과의 재정의: 수치 → 회고 가능한 산출물 | 2026-07-22 | 배포 파일럿에서 "플로우를 끝낸 사용자가 무엇을 얻는지"가 비어 있다는 문제 발견. 제품을 **"성격풀이가 아니라 자기조절 회고 도구"**로 재정의하고, 연구자용 집계 화면과 분리된 **개인 회고 리포트**(로컬 전용)를 신설. |

지금 이 제품이 스스로를 설명하는 한 줄은 다음과 같다(ADR-009):

> MBTI를 친숙한 **입구**로 삼아 → 실제 공부 행동·피로 신호를 행동지표로 **정리**하고 → 오늘 바로 시도할 방법·회복 루틴으로 **바꾸고** → 해본 결과를 예측과 **대조**해 "나에게 맞는 방식"을 스스로 **검증**하며 → 그 과정을 **개인 회고 리포트**로 남겨 회고·포트폴리오에 쓴다.

## 3. 4주 타임라인 요약

([backlog.md](./backlog.md) Task 보드, [decisions.md](./decisions.md) ADR 날짜, `docs/handoff/` 기준)

| 주차 | 기간 | 핵심 결정·산출물 |
|---|---|---|
| 1주차 | 07-09 ~ 07-13 | 기획 재정의, `frontend/`+`backend/` 분리(ADR-003), MBTI×인지과학 매칭 엔진, 하루 스케줄 시드, 비식별 수집 백엔드(ADR-001), 분석 리포트, 크림·블루 에디토리얼 디자인, Skill 4종(`daily-mission`·`plan-and-checklist`·`prototype-build`·`create-pr`) 도입 |
| 2주차 | 07-14 ~ 07-15 | ADR-001~007 다수 결정(저장 계층·DB 제공자·추천 로직·CORS·성인 가명 파일럿·제품 정체성), Supabase 스캐폴딩, `feature-planner`·`feature-verifier` Agent 도입, 컴포넌트 분리, GitHub 이슈 등록(#11~#16), 시크릿 유출 방지 pre-commit 훅 |
| 3주차 | 07-16 ~ 07-23 | ADR-008(외부 LLM 간이 MBTI 추정 채팅 허용 + 게이트 개정), `submit-daily-pr` Skill(승인 게이트 + 업스트림 PR), bare 이슈번호 차단 훅·스크립트 |
| 4주차 | 07-27 ~ 07-29 | ADR-009(결과 재정의 + 개인 회고 리포트), `vitest` 도입(TDD 22개 테스트), Gemini 키 실배포 연동 확인, 데모 영상 제작(5분 미만·4버전 반복), `showcase.json` 반영, 파비콘·검색 메타·og:image 정비 |

## 4. 지금 상태

- **배포**: 프런트 https://hub-theta-brown.vercel.app (Vercel) · 백엔드 https://hub-backend-kymx.onrender.com (Render) · DB Supabase — 확인 기준 4종(공개 접속·헬스체크·화면-서버-DB 라운드트립·실패 시 로그 추적)은 [ai-workflow.md](./ai-workflow.md) §4에 고정됨.
- **검증**: `frontend` vitest 22개 통과, 배포본 `/api/mbti-chat` 실호출 확인(INTJ·confidence mid), SRT·하드룰 금칙어·슬라이드 레이아웃 검증 전부 통과(`docs/handoff/CODEX_HANDOFF_2026-07-29.md`).
- **열린 이슈**: 총 20건(P0 3 · P1 13 · P2 4) — `bricepark94/hub` 기준. 우선순위 높은 것: `#33` 데모 영상(완료 처리 필요), `#10` 주간 통합 QA 및 완료 보고, `#2` 공식 결과 없음 흐름 E2E 수동 검증.
- **남은 것** (`docs/handoff/CODEX_HANDOFF_2026-07-29.md` §5):
  1. Supabase 대시보드에서 2026-07-28 2차 녹화 데모 레코드 1건 수동 삭제
  2. 가명 ID 잔존 처리 방식 ADR로 확정
  3. `docs/prompt-guide.md`의 Review Prompt가 여전히 "외부 AI API 미사용"으로 남아있음(ADR-008 이후 오래된 기술 부채, 반복 이월 중) — 다음 세션 최우선 수정
  4. AI 호출 상한, 모바일·접근성 점검, 파일럿 관찰 요약

## 5. 참고

- 구현 워크플로우·Agent 협업 시각화: [ai-workflow.md](./ai-workflow.md)
- 전체 기획: [plan.md](./plan.md)
- 결정 이력(ADR-001~009): [decisions.md](./decisions.md)
- Task 보드: [backlog.md](./backlog.md)
