# 현재 진행 상황

## 최근 결정 (2026-07-16)

- Supabase Auth 이메일·비밀번호 인증을 MVP에 추가하고, 이메일 인증 완료를 서비스 이용의 필수 조건으로 한다.
- 사용자 식별자는 `auth.users.id`를 사용하고, `sessionId`는 인증 사용자 데이터 소유권에 사용하지 않는다.
- React는 Supabase Auth에 한해 Supabase를 직접 호출한다. 서비스 데이터는 Express API를 거친다.
- 조회·사용자 행동은 user JWT Client(RLS 적용), AI 파이프라인의 시스템 쓰기는 Secret Key Client + Service 계층 소유권 검증으로 처리한다.
- MVP AI Provider는 Claude, OpenAI, Gemini 3개다.
- 정책·DB 모델 초안 v2.1을 확정하고 `docs/domain-policy.md`, `docs/data-model.md`로 분할 반영했다.
- Consensus Agenda도 `selected_content`에 합의 내용을 저장한다.
- `chats.user_id`는 ON DELETE RESTRICT, Chat title은 첫 질문 앞 100자, `updated_at`은 DB Trigger 자동 갱신, DecisionNote는 저장 후 수정 불가.
- DecisionNote는 MVP에서 FinalAnswer 확정 직후 자동 요약으로 생성·저장한다. 사용자 편집 기능은 후속 버전으로 미룬다 (SPEC-UI-001 Step 8에서 결정, domain-policy 반영).
- 모델 표시 라벨은 ChatGPT로 통일한다(내부 provider 값은 `openai` 유지).
- 디자인 시스템으로 Astryx(`@astryxdesign`)를 도입한다. `docs/DESIGN.md`를 Astryx 기반으로 개정했다 (ADR-004).

## 미결정 사항

- 모든 Provider(Claude·OpenAI·Gemini)가 최초 요청과 1회 재시도에 모두 실패한 경우의 FinalAnswer 고정 문구와 DecisionNote 처리 — AI Provider Spec 작성 전에 확정
- 좌초 상태 복구 정책 — Manager AI 비교·재검토·FinalAnswer 생성 호출 실패 시 재시도 규칙, 버려진 `draft` Question 취소, 중단된 `processing` Question timeout 회수
- 단일 SourceAnswer 기반 Agenda 처리 방식과 `resolution_reason` — Manager AI Spec에서 구체화
- 사용자 계정 삭제 시 데이터 처리 정책

## 완료된 작업

- 개발 환경 설정 완료 (`docs/dev-setup.md` 14장)
- Mock 단일 화면(App.tsx)과 HTML 프로토타입 2종
- 인증·정책·DB 문서 체계 정비 (product / architecture / domain-policy / data-model / specs / decisions)

## 현재 작업

- SPEC-UI-001 확정 완료(Ready). 구현 단계 진입 (`docs/specs/SPEC-UI-001-mock-flow.md` 12장 Task 순서)
- T-001 기본 Workspace·Chat·Question UI 완료 (2026-07-16)
  - Astryx 0.1.6 설치 (`@astryxdesign/core`·`theme-neutral`·`cli`, React 19 호환 `react >=19.0.0` 확인)
  - 브랜드 테마 `apps/web/src/theme.ts` (defineTheme 토큰 오버라이드, DESIGN.md 4장 변수명 확정)
  - 3단 레이아웃, 빈 화면(인사+중앙 컴포저+예시 칩), 질문 전송(Chat 생성·제목 100자·draft→processing), Chat 목록 ● 표시·전환, 새 채팅 확인 팝업, 처리 중 컴포저 비활성("충돌 해결 중"), 우측 노트 패널(빈 상태+MD Zip 비활성 버튼)
  - typecheck/lint/build 통과, 브라우저 시나리오 확인 완료
- 모델 표시 라벨을 ChatGPT로 통일 반영 완료 (내부 provider 값은 `openai` 유지, DESIGN.md 4장 규칙).

## 다음 작업

- T-002 Question·SourceAnswer 상태 흐름 (Step 3: 로딩 말풍선 내 Provider 3줄 상태 표시, 시나리오 전환 Query String 포함)
