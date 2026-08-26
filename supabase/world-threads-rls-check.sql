-- NODEINE World Threads live RLS proof
--
-- Runs against a linked environment inside one transaction and rolls every
-- fixture back. It expects at least two profiles plus the deterministic public
-- Ashigara seed installed by world-threads.sql.

begin;

select set_config(
  'nodeine_test.owner_id',
  (select id::text from public.profiles order by created_at nulls last, id limit 1),
  true
);
select set_config(
  'nodeine_test.second_id',
  (
    select id::text
    from public.profiles
    where id::text <> current_setting('nodeine_test.owner_id')
    order by created_at nulls last, id
    limit 1
  ),
  true
);

do $$
begin
  if current_setting('nodeine_test.owner_id', true) is null
    or current_setting('nodeine_test.second_id', true) is null then
    raise exception 'World Thread RLS proof needs two profiles.';
  end if;
end;
$$;

-- Owner: atomic draft creation and private read are allowed.
select set_config(
  'request.jwt.claim.sub',
  current_setting('nodeine_test.owner_id'),
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select *
from public.create_world_thread(
  'RLS proof draft',
  'Rolled back after the authorization checks finish.',
  'draft',
  false,
  array[
    '766265af-4837-5852-9b20-b028e66db9b6'::uuid,
    '343fa613-d303-58d4-b319-c53783fb6db9'::uuid,
    'fba7d74a-7553-54c7-a2eb-32070d151a86'::uuid
  ],
  array['origin', 'mood', 'palette'],
  array['Proof origin', 'Proof connection', 'Proof continuation']
);

do $$
declare
  affected integer;
begin
  if (
    select count(*)
    from public.world_threads
    where title = 'RLS proof draft'
      and owner_id = auth.uid()
      and visibility = 'draft'
  ) <> 1 then
    raise exception 'Owner could not read the created draft.';
  end if;

  update public.world_threads
  set summary = 'Owner direct-update proof.'
  where title = 'RLS proof draft'
    and owner_id = auth.uid();
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Owner could not update the created draft.';
  end if;

  begin
    delete from public.world_threads
    where title = 'RLS proof draft'
      and owner_id = auth.uid();
    raise exception 'Owner thread deletion unexpectedly succeeded in v1.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select set_config(
  'nodeine_test.thread_id',
  (
    select id::text
    from public.world_threads
    where title = 'RLS proof draft'
      and owner_id::text = current_setting('nodeine_test.owner_id')
  ),
  true
);

-- Anonymous: the public seed is readable; the draft and every write path are denied.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;

do $$
begin
  if not exists (
    select 1
    from public.world_threads
    where slug = 'ashigara-moonlit-lineage'
  ) then
    raise exception 'Anonymous viewer could not read the public seed.';
  end if;

  if exists (
    select 1
    from public.world_threads
    where id = current_setting('nodeine_test.thread_id')::uuid
  ) then
    raise exception 'Anonymous viewer could read a private draft.';
  end if;

  begin
    insert into public.world_threads (
      owner_id,
      title,
      slug,
      visibility,
      allow_forks
    ) values (
      current_setting('nodeine_test.owner_id')::uuid,
      'Anonymous direct write',
      'anonymous-direct-write',
      'draft',
      false
    );
    raise exception 'Anonymous direct table insert unexpectedly succeeded.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform *
    from public.create_world_thread(
      'Anonymous write',
      null,
      'draft',
      false,
      array[
        '766265af-4837-5852-9b20-b028e66db9b6'::uuid,
        '343fa613-d303-58d4-b319-c53783fb6db9'::uuid
      ],
      array['origin', 'mood'],
      array[null, null]::text[]
    );
    raise exception 'Anonymous RPC create unexpectedly succeeded.';
  exception
    when others then
      if sqlstate <> '42501'
        and sqlerrm not like 'You must be signed in to create%' then
        raise;
      end if;
  end;
end;
$$;

-- Second user: another owner's draft stays invisible and immutable.
reset role;
select set_config(
  'request.jwt.claim.sub',
  current_setting('nodeine_test.second_id'),
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $$
declare
  affected integer;
begin
  if exists (
    select 1
    from public.world_threads
    where id = current_setting('nodeine_test.thread_id')::uuid
  ) then
    raise exception 'Second user could read another owner''s draft.';
  end if;

  update public.world_threads
  set title = 'Unauthorized edit'
  where id = current_setting('nodeine_test.thread_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Second user mutated another owner''s draft.';
  end if;

  begin
    insert into public.world_thread_items (
      thread_id,
      artwork_id,
      position,
      relation_type,
      note,
      added_by
    ) values (
      current_setting('nodeine_test.thread_id')::uuid,
      '81c76f03-59d4-53a3-8045-7a4ed672b83e'::uuid,
      4,
      'contrast',
      'Unauthorized item insert',
      auth.uid()
    );
    raise exception 'Second user inserted into another owner''s draft.';
  exception
    when insufficient_privilege then null;
  end;

  update public.world_thread_items
  set note = 'Unauthorized item update'
  where thread_id = current_setting('nodeine_test.thread_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Second user updated another owner''s items.';
  end if;

  delete from public.world_thread_items
  where thread_id = current_setting('nodeine_test.thread_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Second user deleted another owner''s items.';
  end if;

  begin
    perform *
    from public.update_world_thread(
      current_setting('nodeine_test.thread_id')::uuid,
      'Unauthorized RPC edit',
      null,
      'draft',
      false,
      array[
        '766265af-4837-5852-9b20-b028e66db9b6'::uuid,
        '343fa613-d303-58d4-b319-c53783fb6db9'::uuid
      ],
      array['origin', 'mood'],
      array[null, null]::text[]
    );
    raise exception 'Second-user RPC update unexpectedly succeeded.';
  exception
    when others then
      if sqlerrm not like 'Only the owner can update%' then
        raise;
      end if;
  end;
end;
$$;

-- Owner direct item writes still cannot commit a broken path. Force the
-- deferred aggregate trigger here so the proof observes the rejection.
reset role;
select set_config(
  'request.jwt.claim.sub',
  current_setting('nodeine_test.owner_id'),
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $$
begin
  begin
    delete from public.world_thread_items
    where thread_id = current_setting('nodeine_test.thread_id')::uuid
      and position = 1;
    set constraints all immediate;
    raise exception 'Owner removed the sole origin without an invariant failure.';
  exception
    when others then
      if sqlerrm not like 'World Threads require 2-12 contiguous artworks%' then
        raise;
      end if;
  end;
  set constraints all deferred;
end;
$$;

-- Authenticated fork: allowed only from the public opt-in source, and source
-- lineage plus per-item added_by provenance remain intact.
reset role;
select set_config(
  'request.jwt.claim.sub',
  current_setting('nodeine_test.second_id'),
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select *
from public.fork_world_thread(
  '1d395380-23cd-59dc-8a3e-d15b66ed3c08'::uuid
);

do $$
declare
  fork_id uuid;
begin
  select id into fork_id
  from public.world_threads
  where owner_id = auth.uid()
    and forked_from_id = '1d395380-23cd-59dc-8a3e-d15b66ed3c08'::uuid
  order by created_at desc
  limit 1;

  if fork_id is null then
    raise exception 'Authenticated fork was not created.';
  end if;

  if not exists (
    select 1
    from public.world_threads
    where id = fork_id
      and visibility = 'draft'
      and allow_forks = false
  ) then
    raise exception 'Fork did not start as a private, non-forkable draft.';
  end if;

  if (
    select count(*)
    from public.world_thread_items
    where thread_id = fork_id
      and added_by = auth.uid()
  ) <> 6 then
    raise exception 'Fork item provenance was not assigned to its curator.';
  end if;

  begin
    perform *
    from public.fork_world_thread(
      current_setting('nodeine_test.thread_id')::uuid
    );
    raise exception 'A private non-opt-in source was forked.';
  exception
    when others then
      if sqlerrm not like 'That World Thread is unavailable%' then
        raise;
      end if;
  end;
end;
$$;

reset role;
set constraints all immediate;

select
  'pass' as result,
  'anonymous/public, owner/create-update, delete denial, cross-owner denial, invariants, fork lineage, item provenance' as checks;

rollback;
