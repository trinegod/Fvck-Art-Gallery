import assert from "node:assert/strict";
import test from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAccountScope, observeAccount, runAccountRequest } from "../lib/activity-session";
import { fetchActivity, persistActivitySeen } from "../lib/activity-data";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: {"Content-Type": "application/json"} });
function client(fetch: typeof globalThis.fetch) {
  return createClient("https://fixture.invalid", "fixture-only", { auth: {persistSession: false, autoRefreshToken: false}, global: {fetch} });
}

for (const outcome of ["success", "failure"] as const) {
  test(`Activity ${outcome} after logout/account switch cannot commit private state`, async () => {
    const pending = deferred<Response>();
    const started = deferred<void>();
    const database = client(async input => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("notifications")) {
        started.resolve();
        return pending.promise;
      }
      return json([]);
    });
    const scope = createAccountScope();
    scope.setAccount("account-a");
    const visible: unknown[] = [];
    const failures: unknown[] = [];
    const oldLoad = runAccountRequest(scope, "account-a", "activity", current => fetchActivity(database, "account-a", current), value => visible.push(value), error => failures.push(error));
    await started.promise;
    scope.setAccount(null);
    scope.setAccount("account-b");
    const currentRequest = scope.latest("activity", "account-b");
    pending.resolve(outcome === "success" ? json([{id: "private-a", actor_id: "actor", recipient_id: "account-a"}]) : json({message: "old private failure", code: "42501"}, 403));
    await oldLoad;
    assert.deepEqual(visible, []);
    assert.deepEqual(failures, []);
    let requested = false;
    await runAccountRequest(scope, "account-a", "activity", async () => {requested = true;}, () => {}, () => {});
    assert.equal(requested, false, "A stale realtime closure cannot start another old-account request");
    assert.equal(currentRequest(), true, "A stale account callback cannot invalidate the new account's current request");
  });
}

test("a newer same-account refresh wins without accepting an older result or failure", async () => {
  const scope = createAccountScope(); scope.setAccount("a");
  const pending = deferred<string>();
  const values: string[] = [];
  const first = runAccountRequest(scope, "a", "activity", () => pending.promise, value => values.push(value), () => assert.fail());
  await runAccountRequest(scope, "a", "activity", async () => "new", value => values.push(value), () => assert.fail());
  pending.resolve("old"); await first;
  assert.deepEqual(values, ["new"]);
  const valid = scope.capture("a"); scope.clear(); scope.setAccount("a");
  assert.equal(valid(), false, "Logout/login to the same account invalidates the old generation");
});

test("auth events beat delayed bootstrap success, and unsubscribe suppresses callbacks", async () => {
  const initial = deferred<{data: {user: {id: string}}}>();
  let emit!: (event: string, session: {user: {id: string}} | null) => void;
  let unsubscribed = false;
  const auth = {
    getUser: () => initial.promise,
    onAuthStateChange(callback: typeof emit) {emit = callback; return {data: {subscription: {unsubscribe(){unsubscribed = true;}}}};},
  } as unknown as SupabaseClient["auth"];
  const accounts: (string | null)[] = [];
  const stop = observeAccount(auth, account => accounts.push(account));
  emit("SIGNED_OUT", null); emit("SIGNED_IN", {user: {id: "b"}});
  initial.resolve({data: {user: {id: "a"}}}); await flush();
  assert.deepEqual(accounts, [null, "b"]);
  stop(); emit("SIGNED_IN", {user: {id: "c"}});
  assert.deepEqual(accounts, [null, "b"]); assert.equal(unsubscribed, true);
});

test("individual seen persistence consumes the lazy request and scopes it to supplied unread IDs", async () => {
  const requests: {url: URL; body: unknown}[] = [];
  const database = client(async (input, init) => {
    requests.push({url: new URL(String(input)), body: JSON.parse(String(init?.body))});
    return json([{id: "notice-a", read_at: "2026-09-06T12:00:00Z"}]);
  });
  const persisted = await persistActivitySeen(database, "account-a", ["notice-a"], "2026-09-06T12:00:00Z");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.searchParams.get("recipient_id"), "eq.account-a");
  assert.equal(requests[0].url.searchParams.get("id"), "in.(notice-a)");
  assert.equal(requests[0].url.searchParams.get("read_at"), "is.null");
  assert.deepEqual(persisted, [{id: "notice-a", read_at: "2026-09-06T12:00:00Z"}]);
});

test("failed seen persistence rejects rather than reporting optimistic success", async () => {
  const database = client(async () => json({message: "Denied", code: "42501"}, 403));
  await assert.rejects(persistActivitySeen(database, "a", ["notice-a"], "2026-09-06T12:00:00Z"), error => (error as {message: string}).message === "Denied");
});

test("active Activity load assembles related records through the real query boundary", async () => {
  const requested: string[] = [];
  const database = client(async input => {
    const table = new URL(String(input)).pathname.split("/").at(-1)!;
    requested.push(table);
    return json(table === "notifications"
      ? [{id: "notice", recipient_id: "viewer", actor_id: "actor", artwork_id: "art", conversation_id: "chat"}]
      : [{id: table === "profiles" ? "actor" : table === "artworks" ? "art" : "chat"}]);
  });
  const result = await fetchActivity(database, "viewer");
  assert.equal(result?.notifications[0].id, "notice");
  assert.equal(result?.profiles[0].id, "actor");
  assert.equal(result?.artworks[0].id, "art");
  assert.equal(result?.conversations[0].id, "chat");
  assert.deepEqual(requested.sort(), ["artworks", "conversations", "notifications", "profiles"]);
});
