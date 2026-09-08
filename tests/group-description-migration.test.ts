import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/group-description.sql", import.meta.url), "utf8");
const rehearsal = readFileSync(new URL("../supabase/tests/group-description.rollback.sql", import.meta.url), "utf8");

// Source contracts complement, but do not claim execution of, the real SQL rehearsal.
test("source contract: About rehearsal contains exact transaction body and mandatory rollback gate", () => {
  const body = migration.split(/^begin;\s*$/m)[1].split(/^commit;\s*$/m)[0].trim();
  const embedded = rehearsal.split("-- BEGIN EXACT GROUP-DESCRIPTION MIGRATION BODY\n")[1]
    .split("-- END EXACT GROUP-DESCRIPTION MIGRATION BODY")[0].trim();
  assert.equal(embedded, body);
  assert.equal((rehearsal.match(/^begin;$/gm) ?? []).length, 1);
  assert.equal((rehearsal.match(/^rollback;$/gm) ?? []).length, 1);
  assert.doesNotMatch(rehearsal, /^commit;$/m);
  assert.match(rehearsal, /'nodeine.description_trigger_review', 'NOT_REVIEWED'/);
  assert.equal((rehearsal.match(/^select pg_temp\.gd_(?:assert|denied)\(/gm) ?? []).length, 38);
  assert.match(rehearsal, /count\(\*\) from gd_assertions\) <> 38/);
  assert.match(rehearsal, /as rollback_restored;/);
});

test("source contract: description is private and no historical table grant or routine is widened", () => {
  assert.match(migration, /alter table public\.group_descriptions enable row level security/);
  assert.match(migration, /revoke all on table public\.group_descriptions from public, anon, authenticated/);
  assert.match(migration, /revoke all \(%s\) on table public\.group_descriptions/);
  assert.doesNotMatch(migration, /grant\s+(?:select|insert|update|delete|all)\b/i);
  assert.doesNotMatch(migration, /(?:alter table|update|insert into|delete from) public\.(?:conversations|conversation_members|messages|notifications)\b/i);
  assert.doesNotMatch(migration, /(?:revoke|grant)[^;]*public\.(?:messages|notifications|conversations|conversation_members|delete_group|leave_group|update_group_details|edit_own_message|remove_own_message|clear_my_conversation)\b/i);
  assert.doesNotMatch(migration, /publication|create policy|create trigger/i);
  assert.match(rehearsal, /existing controls mentions policies triggers and grants are byte-identical/);
});

test("source contract: scoped RPCs lock current group membership and enforce owner/admin writes", () => {
  assert.equal((migration.match(/security definer set search_path = ''/g) ?? []).length, 2);
  assert.equal((migration.match(/member\.profile_id = auth\.uid\(\) and conversation\.kind = 'group'/g) ?? []).length, 2);
  assert.equal((migration.match(/for share of member;/g) ?? []).length, 2);
  assert.match(migration, /viewer_role is null or viewer_role not in \('owner', 'admin'\)/);
  assert.match(migration, /check \(char_length\(description\) <= 500\)/);
  assert.match(migration, /char_length\(clean_description\) > 500/);
  assert.match(migration, /grant execute on function public\.get_group_description\(uuid\) to authenticated/);
  assert.match(migration, /grant execute on function public\.update_group_description\(uuid,text,timestamptz\) to authenticated/);
});

test("source contract: absent-row and stale-editor races serialize with exact monotonic versions", () => {
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(target_conversation_id::text, 9412\)\)/);
  assert.match(migration, /saved_description\.updated_at is distinct from expected_updated_at/);
  assert.match(migration, /errcode = '40001'/);
  assert.match(migration, /greatest\(statement_timestamp\(\), current_description\.updated_at \+ interval '1 microsecond'\)/);
  assert.match(migration, /current_description\.description = excluded\.description then current_description\.updated_at/);
  assert.match(rehearsal, /second initial editor cannot overwrite first description/);
  assert.match(rehearsal, /stale owner editor cannot overwrite newer admin About/);
  assert.match(rehearsal, /accepted save preserves microsecond monotonicity despite earlier statement time/);
});

test("source contract: rollback uses read-only provisioned actors without profile storage or trigger bypass", () => {
  assert.doesNotMatch(rehearsal, /(?:insert\s+into|update|delete\s+from)\s+(?:auth\.users|public\.profiles)\b/i);
  assert.doesNotMatch(rehearsal, /storage\.objects|storage\.allow_delete_query|disable\s+trigger|session_replication_role/i);
  assert.match(rehearsal, /select id from public\.profiles order by id limit 1/);
  assert.match(rehearsal, /fixture namespace is unused/);
  assert.match(rehearsal, /pending invitation is not read membership/);
  assert.match(rehearsal, /former member cannot read retained About/);
  assert.match(rehearsal, /anonymous cannot call update RPC/);
});
