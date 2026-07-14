# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

이 파일은 **라우터**다. 세부 내용을 담지 않고, 각 작업을 어느 정본 문서·Skill·SubAgent로 보낼지만 명시한다. 세부는 아래 정본에 위임한다.

## 프로젝트 한 줄 정의

낮은 자존감 때문에 대외활동·공모전을 시작조차 못 하는 대학생이, 도전을 작은 **퀘스트**로 쪼개 완료 → 코인·경험치 보상 → **캐릭터 육성**의 간접 재미로 시작의 심리적 부담을 넘게 하는 **캐릭터 육성형 도전 앱 (One-Step)**. 배경·시나리오·기능 → `docs/plan.md`.

## 정본 & 라우팅

작업 전 관련 정본을 먼저 읽는다. 내용이 겹치면 아래 정본이 이 파일보다 우선한다.

| 정본 | 역할 | 언제 |
|------|------|------|
| **`docs/plan.md`** | 서비스 기획 · 핵심 기능 2개 · 성공 지표 | 기획/스코프 판단 **1차 기준** |
| **`docs/checklist.md`** | 개발·검증 체크리스트 (기능별 PASS/FAIL 세부 항목 + 최종 통합 검증 기준) | 구현 순서·완료 판정 |
| **`.claude/skills/one-step-design/SKILL.md`** | 디자인 시스템 **진입점** | UI/화면 작업 시 |

> 디자인 상세는 Skill 진입점(`SKILL.md`)을 통해 **필요한 참고 파일만** 연다: 색·타이포·간격 → `tokens.md`, 공통 위젯 → `components.md`, 특정 화면 → `screens.md`, 디자인 검증 → `verification.md`. 관련 없는 파일은 열지 않는다.

## SubAgent 라우팅 & 작업 흐름

작업 성격에 맞는 에이전트에 위임한다 (`.claude/agents/`).

| 작업 | 에이전트 | 비고 |
|------|----------|------|
| 기능 스코프·우선순위·"이거 지금 해야 하나" 기획 판단 | **planning-agent** | 읽기 전용, `docs/plan.md` 기준 |
| Flutter·Firebase 화면/로직 구현·수정 | **development-agent** | 구현 시 one-step-design Skill 사용 |
| 진행 점검·다음 할 일·`checklist.md` 체크박스 갱신 | **checklist-agent** | "어디까지 됐나" 진행 관리 |
| 완료 기준 검증·QA·기능별 PASS/FAIL 판정 | **verification-agent** | "제대로 됐나" 증거 기반 판정 |

**표준 흐름**: planning(할지 판단) → development(구현) → checklist(진행 기록) → verification(품질 판정) → FAIL 시 development로 회귀.

## 구현 우선순위

1. **AI 핵심 기능 2개 최우선** (`docs/plan.md` 기준)
   - ① **AI 도전 분해 엔진** — 큰 목표 → 마이크로 퀘스트 + 난이도 분류, 수정/삭제/재분해, JSON 스키마 강제 + 실패 시 템플릿 폴백.
   - ② **퀘스트 실행 루프** — 완료 → 난이도별 코인·XP 지급 → 캐릭터 성장.
2. **그 다음** 넓은 그림(진화·환생·상점·보관함 등)으로 확장.
   - 충돌 시 우선순위: **plan.md의 2대 기능 > 넓은 그림**.

## 디자인

UI/화면 작업 시 **one-step-design Skill**(`.claude/skills/one-step-design/SKILL.md`)을 호출해 규칙을 따른다.

## 기술 스택

- **Front**: Flutter (iOS·Android). **Backend**: Firebase(Auth·Firestore·FCM·Storage). **디자인**: Figma + 도트아트. **협업**: GitHub, Notion.

## 현재 산출물

- **Flutter 앱** (레포 루트). 1주차 완료 — 홈·퀘스트 목록·퀘스트 등록이 실제 Firebase(`one-step-16073`)에 붙어 동작한다.
  - 상태관리 riverpod 2.6.1 · 라우팅 go_router `StatefulShellRoute` · 저장소는 추상 인터페이스 + Firestore/InMemory 2구현.
  - `lib/core/theme/reward_colors.dart`가 **노랑 HEX의 유일한 정의처**다. `test/theme/color_role_test.dart`가 허용 목록 밖의 노랑 사용을 FAIL 처리한다.
  - Firestore 스키마·경계 설계 → `docs/firestore-schema.md`.
  - **주의: Firebase 패키지 버전을 올리지 말 것** (상류 조기 배포로 빌드가 깨진다). 사유는 `pubspec.yaml` 주석.
  - **주의: 레포 경로에 한글이 있어** `android/gradle.properties`에 `overridePathCheck` + `kotlin.incremental=false`가 필요하다. 네이티브 플러그인 도입 시 재발하면 ASCII 경로로 옮길 것.
- `docs/prototype/` — HTML/CSS/JS 클릭 프로토타입. 화면 흐름·보상 루프의 레퍼런스(보상표·진화 단계는 여기서 포팅했다).

## 작업 규칙

- **git 관련 명령은 사용자가 직접 실행한다.** Claude는 명령어와 설명만 제공하고 실행하지 않는다.
- 원본 기획서 `.docx`는 로컬에만 있고 git에 추적하지 않는다. 필요한 맥락은 `docs/*.md`에 정리되어 있다.
