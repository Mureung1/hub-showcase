# ADR-002: 데이터 접근 클라이언트 분리 (user JWT vs Secret Key)

- 상태: Accepted
- 날짜: 2026-07-16

## 배경

SourceAnswer·Agenda·FinalAnswer는 사용자가 아니라 Express의 AI 파이프라인이 저장한다. AI 호출은 요청 수명보다 길어질 수 있어 사용자 JWT를 보관해 시스템 쓰기에 쓰는 것은 만료·보안 위험이 있다. 반대로 모든 접근을 Secret Key로 처리하면 RLS가 무력화된다.

## 결정

- 조회와 사용자 행동에 의한 쓰기는 사용자 JWT를 전달한 Supabase Client로 처리하며 RLS가 적용된다.
- AI 파이프라인의 시스템 쓰기(SourceAnswer·Agenda·FinalAnswer 저장과 상태 갱신)는 Secret Key Client로 처리한다.
- Secret Key Client의 시스템 쓰기는 Service 계층에서 검증된 JWT의 userId로 대상 Chat·Question의 소유권을 확인한 뒤에만 수행한다.
- Secret Key 사용 범위는 위 시스템 쓰기 목록 밖으로 확장하지 않는다 (`docs/dev-setup.md` 규칙과 정합).
- 하위 테이블에 `user_id`를 중복 저장하지 않으며, RLS Policy는 `chats.user_id`까지의 join 경로(EXISTS)로 소유권을 검사한다.
- 계정 삭제 정책이 확정되기 전까지 `chats.user_id`는 `ON DELETE RESTRICT`로 둔다.

## 결과

- RLS는 사용자 경로의 방어선, Service 소유권 검증은 시스템 쓰기의 방어선이 된다(이중 방어).
- join 기반 RLS 비용은 사용자 조회 경로에만 발생하며 MVP 규모에서 수용 가능하다. 조회 성능 문제가 생기면 `user_id` 비정규화를 재검토한다.
