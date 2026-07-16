# Decision Log 아키텍처

> 전체 기술 구조의 기준 문서다. 작업 규칙의 원문은 `CLAUDE.md`, 도메인 정책은 `docs/domain-policy.md`를 따른다.

---

## 1. 시스템 구성

```text
apps/web   React + Vite + TypeScript (SPA)
apps/api   Node.js + Express + TypeScript
DB         Supabase PostgreSQL + RLS
Auth       Supabase Auth (이메일 + 비밀번호, 이메일 인증 필수)
AI         Claude API · OpenAI API · Gemini API (Provider 계층에서만 호출)
검증        Zod (외부 데이터 경계 전체)
패키지      npm Workspaces, 루트 package-lock.json 하나
```

## 2. 백엔드 계층 구조

```text
Route            → URL과 Middleware 연결
Auth Middleware  → Supabase JWT 검증, req.auth.userId 설정
Controller       → HTTP 요청·응답 처리, 경계 Zod 검증
Service          → 기능 흐름, 업무 규칙, 소유권 검증
Provider         → 외부 AI API 호출 (응답 Zod 검증·정규화)
Repository       → Supabase 조회·저장 (응답 Zod 검증)
```

모든 기능에 위 구조를 기계적으로 만들지 않는다 (`CLAUDE.md` 8장).

## 3. 인증 흐름

```text
Sign-up / Sign-in Form
→ AuthService (signUp, signIn, signOut)
→ Supabase Auth
→ Session (Access Token + Refresh Token)
→ AuthProvider / AuthContext
→ Protected Route
```

## 4. 인증된 API 흐름

```text
React ApiClient
→ Access Token 획득
→ Authorization: Bearer <access-token>
→ Express authMiddleware (Supabase JWT 검증)
→ AuthenticatedRequest (req.auth.userId)
→ Controller → Service → Repository
```

- Express는 클라이언트가 전달한 userId를 신뢰하지 않는다.
- 인증된 사용자 ID는 검증된 JWT에서만 추출한다.

## 5. AI 처리 파이프라인

```text
Question 실행 (Express Service)
→ Provider 계층에서 Claude·OpenAI·Gemini 호출 → SourceAnswer 저장
→ Manager AI가 Agenda 생성·비교 (Consensus 자동 통과 / Conflict 사용자 판단)
→ 사용자 판단 API (채택 / 직접 입력 / 재검토 1회 / 제외)
→ 모든 Agenda 확정 시 Manager AI가 FinalAnswer 생성
→ 사용자가 DecisionNote 저장 → Question completed
```

상세 상태 전이와 예외 정책은 `docs/domain-policy.md`를 따른다.

## 6. 데이터 접근 클라이언트

```text
조회·사용자 행동에 의한 쓰기
→ 사용자 JWT를 전달한 Supabase Client
→ RLS 적용

AI 파이프라인의 시스템 쓰기 (SourceAnswer·Agenda·FinalAnswer 저장·상태 갱신)
→ Secret Key Client
→ Service 계층에서 검증된 userId로 소유권 확인 후에만 수행
```

근거: `docs/decisions/ADR-002-data-access-clients.md`

---

## 7. 주요 서비스 트랜잭션

### 7.1 Question 실행

```text
1. 이메일 인증이 완료된 로그인 사용자인지 확인한다.
2. Chat에 미완료 Question이 없는지 확인한다.
3. 직전 Question의 FinalAnswer와 이전 Question들의 DecisionNote로 Context Snapshot을 만든다.
4. Question을 draft로 생성한다.
5. 실행 시 Question을 processing으로 변경한다.
6. Provider별 SourceAnswer를 pending으로 생성한다.
7. SourceAnswer를 processing으로 변경하고 API를 호출한다.
8. 성공하면 succeeded로 변경한다.
9. 처음 실패하면 같은 레코드로 1회 재시도한다.
10. 재시도도 실패하면 excluded_from_comparison = true로 변경한다.
11. 하나 이상의 SourceAnswer가 succeeded면 성공한 답변으로 Manager AI 처리를 계속한다.
```

새 Chat의 첫 Question이라면 Chat 생성과 Question 생성을 같은 Transaction으로 처리하고, Chat `title`에 message 앞 100자를 저장한다.

### 7.2 Agenda 생성

```text
1. Manager AI가 Agenda를 draft로 생성한다.
2. Consensus면 합의 내용을 selected_content에 저장하고 passed + auto_consensus로 변경한다.
3. Conflict면 conflicted로 저장한다.
4. Conflict Agenda가 하나 이상이면 Question을 review_required로 변경한다.
5. 모든 Agenda가 passed면 FinalAnswer를 생성한다.
```

### 7.3 사용자 판단

Conflict Agenda에서:

```text
기존 AI 내용 채택
→ selected_content 저장
→ passed
→ resolution_reason = user_accepted

사용자 채택 내용 직접 입력
→ selected_content 저장
→ passed
→ resolution_reason = user_composed

제외
→ rejected
→ resolution_reason = user_rejected

재검토
→ recheck_requested
```

재검토 이후:

```text
재검토 결과 또는 기존 AI 내용 채택
→ selected_content 저장
→ passed
→ resolution_reason = user_accepted_after_recheck

사용자 채택 내용 직접 입력
→ selected_content 저장
→ passed
→ resolution_reason = user_composed_after_recheck

제외
→ rejected
→ resolution_reason = user_rejected_after_recheck
```

### 7.4 FinalAnswer 및 DecisionNote 생성

```text
1. 모든 Agenda가 passed 또는 rejected인지 확인한다.
2. 모든 Agenda가 rejected면 고정 안내 문구를 FinalAnswer로 저장한다.
3. Passed Agenda가 있으면 정해진 generation_mode에 따라 FinalAnswer를 한 번 생성한다.
4. FinalAnswer를 저장한다.
5. Manager AI가 FinalAnswer를 요약한 DecisionNote를 자동 생성·저장한다.
6. DecisionNote 저장 성공 후 Question을 completed로 변경한다.
7. completed_at을 기록한다.
8. 다음 Question 입력을 활성화한다.
```

FinalAnswer 중복 생성과 Question 완료 시점의 불일치를 막기 위해 Service 또는 Transaction에서 처리한다.


---

## 8. 프론트엔드 구성 요소 역할

```text
AuthProvider / AuthContext → 현재 사용자와 인증 상태 관리
AuthService                → signUp, signIn, signOut
ApiClient                  → Access Token을 API 요청에 첨부
features/*                 → 기능별 컴포넌트·Hook·Service
storageAdapter             → Promise 기반 저장 추상화 (초기 localStorage → apiStorageAdapter)
```
