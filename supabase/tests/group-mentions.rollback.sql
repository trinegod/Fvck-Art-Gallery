-- ROLLBACK-ONLY group mention rehearsal, AFTER activated message-controls.sql.
-- Run the complete script on ONE privileged connection with stop-on-error.
-- Operator must inspect ALL enabled triggers and called functions on messages,
-- conversations, conversation_members, conversation_invites and notifications,
-- including recursively touched tables, for external/nontransactional effects.
-- This exercises role/RLS behavior, not JWT verification, realtime or HTTP.
-- Only three already-provisioned profiles are read as identities. No real IDs,
-- profile/auth writes, existing message bodies, storage or trigger bypass.
-- Fresh fixture messages legitimately create fixture notification rows, all rolled back.
-- More than 10 distinct targets / 49 recipients and true simultaneous sessions
-- require more provisioned actors/separate connections; source tests cover guards.
-- Never remove ROLLBACK. Replace NOT_REVIEWED only in an approved execution copy.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';
select set_config('nodeine.mentions_trigger_review', 'NOT_REVIEWED', true);
do $preflight$
begin
  if current_setting('nodeine.mentions_trigger_review', true) <> 'reviewed' then
    raise exception 'Stop: inspect trigger side effects before marking this rehearsal reviewed.';
  end if;
  if to_regprocedure('public.nodeine_message_controls(uuid)') is null then
    raise exception 'Stop: reviewed message controls must already be activated.';
  end if;
  if to_regprocedure('public.nodeine_group_mention_tokens(text)') is not null
    or exists (select 1 from pg_attribute
      where attrelid in ('public.messages'::regclass, 'public.notifications'::regclass)
        and attname in ('sent_mention_kind', 'mention_kind') and not attisdropped) then
    raise exception 'Stop: this rehearsal requires the not-yet-activated mentions baseline.';
  end if;
  if (select count(*) from (select id from public.profiles order by id limit 3) p) <> 3 then
    raise exception 'Stop: three normally provisioned profiles are required.';
  end if;
end;
$preflight$;

create temporary table gm_ids (name text primary key, id uuid not null unique, username text) on commit drop;
insert into gm_ids
select case row_number() over (order by id) when 1 then 'sender' when 2 then 'member' else 'third' end,
  id, username from (select id, username from public.profiles order by id limit 3) identities;
insert into gm_ids(name, id)
select name, ('f7100000-0000-4000-8000-' || lpad(ordinality::text, 12, '0'))::uuid
from unnest(array['chat', 'direct', 'foreign', 'invite', 'outsider',
  'person', 'ordinary', 'tokens', 'self', 'pending', 'everyone1', 'everyone2',
  'everyone3', 'member_broadcast', 'admin_broadcast', 'muted_person', 'muted_all',
  'direct_text', 'outsider_text', 'spoof_sender', 'spoof_marker', 'anon_text',
  'former_text', 'former_token', 'edited_original', 'rate1', 'rate2', 'rate3',
  'rate4', 'rate5', 'rate6', 'rate7', 'rate8', 'rate9', 'rate10', 'rate11',
  'dismissed', 'spoof_notification', 'post_clear', 'multi1', 'multi2'
]) with ordinality as fixtures(name, ordinality);
create temporary table gm_assertions (label text primary key) on commit drop;
create temporary table gm_snapshots (name text primary key, value text) on commit drop;
insert into gm_snapshots values
  ('notification_function', pg_get_functiondef('public.create_message_notifications()'::regprocedure)),
  ('notification_trigger', (select pg_get_triggerdef(oid) from pg_trigger
    where tgrelid = 'public.messages'::regclass and tgname = 'create_message_activity')),
  ('edit_function', pg_get_functiondef('public.edit_own_message(uuid,text)'::regprocedure)),
  ('remove_function', pg_get_functiondef('public.remove_own_message(uuid)'::regprocedure)),
  ('clear_function', pg_get_functiondef('public.clear_my_conversation(uuid)'::regprocedure)),
  ('delete_group_function', pg_get_functiondef('public.delete_group(uuid)'::regprocedure));

create function pg_temp.gm_id(label text) returns uuid language sql stable as $$
  select id from pg_temp.gm_ids where name = label;
$$;
create function pg_temp.gm_name(label text) returns text language sql stable as $$
  select username from pg_temp.gm_ids where name = label;
$$;
create function pg_temp.gm_assert(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Mentions rehearsal failed: %', label; end if;
  insert into pg_temp.gm_assertions values (label);
end;
$$;
create function pg_temp.gm_identity(actor text) returns void language plpgsql as $$
declare actor_id uuid := pg_temp.gm_id(actor);
begin
  perform set_config('request.jwt.claim.sub', coalesce(actor_id::text, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', actor_id, 'role', 'authenticated')::text, true);
end;
$$;
create function pg_temp.gm_denied(label text, command text, expected_state text) returns void language plpgsql as $$
declare rejected boolean := false;
begin
  begin
    execute command;
  exception when others then
    if sqlstate <> expected_state then
      raise exception 'Unexpected SQLSTATE % for % (expected %)', sqlstate, label, expected_state;
    end if;
    rejected := true;
  end;
  perform pg_temp.gm_assert(rejected, label);
end;
$$;
create function pg_temp.gm_send(message_label text, message_body text, chat_label text default 'chat')
returns void language sql as $$
  insert into public.messages(id, conversation_id, sender_id, body, message_type, created_at)
  values (pg_temp.gm_id(message_label), pg_temp.gm_id(chat_label), auth.uid(), message_body, 'text', '2000-01-01');
$$;

select pg_temp.gm_assert(not exists (select 1 from gm_ids f where f.username is null and (
  exists (select 1 from public.profiles p where p.id = f.id)
  or exists (select 1 from public.conversations c where c.id = f.id)
  or exists (select 1 from public.messages m where m.id = f.id)
  or exists (select 1 from public.conversation_invites i where i.id = f.id)
  or exists (select 1 from public.notifications n where n.id = f.id
    or n.conversation_id = f.id or n.message_id = f.id
    or n.source_key like 'message:' || f.id::text || ':%')
)), 'fixture identifiers and notification keys are unused');
select pg_temp.gm_assert((select bool_and(username ~ '^[a-zA-Z0-9][a-zA-Z0-9-]{2,29}$'
  and lower(username) <> 'everyone') and count(distinct lower(username)) = 3
  from gm_ids where username is not null), 'fixture usernames are distinct legal nonreserved tokens');
select pg_temp.gm_assert(has_function_privilege('authenticated','public.delete_group(uuid)','EXECUTE'),
  'baseline group deletion grant can be checked after rollback');
select pg_temp.gm_assert(not exists(select 1 from public.conversations where id::text like 'f7100000-0000-4000-8000-%')
  and not exists(select 1 from public.messages where id::text like 'f7100000-0000-4000-8000-%')
  and not exists(select 1 from public.conversation_invites where id::text like 'f7100000-0000-4000-8000-%')
  and not exists(select 1 from public.notifications
    where conversation_id::text like 'f7100000-0000-4000-8000-%'
       or message_id::text like 'f7100000-0000-4000-8000-%'
       or source_key like 'message:f7100000-0000-4000-8000-%'), 'entire rollback namespace is unused');

-- BEGIN EXACT GROUP-MENTIONS MIGRATION BODY
set local lock_timeout = '2s';
set local statement_timeout = '30s';

do $group_mentions_prerequisites$
begin
  if to_regprocedure('public.nodeine_message_controls(uuid)') is null
    or not exists (select 1 from pg_catalog.pg_trigger
      where tgrelid = 'public.messages'::regclass
        and tgname = 'prevent_spoofed_message_control_metadata' and not tgisinternal
        and tgfoid = 'public.prevent_spoofed_message_control_metadata()'::regprocedure
        and tgtype = 7 and tgenabled = 'O')
    or not exists (select 1 from pg_catalog.pg_trigger
      where tgrelid = 'public.messages'::regclass
        and tgname = 'create_message_activity' and not tgisinternal
        and tgfoid = 'public.create_message_notifications()'::regprocedure
        and tgtype = 5 and tgenabled = 'O') then
    raise exception 'Apply reviewed message controls and verify the existing AFTER INSERT message notification trigger first.';
  end if;
end;
$group_mentions_prerequisites$;

alter table public.messages add column if not exists sent_mention_kind text;
alter table public.notifications add column if not exists mention_kind text;
alter table public.messages drop constraint if exists messages_sent_mention_kind_check;
alter table public.messages add constraint messages_sent_mention_kind_check
  check (sent_mention_kind is null or sent_mention_kind in ('person', 'everyone'));
alter table public.notifications drop constraint if exists notifications_mention_kind_check;
alter table public.notifications add constraint notifications_mention_kind_check
  check (mention_kind is null or (kind = 'message' and mention_kind in ('person', 'everyone')));
comment on column public.messages.sent_mention_kind is
  'Server-only original-send group mention marker. Edits/removal do not reset rate history or issue new mentions.';
comment on column public.notifications.mention_kind is
  'Server-only original-send mention classification of an existing recipient-owned message notification.';
create index if not exists messages_sender_mentions_created_idx
  on public.messages(sender_id, created_at desc) where sent_mention_kind is not null;

-- Table grants override column revokes. Keep all currently used text/art/media/
-- voice insertion fields, but never let clients supply server-only markers.
-- Explicit edited_at/removed_at INSERTs are now denied by column privilege too.
revoke insert, update on table public.messages from public, anon, authenticated;
revoke all on table public.notifications from public, anon, authenticated;
do $group_mentions_column_grants$
declare relation_name text; column_names text;
begin
  foreach relation_name in array array['messages', 'notifications'] loop
    select string_agg(quote_ident(a.attname), ', ' order by a.attnum) into column_names
    from pg_catalog.pg_attribute a
    where a.attrelid = format('public.%I', relation_name)::regclass
      and a.attnum > 0 and not a.attisdropped;
    if relation_name = 'messages' then
      execute format('revoke insert (%s), update (%s) on table public.messages from public, anon, authenticated', column_names, column_names);
    else
      execute format('revoke all (%s) on table public.notifications from public, anon, authenticated', column_names);
    end if;
  end loop;
end;
$group_mentions_column_grants$;
grant insert (id, conversation_id, sender_id, body, created_at, message_type,
  artwork_id, attachment_path, attachment_mime, attachment_name, voice_duration_ms)
  on table public.messages to authenticated;
grant select, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

-- Whole-group deletion is already disabled in the UI pending private-storage
-- cleanup review. Enforce the same gate server-side: deleting a group would
-- also erase immutable mention-rate history. Preserve the administrator-owned
-- function definition; normal leave/edit/remove/clear operations are unchanged.
revoke all on function public.delete_group(uuid) from public, anon, authenticated;

-- Same scanner contract as the composer: 3–30 lowercase letters/digits/hyphens,
-- case-insensitive, whole token after start/whitespace/an opening bracket only.
-- This excludes email local-parts, doubled @, and /@name paths conservatively.
-- Final punctuation (including a period) ends a token. @everyone is reserved.
create or replace function public.nodeine_group_mention_tokens(message_body text)
returns text[] language sql immutable set search_path = '' as $$
  select array(select distinct captures[2]
    from regexp_matches(lower(coalesce(message_body, '')),
      '(^|[[:space:](\[{])@([a-z0-9][a-z0-9-]{2,29})(?![a-z0-9_-])', 'g') as captures
    order by captures[2]);
$$;
revoke all on function public.nodeine_group_mention_tokens(text) from public, anon, authenticated;

create or replace function public.validate_group_message_mentions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  tokens text[];
  broadcast boolean;
  direct_count integer;
  recipient_count integer;
  recent_mentions integer;
  recent_broadcasts integer;
  viewer_role text;
begin
  new.sent_mention_kind := null;
  if new.body is null or not exists (select 1 from public.conversations
    where id = new.conversation_id and kind = 'group') then return new; end if;
  tokens := public.nodeine_group_mention_tokens(new.body);
  if cardinality(tokens) = 0 then return new; end if;

  select role into viewer_role from public.conversation_members
  where conversation_id = new.conversation_id and profile_id = new.sender_id;
  if auth.uid() is distinct from new.sender_id or viewer_role is null then
    raise exception 'Only the authenticated current member can send group mentions.';
  end if;
  broadcast := 'everyone' = any(tokens);
  if broadcast and viewer_role not in ('owner', 'admin') then
    raise exception 'Only group owners and admins can use @everyone.';
  end if;
  -- Do not assume a case-insensitive unique profile index exists on legacy data.
  -- One token must never silently route to two people (including a self collision).
  if exists (select 1 from public.conversation_members member
    join public.profiles profile on profile.id = member.profile_id
    where member.conversation_id = new.conversation_id
      and lower(profile.username) <> 'everyone' and lower(profile.username) = any(tokens)
    group by lower(profile.username) having count(distinct member.profile_id) > 1) then
    raise exception 'A mentioned username is ambiguous in this group. Please remove that mention.';
  end if;
  select count(distinct member.profile_id) into direct_count
  from public.conversation_members member join public.profiles profile on profile.id = member.profile_id
  where member.conversation_id = new.conversation_id and member.profile_id <> new.sender_id
    and lower(profile.username) <> 'everyone' and lower(profile.username) = any(tokens);
  if direct_count > 10 then raise exception 'Mention up to 10 group members in one message.'; end if;
  if not broadcast and direct_count = 0 then return new; end if;
  select count(*) into recipient_count from public.conversation_members
  where conversation_id = new.conversation_id and profile_id <> new.sender_id;
  if recipient_count > 49 then raise exception 'Group mentions support up to 49 other current members.'; end if;

  -- Serialize this sender's checks across chats. Supabase's normal READ COMMITTED
  -- requests see prior commits after obtaining the lock. Count immutable send
  -- markers, not editable body text or dismissible notification rows.
  -- The approved controls trigger normalizes every INSERT created_at on server.
  -- Whole-group deletion is server-gated above so clients cannot erase history.
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Retry group mentions in a normal read-committed request.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text, 9411));
  select count(*), count(*) filter (where sent_mention_kind = 'everyone')
    into recent_mentions, recent_broadcasts
  from public.messages where sender_id = new.sender_id and sent_mention_kind is not null
    and created_at >= statement_timestamp() - interval '1 minute';
  if recent_mentions >= 10 then raise exception 'Send up to 10 messages with mentions per minute. Please wait and try again.'; end if;
  if broadcast and recent_broadcasts >= 2 then raise exception 'Use @everyone up to twice per minute. Please wait and try again.'; end if;
  new.sent_mention_kind := case when broadcast then 'everyone' else 'person' end;
  return new;
end;
$$;
revoke all on function public.validate_group_message_mentions() from public, anon, authenticated;
drop trigger if exists nodeine_validate_group_mentions on public.messages;
create trigger nodeine_validate_group_mentions before insert on public.messages
  for each row execute function public.validate_group_message_mentions();

-- The installed create_message_activity trigger is intentionally unchanged.
-- PostgreSQL runs same-event triggers alphabetically: classify its existing rows
-- afterward, without a second notification, new preview text, or changed count.
create or replace function public.classify_group_message_mentions()
returns trigger language plpgsql security definer set search_path = '' as $$
declare tokens text[];
begin
  if new.sent_mention_kind is null then return new; end if;
  tokens := public.nodeine_group_mention_tokens(new.body);
  update public.notifications notification
  set mention_kind = case when lower(profile.username) <> 'everyone' and lower(profile.username) = any(tokens)
    then 'person' else 'everyone' end
  from public.conversation_members member join public.profiles profile on profile.id = member.profile_id
  where notification.message_id = new.id and notification.conversation_id = new.conversation_id
    and notification.actor_id = new.sender_id and notification.kind = 'message'
    and notification.recipient_id = member.profile_id
    and member.conversation_id = new.conversation_id and member.profile_id <> new.sender_id
    and (member.muted_until is null or member.muted_until <= now())
    and (new.sent_mention_kind = 'everyone'
      or (lower(profile.username) <> 'everyone' and lower(profile.username) = any(tokens)))
    and exists (select 1 from public.conversations where id = new.conversation_id and kind = 'group');
  return new;
end;
$$;
revoke all on function public.classify_group_message_mentions() from public, anon, authenticated;
drop trigger if exists zz_nodeine_classify_group_mentions on public.messages;
create trigger zz_nodeine_classify_group_mentions after insert on public.messages
  for each row execute function public.classify_group_message_mentions();

-- END EXACT GROUP-MENTIONS MIGRATION BODY

-- The existing notification pipeline and approved controls must be byte-identical.
select pg_temp.gm_assert((select value = pg_get_functiondef('public.create_message_notifications()'::regprocedure)
  from gm_snapshots where name = 'notification_function'), 'existing notification function unchanged');
select pg_temp.gm_assert((select value = (select pg_get_triggerdef(oid) from pg_trigger
  where tgrelid = 'public.messages'::regclass and tgname = 'create_message_activity')
  from gm_snapshots where name = 'notification_trigger'), 'existing notification trigger unchanged');
select pg_temp.gm_assert((select value = pg_get_functiondef('public.edit_own_message(uuid,text)'::regprocedure)
  from gm_snapshots where name = 'edit_function')
  and (select value = pg_get_functiondef('public.remove_own_message(uuid)'::regprocedure)
  from gm_snapshots where name = 'remove_function')
  and (select value = pg_get_functiondef('public.clear_my_conversation(uuid)'::regprocedure)
  from gm_snapshots where name = 'clear_function'), 'approved controls functions unchanged');
select pg_temp.gm_assert((select value = pg_get_functiondef('public.delete_group(uuid)'::regprocedure)
  from gm_snapshots where name = 'delete_group_function')
  and not has_function_privilege('authenticated','public.delete_group(uuid)','EXECUTE')
  and not has_function_privilege('anon','public.delete_group(uuid)','EXECUTE'),
  'whole-group deletion is server gated without changing its definition');

-- Actual PostgreSQL parser tests (not a JavaScript model).
select pg_temp.gm_assert(public.nodeine_group_mention_tokens('@ADA @ada (@bob) [@cat] {@dog}' || chr(10) || '@eel.')
  = array['ada','bob','cat','dog','eel'], 'parser handles case deduplication brackets whitespace and punctuation');
select pg_temp.gm_assert(public.nodeine_group_mention_tokens(
  'email@ada.example sales+@ada.example "sales"@ada.example é@ada.example /@ada @@ada word@ada @ada_more @ab @' || repeat('x',31))
  = array[]::text[], 'parser excludes emails paths doubles short and overlong tokens');
select pg_temp.gm_assert(public.nodeine_group_mention_tokens(null) = array[]::text[]
  and public.nodeine_group_mention_tokens('@everyone @EVERYONE') = array['everyone'],
  'parser handles null and reserved broadcast');
select pg_temp.gm_assert(not has_table_privilege('authenticated','public.messages','INSERT')
  and has_column_privilege('authenticated','public.messages','body','INSERT')
  and has_column_privilege('authenticated','public.messages','voice_duration_ms','INSERT')
  and not has_column_privilege('authenticated','public.messages','sent_mention_kind','INSERT')
  and not has_column_privilege('authenticated','public.messages','sent_mention_kind','UPDATE'),
  'message payload grants exclude server marker');
select pg_temp.gm_assert(not has_table_privilege('authenticated','public.notifications','UPDATE')
  and has_column_privilege('authenticated','public.notifications','read_at','UPDATE')
  and not has_column_privilege('authenticated','public.notifications','mention_kind','UPDATE')
  and not has_table_privilege('authenticated','public.notifications','INSERT')
  and not has_table_privilege('anon','public.notifications','SELECT'),
  'notification grants keep only recipient read dismiss and read_at');

-- All inserts below target newly reserved conversations, never existing state.
-- No claims are set until fixture membership setup is complete.
insert into public.conversations(id, kind, title, direct_key, created_by) values
  (pg_temp.gm_id('chat'),'group','Rollback mention fixture',null,pg_temp.gm_id('sender')),
  (pg_temp.gm_id('foreign'),'group','Rollback foreign fixture',null,pg_temp.gm_id('member')),
  (pg_temp.gm_id('direct'),'direct',null,'rollback-mentions:' || pg_temp.gm_id('direct'),pg_temp.gm_id('sender'));
insert into public.conversation_members(conversation_id,profile_id,role) values
  (pg_temp.gm_id('chat'),pg_temp.gm_id('sender'),'owner'),
  (pg_temp.gm_id('chat'),pg_temp.gm_id('member'),'member'),
  (pg_temp.gm_id('foreign'),pg_temp.gm_id('member'),'owner'),
  (pg_temp.gm_id('foreign'),pg_temp.gm_id('third'),'member'),
  (pg_temp.gm_id('direct'),pg_temp.gm_id('sender'),'member'),
  (pg_temp.gm_id('direct'),pg_temp.gm_id('member'),'member');
insert into public.conversation_invites(id,conversation_id,invited_profile_id,invited_by)
values(pg_temp.gm_id('invite'),pg_temp.gm_id('chat'),pg_temp.gm_id('third'),pg_temp.gm_id('sender'));
do $temporary_grants$
begin
  execute format('grant usage on schema %I to authenticated, anon', pg_my_temp_schema()::regnamespace);
end;
$temporary_grants$;
grant select on gm_ids to authenticated, anon;
grant select, insert on gm_assertions to authenticated, anon;
grant select, insert, update on gm_snapshots to authenticated, anon;

select pg_temp.gm_identity('sender');
set local role authenticated;
select pg_temp.gm_send('person','Hello @' || upper(pg_temp.gm_name('member')) || ' @' || pg_temp.gm_name('member'));
select pg_temp.gm_send('ordinary','Ordinary original message');
select pg_temp.gm_send('self','@' || pg_temp.gm_name('sender'));
select pg_temp.gm_send('pending','@' || pg_temp.gm_name('third'));
select pg_temp.gm_send('tokens','sales+@' || pg_temp.gm_name('member') || '.example /@' || pg_temp.gm_name('member'));
select pg_temp.gm_send('direct_text','@everyone @' || pg_temp.gm_name('member'),'direct');
select pg_temp.gm_denied('client cannot insert mention marker',
  format('insert into public.messages(id,conversation_id,sender_id,body,sent_mention_kind) values (%L,%L,%L,%L,%L)',
    pg_temp.gm_id('spoof_marker'),pg_temp.gm_id('chat'),pg_temp.gm_id('sender'),'ordinary','everyone'), '42501');
select pg_temp.gm_denied('client cannot update mention marker',
  format('update public.messages set sent_mention_kind=null where id=%L',pg_temp.gm_id('person')), '42501');
select pg_temp.gm_denied('client cannot forge notification metadata',
  format('insert into public.notifications(id,recipient_id,actor_id,kind,source_key,mention_kind) values (%L,%L,%L,%L,%L,%L)',
    pg_temp.gm_id('spoof_notification'),pg_temp.gm_id('member'),pg_temp.gm_id('sender'),'message','rollback-forgery','everyone'), '42501');
select pg_temp.gm_denied('client cannot invoke internal token function',
  'select public.nodeine_group_mention_tokens(''@everyone'')','42501');
select pg_temp.gm_denied('group owner cannot bypass whole-group cleanup gate',
  format('select public.delete_group(%L)',pg_temp.gm_id('chat')),'42501');
reset role;
select pg_temp.gm_assert((select count(*)=1 and bool_and(mention_kind='person'
  and recipient_id=pg_temp.gm_id('member') and source_key=format('message:%s:%s',message_id,recipient_id))
  from public.notifications where message_id=pg_temp.gm_id('person')), 'person is one deduplicated recipient-owned notification');
select pg_temp.gm_assert((select sent_mention_kind='person' and created_at > '2020-01-01'
  from public.messages where id=pg_temp.gm_id('person')), 'server timestamp prevents backdated rate history');
select pg_temp.gm_assert((select count(*)=4 and bool_and(sent_mention_kind is null)
  from public.messages where id in (pg_temp.gm_id('ordinary'),pg_temp.gm_id('self'),pg_temp.gm_id('pending'),pg_temp.gm_id('tokens')))
  and (select count(*)=4 and bool_and(mention_kind is null) from public.notifications where message_id in
  (pg_temp.gm_id('ordinary'),pg_temp.gm_id('self'),pg_temp.gm_id('pending'),pg_temp.gm_id('tokens'))),
  'self pending malformed and ordinary messages keep normal notifications without mentions');
select pg_temp.gm_assert(not exists(select 1 from public.notifications where conversation_id=pg_temp.gm_id('chat')
  and recipient_id in(pg_temp.gm_id('sender'),pg_temp.gm_id('third'))), 'self and pending invite receive no group notification');
select pg_temp.gm_assert((select sent_mention_kind is null from public.messages where id=pg_temp.gm_id('direct_text'))
  and (select count(*)=1 and bool_and(mention_kind is null) from public.notifications where message_id=pg_temp.gm_id('direct_text')),
  'direct messages do not interpret mention tokens');

-- Recipient-owned read/dismiss remains usable; another recipient cannot mutate.
select pg_temp.gm_identity('member');
set local role authenticated;
update public.notifications set read_at='2025-01-01' where message_id=pg_temp.gm_id('person');
select pg_temp.gm_assert((select read_at='2025-01-01' from public.notifications where message_id=pg_temp.gm_id('person')),
  'recipient can still mark notification read');
select pg_temp.gm_denied('recipient cannot update mention classification',
  format('update public.notifications set mention_kind=''everyone'' where message_id=%L',pg_temp.gm_id('person')), '42501');
select pg_temp.gm_denied('ordinary member cannot broadcast',
  format('select pg_temp.gm_send(%L,%L)','member_broadcast','@everyone'),'P0001');
select pg_temp.gm_identity('third');
select pg_temp.gm_assert(not exists(select 1 from public.notifications where conversation_id=pg_temp.gm_id('chat')),
  'pending member cannot read other recipients notifications');
select pg_temp.gm_denied('pending member cannot send mentions',
  format('select pg_temp.gm_send(%L,%L)','outsider_text','@everyone'),'P0001');
select pg_temp.gm_identity('sender');
select pg_temp.gm_denied('sender cannot spoof another current member',
  format('insert into public.messages(id,conversation_id,sender_id,body) values (%L,%L,%L,%L)',
    pg_temp.gm_id('spoof_sender'),pg_temp.gm_id('chat'),pg_temp.gm_id('member'),'@' || pg_temp.gm_name('sender')),'P0001');
reset role;
select pg_temp.gm_identity('outsider');
set local role authenticated;
select pg_temp.gm_denied('unreferenced outsider cannot send mentions',
  format('select pg_temp.gm_send(%L,%L)','outsider_text','@everyone'),'P0001');
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role anon;
select pg_temp.gm_denied('anonymous cannot send messages',
  format('insert into public.messages(id,conversation_id,sender_id,body) values (%L,%L,%L,%L)',
    pg_temp.gm_id('anon_text'),pg_temp.gm_id('chat'),pg_temp.gm_id('sender'),'@everyone'),'42501');
select pg_temp.gm_denied('anonymous cannot read mention notifications','select * from public.notifications','42501');
reset role;

-- Join the third existing identity only to our fresh fixture group.
insert into public.conversation_members(conversation_id,profile_id,role)
values(pg_temp.gm_id('chat'),pg_temp.gm_id('third'),'admin');
select pg_temp.gm_identity('sender');
set local role authenticated;
select pg_temp.gm_send('everyone1','@everyone and @' || pg_temp.gm_name('member'));
select pg_temp.gm_send('everyone2','@EVERYONE');
select pg_temp.gm_denied('third broadcast within minute rejected',
  format('select pg_temp.gm_send(%L,%L)','everyone3','@everyone'),'P0001');
select pg_temp.gm_identity('third');
select pg_temp.gm_send('admin_broadcast','@everyone');
reset role;
select pg_temp.gm_assert((select count(*)=2 and count(*) filter(where mention_kind='person'
  and recipient_id=pg_temp.gm_id('member'))=1 and count(*) filter(where mention_kind='everyone'
  and recipient_id=pg_temp.gm_id('third'))=1 from public.notifications where message_id=pg_temp.gm_id('everyone1')),
  'mixed broadcast has person precedence without duplicate alerts');
select pg_temp.gm_assert((select count(*)=2 and bool_and(mention_kind='everyone')
  from public.notifications where message_id=pg_temp.gm_id('admin_broadcast')), 'current admin can broadcast');

-- Age ONLY our reserved fixture history to isolate subsequent rate cases.
update public.messages set created_at=statement_timestamp()-interval '2 minutes'
where conversation_id in(pg_temp.gm_id('chat'),pg_temp.gm_id('direct'));
select pg_temp.gm_identity('member');
set local role authenticated;
select public.set_conversation_mute(pg_temp.gm_id('chat'),now()+interval '1 day');
select pg_temp.gm_identity('sender');
select pg_temp.gm_send('muted_person','@' || pg_temp.gm_name('member'));
select pg_temp.gm_send('muted_all','@everyone');
reset role;
select pg_temp.gm_assert(not exists(select 1 from public.notifications
  where message_id in(pg_temp.gm_id('muted_person'),pg_temp.gm_id('muted_all'))
  and recipient_id=pg_temp.gm_id('member')), 'mute suppresses direct and everyone notifications');
select pg_temp.gm_assert((select count(*)=1 and bool_and(mention_kind is null) from public.notifications
  where message_id=pg_temp.gm_id('muted_person'))
  and (select count(*)=1 and bool_and(mention_kind='everyone') from public.notifications
  where message_id=pg_temp.gm_id('muted_all')), 'untargeted member keeps ordinary notification while unmuted broadcast is classified');
select pg_temp.gm_identity('member');
set local role authenticated;
select public.set_conversation_mute(pg_temp.gm_id('chat'),null);
reset role;

-- Edits/removal do not produce new alerts or erase anti-spam history.
insert into gm_snapshots select 'person_notification_id',id::text from public.notifications where message_id=pg_temp.gm_id('person');
delete from public.conversation_members where conversation_id=pg_temp.gm_id('chat') and profile_id=pg_temp.gm_id('member');
select pg_temp.gm_identity('member');
set local role authenticated;
select pg_temp.gm_denied('former member cannot send mentions',
  format('select pg_temp.gm_send(%L,%L)','former_text','@everyone'),'P0001');
select pg_temp.gm_identity('sender');
select public.edit_own_message(pg_temp.gm_id('person'),'Edited @everyone confidential replacement');
select public.edit_own_message(pg_temp.gm_id('ordinary'),'Newly added @everyone');
select pg_temp.gm_send('former_token','@' || pg_temp.gm_name('member'));
reset role;
select pg_temp.gm_assert((select count(*)=1 and bool_and(preview='Message edited'
  and mention_kind='person' and read_at='2025-01-01' and id::text=(select value from gm_snapshots where name='person_notification_id'))
  from public.notifications where message_id=pg_temp.gm_id('person')),
  'former recipient sees neutral edited preview with same identity read state and classification');
select pg_temp.gm_assert((select sent_mention_kind='person' from public.messages where id=pg_temp.gm_id('person'))
  and (select sent_mention_kind is null from public.messages where id=pg_temp.gm_id('ordinary'))
  and not exists(select 1 from public.notifications where message_id=pg_temp.gm_id('ordinary') and mention_kind is not null),
  'edits neither add mentions nor erase original marker');
select pg_temp.gm_assert((select sent_mention_kind is null from public.messages where id=pg_temp.gm_id('former_token'))
  and not exists(select 1 from public.notifications where message_id=pg_temp.gm_id('former_token')
    and recipient_id=pg_temp.gm_id('member')), 'former member token cannot target departed recipient');
select pg_temp.gm_identity('sender');
set local role authenticated;
select public.remove_own_message(pg_temp.gm_id('person'));
select public.remove_own_message(pg_temp.gm_id('person'));
reset role;
select pg_temp.gm_assert((select sent_mention_kind='person' and removed_at is not null
  from public.messages where id=pg_temp.gm_id('person'))
  and (select count(*)=1 and bool_and(preview='Message removed' and mention_kind='person'
    and id::text=(select value from gm_snapshots where name='person_notification_id'))
  from public.notifications where message_id=pg_temp.gm_id('person')),
  'remove and retry preserve marker and one neutral notification');
select pg_temp.gm_identity('member');
set local role authenticated;
delete from public.notifications where message_id=pg_temp.gm_id('person');
select pg_temp.gm_assert(not exists(select 1 from public.notifications where message_id=pg_temp.gm_id('person')),
  'recipient can dismiss existing notification after leaving group');
reset role;

-- Rate history is global per sender across groups and survives removals/dismissal.
-- Fixture aging is privileged and scoped; normal clients have no UPDATE grant.
update public.messages set created_at=statement_timestamp()-interval '2 minutes'
where conversation_id in(pg_temp.gm_id('chat'),pg_temp.gm_id('direct'));
select pg_temp.gm_identity('sender');
set local role authenticated;
do $rate_sends$
begin
  for i in 1..10 loop
    perform pg_temp.gm_send('rate' || i::text,'@' || pg_temp.gm_name('third'));
  end loop;
end;
$rate_sends$;
select public.remove_own_message(pg_temp.gm_id('rate1'));
select pg_temp.gm_identity('third');
delete from public.notifications where message_id in(pg_temp.gm_id('rate1'),pg_temp.gm_id('rate2'));
select pg_temp.gm_identity('sender');
select pg_temp.gm_denied('eleventh direct mention is rate limited despite removal and dismissal',
  format('select pg_temp.gm_send(%L,%L)','rate11','@' || pg_temp.gm_name('third')),'P0001');
select public.clear_my_conversation(pg_temp.gm_id('chat'));
select pg_temp.gm_denied('clear chat does not reset mention history',
  format('select pg_temp.gm_send(%L,%L)','rate11','@' || pg_temp.gm_name('third')),'P0001');
reset role;
select pg_temp.gm_assert((select count(*)=10 from public.messages where conversation_id=pg_temp.gm_id('chat')
  and sender_id=pg_temp.gm_id('sender') and sent_mention_kind is not null
  and created_at>=statement_timestamp()-interval '1 minute')
  and not exists(select 1 from public.messages where id=pg_temp.gm_id('rate11')), 'rate rejection leaves no partial message');
select pg_temp.gm_assert(not exists(select 1 from public.notifications where message_id=pg_temp.gm_id('rate11')),
  'rate rejection leaves no partial notification');

-- Age only the ten fixture rows, then prove recovery without deleting history.
update public.messages set created_at=statement_timestamp()-interval '2 minutes'
where id in(select id from gm_ids where name ~ '^rate[0-9]+$');
select pg_temp.gm_identity('sender');
set local role authenticated;
select pg_temp.gm_send('rate11','@' || pg_temp.gm_name('third'));
reset role;
select pg_temp.gm_assert((select sent_mention_kind='person' from public.messages where id=pg_temp.gm_id('rate11')),
  'rate window expiry accepts retry');

-- Nine current events plus a two-row statement: row two must reject atomically.
update public.messages set created_at=statement_timestamp()
where id in(select id from gm_ids where name ~ '^rate[1-8]$');
select pg_temp.gm_identity('sender');
set local role authenticated;
select pg_temp.gm_denied('multirow insert respects per-row serialized rate count',
  format('insert into public.messages(id,conversation_id,sender_id,body) values (%L,%L,%L,%L),(%L,%L,%L,%L)',
    pg_temp.gm_id('multi1'),pg_temp.gm_id('chat'),pg_temp.gm_id('sender'),'@' || pg_temp.gm_name('third'),
    pg_temp.gm_id('multi2'),pg_temp.gm_id('chat'),pg_temp.gm_id('sender'),'@' || pg_temp.gm_name('third')),'P0001');
reset role;
select pg_temp.gm_assert(not exists(select 1 from public.messages where id in(pg_temp.gm_id('multi1'),pg_temp.gm_id('multi2')))
  and not exists(select 1 from public.notifications where message_id in(pg_temp.gm_id('multi1'),pg_temp.gm_id('multi2'))),
  'rejected multirow statement leaves neither messages nor notifications');

select label, true as passed from gm_assertions order by label;
do $mandatory_gate$
begin
  if (select count(*) from gm_assertions) <> 50 then
    raise exception 'Stop: unexpected rehearsal assertion count.';
  end if;
end;
$mandatory_gate$;
rollback;

-- This result must be true after the complete rollback, including notifications.
select to_regprocedure('public.nodeine_message_controls(uuid)') is not null
  and has_function_privilege('authenticated','public.delete_group(uuid)','EXECUTE')
  and to_regprocedure('public.nodeine_group_mention_tokens(text)') is null
  and to_regprocedure('public.validate_group_message_mentions()') is null
  and to_regprocedure('public.classify_group_message_mentions()') is null
  and to_regclass('public.messages_sender_mentions_created_idx') is null
  and not exists(select 1 from pg_attribute where attrelid in
    ('public.messages'::regclass,'public.notifications'::regclass)
    and attname in('sent_mention_kind','mention_kind') and not attisdropped)
  and not exists(select 1 from public.conversations where id::text like 'f7100000-0000-4000-8000-%')
  and not exists(select 1 from public.messages where id::text like 'f7100000-0000-4000-8000-%')
  and not exists(select 1 from public.conversation_invites where id::text like 'f7100000-0000-4000-8000-%')
  and not exists(select 1 from public.notifications
    where conversation_id::text like 'f7100000-0000-4000-8000-%'
       or message_id::text like 'f7100000-0000-4000-8000-%'
       or source_key like 'message:f7100000-0000-4000-8000-%')
  as rollback_restored;
