---
type: core-context
aliases:
  - User Context
  - 핵심 맥락
description: The user's active standalone LLM Wiki context. LLM must read this before ingest, query, or lint so operations align with the user's purpose, not just structure.
author:
  - "[[김규태]]"
date created: 2026-07-07
date modified: 2026-07-07
tags:
  - system
  - schema
  - core-context
operationMode: standalone
source-vault: null
source: []
version: "1.0"
snapshot_date: 2026-07-07
status: active
---

# 🧭 Core Context — LLM Wiki 사용자 맥락

> 이 노트는 김규태가 Codex에서 단독 운영하는 LLM Wiki의 활성 Core Context다.
> 별도 mothership vault 없이 이 vault 안에서 수집, 컴파일, 질의, 검증을 수행한다.

---

## 1. Who — 사용자 정체성

### 기본 정체성

- **이름**: `김규태` (예: 홍길동 / Jane Doe)
- **직함 / 역할**: `TBD`
- **전문 분야**: `TBD`
- **주 활동 영역**: `TBD`

### 연속성 선언 (Continuity Statement)

> TBD — 향후 사용자가 자신의 연구, 개발, 글쓰기, 프로젝트 맥락을 말하면 이 문장을 갱신한다.

---

## 2. Why — 지식을 수집하는 목적 (재활용 축)

**미래의 나에게 보내는 편지**: "이 소스가 아래 어느 축에 재활용될지" 를 수집 시점에 명시하지 못하면 수집하지 않는다.

현재 기본 재활용 축은 AGENTS.md의 Codex ingest gate와 맞춘다.

1. **PhD**: 학위, 연구 질문, 논문 아이디어
2. **학술**: 논문 읽기, 연구 동향, 개념 정리
3. **강의**: 수업, 발표, 교육 자료
4. **컨설팅**: 자문, 실무 적용, 기업 사례
5. **CMDS 시스템**: 지식관리, LLM Wiki, agent harness 개선
6. **에세이**: 블로그, 긴 글, 개인 관점 정리
7. **제품**: 소프트웨어, 기능 설계, 프로토타입

---

## 3. What — (옵션) 개인 지식 프레임워크

TBD — 별도 프레임워크가 확정되기 전까지는 이 vault의 3-layer architecture를 따른다.

---

## 4. How — (옵션) 지식 시스템 철학

TBD — 사용자가 직접 확인한 반복 원칙만 여기에 승격한다.

---

## 5. Standalone Mode

Mode A로 단독 운영한다. 별도 mothership vault는 연결하지 않는다.

- `mainVaultRelated`와 `mainVaultCmds`는 연결할 모선이 없으면 비워둔다.
- `/refresh-context`는 모선 스냅샷 갱신이 아니라 이 Core Context 자체를 갱신할 때만 사용한다.
- 나중에 Mode B로 전환하려면 이 섹션에 mothership 경로와 동적 참조를 추가한다.

---

## 6. Operational Directives (LLM 행동 규칙)

### Ingest 시

1. `/ingest` 는 반드시 "왜 수집했는가?" 를 1회 묻는다 (미래의 나에게 보내는 편지, §2 축 참조).
2. Mode A에서는 mothership 검색을 건너뛴다.
3. Raw Source frontmatter 에 `collectionPurpose` 를 기록하고, `mainVaultRelated` / `mainVaultCmds` 는 비워둘 수 있다.

### Query 시

1. 답변이 §2 7 재활용 축 중 어느 축에 연결되는지 명시.
2. Mode A에서는 이 vault 내부 Wiki / Raw Source / Query 결과만 참조한다.

### Lint 시

- Raw Source 에 `collectionPurpose` 없으면 flag.
- Core Context `snapshot_date` 가 30 일 이상 오래되면 `/refresh-context` 추천.

### 이미지 저장

- 모든 이미지·첨부: `80. References/Attachments/` 일원화.

---

## 7. 채우고 나서

- [x] §1 이름 채움
- [x] §2 재활용 축 5~9개 정의
- [ ] (옵션) §3 개인 프레임워크
- [ ] (옵션) §4 철학 3~5개
- [x] Mode A 단독 운영 설정
- [x] frontmatter `status: active`
- [x] frontmatter `snapshot_date` 오늘 날짜
- [ ] frontmatter `source:` 에 본인이 참고한 에세이·노트 경로 추가

완료 후 첫 `/ingest` 를 실행해보세요. Core Context 가 작동하면 LLM 이 §2 축을 언급하며 목적 질문을 던집니다.

---

## 8. Related

- [[CLAUDE]] — LLM Wiki Schema
- [[index]] — Master Index
- [[log]] — Change Log
- [[LLM-Wiki-Starter-Kit]] — 외부 공유용 간이 킷

---

*템플릿 v1.0 — Karpathy LLM Wiki pattern + 미래의 나에게 보내는 편지 + CMDSPACE harness*
