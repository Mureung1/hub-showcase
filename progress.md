# progress.md

현재 Sprint의 진행 상태를 기록한다. 완료된 Sprint 기록은 유지한다.

## Sprint 1 (2026-07-13 ~ 2026-07-17)

**목표** — 프로젝트 구조와 개발 기반, 콘텐츠 수집/저장 기반, 최소 하네스

### 진행 중

- [ ] #1 Supabase DB/Auth 검증
  - [x] Supabase 프로젝트 연결 및 상태 확인 (ACTIVE_HEALTHY, Postgres 17.6, ap-southeast-1)
  - [x] MVP 테이블 구조와 RLS 활성화 상태 확인 (8개 테이블, 전부 RLS 활성)
  - [x] RLS 정책 내용 확인 (공개 읽기 6개 / `user_id = auth.uid()` 2개)
  - [x] `article_assignments`, `reading_events` 제외 상태 확인
  - [x] Security Advisor 지적 사항 없음 확인
  - [x] 키 체계 결정 — publishable/secret 채택 (legacy anon/service_role 미사용)
  - [x] 검증 기준 문서화 (`docs/quality/supabase-db-auth.md`)
  - [x] 검증 스크립트 작성 (`scripts/verify_supabase.py`)
  - [ ] 검증 스크립트 실행하여 Anonymous Auth와 RLS 경계 확인
  - [ ] FastAPI에서 Supabase 읽기 연결 확인

### 완료

- [x] 프론트엔드/백엔드 분리 및 개발 환경 구성
- [x] AI 협업을 위한 하네스 엔지니어링 폴더 구조 구성
- [x] 공통 작업 규칙과 도구별 설정 경계 구성 (`AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, `.codex/`)
- [x] 개발·브랜치·커밋·검증 규칙 문서화 (`docs/DEVELOPMENT.md`)
- [x] 공통 환경변수 예시 작성 (`.env.example`)

### 다음 작업

- [ ] #1 Supabase DB/Auth 검증 완료 후 다음 Ready 이슈 착수

### 막힌 것

- 없음

## 다음 Sprint 이월

- 없음
