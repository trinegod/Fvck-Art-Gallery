-- ROLLBACK-ONLY message-controls rehearsal. Review before authorized execution.
-- Run as ONE script on ONE privileged database connection, stopping on error.
-- If psql is used: -v ON_ERROR_STOP=1. Never remove the final ROLLBACK.
-- Exact migration body is embedded below with its outer BEGIN/COMMIT removed.
-- This script NEVER inserts/updates auth.users or profiles, reads existing message
-- contents, calls the Storage API, or disables triggers/protected workflows.
-- Two existing profile IDs are read only as identities; all writes target new,
-- collision-checked fixture IDs. Memberships are muted so fixture messages do
-- not generate notifications. Storage rows are metadata only, not real uploads.
--
-- OPERATOR GATE: first inspect all enabled triggers and their called functions
-- on messages, conversations, conversation_members, storage.objects, notifications
-- and any recursively touched tables for nontransactional HTTP/webhook effects.
-- Also inspect constraints, owners, RLS, column/table ACLs and policy definitions.
-- Set the following literal to 'reviewed' ONLY after that inspection is complete.
-- No real actor IDs or usernames are embedded in this checked-in script.
--
-- Database role/claim simulation DOES NOT verify JWT signature/expiry, HTTP,
-- physical Storage deletion, realtime delivery, browser UX, or true concurrency.
-- Deterministic future-version fixtures model an older-started statement that
-- obtains its row lock after a newer write; no clocks are changed or delayed.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';
select set_config('nodeine.controls_trigger_review', 'NOT_REVIEWED', true);

do $preflight$
begin
  if current_setting('nodeine.controls_trigger_review', true) <> 'reviewed' then
    raise exception 'Stop: operator must inspect trigger side effects and mark the rehearsal reviewed.';
  end if;
  if to_regprocedure('public.nodeine_message_controls(uuid)') is not null
    or to_regprocedure('public.edit_own_message(uuid,text)') is not null
    or to_regprocedure('public.remove_own_message(uuid)') is not null
    or to_regprocedure('public.clear_my_conversation(uuid)') is not null
    or to_regclass('public.message_removal_cleanup') is not null
    or exists (select 1 from pg_attribute where attrelid in
      ('public.messages'::regclass, 'public.conversation_members'::regclass)
      and attname in ('edited_at', 'removed_at', 'cleared_before') and not attisdropped) then
    raise exception 'Stop: this rehearsal requires the not-yet-activated controls baseline.';
  end if;
  if to_regprocedure('public.validate_voice_note_message()') is null
    or not exists (select 1 from pg_attribute where attrelid = 'public.messages'::regclass
      and attname = 'voice_duration_ms' and not attisdropped) then
    raise exception 'Stop: existing voice/message schema is required.';
  end if;
  if (select count(*) from (select id from public.profiles order by id limit 2) p) <> 2 then
    raise exception 'Stop: two existing provisioned profile identities are required.';
  end if;
end;
$preflight$;

create temporary table mc_ids (name text primary key, id uuid not null unique) on commit drop;
insert into mc_ids values
  ('sender', (select id from public.profiles order by id limit 1)),
  ('member', (select id from public.profiles order by id offset 1 limit 1));
insert into mc_ids(name, id)
select name, ('f7000000-0000-4000-8000-' || lpad(ordinality::text, 12, '0'))::uuid
from unnest(array[
  'chat', 'foreign_chat', 'text', 'member_text', 'version_text', 'normal_insert',
  'voice_good', 'voice_missing', 'voice_bad_owner', 'voice_wrong_chat',
  'voice_avatar', 'legacy_image', 'after_clear', 'outsider',
  'notification_edit', 'notification_voice', 'notification_other', 'notification_nonmessage'
]) with ordinality as fixture(name, ordinality);
create temporary table mc_assertions (label text primary key) on commit drop;
create temporary table mc_results (name text primary key, result jsonb not null) on commit drop;

create function pg_temp.mc_id(label text) returns uuid
language sql stable as $$ select id from pg_temp.mc_ids where name = label $$;
create function pg_temp.mc_assert(ok boolean, label text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Controls rehearsal failed: %', label; end if;
  insert into pg_temp.mc_assertions values (label);
end; $$;
create function pg_temp.mc_identity(actor text) returns void
language plpgsql as $$
declare actor_id uuid := pg_temp.mc_id(actor);
begin
  perform set_config('request.jwt.claim.sub', coalesce(actor_id::text, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', actor_id, 'role', 'authenticated')::text, true);
end; $$;
create function pg_temp.mc_expect_denied(label text, command text, expected_state text) returns void
language plpgsql as $$
declare rejected boolean := false;
begin
  begin
    execute command;
  exception when others then
    if sqlstate <> expected_state then
      raise exception 'Unexpected SQLSTATE % in assertion % (expected %)', sqlstate, label, expected_state;
    end if;
    rejected := true;
  end;
  perform pg_temp.mc_assert(rejected, label);
end; $$;

-- A collision aborts before any fixture INSERT; existing rows are never reused.
select pg_temp.mc_assert(not exists (
  select 1 from mc_ids f where f.name not in ('sender', 'member') and
    (exists (select 1 from public.profiles p where p.id = f.id)
     or exists (select 1 from public.conversations c where c.id = f.id)
     or exists (select 1 from public.messages m where m.id = f.id)
     or exists (select 1 from public.notifications n where n.id = f.id
       or n.source_key = 'nodeine-mc-rollback:' || f.id::text)
     or exists (select 1 from storage.objects o where o.id = f.id
       or o.name like f.id::text || '/%'))
), 'fixture identifiers are unused');
select pg_temp.mc_assert(
  (select count(*) = 4 and bool_and(relrowsecurity) from pg_class where oid in (
    'public.messages'::regclass, 'public.conversations'::regclass,
    'public.conversation_members'::regclass, 'storage.objects'::regclass)),
  'existing private tables have RLS');

-- BEGIN EXACT MESSAGE-CONTROLS MIGRATION BODY
alter table public.messages
  add column if not exists edited_at timestamptz,
  add column if not exists removed_at timestamptz;

alter table public.conversation_members
  add column if not exists cleared_before timestamptz;

-- Existing application writes use INSERT for messages and a column-scoped
-- last_read_at update for memberships. Keep the new control metadata RPC-only.
-- Table UPDATE grants override a column revoke; deployed Supabase defaults may
-- also grant TRUNCATE/REFERENCES/TRIGGER. Normalize both table and column ACLs.
revoke all on table public.messages, public.conversation_members from public, anon, authenticated;

create index if not exists conversation_members_profile_cleared_idx
  on public.conversation_members (profile_id, conversation_id, cleared_before);

-- A removal receipt survives a lost RPC response, but remains unreadable by
-- clients and all normal message SELECTs. There is intentionally no automatic
-- worker: a later authenticated retry retrieves this exact safe descriptor and
-- the client may attempt idempotent storage cleanup again.
create table if not exists public.message_removal_cleanup (
  message_id uuid primary key
    references public.messages(id) on delete cascade,
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  sender_id uuid not null
    references public.profiles(id) on delete cascade,
  bucket_id text not null check (bucket_id = 'conversation-voice-notes'),
  object_path text not null,
  created_at timestamptz not null default statement_timestamp()
);

alter table public.message_removal_cleanup enable row level security;
revoke all on table public.message_removal_cleanup from public, anon, authenticated;

do $message_control_column_grants$
declare
  relation_name text;
  column_names text;
begin
  foreach relation_name in array array['messages', 'conversation_members', 'message_removal_cleanup'] loop
    select string_agg(quote_ident(attribute.attname), ', ' order by attribute.attnum)
      into column_names
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid = format('public.%I', relation_name)::regclass
      and attribute.attnum > 0 and not attribute.attisdropped;
    execute format('revoke all (%s) on table public.%I from public, anon, authenticated', column_names, relation_name);
  end loop;
end;
$message_control_column_grants$;

grant select, insert on table public.messages to authenticated;
grant select on table public.conversation_members to authenticated;
grant update (last_read_at) on table public.conversation_members to authenticated;

-- Direct message INSERT remains available to members, so prevent a caller from
-- claiming edit/delete metadata while creating an otherwise valid message.
create or replace function public.prevent_spoofed_message_control_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.edited_at is not null
    or new.removed_at is not null then
    raise exception 'Message edit and removal timestamps are server controlled.';
  end if;
  -- Every insertion gets one database timestamp. Otherwise a caller could
  -- future-date a message before another member clears their presentation.
  new.created_at := statement_timestamp();
  return new;
end;
$$;

drop trigger if exists prevent_spoofed_message_control_metadata on public.messages;
create trigger prevent_spoofed_message_control_metadata
  before insert on public.messages
  for each row
  execute function public.prevent_spoofed_message_control_metadata();

create or replace function public.nodeine_message_controls(
  target_conversation_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  member_cutoff timestamptz;
begin
  if viewer_id is null then
    raise exception 'You must be signed in to use message controls.';
  end if;

  select member.cleared_before
    into member_cutoff
  from public.conversation_members as member
  where member.conversation_id = target_conversation_id
    and member.profile_id = viewer_id;

  if not found then
    raise exception 'You are not a member of this conversation.';
  end if;

  return jsonb_build_object(
    'enabled', true,
    'clearedBefore', member_cutoff
  );
end;
$$;

create or replace function public.edit_own_message(
  target_message_id uuid,
  new_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  clean_body text := btrim(new_body);
  updated_message public.messages%rowtype;
begin
  if viewer_id is null then
    raise exception 'You must be signed in to edit a message.';
  end if;

  if clean_body is null or char_length(clean_body) not between 1 and 2000 then
    raise exception 'Messages must be between 1 and 2,000 characters.';
  end if;

  update public.messages as message
  set body = clean_body,
      -- Statements can wait on this row out of timestamp order. Advance the
      -- stored version so clients never discard a later accepted edit as stale.
      edited_at = greatest(statement_timestamp(),
        message.edited_at + interval '1 microsecond', message.created_at)
  where message.id = target_message_id
    and message.sender_id = viewer_id
    and message.message_type = 'text'
    and message.removed_at is null
    and exists (
      select 1
      from public.conversation_members as member
      where member.conversation_id = message.conversation_id
        and member.profile_id = viewer_id
    )
  returning message.* into updated_message;

  if not found then
    raise exception 'That message cannot be edited.';
  end if;

  -- Existing Activity entries must not retain replaced text or disclose the new
  -- body to recipients who have since left. Preserve their IDs/read state.
  update public.notifications
  set preview = 'Message edited'
  where message_id = updated_message.id
    and kind = 'message'
    and preview is distinct from 'Message edited';

  return to_jsonb(updated_message);
end;
$$;

create or replace function public.remove_own_message(
  target_message_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  existing_message public.messages%rowtype;
  updated_message public.messages%rowtype;
  removed_attachment jsonb := null;
  trusted_removed_attachment jsonb := null;
  stored_owner_id text;
begin
  if viewer_id is null then
    raise exception 'You must be signed in to remove a message.';
  end if;

  -- Locking makes concurrent removal idempotent. A private cleanup receipt lets
  -- authorized retries recover the same verified descriptor without guessing.
  select message.*
    into existing_message
  from public.messages as message
  where message.id = target_message_id
  for update;

  if not found
    or existing_message.sender_id <> viewer_id
    or not exists (
      select 1
      from public.conversation_members as member
      where member.conversation_id = existing_message.conversation_id
        and member.profile_id = viewer_id
    ) then
    raise exception 'That message cannot be removed.';
  end if;

  if existing_message.removed_at is not null then
    -- Repair legacy/stale notification previews on an authorized retry too.
    update public.notifications
    set preview = 'Message removed'
    where message_id = existing_message.id
      and kind = 'message'
      and preview is distinct from 'Message removed';

    select jsonb_build_object('bucket', cleanup.bucket_id, 'path', cleanup.object_path)
      into trusted_removed_attachment
    from public.message_removal_cleanup as cleanup
    where cleanup.message_id = existing_message.id
      and cleanup.conversation_id = existing_message.conversation_id
      and cleanup.sender_id = viewer_id;
    return jsonb_build_object(
      'message', to_jsonb(existing_message),
      'removedAttachment', trusted_removed_attachment
    );
  end if;

  -- Legacy image/video paths were not proven to be sender-owned at insert, so
  -- never give clients a deletion descriptor for them. Voice uploads have a
  -- server-enforced path and storage owner; prove both again before cleanup.
  if existing_message.message_type = 'voice'
    and existing_message.attachment_path ~ (
      '^' || existing_message.conversation_id::text || '/voice/' || viewer_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](webm|m4a)$'
    )
    and (
      (existing_message.attachment_mime = 'audio/webm' and existing_message.attachment_path ~ '[.]webm$')
      or (existing_message.attachment_mime = 'audio/mp4' and existing_message.attachment_path ~ '[.]m4a$')
    ) then
    select object.owner_id::text
      into stored_owner_id
    from storage.objects as object
    where object.bucket_id = 'conversation-voice-notes'
      and object.name = existing_message.attachment_path;

    if found and stored_owner_id = viewer_id::text then
    removed_attachment := jsonb_build_object(
      'bucket', 'conversation-voice-notes',
      'path', existing_message.attachment_path
    );
    end if;
  end if;

  update public.messages as message
  set message_type = 'text',
      body = 'Message removed',
      artwork_id = null,
      attachment_path = null,
      attachment_mime = null,
      attachment_name = null,
      voice_duration_ms = null,
      edited_at = null,
      removed_at = greatest(statement_timestamp(),
        existing_message.edited_at + interval '1 microsecond', existing_message.created_at)
  where message.id = existing_message.id
  returning message.* into updated_message;

  if removed_attachment is not null then
    insert into public.message_removal_cleanup (
      message_id,
      conversation_id,
      sender_id,
      bucket_id,
      object_path
    ) values (
      existing_message.id,
      existing_message.conversation_id,
      viewer_id,
      removed_attachment ->> 'bucket',
      removed_attachment ->> 'path'
    ) on conflict (message_id) do nothing;
  end if;

  update public.notifications
  set preview = 'Message removed'
  where message_id = updated_message.id
    and kind = 'message'
    and preview is distinct from 'Message removed';

  return jsonb_build_object(
    'message', to_jsonb(updated_message),
    'removedAttachment', removed_attachment
  );
end;
$$;

create or replace function public.clear_my_conversation(
  target_conversation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  cutoff timestamptz := statement_timestamp();
begin
  if viewer_id is null then
    raise exception 'You must be signed in to clear a conversation.';
  end if;

  update public.conversation_members as member
  -- An earlier-started request may acquire the lock after a newer clear.
  -- Return the stored watermark, never regress it to this statement's start.
  set cleared_before = greatest(member.cleared_before, cutoff)
  where member.conversation_id = target_conversation_id
    and member.profile_id = viewer_id
  returning member.cleared_before into cutoff;

  if not found then
    raise exception 'You are not a member of this conversation.';
  end if;

  return jsonb_build_object('clearedBefore', cutoff);
end;
$$;

revoke all on function public.nodeine_message_controls(uuid) from public, anon;
revoke all on function public.edit_own_message(uuid, text) from public, anon;
revoke all on function public.remove_own_message(uuid) from public, anon;
revoke all on function public.clear_my_conversation(uuid) from public, anon;

grant execute on function public.nodeine_message_controls(uuid) to authenticated;
grant execute on function public.edit_own_message(uuid, text) to authenticated;
grant execute on function public.remove_own_message(uuid) to authenticated;
grant execute on function public.clear_my_conversation(uuid) to authenticated;

-- END EXACT MESSAGE-CONTROLS MIGRATION BODY

-- Only these temporary helpers are made accessible during role simulation.
do $$ declare temp_schema text;
begin
  select nspname into temp_schema from pg_namespace where oid = pg_my_temp_schema();
  execute format('grant usage on schema %I to authenticated, anon', temp_schema);
end; $$;
grant select on mc_ids to authenticated, anon;
grant select, insert on mc_assertions, mc_results to authenticated, anon;
grant execute on function pg_temp.mc_id(text), pg_temp.mc_assert(boolean,text),
  pg_temp.mc_expect_denied(text,text,text) to authenticated, anon;

select pg_temp.mc_assert(
  (select count(*) = 4 and bool_and(p.prosecdef
    and p.proconfig @> array['search_path=""']::text[]
    and has_function_privilege('authenticated', p.oid, 'execute')
    and not has_function_privilege('anon', p.oid, 'execute'))
  from pg_proc p where p.oid in (
    'public.nodeine_message_controls(uuid)'::regprocedure,
    'public.edit_own_message(uuid,text)'::regprocedure,
    'public.remove_own_message(uuid)'::regprocedure,
    'public.clear_my_conversation(uuid)'::regprocedure)),
  'four RPCs are authenticated-only definers with empty search paths');
select pg_temp.mc_assert(
  has_table_privilege('authenticated', 'public.messages', 'select')
  and has_table_privilege('authenticated', 'public.messages', 'insert')
  and not has_any_column_privilege('authenticated', 'public.messages', 'update')
  and not has_table_privilege('authenticated', 'public.messages', 'delete,truncate,references,trigger'),
  'messages expose only required select and insert capabilities');
select pg_temp.mc_assert(
  has_table_privilege('authenticated', 'public.conversation_members', 'select')
  and has_column_privilege('authenticated', 'public.conversation_members', 'last_read_at', 'update')
  and not has_table_privilege('authenticated', 'public.conversation_members', 'update,insert,delete,truncate,references,trigger')
  and not exists (select 1 from pg_attribute a where a.attrelid = 'public.conversation_members'::regclass
    and a.attnum > 0 and not a.attisdropped and a.attname <> 'last_read_at'
    and has_column_privilege('authenticated', a.attrelid, a.attnum, 'update')),
  'memberships allow only last_read_at direct mutation');
select pg_temp.mc_assert(
  not has_table_privilege('anon', 'public.messages', 'select,insert,update,delete,truncate,references,trigger')
  and not has_table_privilege('anon', 'public.conversation_members', 'select,insert,update,delete,truncate,references,trigger')
  and not has_table_privilege('anon', 'public.message_removal_cleanup', 'select,insert,update,delete,truncate,references,trigger')
  and not has_table_privilege('authenticated', 'public.message_removal_cleanup', 'select,insert,update,delete,truncate,references,trigger'),
  'anonymous and cleanup table grants are closed');
select pg_temp.mc_assert(
  (select relrowsecurity from pg_class where oid = 'public.message_removal_cleanup'::regclass),
  'cleanup receipts enforce RLS');

-- Privileged fixture setup only, using existing identities as read-only FK targets.
insert into public.conversations(id, kind, title, created_by)
select id, 'group', 'NODEINE rollback-only controls rehearsal', pg_temp.mc_id('sender')
from mc_ids where name in ('chat', 'foreign_chat');
insert into public.conversation_members(conversation_id, profile_id, role, muted_until)
values (pg_temp.mc_id('chat'), pg_temp.mc_id('sender'), 'owner', 'infinity'),
       (pg_temp.mc_id('chat'), pg_temp.mc_id('member'), 'member', 'infinity');

insert into public.messages(id, conversation_id, sender_id, message_type, body)
select id, pg_temp.mc_id('chat'),
  case when name = 'member_text' then pg_temp.mc_id('member') else pg_temp.mc_id('sender') end,
  'text', 'Synthetic rollback-only message'
from mc_ids where name in ('text', 'member_text', 'version_text',
  'voice_good', 'voice_missing', 'voice_bad_owner', 'voice_wrong_chat',
  'voice_avatar', 'legacy_image', 'after_clear');

-- Seed controlled pre-existing media states only on our fixture rows. This
-- exercises removal revalidation, not upload authenticity; no trigger is disabled.
insert into storage.objects(id, bucket_id, name, owner_id, metadata)
select id, 'conversation-voice-notes',
  pg_temp.mc_id('chat')::text || '/voice/' || pg_temp.mc_id('sender')::text || '/' || id::text || '.webm',
  case when name = 'voice_bad_owner' then pg_temp.mc_id('member')::text else pg_temp.mc_id('sender')::text end,
  '{"mimetype":"audio/webm","size":128}'::jsonb
from mc_ids where name in ('voice_good', 'voice_bad_owner');
update public.messages m
set message_type = 'voice', body = null, voice_duration_ms = 1000, attachment_mime = 'audio/webm',
  attachment_path = case when f.name = 'voice_wrong_chat' then pg_temp.mc_id('foreign_chat') else pg_temp.mc_id('chat') end::text
    || case when f.name = 'voice_avatar' then '/avatars/' else '/voice/' || pg_temp.mc_id('sender')::text || '/' end
    || f.id::text || '.webm'
from mc_ids f where m.id = f.id and f.name in
  ('voice_good', 'voice_missing', 'voice_bad_owner', 'voice_wrong_chat', 'voice_avatar');
update public.messages set message_type = 'image', attachment_mime = 'image/png',
  attachment_path = pg_temp.mc_id('chat')::text || '/voice/' || pg_temp.mc_id('sender')::text || '/' || pg_temp.mc_id('voice_good')::text || '.webm'
where id = pg_temp.mc_id('legacy_image');
update public.messages set edited_at = statement_timestamp() + interval '1 day'
where id = pg_temp.mc_id('version_text');
insert into mc_results values ('prior_version', (select to_jsonb(m) from public.messages m where m.id = pg_temp.mc_id('version_text')));

-- Controlled existing-style notification fixtures, never real Activity rows.
-- The muted memberships above ensure the ordinary INSERT trigger adds none.
insert into public.notifications(id, recipient_id, actor_id, kind, conversation_id, message_id, preview, source_key, read_at)
select f.id, pg_temp.mc_id('member'), pg_temp.mc_id('sender'),
  case when f.name='notification_nonmessage' then 'follow' else 'message' end,
  pg_temp.mc_id('chat'),
  case when f.name='notification_voice' then pg_temp.mc_id('voice_good')
    when f.name='notification_other' then pg_temp.mc_id('text') else pg_temp.mc_id('version_text') end,
  'Original synthetic notification quote', 'nodeine-mc-rollback:' || f.id::text,
  case when f.name='notification_voice' then statement_timestamp() else null end
from mc_ids f where f.name in ('notification_edit','notification_voice','notification_other','notification_nonmessage');
insert into mc_results values ('notification_identity', (select jsonb_agg(to_jsonb(n)-'preview' order by n.id)
  from public.notifications n where n.conversation_id=pg_temp.mc_id('chat')));

select pg_temp.mc_identity('sender');
set local role authenticated;
select pg_temp.mc_assert(current_user = 'authenticated' and auth.uid() = pg_temp.mc_id('sender'), 'sender identity is authenticated');
select pg_temp.mc_assert(public.nodeine_message_controls(pg_temp.mc_id('chat')) = '{"enabled":true,"clearedBefore":null}'::jsonb, 'member capability enabled with no initial clear');
insert into mc_results values ('edited', public.edit_own_message(pg_temp.mc_id('version_text'), '  Revised fixture  '));
select pg_temp.mc_assert((select result->>'body' = 'Revised fixture'
  and result->>'id' = pg_temp.mc_id('version_text')::text
  and result->>'sender_id' = pg_temp.mc_id('sender')::text
  and result->>'conversation_id' = pg_temp.mc_id('chat')::text
  and (result->>'edited_at')::timestamptz > (select (result->>'edited_at')::timestamptz from mc_results where name='prior_version')
  and result->>'created_at' = (select result->>'created_at' from mc_results where name='prior_version')
  from mc_results where name='edited'), 'edit trims body preserves identity and advances existing version');
insert into mc_results values ('edited_again', public.edit_own_message(pg_temp.mc_id('version_text'), 'Revised fixture'));
select pg_temp.mc_assert((select result->>'body' = 'Revised fixture'
  and (result->>'edited_at')::timestamptz > (select (result->>'edited_at')::timestamptz from mc_results where name='edited')
  from mc_results where name='edited_again'), 'same-body edit preserves content and advances version deterministically');
reset role;
select pg_temp.mc_assert((select preview='Message edited' from public.notifications where id=pg_temp.mc_id('notification_edit')),
  'edit replaces the stored notification quote with a neutral preview');
set local role authenticated;

select pg_temp.mc_expect_denied('null edit rejected', 'select public.edit_own_message(pg_temp.mc_id(''text''), null)', 'P0001');
select pg_temp.mc_expect_denied('blank edit rejected', 'select public.edit_own_message(pg_temp.mc_id(''text''), ''   '')', 'P0001');
select pg_temp.mc_expect_denied('oversize edit rejected', 'select public.edit_own_message(pg_temp.mc_id(''text''), repeat(''x'',2001))', 'P0001');
select pg_temp.mc_expect_denied('nontext edit rejected', 'select public.edit_own_message(pg_temp.mc_id(''voice_good''), ''text'')', 'P0001');
select pg_temp.mc_expect_denied('unknown message edit rejected', 'select public.edit_own_message(pg_temp.mc_id(''outsider''), ''text'')', 'P0001');
select pg_temp.mc_expect_denied('unknown message removal rejected', 'select public.remove_own_message(pg_temp.mc_id(''outsider''))', 'P0001');
select pg_temp.mc_expect_denied('owner cannot edit another sender', 'select public.edit_own_message(pg_temp.mc_id(''member_text''), ''text'')', 'P0001');
select pg_temp.mc_expect_denied('owner cannot remove another sender', 'select public.remove_own_message(pg_temp.mc_id(''member_text''))', 'P0001');
select pg_temp.mc_expect_denied('direct message UPDATE denied', 'update public.messages set body=''forged'' where id=pg_temp.mc_id(''text'')', '42501');
select pg_temp.mc_expect_denied('direct message DELETE denied', 'delete from public.messages where id=pg_temp.mc_id(''text'')', '42501');
select pg_temp.mc_expect_denied('direct cutoff UPDATE denied', 'update public.conversation_members set cleared_before=now() where conversation_id=pg_temp.mc_id(''chat'') and profile_id=auth.uid()', '42501');
select pg_temp.mc_expect_denied('direct role escalation denied', 'update public.conversation_members set role=''owner'' where conversation_id=pg_temp.mc_id(''chat'') and profile_id=auth.uid()', '42501');
update public.conversation_members set last_read_at = statement_timestamp()
where conversation_id=pg_temp.mc_id('chat') and profile_id=auth.uid();
select pg_temp.mc_assert((select last_read_at is not null from public.conversation_members
  where conversation_id=pg_temp.mc_id('chat') and profile_id=auth.uid()), 'legitimate read-position update survives grant normalization');

select pg_temp.mc_expect_denied('spoofed edit metadata insert rejected',
  'insert into public.messages(conversation_id,sender_id,body,edited_at) values(pg_temp.mc_id(''chat''),auth.uid(),''fixture'',now())', 'P0001');
select pg_temp.mc_expect_denied('spoofed removal metadata insert rejected',
  'insert into public.messages(conversation_id,sender_id,body,removed_at) values(pg_temp.mc_id(''chat''),auth.uid(),''fixture'',now())', 'P0001');
select pg_temp.mc_expect_denied('forged sender insert rejected',
  'insert into public.messages(conversation_id,sender_id,body) values(pg_temp.mc_id(''chat''),pg_temp.mc_id(''member''),''fixture'')', '42501');
select pg_temp.mc_expect_denied('forged conversation insert rejected',
  'insert into public.messages(conversation_id,sender_id,body) values(pg_temp.mc_id(''foreign_chat''),auth.uid(),''fixture'')', '42501');
with inserted as (
  insert into public.messages(id,conversation_id,sender_id,body,created_at)
  values(pg_temp.mc_id('normal_insert'),pg_temp.mc_id('chat'),auth.uid(),'Synthetic timestamp fixture','9999-01-01T00:00:00Z')
  returning created_at, edited_at, removed_at
)
select pg_temp.mc_assert((select created_at = statement_timestamp() and edited_at is null and removed_at is null
  from inserted), 'caller creation time is normalized to server statement time');

insert into mc_results values ('removed_text', public.remove_own_message(pg_temp.mc_id('version_text')));
select pg_temp.mc_assert((select result->'message'->>'body' = 'Message removed'
  and (result->'message'->>'removed_at')::timestamptz > (select (result->>'edited_at')::timestamptz from mc_results where name='edited_again')
  and result->'message'->'edited_at' = 'null'::jsonb and result->'removedAttachment' = 'null'::jsonb
  from mc_results where name='removed_text'), 'text tombstone advances prior edit and has no cleanup descriptor');
select pg_temp.mc_expect_denied('removed text edit rejected', 'select public.edit_own_message(pg_temp.mc_id(''version_text''),''resurrect'')', 'P0001');
select pg_temp.mc_assert(public.remove_own_message(pg_temp.mc_id('version_text')) = (select result from mc_results where name='removed_text'), 'duplicate text removal is idempotent');

insert into mc_results values ('removed_voice', public.remove_own_message(pg_temp.mc_id('voice_good')));
select pg_temp.mc_assert((select result->'removedAttachment' = jsonb_build_object('bucket','conversation-voice-notes',
  'path', pg_temp.mc_id('chat')::text || '/voice/' || auth.uid()::text || '/' || pg_temp.mc_id('voice_good')::text || '.webm')
  and result->'message'->>'body' = 'Message removed'
  and result->'message'->>'message_type' = 'text'
  and result->'message'->'attachment_path' = 'null'::jsonb
  and result->'message'->'attachment_mime' = 'null'::jsonb
  and result->'message'->'attachment_name' = 'null'::jsonb
  and result->'message'->'artwork_id' = 'null'::jsonb
  and result->'message'->'voice_duration_ms' = 'null'::jsonb
  from mc_results where name='removed_voice'), 'verified voice removal clears payload and returns exact owned descriptor');
select pg_temp.mc_assert(public.remove_own_message(pg_temp.mc_id('voice_good')) = (select result from mc_results where name='removed_voice'), 'lost-response voice retry recovers identical receipt');

do $$ declare fixture text; result jsonb;
begin
  foreach fixture in array array['voice_missing','voice_bad_owner','voice_wrong_chat','voice_avatar','legacy_image'] loop
    result := public.remove_own_message(pg_temp.mc_id(fixture));
    perform pg_temp.mc_assert(result->'removedAttachment' = 'null'::jsonb
      and result->'message'->>'body' = 'Message removed', fixture || ' never yields a guessed cleanup descriptor');
  end loop;
end; $$;
select pg_temp.mc_expect_denied('authenticated receipt SELECT denied', 'select * from public.message_removal_cleanup', '42501');
select pg_temp.mc_expect_denied('authenticated forged receipt INSERT denied',
  'insert into public.message_removal_cleanup(message_id,conversation_id,sender_id,bucket_id,object_path) values(pg_temp.mc_id(''text''),pg_temp.mc_id(''chat''),auth.uid(),''conversation-voice-notes'',''forged'')', '42501');
select pg_temp.mc_expect_denied('authenticated receipt UPDATE denied', 'update public.message_removal_cleanup set object_path=''forged'' where message_id=pg_temp.mc_id(''voice_good'')', '42501');
select pg_temp.mc_expect_denied('authenticated receipt DELETE denied', 'delete from public.message_removal_cleanup where message_id=pg_temp.mc_id(''voice_good'')', '42501');

reset role;
select pg_temp.mc_assert((select count(*)=1 from public.message_removal_cleanup where conversation_id=pg_temp.mc_id('chat')), 'only the verified voice receipt was created');
select pg_temp.mc_assert((select count(*)=2 from storage.objects where id in (pg_temp.mc_id('voice_good'),pg_temp.mc_id('voice_bad_owner'))), 'all storage metadata remains untouched after message removal');
select pg_temp.mc_assert((select count(*)=4 from public.notifications where conversation_id=pg_temp.mc_id('chat')), 'muted memberships created no extra notification rows');
select pg_temp.mc_assert((select count(*)=2 and bool_and(preview='Message removed') from public.notifications
  where id in (pg_temp.mc_id('notification_edit'),pg_temp.mc_id('notification_voice'))), 'remove neutralizes exact message notification previews');
select pg_temp.mc_assert((select count(*)=2 and bool_and(preview='Original synthetic notification quote') from public.notifications
  where id in (pg_temp.mc_id('notification_other'),pg_temp.mc_id('notification_nonmessage'))), 'unrelated message and nonmessage notification previews stay unchanged');
update public.notifications set preview='Stale synthetic quote' where id=pg_temp.mc_id('notification_edit');
set local role authenticated;
select pg_temp.mc_assert(public.remove_own_message(pg_temp.mc_id('version_text'))=(select result from mc_results where name='removed_text'), 'idempotent retry retains its tombstone while repairing a stale preview');
reset role;
select pg_temp.mc_assert((select preview='Message removed' from public.notifications where id=pg_temp.mc_id('notification_edit')), 'already-removed retry neutralizes stale notification preview');
select pg_temp.mc_assert((select jsonb_agg(to_jsonb(n)-'preview' order by n.id) from public.notifications n where n.conversation_id=pg_temp.mc_id('chat'))
  =(select result from mc_results where name='notification_identity'), 'edit removal and retry preserve all notification IDs read states and counts');

select pg_temp.mc_identity('member');
set local role authenticated;
select pg_temp.mc_assert(current_user='authenticated' and auth.uid()=pg_temp.mc_id('member'), 'second member identity is authenticated');
select pg_temp.mc_assert((public.nodeine_message_controls(pg_temp.mc_id('chat'))->>'enabled')::boolean, 'second member can check own capability');
select pg_temp.mc_expect_denied('member cannot edit sender message', 'select public.edit_own_message(pg_temp.mc_id(''text''),''forged'')', 'P0001');
select pg_temp.mc_expect_denied('member cannot remove sender message', 'select public.remove_own_message(pg_temp.mc_id(''text''))', 'P0001');
select pg_temp.mc_expect_denied('member cannot recover sender receipt', 'select public.remove_own_message(pg_temp.mc_id(''voice_good''))', 'P0001');
select pg_temp.mc_assert((public.edit_own_message(pg_temp.mc_id('member_text'),'Member revision')->>'body')='Member revision', 'second member can edit own text');
insert into mc_results values ('member_clear', public.clear_my_conversation(pg_temp.mc_id('chat')));
select pg_temp.mc_assert((select result->>'clearedBefore' is not null from mc_results where name='member_clear'), 'member clear returns a server cutoff');
reset role;
select pg_temp.mc_assert((select cleared_before is null from public.conversation_members
  where conversation_id=pg_temp.mc_id('chat') and profile_id=pg_temp.mc_id('sender')), 'member clear never changes sender cutoff');

-- Model a newer clear that acquired the row lock before an older request.
update public.conversation_members set cleared_before=statement_timestamp()+interval '1 day'
where conversation_id=pg_temp.mc_id('chat') and profile_id=pg_temp.mc_id('member');
insert into mc_results values ('newer_cutoff', (select jsonb_build_object('clearedBefore',cleared_before)
  from public.conversation_members where conversation_id=pg_temp.mc_id('chat') and profile_id=pg_temp.mc_id('member')));
update public.messages set created_at=(select (result->>'clearedBefore')::timestamptz + interval '1 microsecond' from mc_results where name='newer_cutoff')
where id=pg_temp.mc_id('after_clear');
select pg_temp.mc_identity('member');
set local role authenticated;
select pg_temp.mc_assert(public.clear_my_conversation(pg_temp.mc_id('chat')) = (select result from mc_results where name='newer_cutoff'), 'older-started clear cannot rewind stored cutoff or its response');
select pg_temp.mc_assert(public.nodeine_message_controls(pg_temp.mc_id('chat'))->>'clearedBefore' = (select result->>'clearedBefore' from mc_results where name='newer_cutoff'), 'capability reports the actual stored monotonic cutoff');
select pg_temp.mc_assert((select count(*)=1 and bool_and(id=pg_temp.mc_id('after_clear')) from public.messages
  where conversation_id=pg_temp.mc_id('chat') and created_at > (select (result->>'clearedBefore')::timestamptz from mc_results where name='newer_cutoff')), 'precision-preserving cutoff query keeps only post-cutoff fixture message');
select pg_temp.mc_assert((select count(*)>1 from public.messages where conversation_id=pg_temp.mc_id('chat')), 'clear remains presentation-only not row deletion or RLS erasure');
reset role;

-- Former-member and unrelated identities cannot use any controls RPC.
delete from public.conversation_members where conversation_id=pg_temp.mc_id('chat') and profile_id=pg_temp.mc_id('member');
select pg_temp.mc_identity('member');
set local role authenticated;
select pg_temp.mc_assert(auth.uid()=pg_temp.mc_id('member') and not public.is_conversation_member(pg_temp.mc_id('chat')), 'former member is no longer in fixture chat');
select pg_temp.mc_expect_denied('former capability denied', 'select public.nodeine_message_controls(pg_temp.mc_id(''chat''))','P0001');
select pg_temp.mc_expect_denied('former own edit denied', 'select public.edit_own_message(pg_temp.mc_id(''member_text''),''forged'')','P0001');
select pg_temp.mc_expect_denied('former own remove denied', 'select public.remove_own_message(pg_temp.mc_id(''member_text''))','P0001');
select pg_temp.mc_expect_denied('former clear denied', 'select public.clear_my_conversation(pg_temp.mc_id(''chat''))','P0001');
reset role;
select pg_temp.mc_identity('sender');
set local role authenticated;
select pg_temp.mc_assert((public.edit_own_message(pg_temp.mc_id('text'),'New text must not leak to a former recipient')->>'body')='New text must not leak to a former recipient',
  'current sender may still edit after recipient departure');
reset role;
select pg_temp.mc_assert((select preview='Message edited' from public.notifications where id=pg_temp.mc_id('notification_other')),
  'former recipient receives no replacement message body in notification preview');
select pg_temp.mc_assert((select jsonb_agg(to_jsonb(n)-'preview' order by n.id) from public.notifications n where n.conversation_id=pg_temp.mc_id('chat'))
  =(select result from mc_results where name='notification_identity'), 'departure edit preserves notification identities read states and counts');
select pg_temp.mc_identity('outsider');
set local role authenticated;
select pg_temp.mc_assert(auth.uid()=pg_temp.mc_id('outsider'), 'unrelated JWT subject is in scope only for simulation');
select pg_temp.mc_expect_denied('nonmember capability denied', 'select public.nodeine_message_controls(pg_temp.mc_id(''chat''))','P0001');
select pg_temp.mc_expect_denied('nonmember edit denied', 'select public.edit_own_message(pg_temp.mc_id(''text''),''forged'')','P0001');
select pg_temp.mc_expect_denied('nonmember remove denied', 'select public.remove_own_message(pg_temp.mc_id(''text''))','P0001');
select pg_temp.mc_expect_denied('nonmember clear denied', 'select public.clear_my_conversation(pg_temp.mc_id(''chat''))','P0001');
reset role;
delete from public.conversation_members where conversation_id=pg_temp.mc_id('chat') and profile_id=pg_temp.mc_id('sender');
select pg_temp.mc_identity('sender');
set local role authenticated;
select pg_temp.mc_expect_denied('former sender cannot recover private receipt', 'select public.remove_own_message(pg_temp.mc_id(''voice_good''))','P0001');
reset role;

-- An absent identity is not an expired JWT test. Expiry must be tested via HTTP.
select pg_temp.mc_identity(null);
set local role authenticated;
select pg_temp.mc_assert(current_user='authenticated' and auth.uid() is null, 'authenticated role with null subject is tested separately');
select pg_temp.mc_expect_denied('null identity capability denied','select public.nodeine_message_controls(pg_temp.mc_id(''chat''))','P0001');
select pg_temp.mc_expect_denied('null identity edit denied','select public.edit_own_message(pg_temp.mc_id(''text''),''forged'')','P0001');
select pg_temp.mc_expect_denied('null identity removal denied','select public.remove_own_message(pg_temp.mc_id(''text''))','P0001');
select pg_temp.mc_expect_denied('null identity clear denied','select public.clear_my_conversation(pg_temp.mc_id(''chat''))','P0001');
reset role;
set local role anon;
select pg_temp.mc_assert(current_user='anon' and auth.uid() is null, 'anonymous role has no authenticated identity');
select pg_temp.mc_expect_denied('anonymous capability EXECUTE denied','select public.nodeine_message_controls(pg_temp.mc_id(''chat''))','42501');
select pg_temp.mc_expect_denied('anonymous edit EXECUTE denied','select public.edit_own_message(pg_temp.mc_id(''text''),''forged'')','42501');
select pg_temp.mc_expect_denied('anonymous remove EXECUTE denied','select public.remove_own_message(pg_temp.mc_id(''text''))','42501');
select pg_temp.mc_expect_denied('anonymous clear EXECUTE denied','select public.clear_my_conversation(pg_temp.mc_id(''chat''))','42501');
select pg_temp.mc_expect_denied('anonymous receipt SELECT denied','select * from public.message_removal_cleanup','42501');
select pg_temp.mc_expect_denied('anonymous receipt INSERT denied',
  'insert into public.message_removal_cleanup(message_id,conversation_id,sender_id,bucket_id,object_path) values(pg_temp.mc_id(''text''),pg_temp.mc_id(''chat''),pg_temp.mc_id(''sender''),''conversation-voice-notes'',''forged'')','42501');
select pg_temp.mc_expect_denied('anonymous receipt UPDATE denied','update public.message_removal_cleanup set object_path=''forged'' where message_id=pg_temp.mc_id(''voice_good'')','42501');
select pg_temp.mc_expect_denied('anonymous receipt DELETE denied','delete from public.message_removal_cleanup where message_id=pg_temp.mc_id(''voice_good'')','42501');
reset role;

-- This is the assertion result, not the post-rollback check. Preserve it in the
-- authorized run output. Any unexpected SQLSTATE/error means NOT a passing run.
select count(*) as assertions_passed, jsonb_agg(label order by label) as passed_assertions
from mc_assertions;
do $$ begin
  if (select count(*) from mc_assertions) <> 92 then raise exception 'Incomplete controls rehearsal coverage: expected 92'; end if;
end; $$;
rollback;

-- A successful final query does not excuse earlier errors. No fixture rows or
-- schema additions may survive; this script requires an absent-controls baseline.
do $rollback_check$
begin
  if to_regprocedure('public.nodeine_message_controls(uuid)') is not null
    or to_regprocedure('public.edit_own_message(uuid,text)') is not null
    or to_regprocedure('public.remove_own_message(uuid)') is not null
    or to_regprocedure('public.clear_my_conversation(uuid)') is not null
    or to_regclass('public.message_removal_cleanup') is not null
    or to_regclass('pg_temp.mc_ids') is not null
    or exists (select 1 from pg_attribute where attrelid in ('public.messages'::regclass,'public.conversation_members'::regclass)
      and attname in ('edited_at','removed_at','cleared_before') and not attisdropped)
    or exists (select 1 from public.conversations where id in ('f7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000002'))
    or exists (select 1 from public.messages where id::text like 'f7000000-0000-4000-8000-%')
    or exists (select 1 from storage.objects where id::text like 'f7000000-0000-4000-8000-%')
    or exists (select 1 from public.notifications where id::text like 'f7000000-0000-4000-8000-%') then
    raise exception 'Controls rehearsal rollback postcondition failed';
  end if;
end;
$rollback_check$;
select true as rollback_restored,
  'Passing requires all earlier assertions with zero SQL errors. No JWT expiry, HTTP, physical deletion, realtime, browser, or actual concurrent-session claims.' as limitations;
