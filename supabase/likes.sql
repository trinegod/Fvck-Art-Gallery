create table if not exists public.artwork_likes (
  artwork_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint artwork_likes_pkey primary key (artwork_id, user_id),
  constraint artwork_likes_artwork_id_fkey
    foreign key (artwork_id) references public.artworks(id) on delete cascade,
  constraint artwork_likes_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade
);

create index if not exists artwork_likes_artwork_created_at_idx
  on public.artwork_likes (artwork_id, created_at desc);

create index if not exists artwork_likes_user_created_at_idx
  on public.artwork_likes (user_id, created_at desc);

alter table public.artwork_likes enable row level security;

grant select on table public.artwork_likes to anon, authenticated;
grant insert, delete on table public.artwork_likes to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'artwork_likes'
      and policyname = 'Likes are publicly readable'
  ) then
    execute 'create policy "Likes are publicly readable" on public.artwork_likes for select using (true)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'artwork_likes'
      and policyname = 'Users can like artwork'
  ) then
    execute 'create policy "Users can like artwork" on public.artwork_likes for insert to authenticated with check (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'artwork_likes'
      and policyname = 'Users can remove their own likes'
  ) then
    execute 'create policy "Users can remove their own likes" on public.artwork_likes for delete to authenticated using (auth.uid() = user_id)';
  end if;
end
$$;
