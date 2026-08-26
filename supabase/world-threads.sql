-- NODEINE World Threads
--
-- Adds ordered, credit-preserving visual lineages built from existing artwork.
-- Safe to rerun: tables, indexes, policies, functions, triggers, and the seed
-- are idempotent.
--
-- Rollback (destructive): drop the three public RPC functions first, then drop
-- public.world_thread_items and public.world_threads. The internal constraint
-- and immutability triggers/functions can then be dropped. A rollback removes
-- every thread and item; export user-created threads before running it.

begin;

create table if not exists public.world_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  slug text not null,
  summary text,
  visibility text not null default 'draft',
  allow_forks boolean not null default false,
  forked_from_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_threads_owner_id_fkey
    foreign key (owner_id) references public.profiles(id) on delete cascade,
  constraint world_threads_forked_from_id_fkey
    foreign key (forked_from_id) references public.world_threads(id) on delete restrict,
  constraint world_threads_title_check
    check (char_length(btrim(title)) between 1 and 80),
  constraint world_threads_slug_key unique (slug),
  constraint world_threads_slug_check
    check (
      char_length(slug) between 3 and 96
      and slug = lower(slug)
      and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  constraint world_threads_summary_check
    check (
      summary is null
      or char_length(btrim(summary)) between 1 and 500
    ),
  constraint world_threads_visibility_check
    check (visibility in ('draft', 'public')),
  constraint world_threads_not_self_fork_check
    check (forked_from_id is null or forked_from_id <> id)
);

create table if not exists public.world_thread_items (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  artwork_id uuid not null,
  position smallint not null,
  relation_type text not null default 'origin',
  note text,
  added_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint world_thread_items_thread_id_fkey
    foreign key (thread_id) references public.world_threads(id) on delete cascade,
  constraint world_thread_items_artwork_id_fkey
    foreign key (artwork_id) references public.artworks(id) on delete restrict,
  constraint world_thread_items_added_by_fkey
    foreign key (added_by) references public.profiles(id) on delete restrict,
  constraint world_thread_items_thread_artwork_key
    unique (thread_id, artwork_id),
  constraint world_thread_items_thread_position_key
    unique (thread_id, position),
  constraint world_thread_items_position_check
    check (position between 1 and 12),
  constraint world_thread_items_relation_type_check
    check (
      relation_type in (
        'origin',
        'palette',
        'mood',
        'composition',
        'character',
        'setting',
        'motion',
        'lore',
        'contrast'
      )
    ),
  constraint world_thread_items_origin_position_check
    check (
      (position = 1 and relation_type = 'origin')
      or (position > 1 and relation_type <> 'origin')
    ),
  constraint world_thread_items_note_check
    check (
      note is null
      or char_length(btrim(note)) between 1 and 280
    )
);

create index if not exists world_threads_owner_updated_idx
  on public.world_threads (owner_id, updated_at desc);

create index if not exists world_threads_public_updated_idx
  on public.world_threads (updated_at desc)
  where visibility = 'public';

create index if not exists world_threads_forked_from_idx
  on public.world_threads (forked_from_id, created_at desc)
  where forked_from_id is not null;

create index if not exists world_thread_items_artwork_created_idx
  on public.world_thread_items (artwork_id, created_at desc);

alter table public.world_threads enable row level security;
alter table public.world_thread_items enable row level security;

grant select on table public.world_threads to anon, authenticated;
grant select on table public.world_thread_items to anon, authenticated;

-- Direct owner writes remain useful for small metadata/item edits. Creation,
-- replacement, and forking should use the atomic RPCs below. Sensitive lineage
-- columns are intentionally omitted from column-level mutation grants.
grant insert (owner_id, title, slug, summary, visibility, allow_forks)
  on public.world_threads to authenticated;
grant update (title, summary, visibility, allow_forks, updated_at)
  on public.world_threads to authenticated;
-- v1 intentionally has no end-user thread delete path. Immutable fork lineage
-- would otherwise let descendants block an owner deletion, while cascading the
-- source would destroy provenance. A later tombstone workflow can add takedown
-- semantics without weakening either guarantee.
revoke delete on table public.world_threads from authenticated;

grant insert (thread_id, artwork_id, position, relation_type, note, added_by)
  on public.world_thread_items to authenticated;
grant update (artwork_id, position, relation_type, note)
  on public.world_thread_items to authenticated;
grant delete on table public.world_thread_items to authenticated;

drop policy if exists "Public threads and owner drafts are readable"
  on public.world_threads;
create policy "Public threads and owner drafts are readable"
  on public.world_threads
  for select
  to anon, authenticated
  using (visibility = 'public' or owner_id = auth.uid());

drop policy if exists "Owners can create threads" on public.world_threads;
create policy "Owners can create threads"
  on public.world_threads
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and forked_from_id is null
  );

drop policy if exists "Owners can update threads" on public.world_threads;
create policy "Owners can update threads"
  on public.world_threads
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners can delete threads" on public.world_threads;

drop policy if exists "Visible thread items are readable"
  on public.world_thread_items;
create policy "Visible thread items are readable"
  on public.world_thread_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.world_threads as thread
      where thread.id = thread_id
        and (
          thread.visibility = 'public'
          or thread.owner_id = auth.uid()
        )
    )
  );

drop policy if exists "Owners can add thread items"
  on public.world_thread_items;
create policy "Owners can add thread items"
  on public.world_thread_items
  for insert
  to authenticated
  with check (
    added_by = auth.uid()
    and
    exists (
      select 1
      from public.world_threads as thread
      where thread.id = thread_id
        and thread.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can update thread items"
  on public.world_thread_items;
create policy "Owners can update thread items"
  on public.world_thread_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.world_threads as thread
      where thread.id = thread_id
        and thread.owner_id = auth.uid()
    )
  )
  with check (
    added_by = auth.uid()
    and
    exists (
      select 1
      from public.world_threads as thread
      where thread.id = thread_id
        and thread.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can remove thread items"
  on public.world_thread_items;
create policy "Owners can remove thread items"
  on public.world_thread_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.world_threads as thread
      where thread.id = thread_id
        and thread.owner_id = auth.uid()
    )
  );

-- Internal invariant: every committed thread has 2-12 items. The constraint is
-- deferred so the atomic RPCs can replace a complete item set in one transaction.
create or replace function public.enforce_world_thread_item_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_thread_id uuid;
  previous_thread_id uuid;
  target_count integer;
  target_origin_count integer;
  target_max_position integer;
begin
  if tg_table_name = 'world_threads' then
    target_thread_id := new.id;
  elsif tg_op = 'DELETE' then
    target_thread_id := old.thread_id;
  else
    target_thread_id := new.thread_id;
    if tg_op = 'UPDATE' and old.thread_id is distinct from new.thread_id then
      previous_thread_id := old.thread_id;
    end if;
  end if;

  if exists (
    select 1 from public.world_threads where id = target_thread_id
  ) then
    select
      count(*),
      count(*) filter (
        where position = 1 and relation_type = 'origin'
      ),
      coalesce(max(position), 0)
    into target_count, target_origin_count, target_max_position
    from public.world_thread_items
    where thread_id = target_thread_id;

    if target_count not between 2 and 12
      or target_origin_count <> 1
      or target_max_position <> target_count then
      raise exception 'World Threads require 2-12 contiguous artworks with one origin at position 1.';
    end if;
  end if;

  if previous_thread_id is not null and exists (
    select 1 from public.world_threads where id = previous_thread_id
  ) then
    select
      count(*),
      count(*) filter (
        where position = 1 and relation_type = 'origin'
      ),
      coalesce(max(position), 0)
    into target_count, target_origin_count, target_max_position
    from public.world_thread_items
    where thread_id = previous_thread_id;

    if target_count not between 2 and 12
      or target_origin_count <> 1
      or target_max_position <> target_count then
      raise exception 'World Threads require 2-12 contiguous artworks with one origin at position 1.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_world_thread_item_count()
  from public, anon, authenticated;

drop trigger if exists enforce_world_thread_count_after_thread
  on public.world_threads;
create constraint trigger enforce_world_thread_count_after_thread
  after insert on public.world_threads
  deferrable initially deferred
  for each row
  execute function public.enforce_world_thread_item_count();

drop trigger if exists enforce_world_thread_count_after_item
  on public.world_thread_items;
create constraint trigger enforce_world_thread_count_after_item
  after insert or update or delete on public.world_thread_items
  deferrable initially deferred
  for each row
  execute function public.enforce_world_thread_item_count();

-- Lineage is permanent. A fork cannot be detached from or reassigned to a
-- different source, and source rows are protected by ON DELETE RESTRICT.
create or replace function public.preserve_world_thread_lineage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.forked_from_id is distinct from old.forked_from_id then
    raise exception 'A World Thread fork cannot change its source.';
  end if;
  return new;
end;
$$;

revoke all on function public.preserve_world_thread_lineage()
  from public, anon, authenticated;

drop trigger if exists preserve_world_thread_lineage
  on public.world_threads;
create trigger preserve_world_thread_lineage
  before update of forked_from_id on public.world_threads
  for each row
  execute function public.preserve_world_thread_lineage();

create or replace function public.create_world_thread(
  thread_title text,
  thread_summary text,
  thread_visibility text,
  thread_allow_forks boolean,
  thread_artwork_ids uuid[],
  thread_relation_types text[],
  thread_notes text[]
)
returns table(thread_id uuid, thread_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  clean_title text := nullif(btrim(thread_title), '');
  clean_summary text := nullif(btrim(thread_summary), '');
  item_count integer := cardinality(thread_artwork_ids);
  existing_artwork_count integer;
  target_thread_id uuid := gen_random_uuid();
  slug_base text;
  target_slug text;
begin
  if viewer_id is null then
    raise exception 'You must be signed in to create a World Thread.';
  end if;

  if clean_title is null or char_length(clean_title) > 80 then
    raise exception 'World Thread titles must be between 1 and 80 characters.';
  end if;

  if clean_summary is not null and char_length(clean_summary) > 500 then
    raise exception 'World Thread summaries can contain up to 500 characters.';
  end if;

  if thread_visibility not in ('draft', 'public') then
    raise exception 'World Thread visibility must be draft or public.';
  end if;

  if item_count is null or item_count not between 2 and 12 then
    raise exception 'World Threads must contain between 2 and 12 artworks.';
  end if;

  if thread_relation_types is not null
    and cardinality(thread_relation_types) <> item_count then
    raise exception 'Provide one relation type for every artwork.';
  end if;

  if thread_notes is not null and cardinality(thread_notes) <> item_count then
    raise exception 'Provide one note value for every artwork.';
  end if;

  if (
    select count(distinct artwork_id)
    from unnest(thread_artwork_ids) as selected(artwork_id)
  ) <> item_count then
    raise exception 'A World Thread cannot contain the same artwork twice.';
  end if;

  if exists (
    select 1
    from generate_series(1, item_count) as item_index
    where coalesce(
      nullif(btrim(thread_relation_types[item_index]), ''),
      case when item_index = 1 then 'origin' else 'lore' end
    ) not in (
      'origin', 'palette', 'mood', 'composition', 'character',
      'setting', 'motion', 'lore', 'contrast'
    )
  ) then
    raise exception 'Choose a valid relationship for every artwork.';
  end if;

  if coalesce(nullif(btrim(thread_relation_types[1]), ''), 'origin') <> 'origin'
    or exists (
      select 1
      from generate_series(2, item_count) as item_index
      where coalesce(
        nullif(btrim(thread_relation_types[item_index]), ''),
        'lore'
      ) = 'origin'
    ) then
    raise exception 'The first artwork must be the only origin in a World Thread.';
  end if;

  if exists (
    select 1
    from generate_series(1, item_count) as item_index
    where nullif(btrim(thread_notes[item_index]), '') is not null
      and char_length(btrim(thread_notes[item_index])) > 280
  ) then
    raise exception 'World Thread notes can contain up to 280 characters.';
  end if;

  select count(*) into existing_artwork_count
  from public.artworks
  where id = any(thread_artwork_ids);

  if existing_artwork_count <> item_count then
    raise exception 'One or more selected artworks no longer exist.';
  end if;

  slug_base := trim(both '-' from regexp_replace(
    lower(clean_title),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
  slug_base := left(coalesce(nullif(slug_base, ''), 'world-thread'), 72);
  target_slug := slug_base || '-' || left(replace(target_thread_id::text, '-', ''), 8);

  insert into public.world_threads (
    id,
    owner_id,
    title,
    slug,
    summary,
    visibility,
    allow_forks
  ) values (
    target_thread_id,
    viewer_id,
    clean_title,
    target_slug,
    clean_summary,
    thread_visibility,
    coalesce(thread_allow_forks, false)
  );

  insert into public.world_thread_items (
    thread_id,
    artwork_id,
    position,
    relation_type,
    note,
    added_by
  )
  select
    target_thread_id,
    thread_artwork_ids[item_index],
    item_index,
    coalesce(
      nullif(btrim(thread_relation_types[item_index]), ''),
      case when item_index = 1 then 'origin' else 'lore' end
    ),
    nullif(btrim(thread_notes[item_index]), ''),
    viewer_id
  from generate_series(1, item_count) as item_index;

  return query select target_thread_id, target_slug;
end;
$$;

create or replace function public.update_world_thread(
  target_thread_id uuid,
  thread_title text,
  thread_summary text,
  thread_visibility text,
  thread_allow_forks boolean,
  thread_artwork_ids uuid[],
  thread_relation_types text[],
  thread_notes text[]
)
returns table(thread_id uuid, thread_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  thread_owner_id uuid;
  clean_title text := nullif(btrim(thread_title), '');
  clean_summary text := nullif(btrim(thread_summary), '');
  item_count integer := cardinality(thread_artwork_ids);
  existing_artwork_count integer;
  target_slug text;
begin
  if viewer_id is null then
    raise exception 'You must be signed in to update a World Thread.';
  end if;

  select owner_id, slug into thread_owner_id, target_slug
  from public.world_threads
  where id = target_thread_id
  for update;

  if not found then
    raise exception 'That World Thread no longer exists.';
  end if;

  if thread_owner_id <> viewer_id then
    raise exception 'Only the owner can update this World Thread.';
  end if;

  if clean_title is null or char_length(clean_title) > 80 then
    raise exception 'World Thread titles must be between 1 and 80 characters.';
  end if;

  if clean_summary is not null and char_length(clean_summary) > 500 then
    raise exception 'World Thread summaries can contain up to 500 characters.';
  end if;

  if thread_visibility not in ('draft', 'public') then
    raise exception 'World Thread visibility must be draft or public.';
  end if;

  if item_count is null or item_count not between 2 and 12 then
    raise exception 'World Threads must contain between 2 and 12 artworks.';
  end if;

  if thread_relation_types is not null
    and cardinality(thread_relation_types) <> item_count then
    raise exception 'Provide one relation type for every artwork.';
  end if;

  if thread_notes is not null and cardinality(thread_notes) <> item_count then
    raise exception 'Provide one note value for every artwork.';
  end if;

  if (
    select count(distinct artwork_id)
    from unnest(thread_artwork_ids) as selected(artwork_id)
  ) <> item_count then
    raise exception 'A World Thread cannot contain the same artwork twice.';
  end if;

  if exists (
    select 1
    from generate_series(1, item_count) as item_index
    where coalesce(
      nullif(btrim(thread_relation_types[item_index]), ''),
      case when item_index = 1 then 'origin' else 'lore' end
    ) not in (
      'origin', 'palette', 'mood', 'composition', 'character',
      'setting', 'motion', 'lore', 'contrast'
    )
  ) then
    raise exception 'Choose a valid relationship for every artwork.';
  end if;

  if coalesce(nullif(btrim(thread_relation_types[1]), ''), 'origin') <> 'origin'
    or exists (
      select 1
      from generate_series(2, item_count) as item_index
      where coalesce(
        nullif(btrim(thread_relation_types[item_index]), ''),
        'lore'
      ) = 'origin'
    ) then
    raise exception 'The first artwork must be the only origin in a World Thread.';
  end if;

  if exists (
    select 1
    from generate_series(1, item_count) as item_index
    where nullif(btrim(thread_notes[item_index]), '') is not null
      and char_length(btrim(thread_notes[item_index])) > 280
  ) then
    raise exception 'World Thread notes can contain up to 280 characters.';
  end if;

  select count(*) into existing_artwork_count
  from public.artworks
  where id = any(thread_artwork_ids);

  if existing_artwork_count <> item_count then
    raise exception 'One or more selected artworks no longer exist.';
  end if;

  update public.world_threads
  set title = clean_title,
      summary = clean_summary,
      visibility = thread_visibility,
      allow_forks = coalesce(thread_allow_forks, false),
      updated_at = now()
  where id = target_thread_id;

  delete from public.world_thread_items as item
  where item.thread_id = target_thread_id;

  insert into public.world_thread_items (
    thread_id,
    artwork_id,
    position,
    relation_type,
    note,
    added_by
  )
  select
    target_thread_id,
    thread_artwork_ids[item_index],
    item_index,
    coalesce(
      nullif(btrim(thread_relation_types[item_index]), ''),
      case when item_index = 1 then 'origin' else 'lore' end
    ),
    nullif(btrim(thread_notes[item_index]), ''),
    viewer_id
  from generate_series(1, item_count) as item_index;

  return query select target_thread_id, target_slug;
end;
$$;

create or replace function public.fork_world_thread(source_thread_id uuid)
returns table(thread_id uuid, thread_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
  source_thread public.world_threads%rowtype;
  item_count integer;
  target_thread_id uuid := gen_random_uuid();
  target_title text;
  slug_base text;
  target_slug text;
begin
  if viewer_id is null then
    raise exception 'You must be signed in to fork a World Thread.';
  end if;

  select * into source_thread
  from public.world_threads
  where id = source_thread_id
    and visibility = 'public'
    and allow_forks
  for share;

  if not found then
    raise exception 'That World Thread is unavailable or does not allow forks.';
  end if;

  select count(*) into item_count
  from public.world_thread_items as item
  where item.thread_id = source_thread_id;

  if item_count not between 2 and 12 then
    raise exception 'The source World Thread does not contain a valid item set.';
  end if;

  target_title := left(source_thread.title, 72) || ' - Fork';
  slug_base := trim(both '-' from regexp_replace(
    lower(target_title),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
  slug_base := left(coalesce(nullif(slug_base, ''), 'world-thread'), 72);
  target_slug := slug_base || '-' || left(replace(target_thread_id::text, '-', ''), 8);

  insert into public.world_threads (
    id,
    owner_id,
    title,
    slug,
    summary,
    visibility,
    allow_forks,
    forked_from_id
  ) values (
    target_thread_id,
    viewer_id,
    target_title,
    target_slug,
    source_thread.summary,
    'draft',
    false,
    source_thread.id
  );

  insert into public.world_thread_items (
    thread_id,
    artwork_id,
    position,
    relation_type,
    note,
    added_by
  )
  select
    target_thread_id,
    artwork_id,
    position,
    relation_type,
    note,
    viewer_id
  from public.world_thread_items as item
  where item.thread_id = source_thread.id
  order by item.position;

  return query select target_thread_id, target_slug;
end;
$$;

revoke all on function public.create_world_thread(
  text, text, text, boolean, uuid[], text[], text[]
) from public;
revoke all on function public.update_world_thread(
  uuid, text, text, text, boolean, uuid[], text[], text[]
) from public;
revoke all on function public.create_world_thread(
  text, text, text, boolean, uuid[], text[], text[]
) from anon;
revoke all on function public.update_world_thread(
  uuid, text, text, text, boolean, uuid[], text[], text[]
) from anon;
revoke all on function public.fork_world_thread(uuid) from public, anon;

grant execute on function public.create_world_thread(
  text, text, text, boolean, uuid[], text[], text[]
) to authenticated;
grant execute on function public.update_world_thread(
  uuid, text, text, text, boolean, uuid[], text[], text[]
) to authenticated;
grant execute on function public.fork_world_thread(uuid) to authenticated;

-- Deterministic public seed. It is inserted only when the canonical Ashigara
-- collection, its owner profile, and all six deterministic artwork records are
-- present. Existing thread data is never overwritten on a rerun.
do $$
declare
  ashigara_collection_id constant uuid := '8392aa6b-7b58-569a-a276-166892402039';
  seed_thread_id constant uuid := '1d395380-23cd-59dc-8a3e-d15b66ed3c08';
  seed_slug constant text := 'ashigara-moonlit-lineage';
  seed_owner_id uuid;
  seed_artwork_ids constant uuid[] := array[
    '766265af-4837-5852-9b20-b028e66db9b6'::uuid,
    '343fa613-d303-58d4-b319-c53783fb6db9'::uuid,
    'fba7d74a-7553-54c7-a2eb-32070d151a86'::uuid,
    '81c76f03-59d4-53a3-8045-7a4ed672b83e'::uuid,
    '26800a3f-9d91-57d0-b01f-beaeddc1fab0'::uuid,
    '2b82d662-7fb1-5316-9d4a-cb438136f7b0'::uuid
  ];
begin
  select collection.owner_id into seed_owner_id
  from public.collections as collection
  join public.profiles as profile on profile.id = collection.owner_id
  where collection.id = ashigara_collection_id;

  if seed_owner_id is not null
    and (
      select count(*)
      from public.artworks
      where collection_id = ashigara_collection_id
        and id = any(seed_artwork_ids)
    ) = cardinality(seed_artwork_ids)
    and not exists (
      select 1
      from public.world_threads
      where id = seed_thread_id or slug = seed_slug
    ) then
    insert into public.world_threads (
      id,
      owner_id,
      title,
      slug,
      summary,
      visibility,
      allow_forks
    ) values (
      seed_thread_id,
      seed_owner_id,
      'Ashigara: Moonlit Lineage',
      seed_slug,
      'A passage through armor, character, setting, and folklore inside the Ashigara visual world.',
      'public',
      true
    );

    insert into public.world_thread_items (
      thread_id,
      artwork_id,
      position,
      relation_type,
      note,
      added_by
    ) values
      (seed_thread_id, seed_artwork_ids[1], 1, 'origin', 'The visual origin: moonlit armor establishes the lineage.', seed_owner_id),
      (seed_thread_id, seed_artwork_ids[2], 2, 'character', 'The central warrior moves from portrait into full presence.', seed_owner_id),
      (seed_thread_id, seed_artwork_ids[3], 3, 'setting', 'Shrine architecture turns the character study into a world.', seed_owner_id),
      (seed_thread_id, seed_artwork_ids[4], 4, 'composition', 'A close crop concentrates the authority of the silhouette.', seed_owner_id),
      (seed_thread_id, seed_artwork_ids[5], 5, 'palette', 'Navy, gold, and ember red bind the sequence together.', seed_owner_id),
      (seed_thread_id, seed_artwork_ids[6], 6, 'lore', 'The final portrait carries the folklore lineage forward.', seed_owner_id);
  end if;
end
$$;

commit;

-- Rollback reference (destructive; intentionally not executed):
-- drop function if exists public.fork_world_thread(uuid);
-- drop function if exists public.update_world_thread(uuid, text, text, text, boolean, uuid[], text[], text[]);
-- drop function if exists public.create_world_thread(text, text, text, boolean, uuid[], text[], text[]);
-- drop table if exists public.world_thread_items;
-- drop table if exists public.world_threads;
-- drop function if exists public.preserve_world_thread_lineage();
-- drop function if exists public.enforce_world_thread_item_count();
