# Project Context

## Project Name

MBTI 기반 공부법 및 스트레스 관리 웹앱

## One-Line Definition

사용자가 외부 공식 MBTI 평가에서 받은 결과를 직접 입력하거나 공식 결과 없이 진행한 뒤, 짧은 독자 공부습관·스트레스 점검을 통해 행동·상태 신호를 정리하고, task/state-only baseline과 MBTI 힌트 추가 추천을 비교하여 인지과학 학습 전략과 공부·회복 루틴을 제안·검증하는 웹앱.

## User Problem

Many learners know popular study methods but struggle to adapt them to their own focus style, planning preference, fatigue pattern, and recovery needs.

## Cause

- Study method content is often generic.
- MBTI content can become fixed type interpretation.
- Planning tools do not explain why plans break down.
- Stress tools are often separated from study routines.

## Core Value

Help users understand their current study preference and fatigue signals, then turn that understanding into a small routine they can try today.

## Core Features

1. 성향·상태 점검
2. 인지과학 학습법 매칭
3. 오늘의 공부·회복 루틴
4. task/state-only baseline·MBTI 추가 모델 비교와 설명 가능한 피드백 루프

## MVP Includes

- Official MBTI result self-entry or no-official-result path
- Exploratory four-axis preference signal from original study-habit items
- Study preference survey
- Stress response survey
- Behavior signal scoring
- Recommended study methods TOP 3
- Reasons for recommendations
- Avoid list for unsuitable study patterns
- Fatigue signals and recovery routine
- 20-30 minute routine card
- localStorage result and record saving
- localStorage recommendation-fit feedback

## MVP Excludes

- Sign-up
- AI chatbot
- External AI API
- Grade forecasting
- Medical judgment
- Community
- Calendar/notification
- Comparison/ranking
- Study proof features
- Payment
- User responses stored in Git repositories
- Unverified big-data or AI accuracy claims
- Reproduction or paraphrasing of official MBTI assessment items
- Treating exploratory preference signals as official MBTI results

## Expression Principles

- Treat MBTI as a starting point for preference exploration.
- Use stress language as fatigue signals, recovery routines, and caution patterns.
- Use possibility-based result language.
- Prefer behavior signals over type labels.
- Treat scores as recommendation signals, not ability, diagnosis, or standardized assessment results.
- Separate literature evidence from product usage observations.
- Do not describe the current rule weights as validated accuracy.
- Separate user satisfaction from behavioral and delayed-learning outcomes.
- Do not assume that matching a preferred style improves learning.
- Treat self-check preference codes as exploratory signals, not official assessment results.

## Recommended Expressions

- `선호 탐색`
- `피로 신호`
- `회복 루틴`
- `주의 패턴`
- `그럴 가능성이 있습니다`
- `이 방식이 더 편할 수 있습니다`
- `먼저 시도해볼 수 있습니다`
- `현재 응답 기준으로는`
- `오늘은 이 정도부터 시작해볼 수 있습니다`

## Tech Stack

- Vite
- React
- JavaScript
- CSS
- localStorage

## Recommendation Logic Principles

- Use MBTI only as a weak preference hint.
- Apply MBTI hints only when the user directly enters a previously obtained official result.
- Keep the task/state-only baseline alongside the MBTI-adjusted result.
- Do not feed the exploratory four-axis code into the current recommendation model.
- Use study survey answers and stress response answers together.
- Keep recommendations rule-based for the MVP.
- Explain why each recommendation was selected.
- Record recommendation-fit feedback locally and connect future changes to an algorithm version.
- Evaluate missingness and drop-off before interpreting beta feedback; non-response may be NMAR.
- Choose study methods from:
  - 인출 연습
  - 분산 학습
  - 자기설명
  - 교차 학습
  - 오답 분석
  - 환경 설계
  - 짧은 집중 블록

## Product Stages

| Stage | Scope |
| --- | --- |
| MVP | Rule-based recommendation, routine card, localStorage result and feedback |
| Validation beta | Evidence catalog, usability measures, algorithm versioning, missingness analysis |
| Consent-based beta | Account and server storage only after consent, deletion, retention, and security design |
| Long-term | Research-task guidance and official university-platform/OpenAI integrations only when justified |

## Data Boundary

- Current user data stays in the browser.
- Users can delete saved results, routine records, and recommendation feedback from the app.
- Free-text responses and survey records must not be committed to Git or stored in GitHub issues.
- Server collection requires a separate consent and governance design.
- “Big data” is a future validation strategy, not a current product capability.
- Inductive accuracy means reliability, incremental validity, moderation, calibration, and product utility; it does not mean that more records make MBTI true.
- Fit, understanding, and actionability are acceptance measures; completion and delayed learning are separate outcomes.

## Related Planning Documents

- Product plan: [`plan.md`](./plan.md)
- Execution checklist: [`checklist.md`](./checklist.md)
- Evidence and data roadmap: [`evidence-data-roadmap.md`](./evidence-data-roadmap.md)

## Basic URLs

- Repository: https://github.com/bricepark94/hub
- Plan: https://github.com/bricepark94/hub/blob/work/docs/plan.md
- Checklist: https://github.com/bricepark94/hub/blob/work/docs/checklist.md
- Work branch PR head: `bricepark94:work`
- Recommended PR base repository: `connect-AIAgentChallenge-26-1/hub`
- Recommended PR base branch: `N077_박병관`
