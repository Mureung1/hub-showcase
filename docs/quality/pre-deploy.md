# 배포 전 체크리스트

프론트엔드를 공개 배포하기 전에 확인한다. 개발 단계에서는 해당되지 않는 항목이 있으므로, 배포 시점에 전체를 다시 통과시킨다.

## Anonymous Auth 남용 방지

개발 중에는 프로젝트가 Private이고 publishable 키가 외부에 노출되지 않아 위험이 없다. **배포하는 순간 publishable 키가 브라우저에 공개되므로, 아래를 먼저 처리한다.**

- [ ] **CAPTCHA 활성화** — Cloudflare Turnstile 또는 invisible CAPTCHA. 공식 문서가 익명 가입 남용 방지를 위해 강하게 권고한다.
- [ ] **Auth rate limit 확인** — 익명 가입 기본값은 IP당 시간당 30건이다. 필요하면 대시보드에서 낮춘다.
- [ ] **오래된 익명 유저 정리 방법 마련** — Supabase는 자동 정리를 하지 않는다.

```sql
delete from auth.users
where is_anonymous is true and created_at < now() - interval '30 days';
```

- [ ] **MAU 사용량 확인** — 익명 유저도 MAU로 집계된다. Free 플랜 쿼터는 5만 MAU다.

## RLS

- [ ] `docs/quality/supabase-db-auth.md` 전체 통과 (`uv run scripts/verify_supabase.py`)
- [ ] **`to authenticated` 정책을 쓴 곳이 있는지 확인.** 익명 유저는 `anon`이 아니라 **`authenticated` 역할**이므로 그대로 통과한다. 정식 유저만 허용해야 하는 동작이 있다면 `is_anonymous` 클레임을 검사하는 restrictive 정책을 추가한다.
- [ ] Security Advisor 지적 사항 없음

## 키

- [ ] 프론트엔드 번들에 `sb_secret_...`이 포함되지 않았는지 확인 (빌드 산출물 검색)
- [ ] 배포 환경변수에 `VITE_SUPABASE_PUBLISHABLE_KEY`만 설정되어 있는지 확인
- [ ] legacy `anon` / `service_role` 키를 사용하는 코드가 없는지 확인

## 빌드

- [ ] `cd frontend && npm run typecheck` 통과
- [ ] `cd frontend && npm run lint` 통과
- [ ] `cd frontend && npm run build` 성공
