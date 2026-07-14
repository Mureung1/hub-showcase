# 테스트 seed 데이터 기준

프론트를 만들려면 데이터가 있어야 한다. 현재 `interests` 21건 외에는 **전부 0행**이다.

| 테이블 | 현재 | seed 필요 |
| --- | --- | --- |
| `interests` | 21건 (실제 데이터) | 불필요 |
| `sources` | 0 | 필요 |
| `source_interests` | 0 | 필요 |
| `articles` | 0 | 필요 |
| `content_interest_tags` | 0 | 필요 |
| `debate_topics` | 0 | 선택 |
| `user_interests` | 0 | 불필요 (실행 중 생성) |
| `mission_records` | 0 | 불필요 (실행 중 생성) |

## 최소 기준

**"오늘의 글"이 빈 화면이 되지 않을 만큼만.**

- `sources` 3개 이상 (`source_type`이 서로 다르게: `news`, `official_blog`, `expert_article`)
- `articles` — **관심사당 최소 3건.** 1건이면 "오늘의 글 1~3개" 로직을 검증할 수 없다
- `content_interest_tags` — 모든 seed 글이 최소 1개 관심사에 태깅되어 있어야 한다. **태깅 없는 글은 아무에게도 안 보인다**
- `launch_status`가 `curated_only`인 관심사(시사이슈, 사회문제)에도 글이 있어야 한다. 없으면 `empty_state_message` 경로를 검증할 수 없다

## seed와 실제 수집 데이터 구분

**이걸 안 정하면 나중에 섞여서 지옥이 된다.**

`articles.metadata`가 `jsonb`이고 기본값이 `{}`다. 여기에 표시한다.

```json
{ "seed": true }
```

정리할 때:

```sql
delete from articles where metadata->>'seed' = 'true';
```

`sources`에는 `metadata` 컬럼이 없다. `name`에 접두사를 붙이거나(`[SEED] ...`), seed 전용 `source_id`를 고정 UUID로 박아둔다. **어느 쪽이든 정해서 `supabase/seed.sql`에 주석으로 남긴다.**

## 실행

```bash
supabase db reset          # 로컬 DB 초기화 + seed.sql 적용 (미구현)
```

원격 프로젝트에 직접 적용할 경우, **seed는 반드시 지울 수 있어야 한다.** 지우는 SQL을 `seed.sql` 하단에 주석으로 함께 적어둔다.

## 기대 결과

seed 적용 후:

```sql
select count(*) from sources;               -- 3 이상
select count(*) from articles;              -- 관심사 수 × 3 이상
select count(*) from content_interest_tags; -- articles 수 이상

-- 태깅 없는 글이 없어야 한다
select count(*) from articles a
where not exists (
  select 1 from content_interest_tags t where t.content_id = a.id
);
-- 기대: 0
```

**마지막 쿼리가 0이 아니면 그 글들은 화면에 절대 안 나온다.** seed를 넣고도 빈 화면이 나오는 가장 흔한 원인이다.

## 정리

```sql
delete from content_interest_tags
where content_id in (select id from articles where metadata->>'seed' = 'true');

delete from articles where metadata->>'seed' = 'true';
```

`sources`는 위에서 정한 구분 방식에 따라 지운다.
