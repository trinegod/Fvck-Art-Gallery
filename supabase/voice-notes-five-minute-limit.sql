-- NODEINE: extend an already activated voice-note schema from 1 to 5 minutes.
-- Authorized database rollout only. Rehearse with the rollback-only script first.
-- Changes ONLY the upper bound in the two existing validated CHECK constraints.
-- Derive each new definition from its live definition so every other payload
-- condition is preserved. Refuse an absent, unvalidated, or unexpected bound.
-- No storage, RLS, role, function, trigger, rate-limit, or existing-message edits.
-- Idempotent after activation; do not use as a down migration once longer notes exist.

begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

-- BEGIN FIVE-MINUTE MIGRATION BODY
do $voice_duration_limit$
declare
  target_name text;
  current_definition text;
  new_definition text;
  is_validated boolean;
  old_bound constant text := '(voice_duration_ms <= 60000)';
  new_bound constant text := '(voice_duration_ms <= 300000)';
begin
  -- Hold the definition stable between inspection and replacement. The short
  -- lock timeout aborts safely instead of queuing behind active chat work.
  lock table public.messages in access exclusive mode;
  foreach target_name in array array[
    'messages_voice_duration_ms_check',
    'messages_payload_check'
  ] loop
    select pg_catalog.pg_get_constraintdef(c.oid), c.convalidated
      into current_definition, is_validated
    from pg_catalog.pg_constraint c
    where c.conrelid = 'public.messages'::regclass
      and c.conname = target_name
      and c.contype = 'c';

    if not found or not is_validated then
      raise exception 'Expected existing validated voice constraint: %', target_name;
    end if;

    if position(old_bound in current_definition) > 0 then
      if (length(current_definition) - length(replace(current_definition, old_bound, ''))) / length(old_bound) <> 1
        or position(new_bound in current_definition) > 0 then
        raise exception 'Unexpected voice duration expression in %', target_name;
      end if;
      new_definition := replace(current_definition, old_bound, new_bound);
      execute format('alter table public.messages drop constraint %I', target_name);
      execute format('alter table public.messages add constraint %I %s', target_name, new_definition);
    elsif position(new_bound in current_definition) > 0 then
      if (length(current_definition) - length(replace(current_definition, new_bound, ''))) / length(new_bound) <> 1 then
        raise exception 'Unexpected voice duration expression in %', target_name;
      end if;
      -- Already activated; leave its validated definition and OID unchanged.
    else
      raise exception 'Expected a 60000ms or 300000ms voice upper bound in %', target_name;
    end if;
  end loop;
end;
$voice_duration_limit$;
-- END FIVE-MINUTE MIGRATION BODY

commit;
