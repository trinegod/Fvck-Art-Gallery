-- NODEINE voice notes. Run after messages.sql and group-chat-expansion.sql.
-- Run only through an authorized database rollout, not automatically on deploy.
-- It is idempotent and must execute as one transaction.

begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

alter table public.messages
  add column if not exists voice_duration_ms integer;

alter table public.messages
  drop constraint if exists messages_voice_duration_ms_check;

alter table public.messages
  add constraint messages_voice_duration_ms_check
  check (voice_duration_ms is null or voice_duration_ms between 1 and 300000);

alter table public.messages
  drop constraint if exists messages_payload_check;

alter table public.messages
  add constraint messages_payload_check
  check (
    (message_type = 'text'
      and body is not null
      and artwork_id is null
      and attachment_path is null
      and voice_duration_ms is null)
    or
    (message_type = 'artwork'
      and artwork_id is not null
      and attachment_path is null
      and voice_duration_ms is null)
    or
    (message_type in ('image', 'video')
      and attachment_path is not null
      and artwork_id is null
      and attachment_mime is not null
      and voice_duration_ms is null)
    or
    (message_type = 'voice'
      and body is null
      and artwork_id is null
      and attachment_path is not null
      and attachment_mime is not null
      and attachment_mime in ('audio/webm', 'audio/mp4')
      and voice_duration_ms is not null
      and voice_duration_ms between 1 and 300000)
  );

create index if not exists messages_voice_sender_created_idx
  on public.messages (sender_id, created_at desc)
  where message_type = 'voice';

create or replace function public.nodeine_voice_notes_available()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid() is not null;
$$;

revoke all on function public.nodeine_voice_notes_available() from public;
revoke all on function public.nodeine_voice_notes_available() from anon;
grant execute on function public.nodeine_voice_notes_available() to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'conversation-voice-notes',
  'conversation-voice-notes',
  false,
  4194304,
  array['audio/webm', 'audio/mp4']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Conversation members can read private voice notes" on storage.objects;
create policy "Conversation members can read private voice notes"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'conversation-voice-notes'
    and cardinality(storage.foldername(name)) = 3
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = 'voice'
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Conversation members can upload own private voice notes" on storage.objects;
create policy "Conversation members can upload own private voice notes"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'conversation-voice-notes'
    and cardinality(storage.foldername(name)) = 3
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = 'voice'
    and (storage.foldername(name))[3] = auth.uid()::text
    and public.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Voice note owners and managers can delete voice notes" on storage.objects;
create policy "Voice note owners and managers can delete voice notes"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'conversation-voice-notes'
    and cardinality(storage.foldername(name)) = 3
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] = 'voice'
    and (
      owner_id::text = auth.uid()::text
      or public.can_manage_conversation(((storage.foldername(name))[1])::uuid)
    )
  );

create or replace function public.validate_voice_note_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  path_folders text[];
  filename text;
  stored_owner_id text;
  stored_mime text;
  stored_size text;
  recent_voice_count integer;
begin
  if new.message_type <> 'voice' then
    return new;
  end if;

  if auth.uid() is distinct from new.sender_id then
    raise exception 'Voice note sender must match the authenticated user.';
  end if;

  -- Do not trust a caller-controlled message timestamp for the rate-limit window.
  new.created_at := statement_timestamp();
  path_folders := storage.foldername(new.attachment_path);
  filename := storage.filename(new.attachment_path);

  if cardinality(path_folders) <> 3
    or path_folders[1] <> new.conversation_id::text
    or path_folders[2] <> 'voice'
    or path_folders[3] <> new.sender_id::text
    or filename !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webm|m4a)$'
    or (new.attachment_mime = 'audio/webm' and filename !~ '\.webm$')
    or (new.attachment_mime = 'audio/mp4' and filename !~ '\.m4a$') then
    raise exception 'Voice note storage path is invalid.';
  end if;

  select object.owner_id::text, object.metadata ->> 'mimetype', object.metadata ->> 'size'
    into stored_owner_id, stored_mime, stored_size
  from storage.objects as object
  where object.bucket_id = 'conversation-voice-notes'
    and object.name = new.attachment_path;

  if not found
    or stored_owner_id is distinct from new.sender_id::text
    or stored_mime is distinct from new.attachment_mime
    or stored_size is null
    or (case
      when stored_size ~ '^[0-9]+$' then stored_size::bigint not between 1 and 4194304
      else true
    end) then
    raise exception 'Voice note upload does not match this message.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text, 9357));
  select count(*) into recent_voice_count
  from public.messages
  where sender_id = new.sender_id
    and message_type = 'voice'
    and created_at >= statement_timestamp() - interval '1 minute';

  if recent_voice_count >= 6 then
    raise exception 'You can send up to six voice notes per minute.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_voice_note_message on public.messages;
create trigger validate_voice_note_message
  before insert on public.messages
  for each row
  execute function public.validate_voice_note_message();

commit;
