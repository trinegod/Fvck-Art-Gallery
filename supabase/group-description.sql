-- Shared group About text. Additive; run after the current group/chat migrations.
-- No existing conversation, message, notification, storage or RPC grants change.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create table if not exists public.group_descriptions (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  description text not null default '' check (char_length(description) <= 500),
  updated_at timestamptz not null default statement_timestamp()
);
comment on table public.group_descriptions is
  'Shared plain-text group About, read by current members and edited by current owners/admins through dedicated RPCs only.';
alter table public.group_descriptions enable row level security;
-- Supabase default grants can include broad table AND explicit column grants.
-- There are no client-facing table policies: both RPCs validate current scope.
revoke all on table public.group_descriptions from public, anon, authenticated;
do $group_description_column_grants$
declare column_names text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into column_names
  from pg_catalog.pg_attribute where attrelid = 'public.group_descriptions'::regclass
    and attnum > 0 and not attisdropped;
  execute format('revoke all (%s) on table public.group_descriptions from public, anon, authenticated', column_names);
end;
$group_description_column_grants$;

create or replace function public.get_group_description(target_conversation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare viewer_role text; result_description text; result_updated_at timestamptz;
begin
  select member.role into viewer_role
  from public.conversation_members member
  join public.conversations conversation on conversation.id = member.conversation_id
  where member.conversation_id = target_conversation_id
    and member.profile_id = auth.uid() and conversation.kind = 'group'
  for share of member;
  if viewer_role is null then
    raise exception 'Only current group members can read the group About.';
  end if;
  select description, updated_at into result_description, result_updated_at
  from public.group_descriptions where conversation_id = target_conversation_id;
  return jsonb_build_object('conversation_id', target_conversation_id,
    'description', coalesce(result_description, ''), 'updated_at', result_updated_at,
    'can_edit', viewer_role in ('owner', 'admin'));
end;
$$;

create or replace function public.update_group_description(target_conversation_id uuid, new_description text, expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  viewer_role text;
  clean_description text := btrim(coalesce(new_description, ''), E' \t\n\r\f' || chr(11));
  saved_description public.group_descriptions%rowtype;
begin
  -- Lock authorization until the write commits. Concurrent demotion/removal
  -- cannot turn a role observed earlier into permission for a later write.
  select member.role into viewer_role
  from public.conversation_members member
  join public.conversations conversation on conversation.id = member.conversation_id
  where member.conversation_id = target_conversation_id
    and member.profile_id = auth.uid() and conversation.kind = 'group'
  for share of member;
  if viewer_role is null or viewer_role not in ('owner', 'admin') then
    raise exception 'Only group owners and admins can edit the group About.';
  end if;
  if char_length(clean_description) > 500 then
    raise exception 'Group About must be 500 characters or fewer.';
  end if;
  -- Serialize the absent-row case too: two editors both starting from null may
  -- not overwrite each other. Versions retain PostgreSQL microsecond precision.
  perform pg_advisory_xact_lock(hashtextextended(target_conversation_id::text, 9412));
  select * into saved_description from public.group_descriptions
  where conversation_id = target_conversation_id;
  if saved_description.updated_at is distinct from expected_updated_at then
    raise exception using errcode = '40001',
      message = 'Group About changed since you opened it. Refresh it before saving again.';
  end if;
  insert into public.group_descriptions as current_description(conversation_id, description)
  values(target_conversation_id, clean_description)
  on conflict(conversation_id) do update
  set description = excluded.description,
    updated_at = case when current_description.description = excluded.description then current_description.updated_at
      else greatest(statement_timestamp(), current_description.updated_at + interval '1 microsecond') end
  returning * into saved_description;
  return jsonb_build_object('conversation_id', saved_description.conversation_id,
    'description', saved_description.description, 'updated_at', saved_description.updated_at,
    'can_edit', true);
end;
$$;

revoke all on function public.get_group_description(uuid) from public, anon, authenticated;
revoke all on function public.update_group_description(uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.get_group_description(uuid) to authenticated;
grant execute on function public.update_group_description(uuid,text,timestamptz) to authenticated;
commit;
