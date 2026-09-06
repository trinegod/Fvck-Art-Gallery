import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createAccountScope } from "../lib/activity-session";
import { persistMessageAttachment } from "../lib/message-attachment";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {resolve = done;});
  return {promise, resolve};
}
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers: {"Content-Type": "application/json"}});
const input = () => ({accountId: "viewer", conversationId: "original-chat", path: "original-chat/attachments/fixture.png", file: new File(["fixture"], "art.png", {type: "image/png"}), mime: "image/png", caption: null, messageType: "image" as const});

for (const failMessage of [false, true]) {
  test(`same-account navigation ${failMessage ? "still cleans up a failed insert" : "finishes the upload in its original conversation"}`, async () => {
    const upload = deferred<Response>();
    const started = deferred<void>();
    const inserts: Record<string, string>[] = [];
    const removed: unknown[] = [];
    const database = createClient("https://fixture.invalid", "fixture", {
      auth: {persistSession: false, autoRefreshToken: false},
      global: {fetch: async (url, init) => {
        const pathname = new URL(String(url)).pathname;
        if (pathname.endsWith("/messages")) {
          const body = JSON.parse(String(init?.body)); inserts.push(body);
          return failMessage ? response({message: "Insert denied", code: "42501"}, 403) : response({id: "sent", ...body});
        }
        if (init?.method === "DELETE") {
          removed.push(JSON.parse(String(init.body))); return response([]);
        }
        started.resolve(); return upload.promise;
      }},
    });
    const scope = createAccountScope(); scope.setAccount("viewer");
    let activeConversation = "original-chat";
    const sending = persistMessageAttachment(database, {...input(), conversationId: activeConversation}, scope.capture("viewer"));
    await started.promise;
    activeConversation = "new-chat";
    upload.resolve(response({Key: input().path}));
    if (failMessage) await assert.rejects(sending, /Media wasn't sent: Insert denied/);
    else assert.equal((await sending)?.conversation_id, "original-chat");
    assert.equal(activeConversation, "new-chat");
    assert.equal(inserts[0].conversation_id, "original-chat");
    assert.deepEqual(removed, failMessage ? [{prefixes: [input().path]}] : []);
  });
}

test("logout while upload is pending cannot initiate message or cleanup writes with the next account", async () => {
  const upload = deferred<Response>();
  const started = deferred<void>();
  const requests: string[] = [];
  const database = createClient("https://fixture.invalid", "fixture", {
    auth: {persistSession: false, autoRefreshToken: false},
    global: {fetch: async url => {requests.push(String(url)); started.resolve(); return upload.promise;}},
  });
  const scope = createAccountScope(); scope.setAccount("viewer");
  const sending = persistMessageAttachment(database, input(), scope.capture("viewer"));
  await started.promise;
  scope.setAccount(null); scope.setAccount("another-viewer");
  upload.resolve(response({Key: input().path}));
  assert.equal(await sending, null);
  assert.equal(requests.length, 1);
});
