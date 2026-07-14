# Supabase DB/Auth 검증 기준

이슈 #1의 완료 기준이다. Supabase 스키마나 RLS 정책을 바꾼 뒤에는 이 기준을 다시 통과시킨다.

자동 검증: `uv run scripts/verify_supabase.py`

## 프로젝트

- [ ] 프로젝트 상태가 `ACTIVE_HEALTHY`
- [ ] Postgres 17
- [ ] Security Advisor 지적 사항 없음

## 테이블

MVP에 필요한 8개 테이블이 존재하고, 전부 RLS가 활성화되어 있다.

| 테이블 | 성격 | RLS 정책 |
| --- | --- | --- |
| `interests` | 공개 마스터 | 공개 읽기 (SELECT) |
| `sources` | 공개 마스터 | 공개 읽기 (SELECT) |
| `source_interests` | 공개 마스터 | 공개 읽기 (SELECT) |
| `articles` | 공개 콘텐츠 | 공개 읽기 (SELECT) |
| `content_interest_tags` | 공개 콘텐츠 | 공개 읽기 (SELECT) |
| `debate_topics` | 공개 콘텐츠 | 공개 읽기 (SELECT) |
| `user_interests` | 사용자 데이터 | `user_id = auth.uid()` (ALL) |
| `mission_records` | 사용자 데이터 | `user_id = auth.uid()` (ALL) |

- [ ] 위 8개 테이블이 존재한다
- [ ] `article_assignments`, `reading_events`는 MVP 범위에서 제외되어 존재하지 않는다
- [ ] 모든 테이블에 RLS가 활성화되어 있다
- [ ] **RLS가 켜져 있는 것과 정책이 올바른 것은 다르다.** 정책 내용까지 확인한다

## Auth

- [ ] Anonymous sign-ins가 활성화되어 있다
- [ ] 익명 세션이 실제로 생성된다
- [ ] 생성된 유저의 `is_anonymous`가 `true`다

익명 유저는 `anon`이 아니라 **`authenticated` 역할**을 가진다. 따라서 `auth.uid()` 기반 RLS 정책이 익명 유저에게도 그대로 적용된다.

## RLS 경계

- [ ] 익명 유저 A가 본인 `user_id`로 `user_interests`에 INSERT할 수 있다
- [ ] 익명 유저 A가 본인 데이터를 조회할 수 있다
- [ ] 익명 유저 B는 A의 데이터를 조회할 수 없다
- [ ] 익명 유저 B가 A의 `user_id`로 INSERT하면 차단된다 (WITH CHECK)

## 키 경계

- [ ] `frontend/.env`에는 `VITE_SUPABASE_PUBLISHABLE_KEY`만 있다. secret 키가 없다
- [ ] legacy `anon` / `service_role` 키를 코드에서 사용하지 않는다
- [ ] secret 키를 브라우저 User-Agent로 사용하면 401이 반환된다
- [ ] git 추적 파일에 실제 secret 키 문자열이 없다

```bash
git grep -i "sb_secret_[A-Za-z0-9]" -- . ':!scripts/'   # 결과가 없어야 한다
git ls-files | grep -E "^\.env$|/\.env$"                # 결과가 없어야 한다
```

`sb_secret_...` 키는 **RLS를 우회한다.**

## 백엔드 연결

FastAPI가 Supabase에 접근하는 유일한 지점은 `app/db/supabase.py`다.

| 클라이언트 | 키 | RLS | 용도 |
| --- | --- | --- | --- |
| `create_admin_client()` | secret | **우회** | 사용자와 무관한 배치 (RSS 수집, 콘텐츠 저장) |
| `create_user_client(token)` | publishable + 사용자 JWT | **적용** | 사용자 데이터 (`user_interests`, `mission_records`) |

- [ ] 사용자 데이터를 다루는 코드가 `create_admin_client()`를 쓰고 있지 않다
- [ ] `GET /api/interests`가 21건을 `displayOrder` 순으로 반환한다
- [ ] `GET /api/health`가 `{"status":"ok"}`를 반환한다 (회귀)
- [ ] `/docs`에 모든 라우터가 등록되어 있다 (회귀)
