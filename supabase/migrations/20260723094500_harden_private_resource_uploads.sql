-- Harden TeamFlow's private file-upload lifecycle.
-- Apply only to TeamFlow project lmmeuoeuiouyowpthxwg.

alter table public.resources
  drop constraint if exists resources_storage_metadata_check;

alter table public.resources
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
        and size_bytes between 1 and 6291456
      )
    );

-- Browser clients may still create regular links/folders through the existing
-- API contract, but a Storage-backed row must come from the restricted RPC.
drop policy if exists resources_insert_collaborator on public.resources;
create policy resources_insert_collaborator on public.resources
for insert to authenticated with check (
  (select private.is_project_collaborator(project_id))
  and owner_id = (select private.current_project_member_id(project_id))
  and storage_path is null
  and original_name is null
  and mime_type is null
  and size_bytes is null
  and upload_status = 'ready'
);

revoke update (upload_status) on table public.resources from authenticated;

create or replace function public.create_resource_upload_intent(
  p_resource_id uuid,
  p_project_id uuid,
  p_parent_id uuid,
  p_type text,
  p_name text,
  p_description text,
  p_original_name text,
  p_mime_type text,
  p_size_bytes bigint
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_member_id uuid;
  created_resource public.resources;
  normalized_name text := btrim(coalesce(p_name, ''));
  normalized_original_name text := btrim(coalesce(p_original_name, ''));
  normalized_mime_type text := lower(btrim(coalesce(p_mime_type, '')));
  expected_type text;
begin
  if (select auth.uid()) is null or not (select private.is_project_collaborator(p_project_id)) then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  select access.member_id into actor_member_id
  from public.project_access access
  where access.project_id = p_project_id
    and access.user_id = (select auth.uid());

  if actor_member_id is null then raise exception 'PROJECT_NOT_FOUND'; end if;
  if char_length(normalized_name) not between 1 and 200 then raise exception 'INVALID_RESOURCE_UPLOAD'; end if;
  if char_length(coalesce(p_description, '')) > 2000 then raise exception 'INVALID_RESOURCE_UPLOAD'; end if;
  if char_length(normalized_original_name) not between 1 and 200
    or normalized_original_name ~ '[[:cntrl:]]'
    or position('/' in normalized_original_name) > 0
    or position(E'\\' in normalized_original_name) > 0 then
    raise exception 'INVALID_RESOURCE_UPLOAD';
  end if;
  if normalized_mime_type !~ '^[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+$' then
    raise exception 'INVALID_RESOURCE_UPLOAD';
  end if;
  if p_size_bytes is null or p_size_bytes not between 1 and 6291456 then
    raise exception 'INVALID_RESOURCE_UPLOAD';
  end if;

  expected_type := case
    when normalized_mime_type like 'image/%' and normalized_mime_type <> 'image/svg+xml' then 'image'
    else 'document'
  end;
  if p_type is distinct from expected_type then raise exception 'INVALID_RESOURCE_UPLOAD'; end if;

  insert into public.resources (
    id, project_id, parent_id, type, name, description, url, owner_id,
    storage_path, original_name, mime_type, size_bytes, upload_status
  ) values (
    p_resource_id, p_project_id, p_parent_id, p_type, normalized_name,
    coalesce(p_description, ''), null, actor_member_id,
    p_project_id::text || '/' || p_resource_id::text,
    normalized_original_name, normalized_mime_type, p_size_bytes, 'pending'
  ) returning * into created_resource;

  return to_jsonb(created_resource);
end;
$$;

create or replace function public.complete_resource_upload(p_resource_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_resource public.resources;
  completed_resource public.resources;
  object_metadata jsonb;
  stored_size bigint;
  stored_mime_type text;
begin
  select * into existing_resource
  from public.resources
  where id = p_resource_id
  for update;

  if existing_resource.id is null
    or not (select private.is_project_collaborator(existing_resource.project_id)) then
    raise exception 'PROJECT_NOT_FOUND';
  end if;
  if existing_resource.storage_path is null then raise exception 'INVALID_RESOURCE_UPLOAD'; end if;
  if existing_resource.upload_status = 'ready' then return to_jsonb(existing_resource); end if;

  select object.metadata into object_metadata
  from storage.objects object
  where object.bucket_id = 'teamflow-resources'
    and object.name = existing_resource.storage_path;

  if object_metadata is null or coalesce(object_metadata ->> 'size', '') !~ '^[0-9]+$' then
    raise exception 'TEAMFLOW_CONFLICT:RESOURCE_UPLOAD_MISSING';
  end if;
  stored_size := (object_metadata ->> 'size')::bigint;
  stored_mime_type := lower(split_part(
    coalesce(object_metadata ->> 'mimetype', object_metadata ->> 'content-type', ''),
    ';',
    1
  ));
  if stored_size <> existing_resource.size_bytes
    or stored_mime_type = ''
    or stored_mime_type <> existing_resource.mime_type then
    raise exception 'TEAMFLOW_CONFLICT:RESOURCE_UPLOAD_MISMATCH';
  end if;

  update public.resources
  set upload_status = 'ready'
  where id = p_resource_id
  returning * into completed_resource;

  return to_jsonb(completed_resource);
end;
$$;

revoke all on function public.create_resource_upload_intent(uuid, uuid, uuid, text, text, text, text, text, bigint)
  from public, anon, authenticated;
revoke all on function public.complete_resource_upload(uuid)
  from public, anon, authenticated;
grant execute on function public.create_resource_upload_intent(uuid, uuid, uuid, text, text, text, text, text, bigint)
  to authenticated;
grant execute on function public.complete_resource_upload(uuid)
  to authenticated;

create or replace function private.is_teamflow_resource_path_with_status(
  p_object_name text,
  p_statuses text[]
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.resources resource
    where resource.storage_path = p_object_name
      and resource.upload_status = any(p_statuses)
      and (select private.is_project_collaborator(resource.project_id))
  );
$$;

revoke all on function private.is_teamflow_resource_path_with_status(text, text[])
  from public, anon, authenticated;
grant execute on function private.is_teamflow_resource_path_with_status(text, text[])
  to authenticated;

drop policy if exists teamflow_resources_select_collaborator on storage.objects;
drop policy if exists teamflow_resources_insert_collaborator on storage.objects;
drop policy if exists teamflow_resources_delete_collaborator on storage.objects;

create policy teamflow_resources_select_collaborator
on storage.objects for select to authenticated
using (
  bucket_id = 'teamflow-resources'
  and (select private.is_teamflow_resource_path_with_status(name, array['ready']))
);

create policy teamflow_resources_insert_collaborator
on storage.objects for insert to authenticated
with check (
  bucket_id = 'teamflow-resources'
  and (select private.is_teamflow_resource_path_with_status(name, array['pending']))
);

-- A collaborator can remove an opaque project-scoped object during API cleanup,
-- including after a pending database row was removed.
create policy teamflow_resources_delete_collaborator
on storage.objects for delete to authenticated
using (
  bucket_id = 'teamflow-resources'
  and (select private.is_teamflow_resource_path_collaborator(name))
);
