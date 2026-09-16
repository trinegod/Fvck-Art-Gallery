import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import type { MessageRow, SharedArtwork } from "../app/messages/messages-types";
import { classifyArtworkShareResponse, UNCONFIRMED_ARTWORK_SHARE, type ArtworkShareResult } from "../lib/artwork-share";
import { createMessageDraftStore } from "../lib/message-drafts";

const viewerId = "00000000-0000-4000-8000-000000000001";
const conversationId = "00000000-0000-4000-8000-000000000002";
const artworkId = "00000000-0000-4000-8000-000000000003";
const expected = { senderId: viewerId, conversationId, artworkId };
const artwork: SharedArtwork = {
  id: artworkId, title: "Synthetic artwork", src: "/test.webp",
  thumb_src: null, media_type: "image", mood: null,
};
const confirmed: MessageRow = {
  id: "00000000-0000-4000-8000-000000000004", sender_id: viewerId,
  conversation_id: conversationId, artwork_id: artworkId, message_type: "artwork",
  body: null, attachment_path: null, attachment_mime: null, attachment_name: null,
  voice_duration_ms: null, created_at: "2026-09-16T01:00:00.000000Z",
};

test("sharing requires a confirmed row for the exact artwork, account and conversation", () => {
  assert.deepEqual(classifyArtworkShareResponse(confirmed, null, expected), { status: "sent", message: confirmed });
  for (const data of [null, [], {}, { ...confirmed, id: "wrong" },
    { ...confirmed, sender_id: "another-viewer" }, { ...confirmed, conversation_id: "another-chat" },
    { ...confirmed, artwork_id: "another-artwork" }, { ...confirmed, message_type: "text" },
    { ...confirmed, body: "Unexpected caption" }, { ...confirmed, attachment_path: "unexpected" },
    { ...confirmed, created_at: "yesterday" }, { ...confirmed, removed_at: confirmed.created_at }]) {
    assert.equal(classifyArtworkShareResponse(data, null, expected).status, "unconfirmed");
  }
});

test("known write rejections permit retry, but transport and ambiguous responses do not", () => {
  for (const code of ["42501", "23503", "23514", "P0001", "40001", "PGRST204"]) {
    assert.deepEqual(classifyArtworkShareResponse(null, { code, message: "Rejected" }, expected), {
      status: "failed", message: "Rejected",
    });
  }
  for (const code of ["", "08006", "40003", "PGRST116", "PGRST000", "NETWORK_ERROR"]) {
    assert.deepEqual(classifyArtworkShareResponse(null, { code, message: "No response" }, expected), {
      status: "unconfirmed", message: UNCONFIRMED_ARTWORK_SHARE,
    });
  }
});

const viewPath = resolve(process.cwd(), "app/messages/messages-view.tsx");
const viewText = readFileSync(viewPath, "utf8");
const source = ts.createSourceFile(viewPath, viewText, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
let shareFunction: ts.FunctionDeclaration | undefined;
function visit(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "shareArtwork") shareFunction = node;
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(shareFunction, "Expected the actual shareArtwork production callback");
const compiled = ts.transpileModule(`exports.callback = ${shareFunction.getText(source)
  .replace(/^async function\s+shareArtwork/, "async function")};`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

type Response = { data: unknown; error: { code?: string; message?: string } | null };
function harness({ inboxThrows = false } = {}) {
  let settle!: (result: Response) => void;
  let reject!: (error: Error) => void;
  const response = new Promise<Response>((resolvePromise, rejectPromise) => { settle = resolvePromise; reject = rejectPromise; });
  let current = true;
  let accountCurrent = true;
  let sending = false;
  const sendingChanges: boolean[] = [];
  let error: string | null = null;
  let messages: MessageRow[] = [];
  let shared = new Map<string, SharedArtwork>();
  let inserts = 0;
  let inboxLoads = 0;
  let successes = 0;
  let inserted: unknown;
  const draftStore = createMessageDraftStore();
  draftStore.setAccount(viewerId);
  draftStore.write(viewerId, conversationId, "  Keep my unfinished text  ");
  const lock = { current: null as { token: symbol; isCurrent: () => boolean } | null };
  const bindings = {
    supabase: { from: () => ({ insert: (row: unknown) => {
      inserts += 1; inserted = row;
      return { select: () => ({ single: () => response }) };
    } }) },
    viewerId, activeConversationId: conversationId, sending: false, draftSending: false,
    uploadingMedia: false, voiceSending: false, voiceActive: false, artworkShareLock: lock,
    captureConversation: () => () => current && accountCurrent,
    accountScope: { current: { capture: () => () => accountCurrent } },
    classifyArtworkShareResponse, UNCONFIRMED_ARTWORK_SHARE, MESSAGE_FIELDS: "*",
    draftStore,
    setSending: (next: boolean) => { sending = next; sendingChanges.push(next); },
    setError: (next: string | null) => { error = next; },
    setMessages: (update: (old: MessageRow[]) => MessageRow[]) => { messages = update(messages); },
    setSharedArtworks: (update: (old: typeof shared) => typeof shared) => { shared = update(shared); },
    toast: { error: () => {}, success: () => { successes += 1; }, warning: () => {} },
    loadInbox: async () => { inboxLoads += 1; if (inboxThrows) throw new Error("Inbox unavailable"); },
  };
  const exported: { callback?: (item: SharedArtwork) => Promise<ArtworkShareResult> } = {};
  new Function(...Object.keys(bindings), "exports", compiled)(...Object.values(bindings), exported);
  assert.ok(exported.callback);
  return {
    run: () => exported.callback!(artwork),
    settle, reject,
    switchConversation: () => { current = false; },
    switchAccount: () => { accountCurrent = false; draftStore.setAccount("another-account"); },
    draftStore,
    state: () => ({ sending, sendingChanges, error, messages, shared, inserts, inboxLoads, successes, inserted, lock: lock.current }),
  };
}

test("confirmed artwork sharing preserves the unrelated draft and sends the original artwork ID once", async () => {
  const h = harness();
  const pending = h.run();
  assert.equal(h.state().sending, true);
  h.settle({ data: confirmed, error: null });
  assert.deepEqual(await pending, { status: "sent" });
  assert.deepEqual(h.state().inserted, { conversation_id: conversationId, sender_id: viewerId,
    body: null, message_type: "artwork", artwork_id: artworkId });
  assert.equal(h.state().messages[0], confirmed);
  assert.equal(h.state().shared.get(artworkId), artwork);
  assert.equal(h.state().sending, false);
  assert.equal(h.state().lock, null);
  assert.equal(h.state().successes, 1);
  assert.equal(h.state().inboxLoads, 1);
  assert.equal(h.draftStore.getSnapshot().drafts.get(conversationId)?.text, "  Keep my unfinished text  ");
});

test("rapid repeated confirmation cannot create two artwork messages before React rerenders", async () => {
  const h = harness();
  const pending = h.run();
  const second = h.run();
  assert.equal(h.state().inserts, 1);
  h.settle({ data: confirmed, error: null });
  assert.equal((await pending).status, "sent");
  assert.equal((await second).status, "failed");
});

test("a rejected artwork insert preserves the draft, reports failure, and releases pending state", async () => {
  const h = harness();
  const pending = h.run();
  h.settle({ data: null, error: { code: "42501", message: "Membership is required" } });
  assert.deepEqual(await pending, { status: "failed", message: "Membership is required" });
  assert.equal(h.state().sending, false);
  assert.equal(h.state().lock, null);
  assert.equal(h.state().messages.length, 0);
  assert.equal(h.state().successes, 0);
  assert.equal(h.draftStore.getSnapshot().drafts.get(conversationId)?.text, "  Keep my unfinished text  ");
});

for (const mode of ["throw", "missing-row", "wrong-destination", "network-error"] as const) {
  test(`production ${mode} is unconfirmed, not success or a safe retry`, async () => {
    const h = harness();
    const pending = h.run();
    if (mode === "throw") h.reject(new TypeError("Connection lost"));
    else h.settle({ data: mode === "wrong-destination" ? { ...confirmed, conversation_id: "another-chat" } : null,
      error: mode === "network-error" ? { code: "", message: "Failed to fetch" } : null });
    assert.deepEqual(await pending, { status: "unconfirmed", message: UNCONFIRMED_ARTWORK_SHARE });
    assert.equal(h.state().sending, false);
    assert.equal(h.state().lock, null);
    assert.equal(h.state().messages.length, 0);
    assert.equal(h.state().successes, 0);
    assert.equal(h.draftStore.getSnapshot().drafts.get(conversationId)?.text, "  Keep my unfinished text  ");
  });
}

for (const identityChange of ["conversation", "account"] as const) {
  test(`late artwork confirmation cannot update a different ${identityChange}`, async () => {
    const h = harness();
    const pending = h.run();
    if (identityChange === "account") h.switchAccount(); else h.switchConversation();
    h.settle({ data: confirmed, error: null });
    await pending;
    assert.equal(h.state().messages.length, 0);
    assert.equal(h.state().shared.size, 0);
    assert.equal(h.state().successes, 0);
    assert.deepEqual(h.state().sendingChanges, [true], "Old completion must not reset new scope's pending state");
    assert.equal(h.state().inboxLoads, identityChange === "account" ? 0 : 1);
  });
}

test("an inbox refresh failure cannot turn confirmed artwork delivery into an unconfirmed resend", async () => {
  const h = harness({ inboxThrows: true });
  const pending = h.run();
  h.settle({ data: confirmed, error: null });
  assert.deepEqual(await pending, { status: "sent" });
  assert.equal(h.state().sending, false);
  assert.equal(h.state().messages.length, 1);
  assert.equal(h.state().successes, 1);
});
