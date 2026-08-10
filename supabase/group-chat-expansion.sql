-- NODEINE group-chat expansion
-- Run after messages.sql, notifications.sql, and saves.sql.
-- Safe to rerun: schema changes, policies, functions, buckets, and realtime
-- publication membership are all idempotent.

alter table public.conversations
  add column if not exists avatar_path text;

alter table public.conversation_members
  add column if not exists muted_until timestamptz;

alter table public.conversation_members
  drop constraint if exists conversation_members_role_check;

alter table public.conversation_members
  add constraint conversation_members_role_check
  check (role in ('owner', 'admin', 'member'));

alter table public.messages
  add column if not exists message_type text not null default 'text',
  add column if not exists artwork_id uuid,
  add column if not exists attachment_path text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_name text;

alter table public.messages
  alter column body drop not null;

alter table public.messages
  drop constraint if exists messages_body_check;

alter table public.messages
  add constraint messages_body_check
  check (
    body is null
    or char_length(btrim(body)) between 1 and 2000
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_artwork_id_fkey'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_artwork_id_fkey
      foreign key (artwork_id) references public.artworks(id) on delete set null;
  end if;
end
$$;

alter table public.messages
  drop constraint if exists messages_payload_check;

alter table public.messages
  add constraint messages_payload_check
  check (
    (message_type = 'text'
      and body is not null
      and artwork_id is null
      and attachment_path is null)
    or
    (message_type = 'artwork'
      and artwork_id is not null
      and attachment_path is null)
    or
    (message_type in ('image', 'video')
      and attachment_path is not null
      and artwork_id is null
      and attachment_mime is not null)
  );

create index if not exists messages_artwork_created_idx
  on public.messages (artwork_id, created_at desc)
  where artwork_id is not null;

create table if not exists public.conversation_invites (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  invited_profile_id uuid not null,
  invited_by uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint conversation_invites_conversation_profile_key
    unique (conversation_id, invited_profile_id),
  constraint conversation_invites_conversation_id_fkey
    foreign key (conversation_id) references public.conversations(id) on delete cascade,
  constraint conversation_invites_invited_profile_id_fkey
    foreign key (invited_profile_id) references public.profiles(id) on delete cascade,
  constraint conversation_invites_invited_by_fkey
    foreign key (invited_by) references public.profiles(id) on delete cascade,
  constraint conversation_invites_not_self_check
    check (invited_profile_id <> invited_by)
);

create index if not exists conversation_invites_profile_status_idx
  on public.conversation_invites (invited_profile_id, status, created_at desc);

create index if not exists conversation_invites_conversation_status_idx
  on public.conversation_invites (conversation_id, status, created_at desc);

create table if not exists public.conversation_reports (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  reporter_id uuid not null,
  reported_profile_id uuid,
  message_id uuid,
  reason text not null
    check (reason in ('spam', 'harassment', 'copyright', 'unsafe', 'other')),
  details text,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint conversation_reports_conversation_id_fkey
    foreign key (conversation_id) references public.conversations(id) on delete cascade,
  constraint conversation_reports_reporter_id_fkey
    foreign key (reporter_id) references public.profiles(id) on delete cascade,
  constraint conversation_reports_reported_profile_id_fkey
    foreign key (reported_profile_id) references public.profiles(id) on delete set null,
  constraint conversation_reports_message_id_fkey
    foreign key (message_id) references public.messages(id) on delete set null,
  constraint conversation_reports_details_check
    check (details is null or char_length(btrim(details)) between 1 and 1000),
  constraint conversation_reports_not_self_check
    check (reported_profile_id is null or reported_profile_id <> reporter_id)
);

create index if not exists conversation_reports_status_created_idx
  on public.conversation_reports (status, created_at desc);

create index if not exists conversation_reports_reporter_created_idx
  on public.conversation_reports (reporter_id, created_at desc);

alter table public.conversation_invites enable row level security;
alter table public.conversation_reports enable row level security;

create or replace function public.conversation_member_role(
  target_conversation_id uuid,
  target_profile_id uuid default auth.uid()
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select member.role
  from public.conversation_members as member
  where member.conversation_id = target_conversation_id
    and member.profile_id = target_profile_id
  limit 1;
$$;

create or replace function public.can_manage_conversation(
  target_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.conversation_member_role(target_conversation_id, auth.uid())
      in ('owner', 'admin'),
    false
  );
$$;

revoke all on function public.conversation_member_role(uuid, uuid) from public;
revoke all on function public.can_manage_conversation(uuid) from public;
grant execute on function public.can_manage_conversation(uuid) to authenticated;

grant select on table public.conversation_invites to authenticated;
grant select on table public.conversation_reports to authenticated;

drop policy if exists "Invitees and managers can read invitations"
  on public.conversation_invites;
create policy "Invitees and managers can read invitations"
  on public.conversation_invites
  for select
  to authenticated
  using (
    invited_profile_id = auth.uid()
    or public.can_manage_conversation(conversation_id)
  );

drop policy if exists "Reporters can read their reports"
  on public.conversation_reports;
create policy "Reporters can read their reports"
  on public.conversation_reports
  for select
  to authenticated
  using (reporter_id = auth.uid());

create or replace function public.create_group_conversation(
  conversation_title text,
  member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  clean_title text := btrim(conversation_title);
  target_conversation_id uuid;
  invited_count integer;
begin
  if viewer_id is null then
    raise exception 'You must be signed in to create a group.';
  end if;

  if char_length(clean_title) not between 1 and 80 then
    raise exception 'Group names must be between 1 and 80 characters.';
  end if;

  if coalesce(array_length(member_ids, 1), 0) > 20 then
    raise exception 'Groups can include up to 20 initial invitations.';
  end if;

  insert into public.conversations (kind, title, created_by)
  values ('group', clean_title, viewer_id)
  returning id into target_conversation_id;

  insert into public.conversation_members (
    conversation_id,
    profile_id,
    role,
    last_read_at
  )
  values (target_conversation_id, viewer_id, 'owner', now());

  insert into public.conversation_invites (
    conversation_id,
    invited_profile_id,
    invited_by
  )
  select target_conversation_id, profile.id, viewer_id
  from public.profiles as profile
  where profile.id = any(coalesce(member_ids, array[]::uuid[]))
    and profile.id <> viewer_id
  on conflict (conversation_id, invited_profile_id) do update
    set status = 'pending',
        invited_by = excluded.invited_by,
        created_at = now(),
        responded_at = null;

  get diagnostics invited_count = row_count;

  if invited_count < 1 then
    raise exception 'Select at least one other creator for the group.';
  end if;

  return target_conversation_id;
end;
$$;

revoke all on function public.create_group_conversation(text, uuid[]) from public;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;

create or replace function public.invite_to_group(
  target_conversation_id uuid,
  target_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  target_invite_id uuid;
  participant_count integer;
begin
  if viewer_id is null then
    raise exception 'You must be signed in to invite someone.';
  end if;

  if not public.can_manage_conversation(target_conversation_id) then
    raise exception 'Only group owners and admins can invite members.';
  end if;

  if not exists (
    select 1
    from public.conversations
    where id = target_conversation_id and kind = 'group'
  ) then
    raise exception 'Invitations are only available for group chats.';
  end if;

  if target_profile_id is null or target_profile_id = viewer_id then
    raise exception 'Choose another creator to invite.';
  end if;

  if not exists (select 1 from public.profiles where id = target_profile_id) then
    raise exception 'That creator profile no longer exists.';
  end if;

  if exists (
    select 1
    from public.conversation_members
    where conversation_id = target_conversation_id
      and profile_id = target_profile_id
  ) then
    raise exception 'That creator is already in this group.';
  end if;

  select
    (select count(*) from public.conversation_members
      where conversation_id = target_conversation_id)
    +
    (select count(*) from public.conversation_invites
      where conversation_id = target_conversation_id
        and status = 'pending')
  into participant_count;

  if participant_count >= 50 then
    raise exception 'Groups can include up to 50 members and pending invitations.';
  end if;

  insert into public.conversation_invites (
    conversation_id,
    invited_profile_id,
    invited_by,
    status,
    created_at,
    responded_at
  )
  values (
    target_conversation_id,
    target_profile_id,
    viewer_id,
    'pending',
    now(),
    null
  )
  on conflict (conversation_id, invited_profile_id) do update
    set invited_by = excluded.invited_by,
        status = 'pending',
        created_at = now(),
        responded_at = null
  returning id into target_invite_id;

  return target_invite_id;
end;
$$;

revoke all on function public.invite_to_group(uuid, uuid) from public;
grant execute on function public.invite_to_group(uuid, uuid) to authenticated;

create or replace function public.cancel_group_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_conversation_id uuid;
begin
  select invite.conversation_id into target_conversation_id
  from public.conversation_invites as invite
  where invite.id = target_invite_id and invite.status = 'pending'
  for update;

  if target_conversation_id is null then
    raise exception 'That invitation is no longer pending.';
  end if;

  if not public.can_manage_conversation(target_conversation_id) then
    raise exception 'Only group owners and admins can cancel invitations.';
  end if;

  update public.conversation_invites
  set status = 'cancelled', responded_at = now()
  where id = target_invite_id;
end;
$$;

revoke all on function public.cancel_group_invite(uuid) from public;
grant execute on function public.cancel_group_invite(uuid) to authenticated;

create or replace function public.respond_to_group_invite(
  target_invite_id uuid,
  accept_invite boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  target_invite public.conversation_invites%rowtype;
begin
  if viewer_id is null then
    raise exception 'You must be signed in to respond to an invitation.';
  end if;

  select * into target_invite
  from public.conversation_invites
  where id = target_invite_id
    and invited_profile_id = viewer_id
    and status = 'pending'
  for update;

  if target_invite.id is null then
    raise exception 'That invitation is no longer available.';
  end if;

  if accept_invite then
    insert into public.conversation_members (
      conversation_id,
      profile_id,
      role,
      last_read_at
    )
    values (
      target_invite.conversation_id,
      viewer_id,
      'member',
      now()
    )
    on conflict (conversation_id, profile_id) do nothing;
  end if;

  update public.conversation_invites
  set status = case when accept_invite then 'accepted' else 'declined' end,
      responded_at = now()
  where id = target_invite.id;

  return target_invite.conversation_id;
end;
$$;

revoke all on function public.respond_to_group_invite(uuid, boolean) from public;
grant execute on function public.respond_to_group_invite(uuid, boolean) to authenticated;

create or replace function public.list_my_group_invites()
returns table (
  invite_id uuid,
  conversation_id uuid,
  conversation_title text,
  avatar_path text,
  invited_by uuid,
  invited_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    invite.id,
    conversation.id,
    conversation.title,
    conversation.avatar_path,
    invite.invited_by,
    invite.created_at
  from public.conversation_invites as invite
  join public.conversations as conversation
    on conversation.id = invite.conversation_id
  where invite.invited_profile_id = auth.uid()
    and invite.status = 'pending'
  order by invite.created_at desc;
$$;

revoke all on function public.list_my_group_invites() from public;
grant execute on function public.list_my_group_invites() to authenticated;

create or replace function public.update_group_details(
  target_conversation_id uuid,
  new_title text,
  new_avatar_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_title text := btrim(new_title);
begin
  if not public.can_manage_conversation(target_conversation_id) then
    raise exception 'Only group owners and admins can edit group details.';
  end if;

  if char_length(clean_title) not between 1 and 80 then
    raise exception 'Group names must be between 1 and 80 characters.';
  end if;

  if new_avatar_path is not null and (
    split_part(new_avatar_path, '/', 1) <> target_conversation_id::text
    or split_part(new_avatar_path, '/', 2) <> 'avatars'
  ) then
    raise exception 'That group avatar path is invalid.';
  end if;

  update public.conversations
  set title = clean_title,
      avatar_path = new_avatar_path,
      updated_at = now()
  where id = target_conversation_id
    and kind = 'group';

  if not found then
    raise exception 'That group chat no longer exists.';
  end if;
end;
$$;

revoke all on function public.update_group_details(uuid, text, text) from public;
grant execute on function public.update_group_details(uuid, text, text) to authenticated;

create or replace function public.set_group_member_role(
  target_conversation_id uuid,
  target_profile_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if coalesce(
    public.conversation_member_role(target_conversation_id, viewer_id) = 'owner',
    false
  ) = false then
    raise exception 'Only the group owner can change member roles.';
  end if;

  if new_role not in ('admin', 'member') then
    raise exception 'Choose the admin or member role.';
  end if;

  if target_profile_id = viewer_id then
    raise exception 'The group owner role cannot be changed here.';
  end if;

  update public.conversation_members
  set role = new_role
  where conversation_id = target_conversation_id
    and profile_id = target_profile_id
    and role <> 'owner';

  if not found then
    raise exception 'That group member no longer exists.';
  end if;
end;
$$;

revoke all on function public.set_group_member_role(uuid, uuid, text) from public;
grant execute on function public.set_group_member_role(uuid, uuid, text) to authenticated;

create or replace function public.remove_group_member(
  target_conversation_id uuid,
  target_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  viewer_role text;
  target_role text;
begin
  viewer_role := public.conversation_member_role(target_conversation_id, viewer_id);
  target_role := public.conversation_member_role(target_conversation_id, target_profile_id);

  if viewer_role is null or viewer_role not in ('owner', 'admin') then
    raise exception 'Only group owners and admins can remove members.';
  end if;

  if target_profile_id = viewer_id then
    raise exception 'Use Leave group to remove yourself.';
  end if;

  if target_role is null then
    raise exception 'That group member no longer exists.';
  end if;

  if target_role = 'owner' or (target_role = 'admin' and viewer_role <> 'owner') then
    raise exception 'Only the owner can manage group admins.';
  end if;

  delete from public.conversation_members
  where conversation_id = target_conversation_id
    and profile_id = target_profile_id;
end;
$$;

revoke all on function public.remove_group_member(uuid, uuid) from public;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

create or replace function public.leave_group(target_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  viewer_role text;
  successor_id uuid;
begin
  viewer_role := public.conversation_member_role(target_conversation_id, viewer_id);

  if viewer_role is null then
    raise exception 'You are not a member of that group.';
  end if;

  if viewer_role = 'owner' then
    select member.profile_id into successor_id
    from public.conversation_members as member
    where member.conversation_id = target_conversation_id
      and member.profile_id <> viewer_id
    order by
      case member.role when 'admin' then 0 else 1 end,
      member.joined_at
    limit 1;

    if successor_id is null then
      raise exception 'The last member cannot leave an empty group.';
    end if;

    update public.conversation_members
    set role = 'owner'
    where conversation_id = target_conversation_id
      and profile_id = successor_id;
  end if;

  delete from public.conversation_members
  where conversation_id = target_conversation_id
    and profile_id = viewer_id;
end;
$$;

revoke all on function public.leave_group(uuid) from public;
grant execute on function public.leave_group(uuid) to authenticated;

create or replace function public.delete_group(target_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(
    public.conversation_member_role(target_conversation_id, auth.uid()) = 'owner',
    false
  ) = false then
    raise exception 'Only the group owner can delete this group.';
  end if;

  delete from public.conversations
  where id = target_conversation_id
    and kind = 'group';

  if not found then
    raise exception 'That group chat no longer exists.';
  end if;
end;
$$;

revoke all on function public.delete_group(uuid) from public;
grant execute on function public.delete_group(uuid) to authenticated;

create or replace function public.set_conversation_mute(
  target_conversation_id uuid,
  new_muted_until timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversation_members
  set muted_until = new_muted_until
  where conversation_id = target_conversation_id
    and profile_id = auth.uid();

  if not found then
    raise exception 'You are not a member of that conversation.';
  end if;
end;
$$;

revoke all on function public.set_conversation_mute(uuid, timestamptz) from public;
grant execute on function public.set_conversation_mute(uuid, timestamptz) to authenticated;

create or replace function public.report_conversation(
  target_conversation_id uuid,
  target_profile_id uuid,
  target_message_id uuid,
  report_reason text,
  report_details text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  clean_details text := nullif(btrim(report_details), '');
  target_report_id uuid;
begin
  if viewer_id is null or not public.is_conversation_member(target_conversation_id) then
    raise exception 'Only conversation members can submit a report.';
  end if;

  if report_reason not in ('spam', 'harassment', 'copyright', 'unsafe', 'other') then
    raise exception 'Choose a valid report reason.';
  end if;

  if clean_details is not null and char_length(clean_details) > 1000 then
    raise exception 'Report details must be 1000 characters or fewer.';
  end if;

  if target_profile_id = viewer_id then
    raise exception 'You cannot report yourself.';
  end if;

  if target_profile_id is not null and not exists (
    select 1
    from public.conversation_members
    where conversation_id = target_conversation_id
      and profile_id = target_profile_id
  ) then
    raise exception 'That reported member is not in this conversation.';
  end if;

  if target_message_id is not null and not exists (
    select 1
    from public.messages
    where id = target_message_id
      and conversation_id = target_conversation_id
  ) then
    raise exception 'That reported message is not in this conversation.';
  end if;

  insert into public.conversation_reports (
    conversation_id,
    reporter_id,
    reported_profile_id,
    message_id,
    reason,
    details
  )
  values (
    target_conversation_id,
    viewer_id,
    target_profile_id,
    target_message_id,
    report_reason,
    clean_details
  )
  returning id into target_report_id;

  return target_report_id;
end;
$$;

revoke all on function public.report_conversation(uuid, uuid, uuid, text, text)
  from public;
grant execute on function public.report_conversation(uuid, uuid, uuid, text, text)
  to authenticated;

create or replace function public.create_message_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (
    recipient_id,
    actor_id,
    kind,
    conversation_id,
    message_id,
    preview,
    source_key,
    created_at
  )
  select
    member.profile_id,
    new.sender_id,
    'message',
    new.conversation_id,
    new.id,
    left(
      coalesce(
        nullif(btrim(new.body), ''),
        case new.message_type
          when 'artwork' then 'Shared an artwork'
          when 'image' then 'Shared an image'
          when 'video' then 'Shared a video'
          else 'New message'
        end
      ),
      240
    ),
    format('message:%s:%s', new.id, member.profile_id),
    new.created_at
  from public.conversation_members as member
  where member.conversation_id = new.conversation_id
    and member.profile_id <> new.sender_id
    and (member.muted_until is null or member.muted_until <= now())
  on conflict (source_key) do nothing;

  return new;
end;
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'conversation-media',
  'conversation-media',
  false,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Conversation members can read private media"
  on storage.objects;
create policy "Conversation members can read private media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'conversation-media'
    and public.is_conversation_member(
      ((storage.foldername(name))[1])::uuid
    )
  );

drop policy if exists "Conversation members can upload private media"
  on storage.objects;
create policy "Conversation members can upload private media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'conversation-media'
    and public.is_conversation_member(
      ((storage.foldername(name))[1])::uuid
    )
    and (
      (storage.foldername(name))[2] = 'attachments'
      or (
        (storage.foldername(name))[2] = 'avatars'
        and public.can_manage_conversation(
          ((storage.foldername(name))[1])::uuid
        )
      )
    )
  );

drop policy if exists "Conversation media owners and managers can delete media"
  on storage.objects;
create policy "Conversation media owners and managers can delete media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'conversation-media'
    and (
      owner_id = auth.uid()::text
      or public.can_manage_conversation(
        ((storage.foldername(name))[1])::uuid
      )
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_members'
  ) then
    alter publication supabase_realtime add table public.conversation_members;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_invites'
  ) then
    alter publication supabase_realtime add table public.conversation_invites;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end
$$;
