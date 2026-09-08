-- ROLLBACK-ONLY rehearsal for an already activated 60000ms voice-note schema.
-- Review before running with an authorized database connection. No COMMIT.
-- Applies the EXACT narrow migration body, checks the REAL resulting constraints
-- on temporary rows, then restores the original definitions with ROLLBACK.
-- Writes no auth users, profiles, conversations, messages, or storage objects.
-- The temporary clone has CHECK/NOT NULL constraints but NO RLS, foreign keys,
-- indexes, or triggers. This verifies duration/payload validation, not delivery
-- or authenticated RLS behavior; those unchanged paths need a release smoke test.
-- Requires the initial 60-second rollout. Refuses an already upgraded baseline.
-- Execute as ONE multi-statement query whose first SQL error stops execution.
-- If using psql, require -v ON_ERROR_STOP=1. A client that continues after errors
-- cannot prove the assertions passed merely by observing a successful rollback.
-- PostgreSQL LIKE INCLUDING CONSTRAINTS semantics:
-- https://www.postgresql.org/docs/current/sql-createtable.html

begin;
set local lock_timeout = '2s';
set local statement_timeout = '30s';

create temporary table voice_limit_assertions (label text primary key) on commit drop;
create function pg_temp.voice_limit_assert(ok boolean, label text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Voice-limit rehearsal failed: %', label; end if;
  insert into pg_temp.voice_limit_assertions values (label);
end;
$$;

-- Capture only metadata; no private message or audio content is read.
create function pg_temp.voice_security_snapshot()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'relations', (select jsonb_agg(jsonb_build_object(
      'oid', c.oid, 'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity,
      'owner', c.relowner, 'acl', c.relacl::text) order by c.oid)
      from pg_catalog.pg_class c where c.oid in (
        'public.messages'::regclass, 'public.conversations'::regclass,
        'public.conversation_members'::regclass, 'storage.objects'::regclass)),
    'policies', (select jsonb_agg(to_jsonb(p) order by p.oid)
      from pg_catalog.pg_policy p where p.polrelid in (
        'public.messages'::regclass, 'public.conversations'::regclass,
        'public.conversation_members'::regclass, 'storage.objects'::regclass)),
    'triggers', (select jsonb_agg(jsonb_build_object(
      'oid', t.oid, 'definition', pg_catalog.pg_get_triggerdef(t.oid), 'enabled', t.tgenabled) order by t.oid)
      from pg_catalog.pg_trigger t where t.tgrelid in (
        'public.messages'::regclass, 'public.conversations'::regclass,
        'public.conversation_members'::regclass, 'storage.objects'::regclass)),
    'functions', (select jsonb_agg(jsonb_build_object(
      'oid', p.oid, 'definition', pg_catalog.pg_get_functiondef(p.oid),
      'owner', p.proowner, 'acl', p.proacl::text) order by p.oid)
      from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in (
        'nodeine_voice_notes_available', 'validate_voice_note_message',
        'is_conversation_member', 'can_manage_conversation',
        'create_message_notifications', 'touch_conversation')),
    'other_constraints', (select jsonb_agg(jsonb_build_object(
      'oid', c.oid, 'definition', pg_catalog.pg_get_constraintdef(c.oid),
      'validated', c.convalidated) order by c.oid)
      from pg_catalog.pg_constraint c where c.conrelid = 'public.messages'::regclass
      and c.conname not in ('messages_voice_duration_ms_check', 'messages_payload_check')),
    'bucket', (select to_jsonb(b) from storage.buckets b where b.id = 'conversation-voice-notes')
  );
$$;

create temporary table voice_limit_baseline on commit drop as
select pg_temp.voice_security_snapshot() as security;
create temporary table voice_constraint_baseline on commit drop as
select c.conname, pg_catalog.pg_get_constraintdef(c.oid) as definition, c.convalidated
from pg_catalog.pg_constraint c
where c.conrelid = 'public.messages'::regclass
  and c.conname in ('messages_voice_duration_ms_check', 'messages_payload_check');

select pg_temp.voice_limit_assert(
  (select count(*) = 2 and bool_and(convalidated
    and position('(voice_duration_ms <= 60000)' in definition) > 0
    and position('(voice_duration_ms <= 300000)' in definition) = 0)
  from pg_temp.voice_constraint_baseline), 'baseline has two validated 60000ms checks');
select pg_temp.voice_limit_assert(
  (select count(*) = 4 and bool_and(relrowsecurity) from pg_catalog.pg_class
    where oid in ('public.messages'::regclass, 'public.conversations'::regclass,
      'public.conversation_members'::regclass, 'storage.objects'::regclass)), 'private tables retain RLS');
select pg_temp.voice_limit_assert(
  (select not public and file_size_limit = 4194304
    and allowed_mime_types @> array['audio/webm', 'audio/mp4']::text[]
    and cardinality(allowed_mime_types) = 2
    from storage.buckets where id = 'conversation-voice-notes'), 'private bucket retains 4 MiB and two MIME types');
select pg_temp.voice_limit_assert(
  has_function_privilege('authenticated', 'public.nodeine_voice_notes_available()', 'execute')
    and not has_function_privilege('anon', 'public.nodeine_voice_notes_available()', 'execute'),
  'capability remains executable only by authenticated clients');

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

select pg_temp.voice_limit_assert(
  (select count(*) = 2 and bool_and(c.convalidated and pg_catalog.pg_get_constraintdef(c.oid)
    = replace(b.definition, '(voice_duration_ms <= 60000)', '(voice_duration_ms <= 300000)'))
  from pg_temp.voice_constraint_baseline b join pg_catalog.pg_constraint c
    on c.conname = b.conname and c.conrelid = 'public.messages'::regclass),
  'only each duration upper bound changed; both checks validated');
select pg_temp.voice_limit_assert(
  pg_temp.voice_security_snapshot() = (select security from pg_temp.voice_limit_baseline),
  'bucket RLS policies grants triggers functions and other checks unchanged');

create temporary table voice_duration_rows
  (like public.messages including constraints) on commit drop;

create function pg_temp.expect_voice_payload(label text, changes jsonb, accepted boolean)
returns void language plpgsql as $$
declare
  rejected boolean := false;
  constraint_name text;
begin
  -- Deterministic synthetic IDs exist ONLY in this TEMP table, with no FKs.
  begin
    insert into pg_temp.voice_duration_rows
    select * from jsonb_populate_record(null::pg_temp.voice_duration_rows,
      jsonb_build_object(
        'id', 'f5000000-0000-4000-8000-000000000001',
        'conversation_id', 'f5000000-0000-4000-8000-000000000002',
        'sender_id', 'f5000000-0000-4000-8000-000000000003',
        'created_at', '2026-09-07T00:00:00Z', 'message_type', 'voice',
        'body', null, 'artwork_id', null, 'attachment_name', null,
        'attachment_path', 'f5000000-0000-4000-8000-000000000002/voice/f5000000-0000-4000-8000-000000000003/f5000000-0000-4000-8000-000000000001.webm',
        'attachment_mime', 'audio/webm', 'voice_duration_ms', 300000
      ) || changes);
  exception when check_violation then
    get stacked diagnostics constraint_name = constraint_name;
    if constraint_name not in ('messages_payload_check', 'messages_voice_duration_ms_check') then
      raise exception 'Unexpected constraint % for %', constraint_name, label;
    end if;
    rejected := true;
  end;
  perform pg_temp.voice_limit_assert(rejected = not accepted, label);
end;
$$;

select pg_temp.expect_voice_payload('1ms WebM accepted', '{"voice_duration_ms":1}', true);
select pg_temp.expect_voice_payload('60000ms existing limit accepted', '{"voice_duration_ms":60000}', true);
select pg_temp.expect_voice_payload('60001ms newly enabled accepted', '{"voice_duration_ms":60001}', true);
select pg_temp.expect_voice_payload('299999ms accepted', '{"voice_duration_ms":299999}', true);
select pg_temp.expect_voice_payload('300000ms WebM accepted', '{}', true);
select pg_temp.expect_voice_payload('300000ms MP4 accepted', '{"attachment_mime":"audio/mp4"}', true);
select pg_temp.expect_voice_payload('0ms rejected', '{"voice_duration_ms":0}', false);
select pg_temp.expect_voice_payload('negative duration rejected', '{"voice_duration_ms":-1}', false);
select pg_temp.expect_voice_payload('300001ms rejected', '{"voice_duration_ms":300001}', false);
select pg_temp.expect_voice_payload('missing voice duration rejected', '{"voice_duration_ms":null}', false);
select pg_temp.expect_voice_payload('other voice MIME rejected', '{"attachment_mime":"audio/ogg"}', false);
select pg_temp.expect_voice_payload('voice with text body rejected', '{"body":"synthetic test"}', false);
select pg_temp.expect_voice_payload('voice with artwork rejected', '{"artwork_id":"f5000000-0000-4000-8000-000000000004"}', false);
select pg_temp.expect_voice_payload('voice without attachment rejected', '{"attachment_path":null}', false);
select pg_temp.expect_voice_payload('text payload preserved', '{"message_type":"text","body":"synthetic test","attachment_path":null,"attachment_mime":null,"voice_duration_ms":null}', true);
select pg_temp.expect_voice_payload('artwork payload preserved', '{"message_type":"artwork","artwork_id":"f5000000-0000-4000-8000-000000000004","attachment_path":null,"attachment_mime":null,"voice_duration_ms":null}', true);
select pg_temp.expect_voice_payload('image payload preserved', '{"message_type":"image","attachment_mime":"image/png","voice_duration_ms":null}', true);
select pg_temp.expect_voice_payload('video payload preserved', '{"message_type":"video","attachment_mime":"video/mp4","voice_duration_ms":null}', true);
select pg_temp.expect_voice_payload('text cannot borrow voice duration', '{"message_type":"text","body":"synthetic test","attachment_path":null,"voice_duration_ms":1}', false);
select pg_temp.voice_limit_assert((select count(*) = 10 from pg_temp.voice_duration_rows), 'exactly ten accepted temporary payloads');

-- Require all 26 assertions before restoring the baseline. Any assertion error
-- aborts this transaction; do not ignore SQL errors and claim a rehearsal pass.
do $$ begin
  if (select count(*) from pg_temp.voice_limit_assertions) <> 26 then
    raise exception 'Incomplete voice-limit assertion coverage';
  end if;
end; $$;
rollback;

-- The CLI may show only the last SELECT. Verify the full execution had NO SQL
-- errors before claiming 26 passing assertions. The final SELECT reports only
-- the current rollback state, not proof that preceding assertions succeeded.
do $$ begin
  if (select count(*) from pg_catalog.pg_constraint c
      where c.conrelid = 'public.messages'::regclass and c.convalidated
      and c.conname in ('messages_voice_duration_ms_check', 'messages_payload_check')
      and position('(voice_duration_ms <= 60000)' in pg_catalog.pg_get_constraintdef(c.oid)) > 0
      and position('(voice_duration_ms <= 300000)' in pg_catalog.pg_get_constraintdef(c.oid)) = 0) <> 2
    or to_regclass('pg_temp.voice_duration_rows') is not null
    or to_regclass('pg_temp.voice_limit_assertions') is not null then
    raise exception 'Voice-limit rollback postcondition failed';
  end if;
end; $$;
select
  (select count(*) = 2 from pg_catalog.pg_constraint c
    where c.conrelid = 'public.messages'::regclass and c.convalidated
    and c.conname in ('messages_voice_duration_ms_check', 'messages_payload_check')
    and position('(voice_duration_ms <= 60000)' in pg_catalog.pg_get_constraintdef(c.oid)) > 0
    and position('(voice_duration_ms <= 300000)' in pg_catalog.pg_get_constraintdef(c.oid)) = 0)
  and to_regclass('pg_temp.voice_duration_rows') is null
  and to_regclass('pg_temp.voice_limit_assertions') is null as rollback_restored,
  '26 assertion passes require error-free stop-on-error execution. Rollback alone is not assertion proof. No public fixture rows or audio are written.' as verification_note;
