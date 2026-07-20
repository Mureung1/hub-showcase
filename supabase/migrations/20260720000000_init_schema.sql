-- MentorING 초기 스키마
-- 기준 문서: docs/db-schema.md
-- 인증 계정은 Supabase Auth(auth.users)가 관리하므로 여기서는 생성하지 않는다.

create extension if not exists pgcrypto;

-- 4.2 profiles: 모든 사용자의 공통 서비스 정보
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('mentee', 'mentor')),
  name text not null,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4.3 mentee_profiles: 멘티 전용 학적 정보
create table mentee_profiles (
  user_id uuid primary key references profiles (id) on delete cascade,
  school text not null,
  major text not null,
  grade text not null,
  enrollment_status text not null check (
    enrollment_status in ('enrolled', 'leave', 'graduated', 'other')
  ),
  updated_at timestamptz not null default now()
);

-- 4.4 mentor_profiles: 멘토 전체 프로필
create table mentor_profiles (
  user_id uuid primary key references profiles (id) on delete cascade,
  school text not null,
  major text not null,
  academic_status text not null,
  program text not null,
  lab text not null,
  introduction text not null,
  detailed_introduction text not null,
  research_fields text[] not null default '{}',
  counseling_fields text[] not null default '{}',
  career_highlights text[] not null default '{}',
  international_activities text[] not null default '{}',
  available_time text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_highlights_length check (
    coalesce(array_length(career_highlights, 1), 0) between 1 and 5
  ),
  constraint international_activities_length check (
    coalesce(array_length(international_activities, 1), 0) between 1 and 5
  )
);

-- 4.5 applications: 사전 질문지 + 신청 전체 상태
create table applications (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references mentee_profiles (user_id) on delete restrict,
  introduction text not null,
  concern text not null,
  goal text not null,
  preferred_time text not null,
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'completed', 'rejected')
  ),
  accepted_mentor_id uuid references mentor_profiles (user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accepted_mentor_required_when_active check (
    (status not in ('confirmed', 'completed') and accepted_mentor_id is null)
    or (status in ('confirmed', 'completed') and accepted_mentor_id is not null)
  )
);

-- 4.6 application_mentors: 신청과 대상 멘토(최대 3명) 연결
create table application_mentors (
  application_id uuid not null references applications (id) on delete cascade,
  mentor_id uuid not null references mentor_profiles (user_id) on delete restrict,
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'completed', 'rejected')
  ),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (application_id, mentor_id)
);

-- 4.7 meetings: 확정된 면담 정보
create table meetings (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references applications (id) on delete cascade,
  mentor_id uuid not null references mentor_profiles (user_id) on delete restrict,
  scheduled_at timestamptz not null,
  place text not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
