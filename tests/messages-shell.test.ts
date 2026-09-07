import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getMessagesShellMode } from "../lib/messages-shell";

const ready = {
  authReady: true,
  loadState: "ready" as const,
  viewerId: "viewer",
  selectedConversationId: "conversation",
  resolvedConversationId: "conversation",
};

test("only a resolved authenticated conversation gets the focused shell", () => {
  assert.equal(getMessagesShellMode(ready), "conversation");
  assert.equal(getMessagesShellMode({ ...ready, selectedConversationId: null }), "standard");
  assert.equal(getMessagesShellMode({ ...ready, resolvedConversationId: null }), "standard");
  assert.equal(getMessagesShellMode({ ...ready, resolvedConversationId: "another" }), "standard");
  assert.equal(getMessagesShellMode({ ...ready, viewerId: null }), "standard");
});

test("auth and inbox pending work stays pending, not a focused conversation", () => {
  assert.equal(getMessagesShellMode({ ...ready, authReady: false }), "pending");
  assert.equal(getMessagesShellMode({ ...ready, loadState: "loading" }), "pending");
});

test("signed-out and unavailable states retain global escape navigation", () => {
  for (const loadState of ["signed-out", "unavailable"] as const) {
    assert.equal(getMessagesShellMode({ ...ready, loadState }), "standard");
  }
});

test("back, stale IDs, new-conversation resolution and account switches derive fresh presentation", () => {
  const states = [
    { ...ready, selectedConversationId: null, resolvedConversationId: null },
    { ...ready, resolvedConversationId: null },
    ready,
    { ...ready, selectedConversationId: null, resolvedConversationId: null },
    ready,
    { ...ready, authReady: false, viewerId: null },
    { ...ready, loadState: "signed-out" as const, viewerId: null },
  ];
  assert.deepEqual(states.map(getMessagesShellMode), [
    "standard", "standard", "conversation", "standard", "conversation", "pending", "standard",
  ]);
});

test("production view couples dock removal, header visibility and safe-area-only pane spacing", () => {
  const source = readFileSync(new URL("../app/messages/messages-view.tsx", import.meta.url), "utf8");
  assert.match(source, /getMessagesShellMode\(\{\s*authReady,\s*loadState,\s*viewerId,\s*selectedConversationId: activeConversationId,\s*resolvedConversationId: activeConversation\?\.id \?\? null/);
  assert.match(source, /<MobileAppNavigation hidden=\{focusedConversation\}/);
  assert.match(source, /focusedConversation \? "hidden lg:block"/);
  assert.match(source, /focusedConversation \? "pb-\[env\(safe-area-inset-bottom\)\]"/);
  assert.match(source, /variant="viewport" label="Opening your inbox…"/);
  assert.match(source, /variant="inline" label="Opening your conversation…"/);
  assert.match(source, /aria-label="Back to inbox"/);
  assert.match(source, /grid-cols-1 overflow-hidden lg:grid-cols-\[390px_minmax\(0,1fr\)\]/);
});

test("compact controls keep larger-text reflow and override popup motion states", () => {
  const source = readFileSync(new URL("../app/messages/messages-view.tsx", import.meta.url), "utf8");
  assert.ok(/data-chat-part="conversation-header" className="[^"]*flex-wrap/.test(source), "Header must reflow when larger text exceeds one row");
  assert.ok(/motion-reduce:animate-none! motion-reduce:transition-none!/.test(source), "Reduced motion must override shared popup state animations");
  assert.ok(/aria-label="Add attachment"/.test(source));
  assert.ok(/Photo or video/.test(source));
  assert.ok(/Artwork from your worlds/.test(source));
});
