# 4. 정책 & DB 모델링 — 만들기 전에 상태를 다 그렸다

바로 화면부터 짜고 싶은 마음이 컸는데, 참았다. AI가 매번 다르게 구현하던 이유 중 하나가 상태랑 예외를 내가 안 정해줬기 때문이라, 이번엔 코드보다 그림을 먼저 그렸다.

## ① 진행한 내용

- 상태·전이 먼저 확정 — Agenda를 단방향 상태 머신으로: `draft → conflicted → (recheck_requested → reanswered) → passed / rejected`. Consensus면 바로 passed, 재검토는 Agenda당 1회, Provider 실패 시 1회 재시도 후 제외, 전부 rejected면 고정 문구 저장.
- DB를 종이에 먼저 설계 — 테이블 6개 + 사용자 AI 키 테이블(`user_provider_keys`), Enum, 외래키, RLS 방향, 값 부재 구분(`null` vs `NO_VALUE`)까지.
- 중요한 결정은 ADR로 근거 기록 — 왜 Supabase Auth인지, 왜 데이터 접근 클라이언트를 둘로 나누는지, 왜 Provider 3개인지, 왜 Astryx인지.

## ② 추가로 배운 개념

- 상태 머신과 단방향 전이. "이 상태에서 갈 수 있는 다음 상태"만 정해두니 예외가 선명해졌다.
- RLS(행 수준 보안), ERD와 외래키, 정규화 vs JSONB를 언제 쓰는지.
- `null`(값이 아직 없음)과 "의도적으로 없음"을 구분해야 한다는 것.
- `ON DELETE RESTRICT`/`CASCADE`, Partial Unique Index 같은 걸로 정책을 DB가 직접 강제하게 만드는 법.

## ③ 꼭 공부할 개념

- 상태 머신·스테이트차트(상태·전이·가드)
- 데이터 모델링·정규화, JSONB를 언제 쓰나
- PostgreSQL Row Level Security(RLS)
- 외래키 삭제 정책(RESTRICT/CASCADE), 제약으로 불변식 강제

**학습 자료**

- [statecharts.dev](https://statecharts.dev/) — 상태 머신·스테이트차트 입문
- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL — Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

## ④ 참고 링크 — 직접 만든 문서

- `docs/domain-policy.md`
- `docs/data-model.md`
- `docs/decisions/ADR-001~004`
