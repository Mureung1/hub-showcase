delete from public.tasks;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  workspace_owner_id uuid not null references auth.users(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  initial text not null,
  role text not null,
  description text not null default '',
  avatar_url text,
  color text not null default '#3a6898',
  is_ai boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_name_length_check check (char_length(btrim(name)) between 1 and 80),
  constraint members_initial_length_check check (char_length(initial) between 1 and 4),
  constraint members_role_length_check check (char_length(btrim(role)) between 1 and 120),
  constraint members_description_length_check check (char_length(description) <= 500),
  constraint members_owner_auth_user_unique unique (workspace_owner_id, auth_user_id),
  constraint members_linked_user_check check (auth_user_id is null or auth_user_id = workspace_owner_id)
);

create index members_workspace_owner_idx on public.members (workspace_owner_id, created_at);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'in_progress',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_length_check check (char_length(btrim(name)) between 1 and 120),
  constraint projects_description_length_check check (char_length(description) <= 500),
  constraint projects_status_check check (status in ('not_started', 'in_progress', 'completed')),
  constraint projects_period_check check (start_date is null or end_date is null or end_date >= start_date)
);

create index projects_owner_created_at_idx on public.projects (owner_id, created_at desc);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, member_id)
);

alter table public.tasks
  alter column project_id type uuid using project_id::uuid,
  alter column assignee_id type uuid using assignee_id::uuid,
  add column updated_at timestamptz not null default now(),
  add constraint tasks_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade,
  add constraint tasks_project_assignee_fkey foreign key (project_id, assignee_id)
    references public.project_members(project_id, member_id);

create table public.demo_workspaces (
  slug text primary key,
  payload jsonb not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint demo_workspaces_slug_length_check check (char_length(slug) between 1 and 80),
  constraint demo_workspaces_payload_object_check check (jsonb_typeof(payload) = 'object')
);

alter table public.members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.demo_workspaces enable row level security;

revoke all privileges on table public.members from public, anon, authenticated, service_role;
revoke all privileges on table public.projects from public, anon, authenticated, service_role;
revoke all privileges on table public.project_members from public, anon, authenticated, service_role;
revoke all privileges on table public.tasks from public, anon, authenticated, service_role;
revoke all privileges on table public.demo_workspaces from public, anon, authenticated, service_role;

grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.members to authenticated;
grant select, insert, update on table public.projects to authenticated;
grant select, insert on table public.project_members to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select on table public.demo_workspaces to anon, authenticated;

create policy members_select_owned
  on public.members for select to authenticated
  using (workspace_owner_id = (select auth.uid()));

create policy members_insert_owned
  on public.members for insert to authenticated
  with check (
    workspace_owner_id = (select auth.uid())
    and (auth_user_id is null or auth_user_id = (select auth.uid()))
  );

create policy members_update_owned
  on public.members for update to authenticated
  using (workspace_owner_id = (select auth.uid()))
  with check (
    workspace_owner_id = (select auth.uid())
    and (auth_user_id is null or auth_user_id = (select auth.uid()))
  );

create policy projects_select_owned
  on public.projects for select to authenticated
  using (owner_id = (select auth.uid()));

create policy projects_insert_owned
  on public.projects for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy projects_update_owned
  on public.projects for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy project_members_select_owned
  on public.project_members for select to authenticated
  using (
    exists (
      select 1 from public.projects
      where projects.id = project_members.project_id
        and projects.owner_id = (select auth.uid())
    )
  );

create policy project_members_insert_owned
  on public.project_members for insert to authenticated
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_members.project_id
        and projects.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.members
      where members.id = project_members.member_id
        and members.workspace_owner_id = (select auth.uid())
    )
  );

create policy tasks_select_owned
  on public.tasks for select to authenticated
  using (
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
        and projects.owner_id = (select auth.uid())
    )
  );

create policy tasks_insert_owned
  on public.tasks for insert to authenticated
  with check (
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
        and projects.owner_id = (select auth.uid())
    )
  );

create policy tasks_update_owned
  on public.tasks for update to authenticated
  using (
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
        and projects.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
        and projects.owner_id = (select auth.uid())
    )
  );

create policy tasks_delete_owned
  on public.tasks for delete to authenticated
  using (
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
        and projects.owner_id = (select auth.uid())
    )
  );

create policy demo_workspaces_read_active
  on public.demo_workspaces for select to anon, authenticated
  using (is_active = true);

create function public.create_project_with_owner(
  p_name text,
  p_description text,
  p_status text,
  p_start_date date,
  p_end_date date
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_member_id uuid;
  created_project public.projects;
begin
  select id into owner_member_id
  from public.members
  where workspace_owner_id = (select auth.uid())
    and auth_user_id = (select auth.uid());

  if owner_member_id is null then
    raise exception 'OWNER_MEMBER_REQUIRED';
  end if;

  insert into public.projects (owner_id, name, description, status, start_date, end_date)
  values ((select auth.uid()), p_name, coalesce(p_description, ''), p_status, p_start_date, p_end_date)
  returning * into created_project;

  insert into public.project_members (project_id, member_id)
  values (created_project.id, owner_member_id);

  return to_jsonb(created_project);
end;
$$;

create function public.add_project_member(
  p_project_id uuid,
  p_name text,
  p_initial text,
  p_role text,
  p_description text,
  p_color text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_member public.members;
begin
  if not exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = (select auth.uid())
  ) then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  insert into public.members (
    workspace_owner_id, auth_user_id, name, initial, role, description, color, is_ai
  ) values (
    (select auth.uid()), null, p_name, p_initial, p_role, coalesce(p_description, ''), p_color, false
  ) returning * into created_member;

  insert into public.project_members (project_id, member_id)
  values (p_project_id, created_member.id);

  return to_jsonb(created_member);
end;
$$;

revoke all on function public.create_project_with_owner(text, text, text, date, date) from public, anon;
revoke all on function public.add_project_member(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.create_project_with_owner(text, text, text, date, date) to authenticated;
grant execute on function public.add_project_member(uuid, text, text, text, text, text) to authenticated;

insert into public.demo_workspaces (slug, payload)
values (
  'teamflow',
  $demo$
  {
    "projects": [
      {"id":"1","name":"팀플 관리 웹서비스 (TeamFlow)","description":"부트캠프 4주 개인 프로젝트 · 팀플 정보를 한 공간에서 관리","status":"in_progress","startDate":"2026-07-01","endDate":"2026-07-31","memberIds":["member-1","member-2","member-5","member-6","member-ai"],"creatorId":"member-1"}
    ],
    "members": [
      {"id":"member-1","name":"이주환","initial":"이","role":"개발 / 프로젝트 관리","description":"전체 프론트엔드 개발 및 일정 관리 담당","isAi":false,"color":"#3a6898"},
      {"id":"member-2","name":"김민지","initial":"김","role":"서비스 기획 / PM","description":"문제 정의, 요구사항 명세서 작성 및 전반적인 프로젝트 기획","isAi":false,"color":"#8a4e68"},
      {"id":"member-5","name":"최지우","initial":"최","role":"UI/UX 디자인","description":"디자인 시스템 구축, 와이어프레임 및 하이파이 프로토타입 제작","isAi":false,"color":"#3d7a54"},
      {"id":"member-6","name":"정태호","initial":"정","role":"백엔드 개발 / 인프라","description":"API 서버 아키텍처 설계 및 클라우드 인프라 구축","isAi":false,"color":"#48688a"},
      {"id":"member-ai","name":"자료조사 AI","initial":"AI","role":"자료조사 · AI 팀원","description":"공유 노트와 자료를 바탕으로 조사 결과를 정리하는 데모 AI 팀원입니다.","isAi":true,"color":"#6b4ca8"}
    ],
    "tasks": [
      {"id":"1","projectId":"1","title":"기획서 최종 정리","assigneeId":"member-2","dueDate":"2026-07-08","status":"completed","description":"요구사항 정의서 및 1차 기능 명세서 작성 완료"},
      {"id":"2","projectId":"1","title":"초기 회의 일정 조율","assigneeId":"member-1","dueDate":"2026-07-06","status":"completed"},
      {"id":"3","projectId":"1","title":"대시보드 레이아웃 개발","assigneeId":"member-1","dueDate":"2026-07-16","status":"in_progress","description":"React와 CSS Modules를 활용한 메인 대시보드 컴포넌트 마크업"},
      {"id":"4","projectId":"1","title":"DB 테이블 스키마 설계","assigneeId":"member-6","dueDate":"2026-07-14","status":"in_review","description":"Supabase 기반 프로젝트 데이터 구조 초안"},
      {"id":"5","projectId":"1","title":"유사 서비스 레퍼런스 분석","assigneeId":"member-ai","dueDate":"2026-07-11","status":"completed","description":"Notion, Linear, Trello 기능 비교 리포트 작성"},
      {"id":"6","projectId":"1","title":"디자인 시스템 토큰 정리","assigneeId":"member-5","dueDate":"2026-07-13","status":"completed","description":"폰트, 색상, spacing 토큰 정리"},
      {"id":"7","projectId":"1","title":"백엔드 REST API 명세서 작성","assigneeId":"member-6","dueDate":"2026-07-18","status":"in_progress"},
      {"id":"8","projectId":"1","title":"로그인 화면 퍼블리싱","assigneeId":"member-1","dueDate":"2026-07-20","status":"not_started"},
      {"id":"9","projectId":"1","title":"사용자 사용성 테스트 질문지 작성","assigneeId":"member-2","dueDate":"2026-07-22","status":"not_started"},
      {"id":"10","projectId":"1","title":"일러스트 및 아이콘 에셋 추출","assigneeId":"member-5","dueDate":"2026-07-17","status":"in_progress"}
    ],
    "notes": [
      {"id":"note-1","projectId":"1","title":"팀플 관리 서비스 기획 아이디어 및 차별점","content":"# 핵심 기능 정리\n\n- **할 일 관리**: 상태와 담당자 지정\n- **팀원 역할**: 역할과 업무 명확화\n- **자료 링크**: 참고 자료를 한 곳에 모아보기","updatedAt":"2026-07-10","authorId":"member-2"},
      {"id":"note-2","projectId":"1","title":"자료 조사 링크 모음 (AI 요약본)","content":"# 참고 서비스 리서치\n\n## Linear\n- 빠르고 깔끔한 UI\n\n## Notion\n- 자유로운 문서 작성\n\n## Trello\n- 직관적인 칸반 보드","updatedAt":"2026-07-11","authorId":"member-ai"},
      {"id":"note-3","projectId":"1","title":"디자인 시스템 컬러 & 타이포그래피 규칙","content":"# Design System\n\n## Colors\n- Primary: #3860C9\n- Background: #F4F4F2\n\n## Typography\n- 기본 폰트: Pretendard","updatedAt":"2026-07-13","authorId":"member-5"}
    ],
    "resources": [
      {"id":"resource-1","projectId":"1","name":"회의 자료 및 녹음본","ownerId":"member-1","updatedAt":"2026-07-07","type":"folder","parentId":null},
      {"id":"resource-2","projectId":"1","name":"PRD_요구사항정의서.md","description":"문제 정의와 핵심 기능, 유저 스토리 정리","ownerId":"member-2","updatedAt":"2026-07-08","type":"document","parentId":"resource-1"},
      {"id":"resource-3","projectId":"1","name":"Figma 와이어프레임 링크","description":"대시보드 및 할 일 관리 UI 스케치","ownerId":"member-5","updatedAt":"2026-07-12","type":"link","parentId":null},
      {"id":"resource-4","projectId":"1","name":"DB_Schema_v1.pdf","description":"프로젝트 릴레이션 다이어그램","ownerId":"member-6","updatedAt":"2026-07-14","type":"document","parentId":null},
      {"id":"resource-5","projectId":"1","name":"경쟁사_분석_리포트.docx","description":"유사 서비스 장단점 비교 리포트","ownerId":"member-ai","updatedAt":"2026-07-11","type":"document","parentId":null},
      {"id":"resource-6","projectId":"1","name":"TeamFlow_Logo_Final.png","description":"서비스 메인 로고 에셋","ownerId":"member-5","updatedAt":"2026-07-13","type":"image","parentId":null},
      {"id":"resource-7","projectId":"1","name":"API Docs (Swagger)","description":"백엔드 API 명세 접속 링크","ownerId":"member-6","updatedAt":"2026-07-16","type":"link","parentId":null}
    ],
    "aiSettings": {
      "1": {
        "instructions":"너는 TeamFlow 프로젝트의 자료조사 담당 AI 팀원이야. 항상 출처를 확인하고 결과를 마크다운으로 정리해줘.",
        "context":{"project":true,"notes":true,"resources":true,"tasks":true,"team":false}
      }
    },
    "aiHistory": [
      {"id":"history-1","title":"유사 서비스 레퍼런스 조사","result":"Notion, Linear, Trello 비교 분석 완료. 공유 노트에 정리함.","date":"2026-07-11","status":"applied"},
      {"id":"history-2","title":"대학생 팀플 페인포인트 조사","result":"설문 결과 5개 패턴 도출. 검토 요청 중.","date":"2026-07-10","status":"pending_review"},
      {"id":"history-3","title":"경쟁사 기능 비교표 작성","result":"초안 기준이 부적합하여 재작업 예정.","date":"2026-07-08","status":"rejected"}
    ],
    "currentUserId":"member-1",
    "aiMemberId":"member-ai"
  }
  $demo$::jsonb
);
