---
type: wiki-page
aliases:
  - Codex harness
description: Python-based Codex CLI autonomous implementation harness customized for staged app development workflows.
author:
  - Codex
date created: 2026-07-10
date modified: 2026-07-10
tags:
  - project
  - codex
  - automation
  - python
source:
  - https://github.com/gyutaetae/harness
  - https://raw.githubusercontent.com/gyutaetae/harness/main/README.md
related:
  - "[[김규태]]"
  - "[[MOC-Portfolio]]"
confidence: high
layer: entities
explored: true
claimType: project-evidence
evidenceScope: github-readme
verificationStatus: github-readme-verified
status: active
---

# harness

## Overview

`harness`는 Codex CLI 기반 자율 구현 하네스다. 사용자의 한 줄 요구를 받아 단계별 sub-agent가 artifact를 통해 결과를 전달하고, phase 파일을 따라 직렬 구현까지 진행하는 파이프라인이다.

---

## Workflow Signal

- Python 기반 `scripts/run_phases.py` runner를 사용한다.
- `initial-plan`, `clarify`, `context-gather`, `plan`, `generate`, `evaluate` 단계로 작업을 나눈다.
- `.codex/skills/plan-and-build`, stage별 sub-agent prompt, task/phase artifact 구조를 갖는다.
- Codex CLI 실행 권한 플래그와 timeout, git skip 등을 환경 변수로 제어한다.

---

## Portfolio Use

백엔드 취업 포트폴리오에서는 보조 프로젝트로 둔다. 직접 제품 기능보다 "AI를 활용해 개발 프로세스를 구조화하고, 요구사항에서 구현까지의 흐름을 artifact로 남기는 개발 습관"을 보여주는 프로젝트다.

면접 핵심 문장:

> Codex를 단순 코드 생성 도구로 쓰는 데서 그치지 않고, 요구사항 정리부터 phase별 구현까지 이어지는 Python 기반 개발 harness로 구조화했습니다.

---

## Evidence Gaps

- 커서맛피아님 harness에서 어떤 구조를 참고했는지
- 앱 개발에 맞게 수정한 구체 지점
- 실제 앱 개발에 적용한 사례
- 개발 시간, 오류 감소, 문서화 품질 같은 효과

---

## Sources

- https://github.com/gyutaetae/harness
- https://raw.githubusercontent.com/gyutaetae/harness/main/README.md
