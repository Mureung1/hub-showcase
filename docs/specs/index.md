# Spec 목록과 개발 순서

> 각 Spec은 `docs/domain-policy.md`와 `docs/data-model.md`를 기준으로 작성한다.
> Spec 완료·범위 변경 시 `docs/status.md`를 갱신한다.

## 개발 순서

```text
1. Mock 프론트엔드 Spec
2. Question·SourceAnswer·Agenda Zod Schema Spec
3. Agenda 상태 전이 Spec
4. Supabase Auth 및 필수 이메일 인증 Spec
5. AI Provider API Spec
6. Manager AI 비교 및 재검토 Prompt Spec
7. FinalAnswer 생성 Spec
8. Supabase DB·RLS·Migration Spec
9. DecisionNote 저장 및 Export Spec
```

## 예정 Spec 파일

| Spec | 파일명(예정) | 상태 |
|---|---|---|
| Mock 프론트엔드 핵심 흐름 | `SPEC-UI-001-mock-flow.md` | 완료 (2026-07-18) |
| 공통 Zod Schema 계약 | `SPEC-SCHEMA-001-core-contracts.md` | 완료 (2026-07-18, T-011) |
| Agenda 상태 전이 | `SPEC-DOMAIN-001-agenda-transitions.md` | 미작성 |
| 회원가입·로그인 UI | `SPEC-AUTH-001-email-auth-ui.md` | Ready (구현 대기 — T-012) |
| Auth Session·Protected Route | `SPEC-AUTH-002-auth-session.md` | 미작성 |
| Express Auth Middleware | `SPEC-AUTH-003-api-auth-middleware.md` | 미작성 |
| AI Provider API | `SPEC-AI-001-providers.md` | 미작성 |
| Manager AI 비교·재검토 Prompt | `SPEC-AI-002-manager.md` | 미작성 |
| FinalAnswer 생성 | `SPEC-AI-003-final-answer.md` | 미작성 |
| 사용자 소유권·RLS·Migration | `SPEC-DB-001-user-ownership-and-rls.md` | 미작성 |
| DecisionNote 저장·Export | `SPEC-EXPORT-001-notes-and-zip.md` | 미작성 |
| 비밀번호 재설정 (Should) | `SPEC-AUTH-004-password-reset.md` | 보류 |

## Spec 작성 시 고정 요구사항

- `structured_content`의 Zod Schema는 각 Section에 안정적인 `sectionId` 필수 필드를 포함한다 (`docs/domain-policy.md` Agenda 근거 추적).
- Mock Data와 실제 API 응답은 같은 Zod Schema를 만족해야 한다.
