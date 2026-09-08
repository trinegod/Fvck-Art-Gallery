import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/group-mentions.sql", import.meta.url), "utf8");
const rehearsal = readFileSync(new URL("../supabase/tests/group-mentions.rollback.sql", import.meta.url), "utf8");

// These are source-contract checks, not claims that PostgreSQL was executed.
// The rollback SQL separately exercises the real parser, triggers, ACLs and RLS.
test("source contract: rollback rehearsal embeds exact migration without committing", () => {
  const body = migration.split(/^begin;\s*$/m)[1].split(/^commit;\s*$/m)[0].trim();
  const embedded = rehearsal.split("-- BEGIN EXACT GROUP-MENTIONS MIGRATION BODY\n")[1]
    .split("-- END EXACT GROUP-MENTIONS MIGRATION BODY")[0].trim();
  assert.equal(embedded, body);
  assert.equal((rehearsal.match(/^begin;$/gm) ?? []).length, 1);
  assert.equal((rehearsal.match(/^rollback;$/gm) ?? []).length, 1);
  assert.doesNotMatch(rehearsal, /^commit;$/m);
  assert.match(rehearsal, /'nodeine.mentions_trigger_review', 'NOT_REVIEWED'/);
  const assertionCount = (rehearsal.match(/^select pg_temp\.gm_(?:assert|denied)\(/gm) ?? []).length;
  assert.equal(assertionCount, 50);
  assert.match(rehearsal, new RegExp(`count\\(\\*\\) from gm_assertions\\) <> ${assertionCount}`));
  assert.match(rehearsal, /as rollback_restored;/);
});

test("source contract: fixtures never mutate provisioned profiles or protected storage", () => {
  assert.doesNotMatch(rehearsal, /(?:insert\s+into|update|delete\s+from)\s+(?:auth\.users|public\.profiles)\b/i);
  assert.doesNotMatch(rehearsal, /storage\.objects|storage\.allow_delete_query|disable\s+trigger|session_replication_role/i);
  assert.match(rehearsal, /select id, username from public\.profiles order by id limit 3/);
  assert.match(rehearsal, /fixture identifiers and notification keys are unused/);
  assert.match(rehearsal, /entire rollback namespace is unused/);
  assert.match(rehearsal, /source_key like 'message:f7100000-0000-4000-8000-%'/);
});

test("source contract: mention parser is bounded case-insensitive and fail-closed on ambiguous members", () => {
  assert.match(migration, /regexp_matches\(lower\(coalesce\(message_body, ''\)\)/);
  assert.ok(migration.includes("'(^|[[:space:](\\[{])@([a-z0-9][a-z0-9-]{2,29})(?![a-z0-9_-])', 'g'"));
  assert.match(migration, /group by lower\(profile\.username\) having count\(distinct member\.profile_id\) > 1/);
  assert.match(migration, /direct_count > 10/);
  assert.match(migration, /recipient_count > 49/);
  assert.match(rehearsal, /sales\+@ada\.example "sales"@ada\.example é@ada\.example/);
  assert.match(rehearsal, /parser excludes emails paths doubles short and overlong tokens/);
});

test("source contract: server classifies existing notifications without replacing their source pipeline", () => {
  assert.doesNotMatch(migration, /(?:create or replace function public\.create_message_notifications|drop trigger.*create_message_activity)/i);
  assert.doesNotMatch(migration, /insert into public\.notifications/i);
  assert.match(migration, /update public\.notifications notification/);
  assert.match(migration, /notification\.message_id = new\.id and notification\.conversation_id = new\.conversation_id/);
  assert.match(migration, /notification\.actor_id = new\.sender_id and notification\.kind = 'message'/);
  assert.match(migration, /member\.profile_id <> new\.sender_id/);
  assert.match(migration, /member\.muted_until is null or member\.muted_until <= now\(\)/);
  assert.match(migration, /kind = 'group'/);
  assert.match(migration, /create trigger zz_nodeine_classify_group_mentions after insert/);
  assert.doesNotMatch(migration, /after update|before update/i);
});

test("source contract: trusted markers are immutable to clients and ordinary media payloads retain INSERT", () => {
  assert.match(migration, /revoke insert, update on table public\.messages from public, anon, authenticated/);
  assert.match(migration, /revoke insert \(%s\), update \(%s\)/);
  assert.match(migration, /revoke all on table public\.notifications from public, anon, authenticated/);
  assert.match(migration, /revoke all \(%s\) on table public\.notifications/);
  assert.match(migration, /grant insert \(id, conversation_id, sender_id, body, created_at, message_type,\s*artwork_id, attachment_path, attachment_mime, attachment_name, voice_duration_ms\)/);
  assert.match(migration, /grant select, delete on table public\.notifications to authenticated/);
  assert.match(migration, /grant update \(read_at\) on table public\.notifications to authenticated/);
  assert.doesNotMatch(migration, /grant[^;]*(?:sent_mention_kind|mention_kind)/);
  assert.match(rehearsal, /client cannot insert mention marker/);
  assert.match(rehearsal, /recipient cannot update mention classification/);
});

test("source contract: sender limits serialize immutable server-timestamped original sends", () => {
  assert.match(migration, /tgname = 'prevent_spoofed_message_control_metadata'/);
  assert.match(migration, /auth\.uid\(\) is distinct from new\.sender_id or viewer_role is null/);
  assert.match(migration, /viewer_role not in \('owner', 'admin'\)/);
  assert.match(migration, /current_setting\('transaction_isolation'\) <> 'read committed'/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(new\.sender_id::text, 9411\)\)/);
  assert.match(migration, /from public\.messages where sender_id = new\.sender_id and sent_mention_kind is not null/);
  assert.match(migration, /created_at >= statement_timestamp\(\) - interval '1 minute'/);
  assert.match(migration, /recent_mentions >= 10/);
  assert.match(migration, /recent_broadcasts >= 2/);
  assert.match(rehearsal, /multirow insert respects per-row serialized rate count/);
  assert.match(rehearsal, /clear chat does not reset mention history/);
  assert.match(rehearsal, /rate window expiry accepts retry/);
});

test("source contract: whole-group deletion is gated on server without changing normal controls", () => {
  assert.match(migration, /revoke all on function public\.delete_group\(uuid\) from public, anon, authenticated/);
  assert.doesNotMatch(migration, /create or replace function public\.(?:delete_group|leave_group|edit_own_message|remove_own_message|clear_my_conversation)/);
  assert.match(rehearsal, /group owner cannot bypass whole-group cleanup gate/);
  assert.match(rehearsal.split(/^rollback;$/m)[1], /has_function_privilege\('authenticated','public\.delete_group\(uuid\)','EXECUTE'\)/);
});
