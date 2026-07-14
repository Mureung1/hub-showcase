# 테스트 seed 데이터 기준

seed의 목적은 **데이터를 채우는 것이 아니라 검증 가능한 상태를 만드는 것**이다.

현재 `interests` 21건 외에는 전부 0행이다.

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

## 몇 건을 만들 것인가 — 검증 목적에서 역산한다

기획의 "오늘의 글 **1~3개**"에는 코드 경로가 셋 있다.

```
관심사에 글이 3개 이상  →  3개까지만 보여준다      [상한 로직]
관심사에 글이 1~2개     →  있는 만큼만 보여준다     [부족 로직]
관심사에 글이 0개       →  empty_state_message     [빈 상태 로직]
```

**seed의 임무는 이 세 경로를 전부 밟게 만드는 것이다.** 모든 관심사에 글을 균등하게 뿌리면 양이 많아도 경로 하나만 밟는다. 통과해도 아무것도 증명하지 못한다.

### 배치 (고정)

| 관심사 | `launch_status` | 글 수 | 이 배치가 증명하는 것 |
| --- | --- | ---: | --- |
| **AI** | `active` | **4건** | 3개까지만 나오는가. **4번째가 제외되는가** |
| **심리** | `active` | **1건** | 1개만 있으면 1개만 나오는가 (에러 없이) |
| **시사이슈** | `curated_only` | **0건** | `empty_state_message` 경로가 뜨는가 |

**총 5건.**

AI를 3건이 아니라 **4건**으로 두는 이유 — 3건이면 "3개까지 보여준다"와 "전부 보여준다"가 결과가 같아서 **상한이 실제로 작동하는지 구분되지 않는다.**

**이 배치를 `seed.sql`에 그대로 고정한다.** 관심사 이름을 바꾸면 검증이 재현되지 않는다.

### sources

- 3개 이상. `source_type`을 서로 다르게 (`news`, `official_blog`, `expert_article`)
- `source_interests`로 위 관심사에 연결

### content_interest_tags

- **모든 seed 글이 최소 1개 관심사에 태깅되어 있어야 한다**
- 태깅 없는 글은 **어떤 사용자에게도 노출되지 않는다.** DB에는 있는데 화면엔 절대 안 나온다

## 저작권

**원문 본문을 저장하지 않는다.** 제목, `canonical_url`, `official_excerpt`(공식 발췌), 메타데이터만 쓴다. seed도 실수집도 동일하다.

`articles`에 본문 컬럼이 없고 `official_excerpt`만 있는 것이 이 설계 의도다.

## seed와 실제 수집 데이터 구분

**이걸 안 정하면 나중에 섞여서 구분할 방법이 없다.**

`articles.metadata`가 `jsonb`이고 기본값이 `{}`다. 여기에 표시한다.

```json
{ "seed": true }
```

`sources`에는 `metadata` 컬럼이 없다. **`name`에 `[SEED]` 접두사를 붙인다.**

## 실행

```bash
supabase db reset          # 로컬 DB 초기화 + seed.sql 적용 (미구현)
```

원격 프로젝트에 직접 적용할 경우, **seed는 반드시 지울 수 있어야 한다.** 지우는 SQL을 `seed.sql` 하단에 주석으로 함께 적어둔다.

## 기대 결과

seed 적용 후:

```sql
-- 관심사별 글 수가 의도한 배치와 같은가
select i.name, count(t.content_id) as articles
from interests i
left join content_interest_tags t on t.interest_id = i.id
where i.name in ('AI', '심리', '시사이슈')
group by i.name;
-- 기대: AI=4, 심리=1, 시사이슈=0

-- 태깅 없는 글이 없어야 한다
select count(*) from articles a
where not exists (
  select 1 from content_interest_tags t where t.content_id = a.id
);
-- 기대: 0
```

**마지막 쿼리가 0이 아니면 그 글들은 화면에 절대 안 나온다.** seed를 넣고도 빈 화면이 나오는 가장 흔한 원인이다.

## 정리

FK 때문에 순서가 중요하다. **자식 테이블부터 지운다.**

```sql
delete from content_interest_tags
where content_id in (select id from articles where metadata->>'seed' = 'true');

delete from articles where metadata->>'seed' = 'true';

delete from source_interests
where source_id in (select id from sources where name like '[SEED]%');

delete from sources where name like '[SEED]%';
```

**확인** — 정리 후 각 테이블 행 수가 seed 적용 전으로 돌아왔는지 본다.
