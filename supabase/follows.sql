create table if not exists public.profile_follows (
  follower_id uuid not null,
  followed_id uuid not null,
  created_at timestamptz not null default now(),
  constraint profile_follows_pkey primary key (follower_id, followed_id),
  constraint profile_follows_follower_id_fkey
    foreign key (follower_id) references public.profiles(id) on delete cascade,
  constraint profile_follows_followed_id_fkey
    foreign key (followed_id) references public.profiles(id) on delete cascade,
  constraint profile_follows_no_self_follow check (follower_id <> followed_id)
);

create index if not exists profile_follows_followed_created_at_idx
  on public.profile_follows (followed_id, created_at desc);

create index if not exists profile_follows_follower_created_at_idx
  on public.profile_follows (follower_id, created_at desc);

alter table public.profile_follows enable row level security;

grant select on table public.profile_follows to anon, authenticated;
grant insert, delete on table public.profile_follows to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_follows'
      and policyname = 'Follows are publicly readable'
  ) then
    execute 'create policy "Follows are publicly readable" on public.profile_follows for select using (true)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_follows'
      and policyname = 'Users can follow profiles'
  ) then
    execute 'create policy "Users can follow profiles" on public.profile_follows for insert to authenticated with check (auth.uid() = follower_id and follower_id <> followed_id)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_follows'
      and policyname = 'Users can remove their own follows'
  ) then
    execute 'create policy "Users can remove their own follows" on public.profile_follows for delete to authenticated using (auth.uid() = follower_id)';
  end if;
end
$$;
