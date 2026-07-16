# 하네스 (docs/quality)

구현이 "끝났다"고 판단하는 기준을 모아둔 곳이다. 기준은 **구현 전에** 쓴다. 구현 후에 쓰면 만든 사람이 이미 아는 내용을 적는 것뿐이다.

## 원칙

**검증의 기준은 하나다 — 틀렸다면 반드시 실패했을 것인가.**

틀려도 통과하는 확인은 검증이 아니다. 예를 들어 "RLS가 활성화되어 있다"는 확인은 정책이 `using (true)`여도 통과한다. 유저 두 명을 만들어서 서로 못 보는지 확인해야 검증이다.

그래서 모든 체크리스트에는 **실패해야 정상인 항목**이 있어야 한다. 성공 케이스만 있으면 검증한 척이다.

각 항목은 세 가지를 적는다.

- **실행** — 무엇을 어떤 순서로 하는가
- **기대 결과** — 무엇이 나와야 하는가
- **실패 신호** — 틀렸을 때 어떻게 보이는가, 어디를 봐야 하는가

## 문서

| 문서 | 언제 실행 | 자동화 |
| --- | --- | --- |
| `supabase-db-auth.md` | 스키마·RLS 정책 변경 후 | `uv run scripts/verify_supabase.py` |
| `api-smoke.md` | 백엔드 변경 후 | `uv run scripts/smoke_api.py` |
| `core-flow.md` | 화면/API 변경 후, 머지 전 | 수동 |
| `rss-dry-run.md` | 수집기 변경 후, 실제 수집 전 | 수집기 dry-run 모드 |
| `seed-data.md` | 로컬 환경 초기화 시 | `supabase/seed.sql` |
| `pre-deploy.md` | 공개 배포 전 | 수동 |

검증 스크립트는 PEP 723 독립 스크립트다. 백엔드 의존성에 섞지 않는다.

## 현재 구현 상태

기준 문서는 미구현 기능도 포함한다. 구현 여부는 아래에서 확인한다.

| 대상 | 상태 |
| --- | --- |
| `GET /api/health` | 구현됨 |
| `GET /api/interests` | 구현됨 |
| `GET /api/user-interests` | 구현됨 |
| `POST /api/user-interests` (`replace_user_interests` RPC) | 구현됨 |
| `GET /api/articles/today` (`get_recommended_articles` RPC) | 구현됨 |
| 관심사 선택 화면 | 구현됨 |
| 오늘의 깸 카드 화면 | 구현됨 |
| RSS 수집기 | 구현됨 |
| seed 데이터 | 부분 구현 — `interests`는 migration으로 존재. source seed(`supabase/seeds/`)는 원격에만 수동 적용되며 local `supabase db reset`에는 자동 반영되지 않는다 |
