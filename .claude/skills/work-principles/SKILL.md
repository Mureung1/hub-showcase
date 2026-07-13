---
name: work-principles
description: 코딩 작업(구현/버그수정/리팩토링) 시 따라야 할 작업 원칙을 정의합니다. 코드를 작성하거나 수정하기 전에 사용하세요.
---

# 작업 원칙

## 하지 말 것
- any 타입 금지.
- 외부 UI 라이브러리 금지. (필요시 사용자에게 확인)

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
---
**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. 작업이 끝나면 항상 방금 한 작업의 내용을 간략히 설명.
