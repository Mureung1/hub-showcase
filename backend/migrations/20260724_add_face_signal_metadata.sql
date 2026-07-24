begin;

alter table public.emotion_analyses
  add column if not exists face_signal_source text not null default 'manual',
  add column if not exists face_signal_confidence numeric(4, 3),
  add column if not exists face_signal_evidence jsonb not null default '[]'::jsonb,
  add column if not exists face_signal_heuristic_version text;

alter table public.emotion_analyses
  drop constraint if exists emotion_analyses_face_signal_source_check,
  drop constraint if exists emotion_analyses_face_signal_confidence_check,
  drop constraint if exists emotion_analyses_face_signal_evidence_check,
  drop constraint if exists emotion_analyses_face_signal_metadata_check;

alter table public.emotion_analyses
  add constraint emotion_analyses_face_signal_source_check
    check (face_signal_source in ('manual', 'camera')),
  add constraint emotion_analyses_face_signal_confidence_check
    check (face_signal_confidence is null or face_signal_confidence between 0 and 1),
  add constraint emotion_analyses_face_signal_evidence_check
    check (
      jsonb_typeof(face_signal_evidence) = 'array'
      and jsonb_array_length(face_signal_evidence) <= 3
    ),
  add constraint emotion_analyses_face_signal_metadata_check
    check (
      (
        face_signal_source = 'manual'
        and face_signal_confidence is null
        and face_signal_evidence = '[]'::jsonb
        and face_signal_heuristic_version is null
      )
      or
      (
        face_signal_source = 'camera'
        and face_signal_confidence is not null
        and face_signal_heuristic_version ~ '^v[0-9]+$'
      )
    );

comment on column public.emotion_analyses.face_signal_confidence is
  '프로토타입 휴리스틱으로 안정화한 얼굴 표현 신호 유사도이며 감정 정확도가 아님';
comment on column public.emotion_analyses.face_signal_evidence is
  '서버에 허용된 주요 blendshape 특징 이름만 최대 3개 저장';

commit;
