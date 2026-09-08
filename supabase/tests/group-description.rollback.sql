-- ROLLBACK-ONLY shared group About rehearsal; never remove the final ROLLBACK.
-- Run ONE complete script on ONE privileged connection, stopping on any error.
-- Review triggers/called functions on conversations, conversation_members,
-- conversation_invites and recursively touched tables for nontransactional effects.
-- No existing profile/auth/message/notification/storage rows are written or read.
-- Two already-provisioned profile identities are read only; all fixture writes
-- use a collision-checked namespace. No trigger disabling or storage operations.
-- SQL role simulation does not verify real JWT/HTTP/browser/realtime behavior.
-- Concurrent editors are modeled with stale versions; simultaneous sessions
-- and actual lock scheduling remain a separate authorized integration check.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';
select set_config('nodeine.description_trigger_review', 'NOT_REVIEWED', true);
do $preflight$
begin
  if current_setting('nodeine.description_trigger_review', true) <> 'reviewed' then
    raise exception 'Stop: inspect fixture trigger side effects before marking the rehearsal reviewed.';
  end if;
  if to_regclass('public.group_descriptions') is not null
    or to_regprocedure('public.get_group_description(uuid)') is not null
    or to_regprocedure('public.update_group_description(uuid,text,timestamptz)') is not null then
    raise exception 'Stop: group About must not already be activated for this rehearsal.';
  end if;
  if to_regprocedure('public.nodeine_message_controls(uuid)') is null
    or to_regprocedure('public.validate_group_message_mentions()') is null then
    raise exception 'Stop: this preservation rehearsal expects activated controls and mentions.';
  end if;
  if (select count(*) from (select id from public.profiles order by id limit 2) p) <> 2 then
    raise exception 'Stop: two normally provisioned profile identities are required.';
  end if;
end;
$preflight$;
create temporary table gd_ids(name text primary key, id uuid not null unique) on commit drop;
insert into gd_ids values
  ('owner',(select id from public.profiles order by id limit 1)),
  ('member',(select id from public.profiles order by id offset 1 limit 1));
insert into gd_ids
select name,('f7200000-0000-4000-8000-' || lpad(ordinality::text,12,'0'))::uuid
from unnest(array['chat','direct','foreign','missing','invite','outsider'])
  with ordinality as fixture(name,ordinality);
create temporary table gd_assertions(label text primary key) on commit drop;
create temporary table gd_values(name text primary key,value jsonb) on commit drop;
create function pg_temp.gd_id(label text) returns uuid language sql stable as $$
  select id from pg_temp.gd_ids where name=label;
$$;
create function pg_temp.gd_assert(ok boolean,label text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Description rehearsal failed: %',label; end if;
  insert into pg_temp.gd_assertions values(label);
end;
$$;
create function pg_temp.gd_identity(actor text) returns void language plpgsql as $$
declare actor_id uuid := pg_temp.gd_id(actor);
begin
  perform set_config('request.jwt.claim.sub',coalesce(actor_id::text,''),true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
end;
$$;
create function pg_temp.gd_denied(label text,command text,expected_state text) returns void language plpgsql as $$
declare rejected boolean := false;
begin
  begin execute command;
  exception when others then
    if sqlstate <> expected_state then
      raise exception 'Unexpected SQLSTATE % in % (expected %)',sqlstate,label,expected_state;
    end if;
    rejected := true;
  end;
  perform pg_temp.gd_assert(rejected,label);
end;
$$;
-- Catalog-only fingerprint proves existing tables, policies, triggers, routines,
-- ownership and grants are untouched by this additive migration.
create function pg_temp.gd_existing_catalog() returns jsonb language sql stable as $$
  select jsonb_build_object(
    'tables',(select jsonb_agg(jsonb_build_array(c.oid,c.relowner,c.relacl,c.relrowsecurity) order by c.oid)
      from pg_class c where c.oid in ('public.conversations'::regclass,'public.conversation_members'::regclass,
      'public.messages'::regclass,'public.notifications'::regclass,'public.message_removal_cleanup'::regclass)),
    'columns',(select jsonb_agg(jsonb_build_array(attrelid,attnum,attacl) order by attrelid,attnum)
      from pg_attribute where attrelid in ('public.conversations'::regclass,'public.conversation_members'::regclass,
      'public.messages'::regclass,'public.notifications'::regclass,'public.message_removal_cleanup'::regclass) and attnum>0 and not attisdropped),
    'policies',(select jsonb_agg(jsonb_build_array(oid,polrelid,polname,polcmd,polroles,polqual::text,polwithcheck::text) order by oid)
      from pg_policy where polrelid in ('public.conversations'::regclass,'public.conversation_members'::regclass,
      'public.messages'::regclass,'public.notifications'::regclass,'public.message_removal_cleanup'::regclass)),
    'triggers',(select jsonb_agg(jsonb_build_array(oid,pg_get_triggerdef(oid),tgenabled) order by oid)
      from pg_trigger where tgrelid in ('public.conversations'::regclass,'public.conversation_members'::regclass,
      'public.messages'::regclass,'public.notifications'::regclass)
      -- The new FK necessarily adds its own internal parent-table triggers.
      -- Exclude only that new constraint; retain every historical trigger.
      and not exists(select 1 from pg_constraint new_fk where new_fk.oid=tgconstraint
        and new_fk.conrelid=to_regclass('public.group_descriptions'))),
    'routines',(select jsonb_agg(jsonb_build_array(p.oid,p.proowner,p.proacl,pg_get_functiondef(p.oid)) order by p.oid)
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in ('update_group_details','delete_group','leave_group',
      'edit_own_message','remove_own_message','clear_my_conversation','nodeine_message_controls',
      'validate_group_message_mentions','classify_group_message_mentions','nodeine_group_mention_tokens',
      'prevent_spoofed_message_control_metadata','create_message_notifications'))
  );
$$;
insert into gd_values values('catalog',pg_temp.gd_existing_catalog());
select pg_temp.gd_assert(not exists(select 1 from public.conversations where id::text like 'f7200000-0000-4000-8000-%')
  and not exists(select 1 from public.conversation_invites where id::text like 'f7200000-0000-4000-8000-%')
  and not exists(select 1 from public.profiles where id in(select id from gd_ids where name not in('owner','member'))),
  'fixture namespace is unused');
select pg_temp.gd_assert(not has_function_privilege('authenticated','public.delete_group(uuid)','EXECUTE'),
  'existing whole-group cleanup gate is active');

-- BEGIN EXACT GROUP-DESCRIPTION MIGRATION BODY
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

-- END EXACT GROUP-DESCRIPTION MIGRATION BODY

select pg_temp.gd_assert(pg_temp.gd_existing_catalog()=(select value from gd_values where name='catalog'),
  'existing controls mentions policies triggers and grants are byte-identical');
select pg_temp.gd_assert((select relrowsecurity from pg_class where oid='public.group_descriptions'::regclass)
  and exists(select 1 from pg_constraint where conrelid='public.group_descriptions'::regclass
    and confrelid='public.conversations'::regclass and contype='f' and confdeltype='c')
  and not has_table_privilege('authenticated','public.group_descriptions','SELECT')
  and not has_column_privilege('authenticated','public.group_descriptions','description','UPDATE')
  and not has_table_privilege('anon','public.group_descriptions','SELECT'),
  'description table is private with RLS and no client grants');
select pg_temp.gd_assert(has_function_privilege('authenticated','public.get_group_description(uuid)','EXECUTE')
  and has_function_privilege('authenticated','public.update_group_description(uuid,text,timestamptz)','EXECUTE')
  and not has_function_privilege('anon','public.get_group_description(uuid)','EXECUTE')
  and not has_function_privilege('anon','public.update_group_description(uuid,text,timestamptz)','EXECUTE'),
  'only authenticated roles can reach scoped description RPCs');

insert into public.conversations(id,kind,title,direct_key,created_by) values
  (pg_temp.gd_id('chat'),'group','Rollback About fixture',null,pg_temp.gd_id('owner')),
  (pg_temp.gd_id('foreign'),'group','Rollback other group',null,pg_temp.gd_id('member')),
  (pg_temp.gd_id('direct'),'direct',null,'rollback-description:' || pg_temp.gd_id('direct'),pg_temp.gd_id('owner'));
insert into public.conversation_members(conversation_id,profile_id,role) values
  (pg_temp.gd_id('chat'),pg_temp.gd_id('owner'),'owner'),
  (pg_temp.gd_id('foreign'),pg_temp.gd_id('member'),'owner'),
  (pg_temp.gd_id('direct'),pg_temp.gd_id('owner'),'member'),
  (pg_temp.gd_id('direct'),pg_temp.gd_id('member'),'member');
insert into public.conversation_invites(id,conversation_id,invited_profile_id,invited_by)
values(pg_temp.gd_id('invite'),pg_temp.gd_id('chat'),pg_temp.gd_id('member'),pg_temp.gd_id('owner'));
do $temporary_grants$
begin
  execute format('grant usage on schema %I to authenticated, anon',pg_my_temp_schema()::regnamespace);
end;
$temporary_grants$;
grant select on gd_ids to authenticated,anon;
grant select,insert on gd_assertions to authenticated,anon;
grant select,insert,update on gd_values to authenticated,anon;

select pg_temp.gd_identity('owner');
set local role authenticated;
insert into gd_values values('initial',public.get_group_description(pg_temp.gd_id('chat')));
select pg_temp.gd_assert((select value->>'description'='' and value->>'can_edit'='true'
  and value->'updated_at'='null'::jsonb and value->>'conversation_id'=pg_temp.gd_id('chat')::text
  from gd_values where name='initial'),'unset About is empty with null version and current owner permission');
insert into gd_values values('first',public.update_group_description(pg_temp.gd_id('chat'),E' \tFirst paragraph\nSecond paragraph' || chr(11),null));
select pg_temp.gd_assert((select value->>'description'=E'First paragraph\nSecond paragraph'
  and value->>'can_edit'='true' and value->>'updated_at' is not null from gd_values where name='first'),
  'owner saves normalized multiline About with database version');
select pg_temp.gd_denied('second initial editor cannot overwrite first description',
  format('select public.update_group_description(%L,%L,null)',pg_temp.gd_id('chat'),'Stale initial draft'),'40001');
select pg_temp.gd_denied('owner cannot directly read description table','select * from public.group_descriptions','42501');
select pg_temp.gd_denied('owner cannot directly insert description rows',
  format('insert into public.group_descriptions(conversation_id,description) values(%L,%L)',pg_temp.gd_id('chat'),'spoof'),'42501');
select pg_temp.gd_denied('owner cannot directly update description or server version',
  format('update public.group_descriptions set description=%L,updated_at=now() where conversation_id=%L','spoof',pg_temp.gd_id('chat')),'42501');
select pg_temp.gd_denied('owner cannot directly delete description',
  format('delete from public.group_descriptions where conversation_id=%L',pg_temp.gd_id('chat')),'42501');
select pg_temp.gd_denied('group owner cannot read another group About',
  format('select public.get_group_description(%L)',pg_temp.gd_id('foreign')),'P0001');
select pg_temp.gd_denied('group owner cannot write another group About',
  format('select public.update_group_description(%L,%L,null)',pg_temp.gd_id('foreign'),'foreign spoof'),'P0001');
select pg_temp.gd_denied('direct conversation cannot read About',
  format('select public.get_group_description(%L)',pg_temp.gd_id('direct')),'P0001');
select pg_temp.gd_denied('direct conversation cannot gain About',
  format('select public.update_group_description(%L,%L,null)',pg_temp.gd_id('direct'),'direct spoof'),'P0001');
select pg_temp.gd_denied('missing conversation cannot be used as About target',
  format('select public.get_group_description(%L)',pg_temp.gd_id('missing')),'P0001');
select pg_temp.gd_identity('member');
select pg_temp.gd_denied('pending invitation is not read membership',
  format('select public.get_group_description(%L)',pg_temp.gd_id('chat')),'P0001');
select pg_temp.gd_denied('pending invitation is not write authority',
  format('select public.update_group_description(%L,%L,null)',pg_temp.gd_id('chat'),'pending spoof'),'P0001');
reset role;

-- All role changes apply only to the fresh fixture group.
insert into public.conversation_members(conversation_id,profile_id,role)
values(pg_temp.gd_id('chat'),pg_temp.gd_id('member'),'member');
select pg_temp.gd_identity('member');
set local role authenticated;
insert into gd_values values('member_read',public.get_group_description(pg_temp.gd_id('chat')));
select pg_temp.gd_assert((select value->>'description'=E'First paragraph\nSecond paragraph'
  and value->>'can_edit'='false' from gd_values where name='member_read'),
  'current ordinary member can read shared About but cannot edit');
select pg_temp.gd_denied('ordinary member cannot update even with exact current version',
  format('select public.update_group_description(%L,%L,%L)',pg_temp.gd_id('chat'),'member spoof',
    (select value->>'updated_at' from gd_values where name='first')),'P0001');
reset role;
update public.conversation_members set role='admin'
where conversation_id=pg_temp.gd_id('chat') and profile_id=pg_temp.gd_id('member');
select pg_temp.gd_identity('member');
set local role authenticated;
insert into gd_values values('admin',public.update_group_description(pg_temp.gd_id('chat'),'Admin revision',
  (select (value->>'updated_at')::timestamptz from gd_values where name='first')));
select pg_temp.gd_assert((select value->>'description'='Admin revision' and value->>'can_edit'='true'
  and (value->>'updated_at')::timestamptz >
    (select (value->>'updated_at')::timestamptz from gd_values where name='first')
  from gd_values where name='admin'),'current admin can save with strictly advancing version');
select pg_temp.gd_identity('owner');
select pg_temp.gd_denied('stale owner editor cannot overwrite newer admin About',
  format('select public.update_group_description(%L,%L,%L)',pg_temp.gd_id('chat'),'stale owner',
    (select value->>'updated_at' from gd_values where name='first')),'40001');
insert into gd_values values('same',public.update_group_description(pg_temp.gd_id('chat'),'Admin revision',
  (select (value->>'updated_at')::timestamptz from gd_values where name='admin')));
select pg_temp.gd_assert((select value from gd_values where name='same')=(select value from gd_values where name='admin'),
  'same text and current version is idempotent without timestamp churn');
insert into gd_values values('max',public.update_group_description(pg_temp.gd_id('chat'),repeat('🦊',500),
  (select (value->>'updated_at')::timestamptz from gd_values where name='same')));
select pg_temp.gd_assert((select char_length(value->>'description')=500 from gd_values where name='max'),
  '500 Unicode code points are accepted');
select pg_temp.gd_denied('501 Unicode code points are rejected atomically',
  format('select public.update_group_description(%L,%L,%L)',pg_temp.gd_id('chat'),repeat('🦊',501),
    (select value->>'updated_at' from gd_values where name='max')),'P0001');
select pg_temp.gd_assert(public.get_group_description(pg_temp.gd_id('chat'))=(select value from gd_values where name='max'),
  'oversized rejection preserves description and version');
insert into gd_values values('clear',public.update_group_description(pg_temp.gd_id('chat'),null,
  (select (value->>'updated_at')::timestamptz from gd_values where name='max')));
select pg_temp.gd_assert((select value->>'description'='' and value->>'updated_at' is not null
  from gd_values where name='clear'),'explicit empty About keeps a version for stale-editor protection');
reset role;

-- Deterministic future fixture models old statement timestamps waiting on writes.
update public.group_descriptions set updated_at='2099-01-01 00:00:00.000001+00'
where conversation_id=pg_temp.gd_id('chat');
select pg_temp.gd_identity('owner');
set local role authenticated;
insert into gd_values values('monotonic',public.update_group_description(pg_temp.gd_id('chat'),'Future-version fixture',
  '2099-01-01 00:00:00.000001+00'));
select pg_temp.gd_assert((select (value->>'updated_at')::timestamptz='2099-01-01 00:00:00.000002+00'::timestamptz
  from gd_values where name='monotonic'),'accepted save preserves microsecond monotonicity despite earlier statement time');
reset role;
update public.conversation_members set role='member'
where conversation_id=pg_temp.gd_id('chat') and profile_id=pg_temp.gd_id('member');
select pg_temp.gd_identity('member');
set local role authenticated;
select pg_temp.gd_denied('demoted administrator cannot save a previously opened draft',
  format('select public.update_group_description(%L,%L,%L)',pg_temp.gd_id('chat'),'demoted spoof',
    (select value->>'updated_at' from gd_values where name='monotonic')),'P0001');
reset role;
delete from public.conversation_members
where conversation_id=pg_temp.gd_id('chat') and profile_id=pg_temp.gd_id('member');
select pg_temp.gd_identity('member');
set local role authenticated;
select pg_temp.gd_denied('former member cannot read retained About',
  format('select public.get_group_description(%L)',pg_temp.gd_id('chat')),'P0001');
select pg_temp.gd_denied('former member cannot update retained About',
  format('select public.update_group_description(%L,%L,%L)',pg_temp.gd_id('chat'),'former spoof',
    (select value->>'updated_at' from gd_values where name='monotonic')),'P0001');
select pg_temp.gd_identity('outsider');
select pg_temp.gd_denied('unreferenced outsider cannot read About',
  format('select public.get_group_description(%L)',pg_temp.gd_id('chat')),'P0001');
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select pg_temp.gd_denied('missing identity cannot read About',
  format('select public.get_group_description(%L)',pg_temp.gd_id('chat')),'P0001');
reset role;
set local role anon;
select pg_temp.gd_denied('anonymous cannot call read RPC',
  format('select public.get_group_description(%L)',pg_temp.gd_id('chat')),'42501');
select pg_temp.gd_denied('anonymous cannot call update RPC',
  format('select public.update_group_description(%L,%L,null)',pg_temp.gd_id('chat'),'anon spoof'),'42501');
reset role;
select pg_temp.gd_assert((select count(*)=1 and bool_and(conversation_id=pg_temp.gd_id('chat'))
  from public.group_descriptions),'no denied action creates an out-of-scope description');
select pg_temp.gd_assert(pg_temp.gd_existing_catalog()=(select value from gd_values where name='catalog'),
  'all historical controls grants and policies remain unchanged after rehearsal operations');

select label,true as passed from gd_assertions order by label;
do $mandatory_gate$
begin
  if (select count(*) from gd_assertions) <> 38 then
    raise exception 'Stop: unexpected description rehearsal assertion count.';
  end if;
end;
$mandatory_gate$;
rollback;
select to_regclass('public.group_descriptions') is null
  and to_regprocedure('public.get_group_description(uuid)') is null
  and to_regprocedure('public.update_group_description(uuid,text,timestamptz)') is null
  and to_regprocedure('public.nodeine_message_controls(uuid)') is not null
  and to_regprocedure('public.validate_group_message_mentions()') is not null
  and not has_function_privilege('authenticated','public.delete_group(uuid)','EXECUTE')
  and not exists(select 1 from public.conversations where id::text like 'f7200000-0000-4000-8000-%')
  and not exists(select 1 from public.conversation_invites where id::text like 'f7200000-0000-4000-8000-%')
  as rollback_restored;
