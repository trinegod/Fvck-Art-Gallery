import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/message-controls.sql", import.meta.url), "utf8");
const rehearsal = readFileSync(new URL("../supabase/tests/message-controls.rollback.sql", import.meta.url), "utf8");

test("the rollback rehearsal embeds the exact reviewed controls body without its transaction wrappers", () => {
  const body = migration.split(/^begin;\s*$/m)[1].split(/^commit;\s*$/m)[0].trim();
  const embedded = rehearsal.split("-- BEGIN EXACT MESSAGE-CONTROLS MIGRATION BODY\n")[1]
    .split("-- END EXACT MESSAGE-CONTROLS MIGRATION BODY")[0].trim();
  assert.equal(embedded, body);
  assert.equal((rehearsal.match(/^begin;$/gm) ?? []).length, 1);
  assert.equal((rehearsal.match(/^rollback;$/gm) ?? []).length, 1);
  assert.doesNotMatch(rehearsal, /^commit;$/m);
  assert.match(rehearsal, /'nodeine.controls_trigger_review', 'NOT_REVIEWED'/);
});

test("fixture rehearsal never creates auth identities or bypasses storage deletion protection", () => {
  assert.doesNotMatch(rehearsal, /(?:insert\s+into|update|delete\s+from)\s+(?:auth\.users|public\.profiles)\b/i);
  assert.doesNotMatch(rehearsal, /(?:delete\s+from\s+storage\.objects|storage\.allow_delete_query|disable\s+trigger|session_replication_role)/i);
  assert.match(rehearsal, /from public\.profiles order by id limit 1/);
  assert.match(rehearsal, /fixture identifiers are unused/);
  assert.match(rehearsal, /'42501'/);
  assert.match(rehearsal, /'P0001'/);
});

test("control metadata protection resets broad table and column grants before restoring only app necessities", () => {
  assert.match(migration, /revoke all on table public\.messages, public\.conversation_members from public, anon, authenticated;/);
  assert.match(migration, /revoke all \(%s\) on table public\.%I from public, anon, authenticated/);
  assert.match(migration, /grant select, insert on table public\.messages to authenticated;/);
  assert.match(migration, /grant update \(last_read_at\) on table public\.conversation_members to authenticated;/);
  assert.doesNotMatch(migration, /grant\s+update\s+on\s+table\s+public\.(?:messages|conversation_members)/i);
});

test("accepted edits removal versions and clear results preserve monotonic database ordering", () => {
  assert.match(migration, /edited_at = greatest\(statement_timestamp\(\),\s*message\.edited_at \+ interval '1 microsecond', message\.created_at\)/);
  assert.match(migration, /removed_at = greatest\(statement_timestamp\(\),\s*existing_message\.edited_at \+ interval '1 microsecond', existing_message\.created_at\)/);
  assert.match(migration, /set cleared_before = greatest\(member\.cleared_before, cutoff\)/);
  assert.match(migration, /returning member\.cleared_before into cutoff;/);
});

test("notification previews are neutralized inside each authorized edit or removal path", () => {
  assert.equal((migration.match(/update public\.notifications/g) ?? []).length, 3);
  assert.equal((migration.match(/set preview = 'Message edited'/g) ?? []).length, 1);
  assert.equal((migration.match(/set preview = 'Message removed'/g) ?? []).length, 2);
  assert.equal((migration.match(/and kind = 'message'/g) ?? []).length, 3);
  assert.doesNotMatch(migration, /set preview\s*=\s*(?:clean_body|new_body|updated_message\.body)/);
  assert.match(rehearsal, /former recipient receives no replacement message body/);
  assert.match(rehearsal, /edit removal and retry preserve all notification IDs read states and counts/);
});
