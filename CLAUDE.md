# CLAUDE.md

> Decision Log 프로젝트에서 Claude Code가 항상 따라야 하는 핵심 작업 규칙이다.

## 1. 프로젝트 목적

Decision Log는 기술 결정을 내려야 하는 비개발자와 PM이 여러 AI의 구조화된 답변을 비교하고, 합의·충돌·불확실성을 검토하여 자신의 결정을 기록하는 도구다.

핵심 흐름:

```text
기술 질문 입력
→ AI 2개 구조화 응답
→ Manager AI 비교
→ 사용자 상태 선택
→ Decision Note 저장
```

이 흐름과 직접 관련 없는 기능은 임의로 추가하지 않는다.

---

## 2. 고정 기술 스택

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Validation: Zod
- Styling: 일반 CSS
- 초기 저장: localStorage
- DB: Supabase PostgreSQL
- 패키지 관리: npm Workspaces
- 초기 개발: Mock Data 우선

데이터 저장 흐름은 다음과 같다.

```text
React
→ Express API
→ Supabase PostgreSQL
```

React에서 Supabase를 직접 호출하지 않는다.

---

## 3. 기준 문서

작업 종류에 필요한 문서만 읽는다.

| 작업 | 문서 |
|---|---|
| 설치·실행·환경변수 | `docs/dev-setup.md` |
| 제품 목적·MVP 범위 | `docs/product.md` |
| 전체 기술 구조 | `docs/architecture.md` |
| 현재 구현 기능 | `docs/specs/`의 해당 Spec |
| 현재 진행 상황 | `docs/status.md` |
| 기술 결정 근거 | `docs/decisions/`의 해당 ADR |
| 디자인 작업 | 관련 디자인 문서 |

문서 전체를 매 작업마다 모두 읽지 않는다.

문서끼리 충돌하거나 현재 코드와 다르면 임의로 결정하지 말고 사용자에게 알린다.

---

## 4. 구조 변경 규칙

- 기능 코드는 기능별 폴더에 모은다.
- 순수 공통 UI만 `components/ui`에 둔다.
- 전체 화면 배치만 `components/layout`에 둔다.
- 실제 재사용이 확인되기 전에는 공통 모듈로 옮기지 않는다.
- 기술 스택, 디렉토리 구조, DB 구조를 임의로 변경하지 않는다.
- 새로운 패키지는 바로 설치하지 말고 필요 이유와 대안을 먼저 설명한다.
- 요청과 관계없는 리팩터링은 하지 않는다.

---

## 5. TypeScript와 데이터 검증

- Zod 스키마를 먼저 작성한다.
- TypeScript 타입은 가능한 경우 `z.infer`로 생성한다.
- API 요청, AI 응답, DB 응답 등 외부 데이터는 Zod로 검증한다.
- `any`는 원칙적으로 사용하지 않는다.
- 검증 실패를 조용히 무시하지 않는다.

---

## 6. 저장 규칙

- `storageAdapter` 메서드는 처음부터 `Promise` 기반으로 작성한다.
- 컴포넌트에서 `localStorage`를 직접 호출하지 않는다.
- 초기에는 `localStorageAdapter`를 사용한다.
- DB 연결 후에는 `apiStorageAdapter → Express → Supabase` 흐름을 사용한다.
- Supabase Secret Key와 AI API Key는 백엔드 환경변수에만 둔다.
- 실제 `.env` 파일은 Git에 올리지 않는다.

---

## 7. 프론트엔드 규칙

- 컴포넌트는 화면 표시와 사용자 이벤트에 집중한다.
- 컴포넌트에서 직접 API를 호출하지 않고 Service 또는 Hook을 사용한다.
- 상태가 어디에 있고 어떤 이벤트로 변경되는지 추적 가능하게 작성한다.
- 기능 전용 컴포넌트는 해당 `features` 폴더에 둔다.
- Tailwind, styled-components, Redux, Zustand는 승인 없이 추가하지 않는다.

---

## 8. 백엔드 규칙

역할을 다음과 같이 구분한다.

```text
Route
→ URL과 Middleware 연결

Controller
→ HTTP 요청과 응답 처리

Service
→ 기능 흐름과 업무 규칙

Provider
→ 외부 AI API 호출

Repository
→ Supabase 조회와 저장
```

- Service는 Express의 `req`, `res`를 직접 받지 않는다.
- Controller는 AI SDK나 Supabase를 직접 호출하지 않는다.
- 모든 기능에 파일 구조를 기계적으로 만들지 않는다.
- 필요한 역할만 추가한다.

---

## 9. 작업 방식

### 작업 전

- 현재 작업과 관련된 Spec과 `docs/status.md`를 확인한다.
- 수정 범위와 영향받는 파일을 먼저 파악한다.
- 작은 작업은 바로 구현한다.
- 프론트·백엔드·공통 계약·DB가 함께 바뀌는 작업은 짧은 계획을 먼저 제시한다.

### 작업 중

- 한 번에 하나의 기능을 작업한다.
- 변경 범위를 가능한 작게 유지한다.
- Mock 흐름을 먼저 검증한 뒤 실제 API를 연결한다.
- 오류를 숨기기 위한 임시 우회 코드를 남기지 않는다.
- 이해하지 못한 기존 코드는 추측으로 삭제하지 않는다.

### 작업 후

변경 범위에 맞게 다음을 실행한다.

```bash
npm run typecheck
npm run lint
npm run build
```

실행하지 못한 검사가 있다면 이유를 명시한다.

필요한 경우 `docs/status.md`를 갱신한다.

---

## 10. 완료 보고 형식

```md
## 작업 완료

### 수정한 파일
- 파일 경로

### 구현한 내용
- 핵심 변경 사항

### 확인 결과
- 실행한 명령어
- 성공 또는 실패 결과

### 남은 문제
- 미구현 사항
- 확인하지 못한 사항

### 다음 작업
- 이어서 진행할 작업
```

---

## 11. 금지 사항

사용자 승인 없이 다음을 하지 않는다.

- 기술 스택 변경
- 패키지 추가
- 폴더 구조 대규모 변경
- DB 테이블 또는 Migration 변경
- 로그인·결제·팀 협업 기능 추가
- 비밀키의 프론트엔드 노출
- 실제 `.env` 파일 커밋
- 요청과 관계없는 광범위한 리팩터링
- 테스트 실패를 삭제하거나 무시하여 통과 처리

---

## 12. 핵심 원칙

제품 기능을 먼저 완성한다.

Agent 구조, Skill, 공통 모듈은 실제 반복과 재사용이 확인된 뒤 만든다.