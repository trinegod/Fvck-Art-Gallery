create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null,
  user_id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  constraint comments_artwork_id_fkey
    foreign key (artwork_id) references public.artworks(id) on delete cascade,
  constraint comments_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade
);

create index if not exists comments_artwork_created_at_idx
  on public.comments (artwork_id, created_at);

create index if not exists comments_user_id_idx
  on public.comments (user_id);

alter table public.comments enable row level security;

grant select on table public.comments to anon, authenticated;
grant insert, delete on table public.comments to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and policyname = 'Comments are publicly readable'
  ) then
    execute 'create policy "Comments are publicly readable" on public.comments for select using (true)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and policyname = 'Signed in users can comment'
  ) then
    execute 'create policy "Signed in users can comment" on public.comments for insert to authenticated with check (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and policyname = 'Users can delete their own comments'
  ) then
    execute 'create policy "Users can delete their own comments" on public.comments for delete to authenticated using (auth.uid() = user_id)';
  end if;
end
$$;
