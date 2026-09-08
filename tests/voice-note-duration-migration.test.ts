import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MAX_VOICE_NOTE_DURATION_MS } from "../lib/voice-note-upload";

const migration = readFileSync("supabase/voice-notes-five-minute-limit.sql", "utf8");
const rehearsal = readFileSync("supabase/tests/voice-notes-five-minute-limit.rollback.sql", "utf8");

function migrationBody(source: string) {
  const body = source.split("-- BEGIN FIVE-MINUTE MIGRATION BODY\n")[1]
    ?.split("-- END FIVE-MINUTE MIGRATION BODY")[0];
  assert.ok(body, "the marked migration body must exist");
  return body;
}

test("the canonical SQL checks and shared upload limit both allow five minutes", () => {
  const canonical = readFileSync("supabase/voice-notes.sql", "utf8");
  const bounds = [...canonical.matchAll(/voice_duration_ms between 1 and (\d+)/g)]
    .map(match => Number(match[1]));
  assert.equal(MAX_VOICE_NOTE_DURATION_MS, 300000);
  assert.deepEqual(bounds, [300000, 300000], "both payload and optional-duration checks must agree");
});

test("the rollback rehearsal embeds the exact narrow production migration body", () => {
  // Source drift protection, not a SQL execution test. Compilation and actual
  // CHECK behavior are verified by the authorized rollback-only DB rehearsal.
  assert.equal(migrationBody(rehearsal), migrationBody(migration));
  assert.match(migration, /set local lock_timeout = '2s';/);
  assert.match(migration, /set local statement_timeout = '30s';/);
  assert.match(migration, /\ncommit;\s*$/);
  const rehearsalStatements = rehearsal.replace(/--[^\n]*/g, "");
  assert.doesNotMatch(rehearsalStatements, /^\s*commit\s*;/im);
  assert.match(rehearsalStatements, /\nrollback;/);
  assert.match(rehearsalStatements, /from pg_temp\.voice_limit_assertions\) <> 26/);
  assert.doesNotMatch(rehearsalStatements, /select 'PASS:/i,
    "a later rollback result cannot certify earlier assertions for an error-continuing client");
  assert.match(rehearsalStatements, /as rollback_restored/);
});

test("the narrow migration changes only the two existing validated duration CHECKs", () => {
  const body = migrationBody(migration).replace(/--[^\n]*/g, "");
  assert.match(body, /array\[\s*'messages_voice_duration_ms_check',\s*'messages_payload_check'\s*\]/);
  assert.match(body, /old_bound constant text := '\(voice_duration_ms <= 60000\)'/);
  assert.match(body, /new_bound constant text := '\(voice_duration_ms <= 300000\)'/);
  assert.match(body, /if not found or not is_validated then/);
  assert.match(body, /new_definition := replace\(current_definition, old_bound, new_bound\)/);
  assert.equal((body.match(/execute format\(/g) ?? []).length, 2);
  assert.match(body, /execute format\('alter table public\.messages drop constraint %I', target_name\)/);
  assert.match(body, /execute format\('alter table public\.messages add constraint %I %s', target_name, new_definition\)/);
  assert.doesNotMatch(body, /\b(?:insert|delete|update|grant|revoke|create\s+(?:policy|trigger|function))\b/i);
  assert.doesNotMatch(body, /\bstorage\./i);
});
