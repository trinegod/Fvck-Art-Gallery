import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { cleanGroupDescription, fetchGroupDescription, GroupDescriptionError, updateGroupDescription } from "../lib/group-description";

const conversationId = "f7200000-0000-4000-8000-000000000001";
const saved = { conversation_id: conversationId, description: "About this group",
  updated_at: "2026-09-08T10:00:00.123456+00:00", can_edit: true };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json" },
});
const client = (fetch: typeof globalThis.fetch) => createClient("https://fixture.invalid", "fixture-only", {
  auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
});
const current = () => true;

test("description read crosses only its current-conversation RPC and validates returned scope", async () => {
  const database = client(async (input, init) => {
    assert.equal(new URL(String(input)).pathname, "/rest/v1/rpc/get_group_description");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { target_conversation_id: conversationId });
    return json(saved);
  });
  assert.deepEqual(await fetchGroupDescription(database, conversationId, current), {
    state: "ready", conversationId, description: saved.description, updatedAt: saved.updated_at, canEdit: true,
  });
});

test("description save sends only normalized text and conversation scope, preserving paragraphs", async () => {
  const database = client(async (input, init) => {
    assert.equal(new URL(String(input)).pathname, "/rest/v1/rpc/update_group_description");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      target_conversation_id: conversationId, new_description: "First line\nSecond line", expected_updated_at: null,
    });
    return json({ ...saved, description: "First line\nSecond line" });
  });
  assert.equal((await updateGroupDescription(database, conversationId, " \tFirst line\nSecond line\v ", null, current))?.description,
    "First line\nSecond line");
});

test("500-character validation matches PostgreSQL code points, including emoji and vertical-tab trim", () => {
  assert.equal(cleanGroupDescription("🦊".repeat(500)), "🦊".repeat(500));
  assert.throws(() => cleanGroupDescription("🦊".repeat(501)), { outcome: "rejected" });
  assert.equal(cleanGroupDescription(" \vAbout v\v "), "About v");
  assert.equal(cleanGroupDescription(" \t\n\r\f\v"), "");
  assert.equal(cleanGroupDescription("hello\n\nworld"), "hello\n\nworld");
});

test("invalid target or oversized text never starts an RPC", async () => {
  let calls = 0;
  const database = client(async () => { calls++; return json(saved); });
  await assert.rejects(fetchGroupDescription(database, "not-a-uuid", current), { outcome: "rejected" });
  await assert.rejects(updateGroupDescription(database, conversationId, "x".repeat(501), null, current), { outcome: "rejected" });
  assert.equal(calls, 0);
});

test("only the exact missing read RPC becomes unavailable without a table fallback", async () => {
  let calls = 0;
  const database = client(async () => {
    calls++; return json({ code: "PGRST202", message: "Could not find public.get_group_description in schema cache" }, 404);
  });
  assert.equal((await fetchGroupDescription(database, conversationId, current))?.state, "unavailable");
  assert.equal(calls, 1);
});

for (const error of [
  { code: "42501", message: "permission denied for get_group_description" },
  { code: "P0001", message: "Only current group members can read the group About." },
  { code: "42883", message: "function internal_dependency does not exist" },
  { code: "PGRST202", message: "Could not find some_other_function" },
]) test(`description does not downgrade ${error.code}: ${error.message}`, async () => {
  let calls = 0;
  const database = client(async () => { calls++; return json(error, 400); });
  await assert.rejects(fetchGroupDescription(database, conversationId, current), { outcome: "rejected", message: error.message });
  assert.equal(calls, 1);
});

test("a missing write RPC is an explicit unavailable error, never an optimistic local save", async () => {
  const database = client(async () => json({ code: "42883", message: "function public.update_group_description does not exist" }, 400));
  await assert.rejects(updateGroupDescription(database, conversationId, "About", null, current), { outcome: "unavailable" });
});

test("expired account or conversation scopes skip both read and write requests", async () => {
  let calls = 0;
  const database = client(async () => { calls++; return json(saved); });
  assert.equal(await fetchGroupDescription(database, conversationId, () => false), null);
  assert.equal(await updateGroupDescription(database, conversationId, "About", null, () => false), null);
  assert.equal(calls, 0);
});

for (const action of ["read", "write"] as const) test(`account switch suppresses late ${action} success or failure without a retry`, async () => {
  for (const fails of [false, true]) {
    let active = true, calls = 0;
    const database = client(async () => {
      calls++; active = false;
      return fails ? json({ code: "PGRST202", message: "Could not find public.get_group_description" }, 404) : json(saved);
    });
    const result = action === "read"
      ? await fetchGroupDescription(database, conversationId, () => active)
      : await updateGroupDescription(database, conversationId, saved.description, null, () => active);
    assert.equal(result, null);
    assert.equal(calls, 1);
  }
});

test("a transport failure has unknown outcome and never silently clears saved About", async () => {
  const database = client(async () => { throw new Error("offline"); });
  await assert.rejects(updateGroupDescription(database, conversationId, "new", null, current), (error: unknown) =>
    error instanceof GroupDescriptionError && error.outcome === "unknown");
});

test("malformed or cross-conversation responses fail closed", async () => {
  for (const value of [null, [], { ...saved, conversation_id: "different" },
    { ...saved, description: "x".repeat(501) }, { ...saved, can_edit: "true" },
    { ...saved, updated_at: "yesterday" }, { ...saved, updated_at: undefined }]) {
    await assert.rejects(fetchGroupDescription(client(async () => json(value)), conversationId, current), { outcome: "unknown" });
  }
});

test("a successful write must confirm its exact normalized text, server version, and permission", async () => {
  for (const value of [{ ...saved, description: "different" }, { ...saved, can_edit: false }, { ...saved, updated_at: null }]) {
    await assert.rejects(updateGroupDescription(client(async () => json(value)), conversationId, saved.description, null, current), { outcome: "unknown" });
  }
});

test("saves preserve PostgreSQL microsecond versions verbatim and surface stale-editor conflicts", async () => {
  let calls = 0;
  const database = client(async (_input, init) => {
    calls++;
    assert.equal(JSON.parse(String(init?.body)).expected_updated_at, saved.updated_at);
    return json({ code: "40001", message: "Group About changed since you opened it. Refresh it before saving again." }, 400);
  });
  await assert.rejects(updateGroupDescription(database, conversationId, "My unsaved draft", saved.updated_at, current),
    { outcome: "conflict" });
  assert.equal(calls, 1);
});

test("invalid editor versions are rejected before a mutation starts", async () => {
  let calls = 0;
  const database = client(async () => { calls++; return json(saved); });
  await assert.rejects(updateGroupDescription(database, conversationId, "About", "yesterday", current), { outcome: "rejected" });
  assert.equal(calls, 0);
});
