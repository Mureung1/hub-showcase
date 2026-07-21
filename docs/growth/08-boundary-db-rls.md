# 8. 인증 경계·DB·RLS — 서버가 신원을 정한다

로그인이 되니까 다음은 데이터였다. 사용자마다 자기 것만 보이게, 남의 건 절대 안 보이게 하는 것. 여기서 "프론트가 하는 말을 믿지 않는다"는 걸 몸으로 배웠다.

## ① 진행한 내용

- Express Auth Middleware 구축 — 프론트가 보낸 토큰을 Supabase로 검증하고 서버가 `req.auth.userId`를 결정. 위조 userId(몸통·쿼리)는 무시, 실제 위조 값 넣어도 검증된 토큰의 userId만 나오는 것 확인.
- PostgreSQL 마이그레이션 + 전 테이블 RLS — 계정 2개로 교차 차단 양방향 실측(A→B 0건, B→A 0건).
- 데이터 접근 클라이언트 2개로 분리 — 조회·사용자 쓰기는 사용자 토큰 클라이언트(RLS), AI 파이프라인 시스템 쓰기는 Secret Key 클라이언트(서버 소유권 확인 후에만).
- Chat·Question 실제 DB 저장, 사용자 AI 키는 AES-256-GCM 암호화 저장.

## ② 추가로 배운 개념

- JWT 검증(`getUser`), 인증 경계 미들웨어.
- RLS를 join(EXISTS)으로 소유권 확인하고, 하위 테이블에 user_id를 중복 저장하지 않기.
- 2-클라이언트 이중 방어 — RLS 한 겹, 서비스 계층의 소유권 검증 한 겹.
- AES-256-GCM(IV·인증 태그), 서버 시작할 때 환경변수를 검증해서 없으면 바로 죽게 하기.

## ③ 꼭 공부할 개념

- 서버 측 인증 경계(미들웨어)와 신뢰 경계
- JWT 검증으로 서버가 신원 결정, 클라이언트 입력 불신뢰
- RLS 이중 방어와 최소 권한 원칙
- 대칭키 암호화 AES-256-GCM(IV·인증 태그)과 키 관리

**학습 자료**

- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [OWASP — Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Node.js — Crypto (AES-GCM)](https://nodejs.org/api/crypto.html)

## ④ 참고 링크 — 직접 만든 문서

- `docs/specs/SPEC-AUTH-003-api-auth-middleware.md`
- `docs/specs/SPEC-DB-001-user-ownership-and-rls.md`
- `docs/decisions/ADR-002-data-access-clients.md`
