-- TeamFlow private resource uploads.
-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('teamflow-resources', 'teamflow-resources', false, 6291456, null)
on conflict (id) do update
set public = false,
    file_size_limit = 6291456,
    allowed_mime_types = null;

alter table public.resources
  add column if not exists storage_path text,
  add column if not exists original_name text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists upload_status text not null default 'ready';

alter table public.resources
  drop constraint if exists resources_upload_status_check,
  drop constraint if exists resources_storage_metadata_check,
  drop constraint if exists resources_pending_requires_file_check;

alter table public.resources
  add constraint resources_upload_status_check
    check (upload_status in ('pending', 'ready')),
  add constraint resources_storage_metadata_check
    check (
      (
        storage_path is null
        and original_name is null
        and mime_type is null
        and size_bytes is null
      )
      or (
        storage_path = project_id::text || '/' || id::text
        and type in ('document', 'image')
        and url is null
        and char_length(btrim(original_name)) between 1 and 200
        and char_length(btrim(mime_type)) between 1 and 255
        and size_bytes between 0 and 6291456
      )
    ),
  add constraint resources_pending_requires_file_check
    check (upload_status = 'ready' or storage_path is not null);

create unique index if not exists resources_storage_path_unique
  on public.resources (storage_path)
  where storage_path is not null;

revoke insert on table public.resources from authenticated;
grant insert (
  id,
  project_id,
  parent_id,
  type,
  name,
  description,
  url,
  owner_id,
  storage_path,
  original_name,
  mime_type,
  size_bytes,
  upload_status
) on public.resources to authenticated;

grant update (
  parent_id,
  type,
  name,
  description,
  url,
  upload_status,
  updated_at
) on public.resources to authenticated;

create or replace function private.is_teamflow_resource_path_collaborator(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  project_id uuid;
begin
  if p_object_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;

  project_id := split_part(p_object_name, '/', 1)::uuid;
  return (select private.is_project_collaborator(project_id));
end;
$$;

revoke all on function private.is_teamflow_resource_path_collaborator(text) from public, anon, authenticated;
grant execute on function private.is_teamflow_resource_path_collaborator(text) to authenticated;

drop policy if exists teamflow_resources_select_collaborator on storage.objects;
drop policy if exists teamflow_resources_insert_collaborator on storage.objects;
drop policy if exists teamflow_resources_delete_collaborator on storage.objects;

create policy teamflow_resources_select_collaborator
on storage.objects for select to authenticated
using (
  bucket_id = 'teamflow-resources'
  and (select private.is_teamflow_resource_path_collaborator(name))
);

create policy teamflow_resources_insert_collaborator
on storage.objects for insert to authenticated
with check (
  bucket_id = 'teamflow-resources'
  and (select private.is_teamflow_resource_path_collaborator(name))
);

create policy teamflow_resources_delete_collaborator
on storage.objects for delete to authenticated
using (
  bucket_id = 'teamflow-resources'
  and (select private.is_teamflow_resource_path_collaborator(name))
);
