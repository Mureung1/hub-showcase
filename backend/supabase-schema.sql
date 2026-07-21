begin;

create table public.emotion_analyses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  situation_text text not null,
  face_signal text not null,
  voice_signal text not null,
  selected_scenario text not null,
  analysis_result jsonb not null,
  ai_response text not null,
  created_at timestamptz not null default now(),

  constraint emotion_analyses_situation_text_length_check
    check (char_length(btrim(situation_text)) between 1 and 500),
  constraint emotion_analyses_face_signal_check
    check (face_signal in ('neutral', 'smile', 'tense', 'downcast', 'angry')),
  constraint emotion_analyses_voice_signal_check
    check (voice_signal in ('normal', 'fast', 'low', 'strong', 'bright')),
  constraint emotion_analyses_selected_scenario_check
    check (selected_scenario in ('normal', 'tension', 'tired')),
  constraint emotion_analyses_analysis_result_object_check
    check (jsonb_typeof(analysis_result) = 'object'),
  constraint emotion_analyses_ai_response_not_blank_check
    check (char_length(btrim(ai_response)) > 0)
);

create index emotion_analyses_session_created_at_idx
  on public.emotion_analyses (session_id, created_at desc);

alter table public.emotion_analyses enable row level security;

revoke all on table public.emotion_analyses from anon, authenticated;
grant select, insert on table public.emotion_analyses to service_role;

comment on table public.emotion_analyses is
  'Express 서버를 통해 저장하고 조회하는 감정 분석 기록';
comment on column public.emotion_analyses.session_id is
  '로그인 도입 전 브라우저별 기록을 구분하는 UUID';
comment on column public.emotion_analyses.analysis_result is
  '감정 점수, 상태 가능성, 판단 근거와 대응 방식을 포함한 JSON 객체';

commit;
