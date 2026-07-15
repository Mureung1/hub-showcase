create or replace function get_recommended_articles(p_user_id uuid, p_limit int default 3)
returns table (
  article_id uuid,
  title text,
  canonical_url text,
  interest_match_score numeric,
  recency_score numeric,
  source_quality_score numeric,
  source_repeat_penalty numeric,
  stance_repeat_penalty numeric,
  total_score numeric
)
language sql
stable
as $$
  with user_interest_ids as (
    select interest_id from user_interests where user_id = p_user_id
  ),
  recent_history as (
    select a.source_id, a.stance, a.debate_topic_id
    from mission_records mr
    join articles a on a.id = mr.article_id
    where mr.user_id = p_user_id
      and mr.created_at > now() - interval '14 days'
  ),
  candidates as (
    select
      a.id as article_id,
      a.title,
      a.canonical_url,
      a.source_id,
      a.stance,
      a.debate_topic_id,
      least(1.0, coalesce((
        select sum(cit.confidence)
        from content_interest_tags cit
        where cit.content_id = a.id
          and cit.interest_id in (select interest_id from user_interest_ids)
      ), 0)) as interest_match_score,
      case
        when a.published_at > now() - interval '2 days' then 1.0
        when a.published_at > now() - interval '7 days' then 0.5
        else 0.1
      end as recency_score,
      coalesce(s.source_quality_score, 0.5) as source_quality_score
    from articles a
    left join sources s on s.id = a.source_id
    where a.access_type in ('free', 'partial_free')
      and a.url_status = 'active'
      and a.quality_score >= 0.65
      and (s.trust_level is null or s.trust_level in ('high', 'medium'))
      and (s.default_exposure is null or s.default_exposure = 'primary')
      and not exists (
        select 1 from mission_records mr
        where mr.user_id = p_user_id and mr.article_id = a.id
      )
      and exists (
        select 1 from content_interest_tags cit
        where cit.content_id = a.id
          and cit.interest_id in (select interest_id from user_interest_ids)
      )
  )
  select
    c.article_id,
    c.title,
    c.canonical_url,
    c.interest_match_score,
    c.recency_score,
    c.source_quality_score,
    (
      (select count(*) from recent_history rh where rh.source_id = c.source_id) * -0.1
    )::numeric as source_repeat_penalty,
    (
      case
        when c.stance in ('pro', 'con') and c.debate_topic_id is not null and (
          select
            count(*) filter (where rh.stance = c.stance)::numeric
            / greatest(count(*) filter (where rh.stance in ('pro', 'con')), 1)
          from recent_history rh
          where rh.debate_topic_id = c.debate_topic_id
        ) >= 0.65 then -0.3
        else 0
      end
    )::numeric as stance_repeat_penalty,
    (
      c.interest_match_score
      + c.recency_score
      + c.source_quality_score
      + (select count(*) from recent_history rh where rh.source_id = c.source_id) * -0.1
      + case
          when c.stance in ('pro', 'con') and c.debate_topic_id is not null and (
            select
              count(*) filter (where rh.stance = c.stance)::numeric
              / greatest(count(*) filter (where rh.stance in ('pro', 'con')), 1)
            from recent_history rh
            where rh.debate_topic_id = c.debate_topic_id
          ) >= 0.65 then -0.3
          else 0
        end
    )::numeric as total_score
  from candidates c
  order by total_score desc
  limit p_limit;
$$;
