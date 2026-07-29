# DB Schema

## quest_logs

Recommended database: Supabase Postgres.

Fields:

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `user_id` | uuid nullable | future auth link |
| `anonymous_session_id` | text nullable | MVP anonymous session |
| `quest_id` | uuid nullable | future quest table link |
| `event_type` | text | `quest_completed`, `quest_failed`, `recovery_completed`, etc. |
| `title` | text | quest title at event time |
| `quest_type` | text | `time`, `quantity`, `action` |
| `amount` | integer | quest amount |
| `unit` | text | display unit |
| `difficulty` | text | `easy`, `normal`, `hard` |
| `deadline_at` | timestamptz nullable | quest deadline |
| `result` | text nullable | `success`, `failed`, `recovery`; nullable for non-result events |
| `exp_delta` | integer | EXP change from event |
| `failure_reason` | text nullable | selected failure reason |
| `previous_quest_title` | text nullable | recovery context |
| `recovery_from_event_id` | uuid nullable | future self-reference |
| `manager_mood_after` | text nullable | manager state after event |
| `manager_line` | text nullable | manager reaction text used to summarize the event |
| `client_created_at` | timestamptz nullable | client event time |
| `created_at` | timestamptz | server insert time, default `now()` |
| `visibility` | text | default `private` |
| `event_version` | integer | default `1` |
| `metadata` | jsonb | extension data |

Indexes to add with the real migration:

- `created_at desc`
- `(user_id, created_at desc)`
- `(anonymous_session_id, created_at desc)`
- `(result, created_at desc)`
- `(event_type, created_at desc)`

Data API grants used for local Supabase verification:

```sql
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.quest_logs to service_role;
```

Expansion notes:

- Weekly reports can aggregate by `created_at`, `result`, `exp_delta`, and `failure_reason`.
- Manager memory can summarize from private logs instead of storing prompts.
- Public quest exploration must keep `visibility` defaulted to `private`.
- Camera or gesture features should store settings or consent versions only, not raw frames.

## Normalization Plan For Remaining Features

`quest_logs`는 현재 수직 슬라이스의 중심 이벤트 테이블이다. 남은 기능을 모두 고려하면 `metadata`는 임시 확장 영역으로만 사용하고, 반복 조회, 권한 제어, 사용자 설정, 보상 인벤토리처럼 독립 수명이 있는 데이터는 단계적으로 별도 테이블로 승격한다.

| Phase | Table or view | Why | Candidate columns | Related tasks |
|---|---|---|---|---|
| 1 | `user_profiles` | 프로필, 목표, 선호 퀘스트 크기, 매니저 톤을 저장 | `id`, `nickname`, `primary_goal`, `category`, `minimum_minutes`, `quest_size`, `manager_tone`, `created_at`, `updated_at` | T-709, T-711 |
| 1 | `manager_personas` | LLM 매니저가 사용할 제한된 Persona와 rule fallback을 저장 | `id`, `profile_id`, `pet_id`, `behavior_style`, `tone`, `voice_id`, `prompt_guardrails`, `created_at`, `updated_at` | T-709, T-711, T-713 |
| 2 | `user_stats` | Quest Event metadata에서 능력치 증가를 반복 조회 가능한 값으로 승격 | `id`, `profile_id`, `stat_key`, `value`, `updated_at` | T-712 |
| 2 | `reward_inventory` | 보상, 테마, sound, accessory 해금 상태를 관리 | `id`, `profile_id`, `reward_id`, `reward_type`, `source_event_id`, `unlocked_at`, `equipped_at` | T-703, T-707 |
| 2 | `pet_appearance_settings` | 해금된 stage 중 사용자가 선택한 외형 회귀 상태를 저장 | `id`, `profile_id`, `pet_id`, `selected_stage`, `unlocked_stages`, `updated_at` | T-703, T-717 |
| 3 | `memory_fragments` | 완료/복구 이벤트를 기억 조각으로 표시 | `id`, `profile_id`, `source_event_id`, `fragment_type`, `title`, `asset_id`, `created_at` | T-706 |
| 3 | `theme_unlocks` | 배경/창 테마 해금과 장착을 관리 | `id`, `profile_id`, `theme_id`, `theme_type`, `source_event_id`, `equipped`, `unlocked_at` | T-704, T-705, T-708 |
| 4 | `public_quest_shards` view | 공개 퀘스트 탐색은 private 기본값을 유지한 익명 view로 제공 | `quest_log_id`, `title`, `quest_type`, `difficulty`, `created_at`, `motif` | T-722 |
| 4 | `device_preferences` | webcam, gesture, projection, sound consent와 fallback 설정 저장 | `id`, `profile_id`, `camera_consent_version`, `gesture_enabled`, `sound_enabled`, `projection_mode_enabled`, `updated_at` | T-713, T-721, T-723, T-724 |

## Normalization Rules

- `quest_logs.metadata`에 한 번만 쓰이고 조회하지 않는 값은 그대로 둔다.
- 여러 화면에서 반복 조회하거나 정렬/필터링할 값은 별도 컬럼 또는 별도 테이블로 승격한다.
- LLM prompt 원문을 장기 저장하지 않는다. 대신 `ManagerContext`, event summary, persona setting을 저장하고, 필요 시 최종 출력에 대한 `promptVersion`, `source`, `fallbackReason` 같은 최소 metadata만 남긴다.
- webcam frame, raw gesture frame, audio recording은 DB에 저장하지 않는다.
- public 기능은 `visibility = 'anonymous_public'`인 이벤트만 별도 view로 노출한다.
- Supabase RLS는 user auth를 붙이는 시점에 `profile_id` 또는 `user_id` 기준으로 작성한다.
