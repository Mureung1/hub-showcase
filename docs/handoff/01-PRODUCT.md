# 01. 제품 정의와 현재 상황

> **[2026-07-31 갱신 안내]**
> 제품 정체성·용어·Epic·Story는 그대로 유효하다. 다만 문서 끝의 **진행 상황**은 2026-07-29 기준이라 낡았다 — 최종 상태는 `07-BUILD-HISTORY.md`를 보라.
> 이 묶음은 6개 → **10개**로 늘어났다. `00-INDEX.md`를 먼저 보라.

---

## 1. 무엇을 푸는 제품인가

### 1.1 문제

기술 결정을 내려야 하는 비개발자·PM은 AI에게 묻는다. 그런데 AI 하나에게만 물으면 그 답이 맞는지 알 수 없고, 여러 AI에게 물으면 **답변 세 개를 나란히 놓고 직접 읽어 비교해야 한다.** 그 비교는 오래 걸리고, 무엇보다 **어디가 다른지를 놓치기 쉽다.**

세 AI가 "팀은 3~4명이 적정" / "5명은 필요" / "3명"이라고 답했을 때, 사람이 세 개의 긴 글에서 이 숫자 차이를 찾아내야 한다. 그리고 대부분은 못 찾는다.

### 1.2 해법

**AI별 답변을 공통 소주제(Agenda) 단위로 쪼개 정렬하고, 결론이 갈리는 지점만 뽑아 사용자에게 판단을 요구한다.**

합의된 것은 자동으로 통과시켜 사용자의 시간을 아끼고, 갈린 것만 3열 비교로 보여준다. 사용자는 하나를 채택하거나, 직접 쓰거나, 재검토를 요청하거나, 제외한다. 그 판단이 곧 **결정 기록**이 된다.

### 1.3 한 줄 정의

> Decision Log는 기술 결정을 내려야 하는 비개발자와 PM이 여러 AI의 구조화된 답변을 Agenda 단위로 비교하고, 충돌을 직접 판단하여 자신의 결정을 기록하는 도구다.
> — `CLAUDE.md` 1장

---

## 2. 핵심 흐름

```text
Chat 생성
→ Question 입력
→ Claude·OpenAI·Gemini SourceAnswer 생성 (동시)
→ Manager AI가 Agenda 생성·비교
→ Consensus Agenda 자동 통과
→ Conflict Agenda 사용자 판단 (채택 / 직접 입력 / 재검토 1회 / 제외)
→ 모든 Agenda가 passed 또는 rejected
→ FinalAnswer 생성
→ DecisionNote 자동 생성·저장
→ 다음 Question은 이전 확정 결과를 Context로 사용
```

이 흐름과 직접 관련 없는 기능은 임의로 추가하지 않는다는 것이 프로젝트 규칙이다.

---

## 3. 핵심 용어 8개

| 용어 | 정의 |
|---|---|
| **User** | Supabase Auth로 인증된 사용자. 이메일 인증 완료가 서비스 이용의 필수 조건 |
| **Chat** | 하나의 주제를 다루는 대화 단위. 여러 Question을 포함한다 |
| **Question** | 사용자가 던진 하나의 질문. 3사 답변·Agenda·FinalAnswer를 거느린다 |
| **SourceAnswer** | 한 AI Provider의 원답변. 구조화된 Section 배열(`structuredContent`)을 갖는다 |
| **Manager AI** | 3사 답변을 비교해 Agenda를 만들고 합의/충돌을 판정하는 내부 엔진. 화면에 모델명이 노출되지 않는다 |
| **Agenda** | 공통 소주제 단위의 쟁점. 상태 머신을 가지며 사용자 판단의 대상이 된다 |
| **FinalAnswer** | 확정된 Agenda들을 종합한 최종 답변 |
| **DecisionNote** | 결정 요약 기록. 카드 형태로 저장·조회·Export된다 |

### 3.1 Agenda가 이 제품의 중심 단위다

Agenda는 "세 AI가 같은 주제에 대해 뭐라고 했는가"를 담는 그릇이다. 각 Agenda는

- 어느 AI들이 이 주제를 다뤘는지 (`stances`)
- 그 근거가 원문 어디인지 (`sourceRefs`, `quotes`)
- 합의인지 충돌인지 (`kind`)
- 사용자가 무엇을 선택했는지 (`resolutionReason`)

를 전부 보존한다. 이 보존이 DecisionNote의 신뢰성을 만든다.

---

## 4. 가치 구조

### 4.1 Value (최상위 가치)

> 고객은 AI 교차 검증을 통해 신뢰도 높은 지식을 기반으로 결정을 내리고, 이 기록을 카드 형태로 분류하여 저장할 수 있다.

### 4.2 Epic 5개

| Epic | 내용 | Story 수 |
|---|---|---|
| **1** | 하나의 질문에 여러 AI가 **구조적으로 통일성 있는** 답변을 준다 | 4 |
| **2** | 공통 소주제의 **충돌 내용을 카드로 비교**해 본다 | 3 |
| **3** | 충돌 카드를 **채택·재검증·폐기**하고 최종 답변을 받는다 | 5 |
| **4** | 최종 답변의 요약인 Decision Log를 확인하고 **MD 파일로 다운로드**한다 | 4 |
| **5** | 기존 최종 답변들을 **맥락으로 다음 질문**을 이어간다 | 1 |

**Epic 2·3이 제품의 심장**이다. Epic 1은 입력, Epic 4·5는 출력과 연속성이다. Manager AI 로직(`04`)이 Epic 2·3 전체를 떠받친다.

### 4.3 Story 전문

**Epic 1 — 구조적으로 통일성 있는 다중 AI 답변**
- 1-1. 질문을 시작할 수 있다
- 1-2. 질문을 Claude·ChatGPT·Gemini에 동시에 보낼 수 있다
- 1-3. 여러 AI가 같은 답변 구조로 응답하도록 만들 수 있다
- 1-4. AI별 답변을 한 화면에서 비교할 수 있다

**Epic 2 — 소주제 단위 충돌 비교**
- 2-1. 여러 AI 답변을 소주제 단위로 나눠 비교된 결과를 확인할 수 있다
- 2-2. 소주제 안에 충돌이 있으면 별도 리스트로 확인할 수 있다
- 2-3. 충돌 소주제에 대한 각 AI의 의견을 비교해서 볼 수 있다

**Epic 3 — 판단과 최종 답변**
- 3-1. 각 AI 의견 중 하나를 채택할 수 있다
- 3-2. Manager AI에게 재질문해 답변을 받고 채택할 수 있다
- 3-3. 해당 주제를 폐기할 수 있다
- 3-4. 사용자가 스스로 채택 내용을 기재하고 채택할 수 있다
- 3-5. 모든 충돌을 처리하면 최종 답변을 받을 수 있다

**Epic 4 — Decision Log 확인·Export**
- 4-1. 최종 답변의 요약인 Decision Log를 확인할 수 있다
- 4-2. Decision Log를 리스트로 확인할 수 있다
- 4-3. 개별 MD 파일로 저장한 Zip을 다운받을 수 있다
- 4-4. 전체 대화 내용을 MD로 다운받을 수 있다

**Epic 5 — 맥락 연속**
- 5-1. 기존 최종 답변들을 맥락으로 다음 질문을 이어갈 수 있다

---

## 5. MVP 범위

### 5.1 포함

- 이메일·비밀번호 회원가입, 로그인, 로그아웃, 로그인 상태 복원, 인증 필요 화면 보호
- **Epic 1~5 전체**: 3개 Provider 동시 질문, Agenda 비교·판단·1회 재검토, FinalAnswer, DecisionNote, MD Zip Export, Context 연속 질문

### 5.2 제외

- Chat과 하위 데이터의 삭제·보관 기능
- 비밀번호 재설정(Should), 소셜 로그인, 프로필 테이블, 회원 탈퇴, 다중 인증

---

## 6. 기술 스택 (고정)

| 영역 | 선택 |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Validation | **Zod** (web·api 공용 계약) |
| Design System | Astryx (`@astryxdesign/core` + theme-neutral) |
| Package Management | npm Workspaces (monorepo) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (이메일+비밀번호) |
| 권한 제어 | PostgreSQL **Row Level Security** |
| AI API | Claude · OpenAI · Gemini |
| Manager AI | Qwen via **OpenRouter** (`qwen/qwen3.7-plus`) |
| Prompt 관리 | `/prompts` 디렉터리, 버전 관리 |
| Export | Markdown Generator + JSZip |
| 환경변수 | dotenv + Zod 검증 |
| 배포 | Render (web·api) |

### 6.1 저장 계층의 진화

```text
1단계  React → storageAdapter → localStorageAdapter → localStorage
2단계  React → apiStorageAdapter → Express → Repository → Supabase
```

`storageAdapter` 인터페이스를 먼저 두고 구현만 갈아끼우는 방식으로, Mock 단계에서 만든 화면을 그대로 실서버에 붙였다.

### 6.2 지켜지는 경계

- React는 **Supabase Auth 기능에 한해서만** Supabase Client를 직접 쓴다
- 서비스 데이터 조회·저장은 **반드시 Express API를 거친다**
- React에서 **외부 AI API를 직접 호출하지 않는다**

---

## 7. 현재 진행 상황 (2026-07-29)

### 7.1 Spec 완료 현황

| Spec | 내용 | 상태 |
|---|---|---|
| SPEC-UI-001 | Mock 프론트엔드 핵심 흐름 | 완료 (2026-07-18) |
| SPEC-SCHEMA-001 | 공통 Zod Schema 계약 | 완료 (2026-07-18) |
| SPEC-AUTH-001 | 회원가입·로그인 UI | 완료 (2026-07-20) |
| SPEC-AUTH-002 | Auth Session·Protected Route | 완료 (2026-07-20) |
| SPEC-AUTH-003 | Express Auth Middleware | 완료 (2026-07-20) |
| SPEC-DB-001 | 사용자 소유권·RLS·Migration | 완료 (2026-07-22) |
| SPEC-AI-001 | AI Provider 3사 실호출 | 완료 (2026-07-22) |
| **SPEC-AI-002** | **Manager AI 비교·재검토** | **Ready — 구현 중** |
| SPEC-AI-003 | FinalAnswer 생성 | 미작성 |
| SPEC-EXPORT-001 | DecisionNote 저장·Export | 미작성 |

### 7.2 SPEC-AI-002 구현 분할

| 태스크 | 내용 | 상태 |
|---|---|---|
| T-019.1 | Agenda 계약 확장·마이그레이션·Mock 정합 | **완료** (브라우저 회귀 5종 PASS) |
| T-019.2 | 분류 파이프라인 (단계 1~5) + Manager 실호출 | 착수 |
| T-019.3 | 판정(단계 6~7)·DB 저장·SSE 배선 | 예정 |
| T-019.4 | web 재배선, Mock 제거 | 예정 |

### 7.3 남은 일 전체

| 항목 | 규모 |
|---|---|
| SPEC-AI-002 구현 T-019.2·.3·.4 | 3개 태스크 |
| SPEC-AI-003 (FinalAnswer 서버 생성) | Spec 1 + 구현 2~3 |
| SPEC-EXPORT-001 (MD Zip Export) | Spec 1 + 구현 1~2 |
| 안정화 (좌초 복구) | 태스크 |
| 데모 전 정리 | 테스트 계정·데이터 |

### 7.4 현재의 제약

지금 시점에서 **Agenda까지는 서버가 만들지만 FinalAnswer·DecisionNote는 여전히 브라우저 Mock**이다. 따라서 옛 Chat을 다시 열면 Agenda는 복원되지만 FinalAnswer·노트는 복원되지 않는다. 의도된 증분이며 SPEC-AI-003이 해소한다.

---

## 8. 확정된 아키텍처 결정 (ADR)

| ADR | 결정 | 날짜 |
|---|---|---|
| **001** | Supabase Auth 이메일+비밀번호, **이메일 인증 완료를 필수 조건**으로 | 2026-07-16 |
| **002** | 데이터 접근 클라이언트 이원화 — 조회·사용자 쓰기는 JWT+RLS, **AI 파이프라인 시스템 쓰기는 Secret Key** | 2026-07-16 |
| **003** | MVP Provider를 `claude`·`openai`·`gemini` **3개로 확정** | 2026-07-16 |
| **004** | Astryx 디자인 시스템 도입 (150+ 접근성 컴포넌트, 다크모드, agent-ready) | 2026-07-16 |
| **005** | AI 파이프라인을 **5개 포트로 분리** — Provider 호출 / 답변 프롬프트 / Section 정규화 / **Agenda 분류** / **충돌 판정** | 2026-07-22 |

ADR-002와 ADR-005가 Manager AI 구현의 직접적 전제다. 상세는 `05-TECHNICAL.md`.

---

## 9. 핵심 원칙 7개 (`CLAUDE.md` 13장)

1. 제품의 핵심 사용자 흐름을 먼저 완성한다
2. 한 번에 하나의 작동하는 작은 기능을 구현한다
3. **Mock과 실제 API는 같은 데이터 계약을 사용한다**
4. **외부 데이터는 실행 시점에 검증한다**
5. 프론트엔드는 외부 AI와 DB의 비밀 자원에 직접 접근하지 않는다
6. 구현 결과는 **실행 가능한 검증**으로 확인한다
7. Agent 구조·Skill·Hook·공통 모듈은 **실제 반복과 재사용이 확인된 뒤** 만든다

3번과 4번이 이 프로젝트의 개발 속도를 만들었다. Mock을 계약에 맞춰 만들어두면 실서버로 바꿀 때 화면을 다시 만들지 않아도 된다. 7번은 조기 추상화를 막는 규칙이다.
