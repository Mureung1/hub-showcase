---
type: wiki-page
aliases:
  - Financial Order Latency Lab
description: Python-based backend performance experiment measuring p99 order latency under CPU, disk, and GPU contention.
author:
  - Codex
date created: 2026-07-10
date modified: 2026-07-10
tags:
  - project
  - backend
  - performance
  - python
source:
  - https://github.com/gyutaetae/financial-order-latency-lab
  - https://raw.githubusercontent.com/gyutaetae/financial-order-latency-lab/main/README.md
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

# financial-order-latency-lab

## Overview

`financial-order-latency-lab`는 금융 실시간 주문 처리 서버에서 CPU 계산, 동기식 거래 로그 flush, GPU risk scoring이 p99 latency에 어떤 영향을 주는지 측정한 운영체제/백엔드 성능 분석 프로젝트다.

---

## Backend Signal

- Python 기반 Windows-local order server와 TCP load generator를 사용했다.
- CPU risk check, sync log + fsync, PyTorch CUDA scoring server 호출을 각각 scenario로 분리했다.
- 100 rps 기준 baseline p99 `25.60 ms`, gpu-scoring p99 `45.11 ms`, combined p99 `48.36 ms`를 기록했다.
- mitigation은 disk pressure를 `10.95 -> 1.49`로 낮췄지만 p99 개선은 제한적이었고, GPU call과 Python request-per-connection overhead가 더 큰 병목으로 해석됐다.

---

## Portfolio Use

백엔드 취업 포트폴리오에서는 "단순 구현"보다 성능 실험 설계, p99 latency 해석, 병목 완화 전략을 보여주는 대표 프로젝트로 사용한다.

면접 핵심 문장:

> 금융 주문 서버의 tail latency를 CPU, disk, GPU 경합 조건으로 나누어 측정하고, p99 latency와 시스템 병목을 근거로 완화 전략의 한계를 해석했습니다.

---

## Evidence Gaps

- 수업 과제 요구사항과 평가 기준
- 본인이 맡은 설계/개발 범위
- 실험을 설계한 이유와 대안
- Linux 환경에서 재측정했는지 여부
- 발표자료 또는 교수/팀 피드백

---

## Sources

- https://github.com/gyutaetae/financial-order-latency-lab
- https://raw.githubusercontent.com/gyutaetae/financial-order-latency-lab/main/README.md
