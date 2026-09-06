import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { fetchMessagePage, mergeMessageHistory, persistConversationRead } from "../lib/message-history";
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
