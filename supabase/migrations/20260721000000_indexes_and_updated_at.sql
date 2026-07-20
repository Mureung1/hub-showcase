-- 인덱스와 updated_at 자동 갱신 처리
-- 기준 문서: docs/db-schema.md (6. 권장 인덱스)

-- 6. 권장 인덱스
create index idx_profiles_role on profiles (role);
create index idx_mentor_profiles_major on mentor_profiles (major);
create index idx_mentor_profiles_academic_status on mentor_profiles (academic_status);
create index idx_mentor_profiles_research_fields on mentor_profiles using gin (research_fields);
create index idx_mentor_profiles_counseling_fields on mentor_profiles using gin (counseling_fields);
create index idx_applications_mentee_status_created_at
  on applications (mentee_id, status, created_at desc);
create index idx_application_mentors_mentor_status_created_at
  on application_mentors (mentor_id, status, created_at desc);
create index idx_meetings_mentor_scheduled_at
  on meetings (mentor_id, scheduled_at);

-- updated_at 자동 갱신
create function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on profiles
  for each row execute function set_updated_at();

create trigger set_updated_at before update on mentee_profiles
  for each row execute function set_updated_at();

create trigger set_updated_at before update on mentor_profiles
  for each row execute function set_updated_at();

create trigger set_updated_at before update on applications
  for each row execute function set_updated_at();

create trigger set_updated_at before update on meetings
  for each row execute function set_updated_at();
