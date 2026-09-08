import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { fetchMessagePage, fetchViewerMemberships, mergeMessageHistory, persistConversationRead, MESSAGE_FIELDS, CONTROLLED_MESSAGE_FIELDS } from "../lib/message-history";
import { createAccountScope } from "../lib/activity-session";
import type { MessageRow } from "../app/messages/messages-types";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (n: number): MessageRow => ({id: id(n), conversation_id: id(9999), sender_id: "other", body: `message-${n}`, message_type: "text", artwork_id: null, attachment_path: null, attachment_mime: null, attachment_name: null, created_at: new Date(Date.UTC(2026, 8, 6, 0, 0, Math.floor(n / 3))).toISOString()});

function fixture(initialCount = 205) {
  const rows = Array.from({length: initialCount}, (_, i) => row(i + 1));
  const updates: string[] = [];
  let readAt: string | null = null;
  const database = createClient("https://fixture.invalid", "fixture", {
    auth: {persistSession: false, autoRefreshToken: false},
    global: {fetch: async (input, init) => {
      const url = new URL(String(input));
      if (init?.method === "PATCH") {
        const through = JSON.parse(String(init.body)).last_read_at as string;
        assert.equal(url.searchParams.get("profile_id"), "eq.viewer");
        assert.equal(url.searchParams.get("conversation_id"), `eq.${id(9999)}`);
        assert.equal(url.searchParams.get("or"), `(last_read_at.is.null,last_read_at.lt.${through})`);
        if (!readAt || readAt < through) {readAt = through; updates.push(through);}
        return new Response(null, {status: 204});
      }
      assert.equal(url.searchParams.get("order"), "created_at.desc,id.desc");
      assert.equal(url.searchParams.get("conversation_id"), `eq.${id(9999)}`);
      let result = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      const cursor = url.searchParams.get("or")?.match(/^\(created_at\.lt\.(.+),and\(created_at\.eq\.(.+),id\.lt\.([0-9a-f-]+)\)\)$/);
      if (cursor) result = result.filter(message => message.created_at < cursor[1] || message.created_at === cursor[2] && message.id < cursor[3]);
      result = result.slice(0, Number(url.searchParams.get("limit")));
      return new Response(JSON.stringify(result), {status: 200, headers: {"Content-Type": "application/json"}});
    }},
  });
  return {database, rows, updates, readAt: () => readAt};
}

test("opening a 205-message conversation returns the newest 200 and keyset pagination reaches every older row", async () => {
  const {database} = fixture();
  const latest = await fetchMessagePage(database, id(9999));
  assert.equal(latest.rows.length, 200);
  assert.equal(latest.rows[0].id, id(6));
  assert.equal(latest.rows.at(-1)?.id, id(205));
  assert.ok(latest.olderCursor);
  const older = await fetchMessagePage(database, id(9999), latest.olderCursor);
  assert.deepEqual(older.rows.map(message => message.id), [1, 2, 3, 4, 5].map(id));
  assert.equal(older.olderCursor, null);
  const merged = mergeMessageHistory(latest.rows, older.rows);
  assert.equal(merged.length, 205);
  assert.equal(new Set(merged.map(message => message.id)).size, 205);
});

test("reloaded voice history retrieves its stored duration in both normal and controlled queries", async () => {
  const voice = { ...row(1), body: null, message_type: "voice", voice_duration_ms: 300000 };
  const database = createClient("https://fixture.invalid", "fixture", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => {
      const fields = new URL(String(input)).searchParams.get("select")!.split(",");
      // Match the actual database projection instead of returning unselected data.
      const projected = Object.fromEntries(fields.map(field => [field, voice[field as keyof typeof voice] ?? null]));
      return new Response(JSON.stringify([projected]), { headers: { "Content-Type": "application/json" } });
    } },
  });
  for (const controlsEnabled of [false, true]) {
    const page = await fetchMessagePage(database, id(9999), null, { controlsEnabled });
    assert.equal(page.rows[0].voice_duration_ms, 300000);
  }
});

test("an incoming message does not shift older pagination or get lost when hydration finishes", async () => {
  const {database, rows} = fixture();
  const latest = await fetchMessagePage(database, id(9999));
  rows.push(row(206));
  const received = mergeMessageHistory([], [row(206)]);
  const merged = mergeMessageHistory(received, latest.rows);
  assert.equal(merged.at(-1)?.id, id(206));
  const older = await fetchMessagePage(database, id(9999), latest.olderCursor);
  assert.equal(older.rows.length, 5);
  assert.equal(mergeMessageHistory(merged, [row(206)]).length, 201);
});

test("read watermark uses the retrieved newest message, never an unseen later arrival or a stale account", async () => {
  const {database, rows, updates, readAt} = fixture();
  const scope = createAccountScope(); scope.setAccount("viewer");
  const latest = await fetchMessagePage(database, id(9999));
  rows.push(row(209));
  const through = latest.rows.at(-1)!.created_at;
  await persistConversationRead(database, "viewer", id(9999), through, scope.capture("viewer"));
  assert.equal(readAt(), through);
  assert.ok(row(209).created_at > readAt()!);
  await persistConversationRead(database, "viewer", id(9999), row(1).created_at);
  assert.equal(readAt(), through, "An older page/realtime arrival cannot rewind the database watermark");
  const isCurrent = scope.capture("viewer"); scope.setAccount(null);
  await persistConversationRead(database, "viewer", id(9999), row(209).created_at, isCurrent);
  assert.equal(updates.length, 1);
});

test("an empty conversation does not acquire a fabricated read timestamp", async () => {
  const {database, updates} = fixture(0);
  const page = await fetchMessagePage(database, id(9999));
  assert.deepEqual(page, {rows: [], olderCursor: null});
  await persistConversationRead(database, "viewer", id(9999), null);
  assert.deepEqual(updates, []);
});

test("a failed read update is surfaced so the UI does not claim that persistence succeeded", async () => {
  const database = createClient("https://fixture.invalid", "fixture", {
    auth: {persistSession: false, autoRefreshToken: false},
    global: {fetch: async () => new Response(JSON.stringify({message: "Permission denied", code: "42501"}), {status: 403})},
  });
  await assert.rejects(persistConversationRead(database, "viewer", id(9999), row(10).created_at), error => (error as {message: string}).message === "Permission denied");
});

test("stale history cannot overwrite a realtime edit or resurrect a removed message", () => {
  const original = row(10);
  const edited = {...original, body: "Revised", edited_at: "2026-09-07T00:00:00Z"};
  const removed = {...original, body: "Message removed", removed_at: "2026-09-07T00:01:00Z"};
  assert.equal(mergeMessageHistory([edited], [original])[0].body, "Revised");
  assert.equal(mergeMessageHistory([removed], [edited])[0].body, "Message removed");
  assert.equal(mergeMessageHistory([edited], [removed])[0].removed_at, removed.removed_at);
});

test("an older edit within the same millisecond cannot replace a newer realtime revision", () => {
  const original = row(10);
  const newest = {...original, body: "Newest revision", edited_at: "2026-09-07T12:00:00.123900+00:00"};
  const stale = {...original, body: "Earlier revision", edited_at: "2026-09-07T12:00:00.123100+00:00"};
  assert.equal(mergeMessageHistory([newest], [stale])[0].body, "Newest revision");
});

test("history orders actual instants across offsets and uses message IDs only for exact timestamp ties", () => {
  const earliest = {...row(3), created_at: "2026-09-07T12:00:00.123100Z"};
  const latest = {...row(1), created_at: "2026-09-07T05:00:00.123900-07:00"};
  const tied = {...row(2), created_at: "2026-09-07T12:00:00.1239Z"};
  assert.deepEqual(mergeMessageHistory([tied], [latest, earliest]).map(message => message.id), [id(3), id(1), id(2)]);
});

test("cleared history is filtered at the database boundary and optional fields stay gated", async () => {
  const queries: URL[] = [];
  const database = createClient("https://fixture.invalid", "fixture", {
    auth: {persistSession: false, autoRefreshToken: false},
    global: {fetch: async input => {
      queries.push(new URL(String(input)));
      return new Response("[]", {headers: {"Content-Type": "application/json"}});
    }},
  });
  await fetchMessagePage(database, id(9999));
  assert.equal(queries[0].searchParams.get("select"), MESSAGE_FIELDS.replaceAll(" ", ""));
  const cutoff = "2026-09-07T00:00:00.123456+00:00";
  await fetchMessagePage(database, id(9999), null, {controlsEnabled: true, clearedBefore: cutoff});
  assert.equal(queries[1].searchParams.get("select"), CONTROLLED_MESSAGE_FIELDS.replaceAll(" ", ""));
  assert.equal(queries[1].searchParams.get("created_at"), `gt.${cutoff}`);
  await assert.rejects(fetchMessagePage(database, id(9999), null, {clearedBefore: "invalid-filter"}), /Invalid message timestamp/);
  const impossibleDate = "2026-02-30T12:00:00.123456Z";
  await assert.rejects(fetchMessagePage(database, id(9999), null, {clearedBefore: impossibleDate}), /Invalid message timestamp/);
  await assert.rejects(fetchMessagePage(database, id(9999), {id: id(10), created_at: impossibleDate}), /Invalid message timestamp/);
  await assert.rejects(persistConversationRead(database, "viewer", id(9999), impossibleDate), /Invalid message timestamp/);
  assert.equal(queries.length, 2, "Invalid cutoff, cursor, and read timestamps never reach the database");
});

test("only a missing optional membership column falls back to the legacy schema", async () => {
  for (const code of ["42703", "PGRST204", "42501"]) {
    let requests = 0;
    const database = createClient("https://fixture.invalid", "fixture", {
      auth: {persistSession: false, autoRefreshToken: false},
      global: {fetch: async input => {
        const url = new URL(String(input));
        assert.equal(url.searchParams.get("profile_id"), "eq.viewer");
        requests += 1;
        if (requests === 1) return new Response(JSON.stringify({code,message:"fixture error"}), {status:400,headers:{"Content-Type":"application/json"}});
        assert.ok(!url.searchParams.get("select")?.includes("cleared_before"));
        return new Response("[]", {headers:{"Content-Type":"application/json"}});
      }},
    });
    const result = await fetchViewerMemberships(database, "viewer");
    assert.equal(requests, code === "42501" ? 1 : 2);
    assert.equal(result.error?.code ?? null, code === "42501" ? code : null);
  }
});
