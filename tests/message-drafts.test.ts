import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createMessageDraftStore, visibleMessageDrafts } from "../lib/message-drafts";
import InboxMessagePreview from "../app/messages/inbox-message-preview";

function setup() {
  const store = createMessageDraftStore();
  store.setAccount("alice");
  return store;
}

test("text stays separate in direct and group destinations, preserving whitespace, Chinese and mentions", () => {
  const store = setup();
  store.write("alice", "direct", "  你好\nSee you later 👋  ");
  store.write("alice", "group", "@everyone a group draft");
  assert.equal(store.getSnapshot().drafts.get("direct")?.text, "  你好\nSee you later 👋  ");
  assert.equal(store.getSnapshot().drafts.get("group")?.text, "@everyone a group draft");
  store.write("alice", "direct", "");
  assert.equal(store.getSnapshot().drafts.has("direct"), false);
  assert.equal(store.getSnapshot().drafts.size, 1);
});

test("a token refresh preserves drafts; logout and every identity change purge them", () => {
  const store = setup();
  store.write("alice", "chat", "private draft");
  const before = store.getSnapshot();
  store.setAccount("alice");
  assert.equal(store.getSnapshot(), before);
  store.setAccount(null);
  assert.equal(store.getSnapshot().drafts.size, 0);
  store.setAccount("alice");
  assert.equal(store.getSnapshot().drafts.size, 0);
  store.write("alice", "chat", "new draft");
  store.setAccount("bob");
  assert.equal(store.getSnapshot().drafts.size, 0);
  store.setAccount("alice");
  assert.equal(store.getSnapshot().drafts.size, 0);
});

test("stale/signed-out writes and reads never cross the account boundary", () => {
  const store = setup();
  store.write("alice", "chat", "private");
  for (const account of [null, "bob"]) {
    store.write(account, "chat", "wrong");
    assert.equal(visibleMessageDrafts(store.getSnapshot(), account).drafts.size, 0);
  }
  store.write("alice", null, "no destination");
  assert.equal(store.getSnapshot().drafts.size, 1);
  assert.equal(store.getSnapshot().drafts.get("chat")?.text, "private");
  assert.equal(store.beginSend("bob", "chat"), null);
});

test("confirmed delivery clears only its captured chat, even after switching away", () => {
  const store = setup();
  store.write("alice", "first", "send this");
  store.write("alice", "second", "keep this");
  const operation = store.beginSend("alice", "first")!;
  assert.equal(operation.text, "send this");
  assert.equal(store.beginSend("alice", "first"), null, "Returning while pending must not enable duplicate sending");
  operation.complete(true);
  assert.equal(store.getSnapshot().drafts.has("first"), false);
  assert.equal(store.getSnapshot().drafts.get("second")?.text, "keep this");
  assert.equal(store.getSnapshot().sending.size, 0);
});

test("newer edits survive confirmation, including edits back to identical text", () => {
  for (const newerText of ["new text", "original", ""]) {
    const store = setup();
    store.write("alice", "chat", "original");
    const operation = store.beginSend("alice", "chat")!;
    store.write("alice", "chat", "intermediate edit");
    store.write("alice", "chat", newerText);
    operation.complete(true);
    assert.equal(store.getSnapshot().drafts.get("chat")?.text ?? "", newerText);
  }
});

test("failed or unconfirmed text/media delivery preserves the draft and unlocks retry", () => {
  const store = setup();
  store.write("alice", "chat", "caption");
  store.beginSend("alice", "chat")!.complete(false);
  assert.equal(store.getSnapshot().drafts.get("chat")?.text, "caption");
  assert.equal(store.getSnapshot().sending.size, 0);
  assert.ok(store.beginSend("alice", "chat"));
});

test("an attachment started without a caption cannot consume text typed later", () => {
  const store = setup();
  const upload = store.beginSend("alice", "chat")!;
  assert.equal(upload.text, "");
  store.write("alice", "chat", "new message");
  upload.complete(true);
  assert.equal(store.getSnapshot().drafts.get("chat")?.text, "new message");
});

test("completion is one-shot and cannot clear a later send, even after re-login as the same account", () => {
  const store = setup();
  store.write("alice", "chat", "old");
  const old = store.beginSend("alice", "chat")!;
  store.setAccount(null);
  store.setAccount("alice");
  store.write("alice", "chat", "new");
  const current = store.beginSend("alice", "chat")!;
  old.complete(true);
  assert.equal(store.getSnapshot().drafts.get("chat")?.text, "new");
  assert.equal(store.getSnapshot().sending.has("chat"), true);
  current.complete(false);
  current.complete(true);
  assert.equal(store.getSnapshot().drafts.get("chat")?.text, "new");
});

test("different tabs/app trees never share drafts, while subscribers can leave and return", () => {
  const store = setup();
  let changes = 0;
  const stop = store.subscribe(() => { changes += 1; });
  store.write("alice", "chat", "kept while route unmounts");
  store.write("alice", "chat", "kept while route unmounts");
  assert.equal(changes, 1, "identical writes do not rerender");
  stop();
  assert.equal(store.getSnapshot().drafts.get("chat")?.text, "kept while route unmounts");
  assert.equal(setup().getSnapshot().drafts.size, 0, "fresh app/refresh starts empty");
  store.write("alice", "chat", "still private");
  assert.equal(changes, 1);
});

test("draft preview is textual, bounded, escaped, and falls back for blank text", () => {
  const render = (draft?: string) => renderToStaticMarkup(createElement(InboxMessagePreview, { draft, preview: "Latest message" }));
  assert.match(render("draft"), /Draft:/);
  assert.match(render("draft"), /truncate/);
  assert.match(render("<script>"), /&lt;script&gt;/);
  assert.doesNotMatch(render("<script>"), /<script>/);
  for (const empty of [undefined, "", "  \n "]) {
    assert.match(render(empty), /Latest message/);
    assert.doesNotMatch(render(empty), /Draft:/);
  }
});

test("production wiring keeps drafts above route lifetime, separate from storage and audio", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  const provider = read("../app/components/message-drafts-provider.tsx");
  const model = read("../lib/message-drafts.ts");
  const view = read("../app/messages/messages-view.tsx");
  assert.match(read("../app/layout.tsx"), /<MessageDraftsProvider>\{children\}<\/MessageDraftsProvider>/);
  assert.match(provider, /useState\(createMessageDraftStore\)/);
  assert.match(provider, /observeAccount\(supabase.auth, store.setAccount\)/);
  assert.match(provider, /store.setAccount\(null\)/);
  assert.doesNotMatch(provider + model, /localStorage|sessionStorage|indexedDB|fetch\(/);
  assert.doesNotMatch(view, /setDraft\(""\)/);
  assert.match(view, /InboxMessagePreview draft=\{drafts.get\(conversation.id\)/);
  assert.match(view, /<GroupMessageInput key=\{currentVoiceKey\}/);
});
