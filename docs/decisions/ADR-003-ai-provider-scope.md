# ADR-003: MVP AI Provider 범위와 실패 정책

- 상태: Accepted
- 날짜: 2026-07-16

## 배경

초기 계획은 Claude·OpenAI 2개로 시작하고 Gemini는 후순위였다. 가치 구조 문서(Epic 1)가 3개 AI 동시 비교를 핵심 가치로 정의하고 있어 Provider 범위를 확정할 필요가 있었다.

## 결정

- MVP Provider는 `claude`, `openai`, `gemini` 3개로 하고 `ai_provider` Enum으로 관리한다.
- Question당 Provider별 SourceAnswer 1개를 사용한다. `UNIQUE (question_id, provider)`.
- Provider 호출 실패 시 1회만 재시도하고, 재시도 실패 시 비교에서 제외한다(`excluded_from_comparison`).
- 정확히 하나의 Provider만 성공하면 `single_source_fallback`, 두 개 이상 성공하면 `multi_source`로 FinalAnswer를 생성한다.
- 모든 Provider가 최종 실패한 경우의 처리는 미결정이다 (`docs/status.md` 참조).

## 결과

- Manager AI 비교와 FinalAnswer는 성공한 SourceAnswer만 근거로 사용하며, 제외 사실을 사용자에게 표시한다.
- Provider를 더 추가할 경우 Enum 확장 또는 Provider 테이블 전환을 검토한다.
