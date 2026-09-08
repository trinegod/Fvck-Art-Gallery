import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { fetchActivity, messageActivityLabel } from "../lib/activity-data";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json" },
});
const client = (fetch: typeof globalThis.fetch) => createClient("https://fixture.invalid", "fixture-only", {
  auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
});

test("Activity labels only server-classified mentions, never a preview containing @", () => {
  assert.equal(messageActivityLabel({ preview: "@everyone hello" }), "sent a message");
  assert.equal(messageActivityLabel({ preview: "hello", mention_kind: "person" }), "mentioned you");
  assert.equal(messageActivityLabel({ preview: "hello", mention_kind: "everyone" }), "mentioned everyone");
  assert.equal(messageActivityLabel({ preview: "Message edited" }), "sent a message");
  assert.equal(messageActivityLabel({ preview: "Message removed" }), "sent a message");
  assert.equal(messageActivityLabel({ preview: "Message edited", mention_kind: "person" }), "mentioned you");
  assert.equal(messageActivityLabel({ preview: "Message removed", mention_kind: "everyone" }), "mentioned everyone");
});

test("Activity retains the feed before the optional mention migration with account-scoped fallback", async () => {
  const requests: URL[] = [];
  const database = client(async input => {
    const url = new URL(String(input)); requests.push(url);
    return requests.length === 1
      ? json({ code: "42703", message: "column notifications.mention_kind does not exist" }, 400)
      : json([]);
  });
  const result = await fetchActivity(database, "viewer");
  assert.deepEqual(result?.notifications, []);
  assert.equal(requests.length, 2);
  assert.match(requests[0].searchParams.get("select")!, /mention_kind/);
  assert.doesNotMatch(requests[1].searchParams.get("select")!, /mention_kind/);
  for (const url of requests) assert.equal(url.searchParams.get("recipient_id"), "eq.viewer");
});

for (const error of [
  { code: "42501", message: "permission denied for mention_kind" },
  { code: "42703", message: "column something_else does not exist" },
]) test(`Activity does not downgrade ${error.code}: ${error.message}`, async () => {
  let calls = 0;
  const database = client(async () => { calls++; return json(error, 403); });
  await assert.rejects(fetchActivity(database, "viewer"), error);
  assert.equal(calls, 1);
});

test("account changes suppress an optional-column fallback request", async () => {
  let current = true, calls = 0;
  const database = client(async () => {
    calls++; current = false;
    return json({ code: "42703", message: "column mention_kind does not exist" }, 400);
  });
  assert.equal(await fetchActivity(database, "viewer", () => current), null);
  assert.equal(calls, 1);
});
