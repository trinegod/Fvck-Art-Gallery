create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group')),
  title text,
  direct_key text unique,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete cascade,
  constraint conversations_title_check
    check (
      (kind = 'direct' and title is null and direct_key is not null)
      or
      (kind = 'group' and char_length(btrim(title)) between 1 and 80 and direct_key is null)
    )
);

create table if not exists public.conversation_members (
  conversation_id uuid not null,
  profile_id uuid not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  constraint conversation_members_pkey primary key (conversation_id, profile_id),
  constraint conversation_members_conversation_id_fkey
    foreign key (conversation_id) references public.conversations(id) on delete cascade,
  constraint conversation_members_profile_id_fkey
    foreign key (profile_id) references public.profiles(id) on delete cascade
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint messages_conversation_id_fkey
    foreign key (conversation_id) references public.conversations(id) on delete cascade,
  constraint messages_sender_id_fkey
    foreign key (sender_id) references public.profiles(id) on delete cascade
);

create index if not exists conversations_updated_at_idx
  on public.conversations (updated_at desc);

create index if not exists conversation_members_profile_joined_idx
  on public.conversation_members (profile_id, joined_at desc);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = target_conversation_id
      and profile_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public;
grant execute on function public.is_conversation_member(uuid) to authenticated;

grant select on table public.conversations to authenticated;
grant select on table public.conversation_members to authenticated;
grant update (last_read_at) on table public.conversation_members to authenticated;
grant select, insert on table public.messages to authenticated;

drop policy if exists "Members can read their conversations" on public.conversations;
create policy "Members can read their conversations"
  on public.conversations
  for select
  to authenticated
  using (public.is_conversation_member(id));

drop policy if exists "Members can read conversation membership" on public.conversation_members;
create policy "Members can read conversation membership"
  on public.conversation_members
  for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

drop policy if exists "Members can update their read position" on public.conversation_members;
create policy "Members can update their read position"
  on public.conversation_members
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "Members can read messages" on public.messages;
create policy "Members can read messages"
  on public.messages
  for select
  to authenticated
  using (public.is_conversation_member(conversation_id));

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

create or replace function public.start_direct_conversation(other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  conversation_key text;
  target_conversation_id uuid;
begin
  if viewer_id is null then
    raise exception 'You must be signed in to start a conversation.';
  end if;

  if other_profile_id is null or other_profile_id = viewer_id then
    raise exception 'Choose another creator to start a conversation.';
  end if;

  if not exists (select 1 from public.profiles where id = other_profile_id) then
    raise exception 'That creator profile no longer exists.';
  end if;

  conversation_key := least(viewer_id::text, other_profile_id::text)
    || ':' || greatest(viewer_id::text, other_profile_id::text);

  insert into public.conversations (kind, created_by, direct_key)
  values ('direct', viewer_id, conversation_key)
  on conflict (direct_key) do update
    set direct_key = excluded.direct_key
  returning id into target_conversation_id;

  insert into public.conversation_members (conversation_id, profile_id, role, last_read_at)
  values
    (target_conversation_id, viewer_id, 'owner', now()),
    (target_conversation_id, other_profile_id, 'member', null)
  on conflict (conversation_id, profile_id) do nothing;

  return target_conversation_id;
end;
$$;

revoke all on function public.start_direct_conversation(uuid) from public;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

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
  member_count integer;
begin
  if viewer_id is null then
    raise exception 'You must be signed in to create a group.';
  end if;

  if char_length(clean_title) not between 1 and 80 then
    raise exception 'Group names must be between 1 and 80 characters.';
  end if;

  if coalesce(array_length(member_ids, 1), 0) > 20 then
    raise exception 'Groups can include up to 20 invited members.';
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

  insert into public.conversation_members (conversation_id, profile_id, role)
  select target_conversation_id, profile.id, 'member'
  from public.profiles as profile
  where profile.id = any(coalesce(member_ids, array[]::uuid[]))
    and profile.id <> viewer_id
  on conflict (conversation_id, profile_id) do nothing;

  select count(*) into member_count
  from public.conversation_members
  where conversation_id = target_conversation_id;

  if member_count < 2 then
    raise exception 'Select at least one other creator for the group.';
  end if;

  return target_conversation_id;
end;
$$;

revoke all on function public.create_group_conversation(text, uuid[]) from public;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;

create or replace function public.touch_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set updated_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists touch_conversation_after_message on public.messages;
create trigger touch_conversation_after_message
  after insert on public.messages
  for each row
  execute function public.touch_conversation_after_message();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
