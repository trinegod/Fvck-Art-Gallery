create table if not exists public.artwork_saves (
  artwork_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint artwork_saves_pkey primary key (artwork_id, user_id),
  constraint artwork_saves_artwork_id_fkey
    foreign key (artwork_id) references public.artworks(id) on delete cascade,
  constraint artwork_saves_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade
);

create index if not exists artwork_saves_user_created_at_idx
  on public.artwork_saves (user_id, created_at desc);

create index if not exists artwork_saves_artwork_created_at_idx
  on public.artwork_saves (artwork_id, created_at desc);

alter table public.artwork_saves enable row level security;

grant select, insert, delete on table public.artwork_saves to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'artwork_saves'
      and policyname = 'Users can view their own saves'
  ) then
    execute 'create policy "Users can view their own saves" on public.artwork_saves for select to authenticated using (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'artwork_saves'
      and policyname = 'Users can save artwork'
  ) then
    execute 'create policy "Users can save artwork" on public.artwork_saves for insert to authenticated with check (auth.uid() = user_id)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'artwork_saves'
      and policyname = 'Users can remove their own saves'
  ) then
    execute 'create policy "Users can remove their own saves" on public.artwork_saves for delete to authenticated using (auth.uid() = user_id)';
  end if;
end
$$;
