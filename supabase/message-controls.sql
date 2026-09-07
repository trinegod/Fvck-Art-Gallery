-- NODEINE message controls. Run after voice-notes.sql.
-- This migration uses per-member presentation cutoffs for "Clear chat for me".
-- A cutoff is not cryptographic erasure: message SELECT remains membership-wide
-- so existing conversation, storage, and RPC authorization continue to work.

begin;

alter table public.messages
  add column if not exists edited_at timestamptz,
  add column if not exists removed_at timestamptz;

alter table public.conversation_members
  add column if not exists cleared_before timestamptz;

-- Existing application writes use INSERT for messages and a column-scoped
-- last_read_at update for memberships. Keep the new control metadata RPC-only.
revoke update, delete on table public.messages from authenticated;
revoke update (cleared_before) on table public.conversation_members from authenticated;

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
revoke all on table public.message_removal_cleanup from public;
revoke all on table public.message_removal_cleanup from authenticated;

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
      edited_at = statement_timestamp()
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
      removed_at = statement_timestamp()
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
  set cleared_before = cutoff
  where member.conversation_id = target_conversation_id
    and member.profile_id = viewer_id;

  if not found then
    raise exception 'You are not a member of this conversation.';
  end if;

  return jsonb_build_object('clearedBefore', cutoff);
end;
$$;

revoke all on function public.nodeine_message_controls(uuid) from public;
revoke all on function public.edit_own_message(uuid, text) from public;
revoke all on function public.remove_own_message(uuid) from public;
revoke all on function public.clear_my_conversation(uuid) from public;

grant execute on function public.nodeine_message_controls(uuid) to authenticated;
grant execute on function public.edit_own_message(uuid, text) to authenticated;
grant execute on function public.remove_own_message(uuid) to authenticated;
grant execute on function public.clear_my_conversation(uuid) to authenticated;

commit;
