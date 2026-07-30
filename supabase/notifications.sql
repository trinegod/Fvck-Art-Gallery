create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  actor_id uuid not null,
  kind text not null,
  artwork_id uuid,
  comment_id uuid,
  conversation_id uuid,
  message_id uuid,
  preview text,
  source_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_recipient_id_fkey
    foreign key (recipient_id) references public.profiles(id) on delete cascade,
  constraint notifications_actor_id_fkey
    foreign key (actor_id) references public.profiles(id) on delete cascade,
  constraint notifications_artwork_id_fkey
    foreign key (artwork_id) references public.artworks(id) on delete cascade,
  constraint notifications_comment_id_fkey
    foreign key (comment_id) references public.comments(id) on delete cascade,
  constraint notifications_conversation_id_fkey
    foreign key (conversation_id) references public.conversations(id) on delete cascade,
  constraint notifications_message_id_fkey
    foreign key (message_id) references public.messages(id) on delete cascade,
  constraint notifications_kind_check
    check (kind in ('follow', 'artwork_like', 'artwork_comment', 'message')),
  constraint notifications_preview_check
    check (preview is null or char_length(preview) <= 240),
  constraint notifications_source_key_check
    check (char_length(source_key) between 1 and 220),
  constraint notifications_no_self_event_check
    check (recipient_id <> actor_id)
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;
alter table public.notifications replica identity full;

grant select, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
  on public.notifications
  for select
  to authenticated
  using (recipient_id = auth.uid());

drop policy if exists "Users can mark their own notifications" on public.notifications;
create policy "Users can mark their own notifications"
  on public.notifications
  for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "Users can dismiss their own notifications" on public.notifications;
create policy "Users can dismiss their own notifications"
  on public.notifications
  for delete
  to authenticated
  using (recipient_id = auth.uid());

create or replace function public.sync_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_key text := format(
    'follow:%s:%s',
    coalesce(new.follower_id, old.follower_id),
    coalesce(new.followed_id, old.followed_id)
  );
begin
  if tg_op = 'DELETE' then
    delete from public.notifications where source_key = event_key;
    return old;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    kind,
    source_key,
    created_at
  )
  values (
    new.followed_id,
    new.follower_id,
    'follow',
    event_key,
    new.created_at
  )
  on conflict (source_key) do update
    set created_at = excluded.created_at,
        read_at = null;

  return new;
end;
$$;

drop trigger if exists sync_follow_activity on public.profile_follows;
create trigger sync_follow_activity
  after insert or delete on public.profile_follows
  for each row
  execute function public.sync_follow_notification();

create or replace function public.sync_like_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_artwork_id uuid := coalesce(new.artwork_id, old.artwork_id);
  event_actor_id uuid := coalesce(new.user_id, old.user_id);
  event_key text := format('like:%s:%s', event_artwork_id, event_actor_id);
  artwork_owner_id uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.notifications where source_key = event_key;
    return old;
  end if;

  select collection.owner_id into artwork_owner_id
  from public.artworks as artwork
  join public.collections as collection on collection.id = artwork.collection_id
  where artwork.id = new.artwork_id;

  if artwork_owner_id is null or artwork_owner_id = new.user_id then
    return new;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    kind,
    artwork_id,
    source_key,
    created_at
  )
  values (
    artwork_owner_id,
    new.user_id,
    'artwork_like',
    new.artwork_id,
    event_key,
    new.created_at
  )
  on conflict (source_key) do update
    set created_at = excluded.created_at,
        read_at = null;

  return new;
end;
$$;

drop trigger if exists sync_like_activity on public.artwork_likes;
create trigger sync_like_activity
  after insert or delete on public.artwork_likes
  for each row
  execute function public.sync_like_notification();

create or replace function public.create_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  artwork_owner_id uuid;
begin
  select collection.owner_id into artwork_owner_id
  from public.artworks as artwork
  join public.collections as collection on collection.id = artwork.collection_id
  where artwork.id = new.artwork_id;

  if artwork_owner_id is null or artwork_owner_id = new.user_id then
    return new;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    kind,
    artwork_id,
    comment_id,
    preview,
    source_key,
    created_at
  )
  values (
    artwork_owner_id,
    new.user_id,
    'artwork_comment',
    new.artwork_id,
    new.id,
    left(btrim(new.body), 240),
    format('comment:%s', new.id),
    new.created_at
  )
  on conflict (source_key) do nothing;

  return new;
end;
$$;

drop trigger if exists create_comment_activity on public.comments;
create trigger create_comment_activity
  after insert on public.comments
  for each row
  execute function public.create_comment_notification();

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
    left(btrim(new.body), 240),
    format('message:%s:%s', new.id, member.profile_id),
    new.created_at
  from public.conversation_members as member
  where member.conversation_id = new.conversation_id
    and member.profile_id <> new.sender_id
  on conflict (source_key) do nothing;

  return new;
end;
$$;

drop trigger if exists create_message_activity on public.messages;
create trigger create_message_activity
  after insert on public.messages
  for each row
  execute function public.create_message_notifications();

insert into public.notifications (
  recipient_id,
  actor_id,
  kind,
  source_key,
  created_at
)
select
  followed_id,
  follower_id,
  'follow',
  format('follow:%s:%s', follower_id, followed_id),
  created_at
from public.profile_follows
where follower_id <> followed_id
  and created_at >= now() - interval '30 days'
on conflict (source_key) do nothing;

insert into public.notifications (
  recipient_id,
  actor_id,
  kind,
  artwork_id,
  source_key,
  created_at
)
select
  collection.owner_id,
  artwork_like.user_id,
  'artwork_like',
  artwork_like.artwork_id,
  format('like:%s:%s', artwork_like.artwork_id, artwork_like.user_id),
  artwork_like.created_at
from public.artwork_likes as artwork_like
join public.artworks as artwork on artwork.id = artwork_like.artwork_id
join public.collections as collection on collection.id = artwork.collection_id
where collection.owner_id <> artwork_like.user_id
  and artwork_like.created_at >= now() - interval '30 days'
on conflict (source_key) do nothing;

insert into public.notifications (
  recipient_id,
  actor_id,
  kind,
  artwork_id,
  comment_id,
  preview,
  source_key,
  created_at
)
select
  collection.owner_id,
  comment.user_id,
  'artwork_comment',
  comment.artwork_id,
  comment.id,
  left(btrim(comment.body), 240),
  format('comment:%s', comment.id),
  comment.created_at
from public.comments as comment
join public.artworks as artwork on artwork.id = comment.artwork_id
join public.collections as collection on collection.id = artwork.collection_id
where collection.owner_id <> comment.user_id
  and comment.created_at >= now() - interval '30 days'
on conflict (source_key) do nothing;

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
  message.sender_id,
  'message',
  message.conversation_id,
  message.id,
  left(btrim(message.body), 240),
  format('message:%s:%s', message.id, member.profile_id),
  message.created_at
from public.messages as message
join public.conversation_members as member
  on member.conversation_id = message.conversation_id
where member.profile_id <> message.sender_id
  and message.created_at >= now() - interval '30 days'
on conflict (source_key) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
