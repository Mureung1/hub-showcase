begin;

alter table public.emotion_analyses
  alter column face_signal drop not null;

alter table public.emotion_analyses
  drop constraint if exists emotion_analyses_face_signal_check;

update public.emotion_analyses
set face_signal = null
where face_signal_source = 'camera';

alter table public.emotion_analyses
  add constraint emotion_analyses_face_signal_check
    check (
      (
        face_signal_source = 'manual'
        and face_signal in ('neutral', 'smile', 'tense', 'downcast', 'angry')
      )
      or
      (
        face_signal_source = 'camera'
        and face_signal is null
      )
    ) not valid;

alter table public.emotion_analyses
  validate constraint emotion_analyses_face_signal_check;

comment on column public.emotion_analyses.face_signal is
  '수동 선택값만 저장하며 카메라 입력은 감정형 대표값을 저장하지 않음';

commit;
