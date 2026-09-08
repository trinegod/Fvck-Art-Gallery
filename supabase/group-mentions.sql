-- NODEINE original-send group mentions. Apply AFTER message-controls.sql.
-- Existing message INSERT and notification creation remain the public workflow.
-- Clients send body text only, never recipient IDs or mention metadata.
begin;
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

commit;
