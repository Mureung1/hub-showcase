# CLAUDE.md

> Decision Log 저장소에서 Claude Code가 항상 따라야 하는 핵심 작업 규칙이다.
> 모든 작업에 공통으로 적용되는 규칙만 두며, 상세 내용은 관련 문서를 따른다.

## 1. 프로젝트 목적

Decision Log는 기술 결정을 내려야 하는 비개발자와 PM이 여러 AI의 구조화된 답변을 Agenda 단위로 비교하고, 충돌을 직접 판단하여 자신의 결정을 기록하는 도구다.

핵심 흐름:

```text
Chat 생성
→ Question 입력
→ Claude·OpenAI·Gemini SourceAnswer 생성
→ Manager AI가 Agenda 생성·비교
→ Consensus Agenda 자동 통과
→ Conflict Agenda 사용자 판단(채택 / 직접 입력 / 재검토 1회 / 제외)
→ 모든 Agenda가 passed 또는 rejected
→ FinalAnswer 생성
→ DecisionNote 자동 생성·저장
→ 다음 Question은 이전 확정 결과를 Context로 사용
```

이 흐름과 직접 관련 없는 기능은 임의로 추가하지 않는다.
MVP는 Claude, OpenAI, Gemini 세 AI Provider를 사용한다.

---

## 2. 고정 기술 스택과 데이터 흐름

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Validation: Zod
- Design System: Astryx (`@astryxdesign/core` + 테마)
- Styling: Astryx 컴포넌트 우선, 테마 토큰(CSS custom property) 오버라이드 + 보조 일반 CSS
- Package Management: npm Workspaces
- 초기 저장: localStorage
- 저장 추상화: 비동기 `storageAdapter`
- Database: Supabase PostgreSQL
- Auth: Supabase Auth
- 초기 인증 방식: 이메일 + 비밀번호
- 사용자 식별자: `auth.users.id`
- 인증된 데이터 접근: Supabase JWT + Express Auth Middleware
- 권한 제어: PostgreSQL Row Level Security
- AI API: Claude API, OpenAI API, Gemini API
- Prompt 관리: `/prompts`
- Export: Markdown Generator, JSZip
- 환경변수: dotenv + Zod

정확한 패키지 버전과 실행 스크립트의 기준은 루트 및 각 Workspace의 `package.json`, 루트 `package-lock.json`, `docs/dev-setup.md`다.
사용자 승인 없이 버전이나 패키지 관리 방식을 변경하지 않는다.

단계별 데이터 흐름:

```text
Mock
React → Mock Service → 구조화된 Mock Data

초기 저장
React → storageAdapter → localStorageAdapter → localStorage

인증
React → Supabase Auth → Access Token 발급·갱신

인증된 API 호출
React → Authorization: Bearer <access-token> → Express Auth Middleware → Service → Repository

AI 호출
React → API Client 또는 Feature Service → Express → AI Provider → AI API

DB 저장
React → apiStorageAdapter → Express → Repository → Supabase
```

React는 회원가입, 로그인, 로그아웃, 세션 확인 등 Supabase Auth 기능에 한해 Supabase Client를 직접 사용할 수 있다.
서비스 데이터의 조회·저장에는 Supabase Client를 직접 사용하지 않으며, 반드시 Express API를 거친다.
React에서 외부 AI API를 직접 호출하지 않는다.

---

## 3. 기준 문서

작업에 필요한 문서만 읽는다.

| 작업 | 기준 문서 |
|---|---|
| 패키지 버전·실행 스크립트 | 루트 및 Workspace의 `package.json`, 루트 `package-lock.json` |
| 설치·실행·환경변수 | `docs/dev-setup.md` |
| 제품 목적·MVP 범위 | `docs/product.md` |
| 전체 기술 구조 | `docs/architecture.md` |
| 도메인 객체·상태 전이 정책 | `docs/domain-policy.md` |
| 데이터 모델·RLS | `docs/data-model.md` |
| 현재 구현 기능과 완료 조건 | `docs/specs/`의 해당 Spec |
| 현재 진행 상황 | `docs/status.md` |
| 기술 결정 근거 | `docs/decisions/`의 해당 ADR |
| 디자인 작업 | `docs/DESIGN.md`, `docs/design-skill.md` |

문서 전체를 매 작업마다 모두 읽지 않는다.
사용자의 현재 요청, 관련 Spec, 문서, 실제 코드가 충돌하면 임의로 결정하지 말고 충돌 내용과 영향을 먼저 알린다.

---

## 4. 저장소와 구조 규칙

현재 주요 Workspace:

```text
apps/web
apps/api
```

필요한 시점에만 다음 구조를 추가한다.

```text
packages/shared
prompts
supabase
```

- 기능 코드는 기능별 폴더에 모은다.
- 순수 공통 UI만 `components/ui`에 둔다.
- 전체 화면 배치만 `components/layout`에 둔다.
- 실제 재사용이 확인되기 전에는 공통 모듈로 옮기지 않는다.
- `packages/shared`에는 Web과 API가 함께 쓰는 Zod 스키마, 추론 타입, 순수 유틸리티만 둔다.
- `packages/shared`는 React, Express, Supabase SDK, AI SDK에 의존하지 않는다.
- Web에서 API의 소스 파일을 직접 import하지 않는다.
- 루트 `package-lock.json` 하나만 유지한다.
- 새로운 패키지는 필요한 이유, 대안, 설치할 Workspace를 설명한 뒤 추가한다.
- 기술 스택, 디렉토리 구조, DB 구조를 임의로 변경하지 않는다.
- 요청과 관계없는 리팩터링은 하지 않는다.

---

## 5. TypeScript와 Zod 규칙

- Zod 스키마를 먼저 작성한다.
- TypeScript 타입은 가능한 경우 `z.infer`로 생성한다.
- API 요청, AI 응답, DB 응답, 환경변수 등 외부 데이터는 Zod로 검증한다.
- 외부 데이터는 검증 전까지 `unknown`으로 취급한다.
- `any`는 원칙적으로 사용하지 않는다.
- 검증 실패를 조용히 무시하거나 타입 단언만으로 우회하지 않는다.
- Mock Data와 실제 API 응답은 같은 Zod 스키마를 만족해야 한다.
- Web과 API가 실제로 공유하는 계약만 `packages/shared`로 옮긴다.

---

## 6. 저장, 인증, 보안 규칙

- `storageAdapter` 메서드는 처음부터 `Promise` 기반으로 작성한다.
- 컴포넌트에서 `localStorage`를 직접 호출하지 않는다.
- 초기에는 `localStorageAdapter`를 사용한다.
- DB 연결 후에는 `apiStorageAdapter → Express → Supabase` 흐름을 사용한다.
- 로그인 사용자의 데이터 소유자는 `auth.users.id`(`user_id`)를 기준으로 한다.
- `sessionId`는 인증 사용자 데이터의 소유권에 사용하지 않는다.
- `sessionId`는 필요한 경우 로그인 전 localStorage 임시 Draft 구분에만 사용한다.
- Express는 클라이언트가 전달한 userId를 신뢰하지 않으며, 인증된 사용자 ID는 검증된 JWT에서 추출한다.
- 요청 Body의 userId를 데이터 소유권 판단에 사용하지 않는다.
- 사용자 데이터 테이블에는 RLS를 적용한다.
- 비회원 데이터의 회원 이전, 여러 브라우저의 sessionId 병합, 게스트 계정과 정식 계정 병합은 MVP에서 제외한다.
- 역할, 권한 체계 확장은 사용자 승인 없이 추가하지 않는다.
- DB 테이블과 Migration은 관련 Spec 또는 ADR 없이 변경하지 않는다.
- 실제 `.env`, `.env.local` 파일은 Git에 올리지 않는다.
- `VITE_` 환경변수는 브라우저에 공개되는 값으로 간주한다.
- 프론트엔드에는 Supabase URL과 Publishable Key만 둘 수 있다.
- AI API Key, Supabase Secret Key, Service Role Key는 백엔드 환경변수에만 둔다.
- 비밀값을 코드, 로그, 오류 응답, 예시 데이터에 남기지 않는다.

---

## 7. 프론트엔드 규칙

- 컴포넌트는 화면 표시와 사용자 이벤트 처리에 집중한다.
- 컴포넌트에서 `fetch`, AI SDK, Supabase SDK, `localStorage`를 직접 호출하지 않는다.
- 서버 통신은 Feature Service, API Client 또는 Hook을 통해 수행한다.
- 상태의 소유 위치와 상태를 변경하는 이벤트가 추적 가능하도록 작성한다.
- 파생 가능한 값은 불필요한 별도 state로 중복 저장하지 않는다.
- 기능 전용 컴포넌트, Hook, Service, 타입은 해당 `features` 폴더에 둔다.
- 비동기 기능은 필요에 따라 `idle`, `loading`, `success`, `empty`, `error` 상태를 구분한다.
- UI는 Astryx 컴포넌트를 우선 사용하고, 색·간격 변경은 테마 토큰 오버라이드로 한다.
- Astryx에 없는 도메인 전용 UI만 직접 만들며, 보조 스타일은 일반 CSS로 작성한다.
- Tailwind, styled-components, Redux, Zustand는 승인 없이 추가하지 않는다.
- 단순 기능을 위해 과도한 전역 상태나 추상화를 만들지 않는다.

---

## 8. 백엔드와 AI 규칙

역할은 필요에 따라 다음처럼 구분한다.

```text
Route
→ URL과 Middleware 연결

Auth Middleware
→ Supabase JWT 검증과 인증 사용자 ID(`req.auth.userId`) 설정

Controller
→ HTTP 요청과 응답 처리

Service
→ 기능 흐름과 업무 규칙

Provider
→ 외부 AI API 호출

Repository
→ Supabase 조회와 저장
```

- 모든 기능에 위 파일 구조를 기계적으로 만들지 않는다.
- 인증이 필요한 Route는 Auth Middleware에서 Supabase JWT를 검증한 뒤 Controller로 전달한다.
- 요청 데이터는 Controller 또는 그 이전 경계에서 Zod로 검증한다.
- Service는 Express의 `req`, `res`를 직접 받지 않는다.
- Controller는 AI SDK나 Supabase SDK를 직접 호출하지 않는다.
- AI SDK 호출은 Provider, Supabase 접근은 Repository에 둔다.
- Provider와 Repository가 반환하는 외부 데이터도 Zod로 검증한다.
- 서버 오류에 비밀값이나 불필요한 내부 정보를 포함하지 않는다.
- 환경변수는 서버 시작 시 검증하고 필수 값이 없으면 명확하게 실패시킨다.

AI와 Prompt는 다음 규칙을 따른다.

- 실제 API 연결 전 동일한 계약의 Mock Data로 UI와 상태 흐름을 먼저 완성한다.
- 긴 Prompt를 Controller, Service, Provider에 직접 하드코딩하지 않는다.
- 답변 Prompt와 Manager Prompt는 `/prompts`에서 버전 관리한다.
- Provider별 응답을 내부 공통 스키마로 정규화한다.
- Agenda는 가능한 경우 근거가 된 SourceAnswer와 Section 참조(`source_refs`)를 포함한다.
- 여러 AI의 합의(Consensus)를 사실 판정으로 표현하지 않고 비교 결과로만 취급한다.
- 근거에 없는 AI 비교 결과를 정상 데이터로 저장하지 않는다.

---

## 9. 작업 방식

### 작업 전

- 관련 Spec과 `docs/status.md`를 확인한다.
- 실제 파일 구조와 기존 구현을 먼저 조사한다.
- 수정 범위, 영향받는 파일, 완료 조건을 파악한다.
- 한 번에 하나의 기능 또는 하나의 명확한 수정 단위를 작업한다.
- 작은 저위험 변경은 조사 후 바로 구현할 수 있다.
- 다음 작업은 짧은 계획을 먼저 제시한다.

```text
- Frontend와 Backend를 함께 변경
- 공통 Zod 계약 변경
- 저장 방식 변경
- DB 또는 Migration 변경
- AI Prompt 또는 응답 스키마 변경
- 새로운 패키지 추가
- 여러 기능 폴더에 걸친 구조 변경
```

### 작업 중

- 관련 Spec의 범위만 구현한다.
- 변경 범위를 가능한 작게 유지한다.
- Mock 흐름을 먼저 검증한 뒤 실제 API를 연결한다.
- 기존 패턴을 우선 재사용한다.
- 오류를 숨기기 위한 임시 우회 코드를 남기지 않는다.
- 이해하지 못한 기존 코드는 추측으로 삭제하지 않는다.
- 작업 범위가 커지면 임의로 확장하지 않고 현재 완료 가능한 최소 단위를 구분한다.

### 작업 후

변경 범위에 맞게 루트에서 다음을 실행한다.

```bash
npm run typecheck
npm run lint
npm run build
```

- API 변경 시 필요한 서버 실행 또는 endpoint 확인도 수행한다.
- UI 변경 시 관련 사용자 시나리오를 브라우저에서 확인한다.
- 현재 스크립트가 검사하지 않는 Workspace나 항목을 통과했다고 보고하지 않는다.
- 실행하지 못한 검사와 확인하지 못한 항목은 이유를 명시한다.
- 기능 완료, 범위 변경, 알려진 문제 발생 시 `docs/status.md`를 갱신한다.
- 동작이나 계약이 바뀌면 관련 Spec, architecture 문서 또는 ADR도 갱신한다.

---

## 10. Agent와 Review 규칙

- 요구사항과 구현 맥락은 메인 작업 Context가 유지한다.
- Subagent는 독립적으로 조사하거나 검토할 수 있는 작업에만 사용한다.
- Reviewer와 QA Agent는 기본적으로 읽기·검증 중심으로 사용하고, 수정은 메인 Agent가 담당한다.
- QA 결과는 Acceptance Criteria별 Pass / Fail, 재현 방법, 심각도, 미확인 범위를 포함한다.
- Agent, Skill, Hook, 공통 모듈은 실제 반복이나 강제 필요성이 확인된 뒤 추가한다.
- 단순 작업을 위해 여러 Agent를 직렬로 연결하지 않는다.

---

## 11. 완료 보고 형식

```md
## 작업 완료

### 수정한 파일
- 파일 경로

### 구현한 내용
- 핵심 변경 사항

### 동작 흐름
- 사용자 행동 이후 state, service, API 또는 저장 흐름

### 확인 결과
- 실행한 명령어와 결과
- 직접 확인한 사용자 시나리오

### 남은 문제
- 미구현 사항
- 확인하지 못한 사항
- 알려진 위험

### 다음 작업
- 이어서 진행할 가장 작은 작업
```

프론트엔드 state나 이벤트 로직을 변경한 경우, 핵심 state의 위치와 변경 이벤트를 짧게 설명한다.

---

## 12. 금지 사항

사용자 승인 없이 다음을 하지 않는다.

- 기술 스택 또는 패키지 관리 방식 변경
- 패키지 추가 또는 주요 버전 변경
- 폴더 구조 대규모 변경
- 불필요한 공통 모듈과 추상화 생성
- DB 테이블 또는 Migration 변경
- 결제·팀 협업 기능 추가
- React에서 외부 AI API 직접 호출
- React에서 Supabase Auth 외 기능의 Supabase 직접 호출
- 클라이언트가 전달한 userId로 데이터 소유권 판단
- 컴포넌트에서 `localStorage` 직접 호출
- 비밀키의 프론트엔드 노출
- 실제 `.env` 파일 커밋
- Workspace 내부 별도 lock 파일 생성
- 요청과 관계없는 광범위한 리팩터링
- Zod 검증 우회
- 테스트나 검증 실패를 삭제·무시하여 통과 처리
- 실행하지 않은 검사를 성공했다고 보고
- 근거가 없는 AI 비교 결과를 정상 데이터로 저장

---

## 13. 핵심 원칙

1. 제품의 핵심 사용자 흐름을 먼저 완성한다.
2. 한 번에 하나의 작동하는 작은 기능을 구현한다.
3. Mock과 실제 API는 같은 데이터 계약을 사용한다.
4. 외부 데이터는 실행 시점에 검증한다.
5. 프론트엔드는 외부 AI와 DB의 비밀 자원에 직접 접근하지 않는다.
6. 구현 결과는 실행 가능한 검증으로 확인한다.
7. Agent 구조, Skill, Hook, 공통 모듈은 실제 반복과 재사용이 확인된 뒤 만든다.
