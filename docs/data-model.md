# 데이터 모델 설계 — TideNote

이번 주(2주차) 수직 슬라이스에 필요한 테이블과, 다음 주 이후 확장될 테이블을
구분해서 정리한다. 실제 생성은 목요일에 Supabase에서 진행한다.

## 이번 주 구현 대상

### `tide_checks`
사용자가 하루 최소 1회(또는 "Update your tide") 남기는 상태 체크인 기록.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigint (identity, PK) | 행 식별자 |
| `valence` | int (0~100) | "How are you feeling right now?" 슬라이더 값 (Cloudy↔Clear) |
| `arousal` | int (0~100) | "How awake do you feel right now?" 슬라이더 값 (Calm↔Rippling) |
| `created_at` | timestamptz | 기록 시각, 기본값 `now()` — 이 값이 곧 `D_recall`이 측정된 시점 |

정의: `server/tide_checks.sql` 참고.

> 지금은 로그인/사용자 구분이 없어서 `user_id` 컬럼을 넣지 않았다 — 이번 주
> 목표는 "슬라이더 → 저장 → 조회" 사이클 하나를 끝까지 잇는 것이지 멀티유저
> 지원이 아니기 때문. 인증을 붙이면 `user_id`(FK)를 추가해야 한다.

## 다음 주 이후 확장 대상 (지금은 만들지 않음)

TideNote의 나머지 기능(Episode Segmentation, Recall Module)을 구현하려면
아래 테이블이 필요해질 것으로 예상한다. 지금은 채팅 데이터 자체가 없어서
설계만 남겨두고 만들지 않는다.

### `episodes` (예정)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigint (PK) | episode 식별자 |
| `started_at` / `ended_at` | timestamptz | 이 episode에 속한 메시지들의 시간 범위 |
| `topic` | text | episode 요약 라벨 (예: "Self-doubt") |
| `d_gen` | float | 생성 시점 상태 — MEQ 기반 circadian trough로부터의 편차 |
| `summary` | text | 잠겼을 때 항상 보이는 한 줄 요약 (예: "2:14 AM, later than usual") |

### `messages` (예정)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | bigint (PK) | 메시지 식별자 |
| `episode_id` | bigint (FK → episodes.id) | 소속 episode |
| `role` | text | `user` 또는 `ai` |
| `content` | text | 메시지 원문 (verbatim text — 이 컬럼만 Recall Module이 조건부로 숨김) |
| `created_at` | timestamptz | 메시지 생성 시각 |

> `messages.content`를 숨기는 건 DB 레벨이 아니라 **조회 시점의 애플리케이션
> 로직**(`|D_gen − D_recall| > T` 판단)에서 처리한다 — 원문 자체는 항상 DB에
> 남아있고, "보여줄지 말지"만 매 요청마다 계산한다.
