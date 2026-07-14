# 핵심 플로우 QA — 관심사 선택

온보딩의 관심사 선택 플로우를 **같은 순서로 반복 확인**한다. 순서를 바꾸면 재현이 안 된다.

## 사전 조건

- 백엔드 실행 중 (`cd backend && uv run fastapi dev app/main.py`)
- 프론트 실행 중 (`cd frontend && npm run dev`)
- `interests` 21건 존재
- 브라우저 시크릿 창 (이전 세션이 남아 있으면 익명 세션 재생성이 안 된다)

시작 전 DB 상태를 확인한다.

```sql
select count(*) from auth.users;         -- 기록해둔다
select count(*) from user_interests;     -- 기록해둔다
```

---

## 1. 관심사 목록 표시

**실행** — 온보딩 화면 진입

**기대 결과**

- 관심사가 `displayOrder` 순으로 표시된다 (AI → IT·개발 → 커리어·취업 → …)
- **`launchStatus`가 `hidden` 또는 `preparing`인 관심사는 표시되지 않는다**
- 아무것도 선택되지 않은 상태로 시작한다
- 다음 버튼이 비활성 상태다

**실패 신호**

| 증상 | 원인 |
| --- | --- |
| 목록이 비어 있음 | 백엔드 미실행, 또는 Vite 프록시 미적용 (`/api` 호출이 5173으로 감) |
| 순서가 뒤죽박죽 | `.order("display_order")` 누락 |
| `hidden`/`preparing` 항목이 보임 | **현재 `GET /api/interests`는 필터링하지 않는다.** 프론트나 백엔드 중 한 곳에서 걸러야 한다 |
| 콘솔에 `display_order is undefined` | camelCase 변환 확인 (`displayOrder`여야 함) |

---

## 2. 선택과 해제

**실행** — 관심사 3개를 선택 → 그중 1개를 다시 눌러 해제 → 다른 1개 선택

**기대 결과**

- 선택된 항목에 선택 표시가 남는다
- 다시 누르면 해제된다
- 선택 개수가 화면에 반영된다 (예: "3개 선택")
- 선택 개수가 0이면 다음 버튼이 비활성

**실패 신호**

- 해제가 안 됨 → 토글이 아니라 추가만 하고 있음
- 같은 항목이 두 번 들어감 → 중복 제거 안 됨. **`user_interests`의 PK가 `(user_id, interest_id)`라 저장 시 에러가 난다**

---

## 3. 저장 (미구현 — `POST /api/user-interests` 필요)

**실행** — 관심사 3개 선택 후 "깸 시작하기"

**기대 결과**

- 익명 세션이 생성된다 (`auth.users`에 1행 증가, `is_anonymous = true`)
- `user_interests`에 **정확히 3행**, 전부 **내 `user_id`**로 저장된다
- 다음 화면으로 이동한다

```sql
select user_id, interest_id from user_interests order by created_at desc limit 5;
```

**실패 신호**

| 증상 | 원인 |
| --- | --- |
| 0행 저장 | RLS 차단. 사용자 JWT가 전달되지 않았다 → 백엔드가 `create_user_client()`를 쓰는지 확인 |
| 저장은 됐는데 `user_id`가 다름 | 세션의 uid가 아닌 값을 넣고 있다 |
| **RLS 없이도 저장됨** | 백엔드가 `create_admin_client()`를 쓰고 있다. **secret 키는 RLS를 우회한다.** 즉시 고쳐야 한다 |
| 중복 키 에러 | 같은 관심사를 두 번 보내고 있다 |

---

## 4. 경계 확인 (실패해야 정상)

**이 항목이 없으면 위의 확인은 전부 무의미하다.**

**실행 4-1** — 인증 없이 저장 요청

```bash
curl -X POST http://localhost:8000/api/user-interests \
  -H "Content-Type: application/json" \
  -d '{"interestIds": ["<아무 uuid>"]}'
```

**기대 결과** — `401`. 저장되지 않는다.

**실행 4-2** — 다른 사용자의 `user_id`로 저장 시도

시크릿 창 두 개로 익명 세션 A, B를 만든 뒤, B의 토큰으로 A의 `user_id`를 넣어 저장 요청.

**기대 결과** — 거부된다. `user_interests`에 A의 행이 생기지 않는다.

**실패 신호** — **저장에 성공하면 심각한 결함이다.** 백엔드가 RLS를 우회하고 있거나, `user_id`를 요청 본문에서 받고 있다. `user_id`는 **토큰에서만** 뽑아야 한다.

---

## 5. 정리

확인이 끝나면 테스트로 생성된 익명 유저와 데이터를 지운다.

```sql
delete from user_interests
where user_id in (select id from auth.users where is_anonymous);

delete from auth.users where is_anonymous;
```

사전 조건에서 기록해둔 개수로 돌아왔는지 확인한다.
