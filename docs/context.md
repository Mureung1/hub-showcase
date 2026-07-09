# Project Context

## Project Name

MBTI 기반 공부법 및 스트레스 관리 웹앱

## One-Line Definition

사용자가 MBTI와 공부·스트레스 설문을 입력하면, 학습 선호와 피로 패턴을 행동지표로 정리하고, 인지과학 기반 학습법과 오늘 바로 실행할 공부·회복 루틴을 추천하는 웹앱.

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

## MVP Includes

- MBTI selection or unknown option
- Study preference survey
- Stress response survey
- Behavior signal scoring
- Recommended study methods TOP 3
- Reasons for recommendations
- Avoid list for unsuitable study patterns
- Fatigue signals and recovery routine
- 20-30 minute routine card
- localStorage result and record saving

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

## Expression Principles

- Treat MBTI as a starting point for preference exploration.
- Use stress language as fatigue signals, recovery routines, and caution patterns.
- Use possibility-based result language.
- Prefer behavior signals over type labels.

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
- Use study survey answers and stress response answers together.
- Keep recommendations rule-based for the MVP.
- Explain why each recommendation was selected.
- Choose study methods from:
  - 인출 연습
  - 분산 학습
  - 자기설명
  - 교차 학습
  - 오답 분석
  - 환경 설계
  - 짧은 집중 블록

## Basic URLs

- Repository: https://github.com/bricepark94/hub
- Plan: https://github.com/bricepark94/hub/blob/work/docs/plan.md
- Checklist: https://github.com/bricepark94/hub/blob/work/docs/checklist.md
- Work branch PR head: `bricepark94:work`
- Recommended PR base repository: `connect-AIAgentChallenge-26-1/hub`
- Recommended PR base branch: `N077_박병관`
