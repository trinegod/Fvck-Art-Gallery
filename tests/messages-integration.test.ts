import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import type { MessageRow } from "../app/messages/messages-types";
import { mergeMessageHistory } from "../lib/message-history";
import { compareMessageTimestamps } from "../lib/message-timestamp";

const viewPath = resolve(process.cwd(), "app/messages/messages-view.tsx");
const viewText = readFileSync(viewPath, "utf8");
const viewSource = ts.createSourceFile(
  viewPath,
  viewText,
  ts.ScriptTarget.ES2022,
  true,
  ts.ScriptKind.TSX
);

function namedFunction(name: string) {
  let result: ts.FunctionDeclaration | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      result = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(viewSource);
  assert.ok(result, `Expected ${name} in the production messages view`);
  return result;
}

function productionCallback(name: string, bindings: Record<string, unknown>) {
  const declaration = namedFunction(name).getText(viewSource);
  const expression = declaration.replace(
    new RegExp(`^async function\\s+${name}`),
    "async function"
  );
  const compiled = ts.transpileModule(`exports.callback = ${expression};`, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exported: { callback?: unknown } = {};
  const keys = Object.keys(bindings);
  new Function(...keys, "exports", compiled)(
    ...keys.map((key) => bindings[key]),
    exported
  );
  assert.equal(typeof exported.callback, "function");
  return exported.callback as (...args: unknown[]) => Promise<void>;
}

function useEffectCalls(name: "useEffect" | "useLayoutEffect") {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(viewSource);
  return calls;
}

function dependencyNames(call: ts.CallExpression) {
  const dependencies = call.arguments[1];
  assert.ok(dependencies && ts.isArrayLiteralExpression(dependencies), "Expected an effect dependency list");
  return dependencies.elements.map((element) => element.getText(viewSource));
}

function deferred<T>() {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

const conversationId = "00000000-0000-4000-8000-000000000002";
const viewerId = "00000000-0000-4000-8000-000000000003";

function textMessage(id: string, created_at: string, body: string) {
  return {
    id,
    conversation_id: conversationId,
    sender_id: viewerId,
    body,
    message_type: "text" as const,
    artwork_id: null,
    attachment_path: null,
    attachment_mime: null,
    attachment_name: null,
    created_at,
  };
}

function clearHarness() {
  const response = deferred<{ clearedBefore: string }>();
  let current = true;
  let messages = [
    textMessage("00000000-0000-4000-8000-000000000011", "2026-09-07T00:00:00.000000Z", "old"),
    textMessage("00000000-0000-4000-8000-000000000012", "2026-09-07T00:00:00.000101Z", "new"),
  ];
  let inbox: Array<{ id: string; preview: string; unreadCount: number; clearedBefore?: string | null }> = [
    { id: conversationId, preview: "old", unreadCount: 2 },
  ];
  let clearing = false;
  let optionsKey: string | null = "open";
  let armed = true;
  let olderCursor: unknown = { id: "older" };
  const calls = { inbox: 0, load: 0, messages: 0, success: 0 };

  const callback = productionCallback("clearConversationForMe", {
    supabase: {},
    viewerId,
    activeConversationId: conversationId,
    controlsEnabled: true,
    clearingConversation: false,
    captureConversation: () => () => current,
    setClearingConversation: (next: boolean) => { clearing = next; },
    setClearError: () => {},
    clearMyConversation: async () => response.promise,
    setMessages: (update: (currentMessages: typeof messages) => typeof messages) => {
      calls.messages += 1;
      messages = update(messages);
    },
    compareMessageTimestamps,
    setOlderCursor: (next: unknown) => { olderCursor = next; },
    setInbox: (update: (currentInbox: typeof inbox) => typeof inbox) => {
      calls.inbox += 1;
      inbox = update(inbox);
    },
    setConversationOptionsKey: (next: string | null) => { optionsKey = next; },
    setClearArmed: (next: boolean) => { armed = next; },
    toast: { success: () => { calls.success += 1; } },
    loadInbox: () => { calls.load += 1; },
  });

  return {
    callback,
    calls,
    resolve: response.resolve,
    invalidate: () => { current = false; },
    state: () => ({ messages, inbox, clearing, optionsKey, armed, olderCursor }),
  };
}

test("the production view only changes identity generation for viewer/conversation changes, not a cutoff refresh", () => {
  const layout = useEffectCalls("useLayoutEffect").find((call) =>
    call.getText(viewSource).includes("conversationVersion.current += 1")
  );
  assert.ok(layout);
  assert.deepEqual(dependencyNames(layout), ["viewerId", "activeConversationId"]);

  const history = useEffectCalls("useEffect").find((call) =>
    call.getText(viewSource).includes("nodeine-conversation-")
  );
  assert.ok(history);
  assert.ok(dependencyNames(history).includes("activeClearedBefore"));
  assert.doesNotMatch(history.getText(viewSource), /conversationVersion\.current\s*\+=/);

  assert.match(namedFunction("selectConversation").getText(viewSource), /resetConversationComposer\(\)/);
  assert.match(viewText, /if \(changed \|\| !userId\)[\s\S]*?setClearingConversation\(false\)/);
});

test("the extracted clear callback keeps messages received after the server cutoff and completes same-scope UI state", async () => {
  const harness = clearHarness();
  const pending = harness.callback();
  assert.equal(harness.state().clearing, true);

  harness.resolve({ clearedBefore: "2026-09-07T00:00:00.000100Z" });
  await pending;

  const state = harness.state();
  assert.deepEqual(state.messages.map((message) => message.body), ["new"]);
  assert.equal(state.olderCursor, null);
  assert.equal(state.inbox[0].clearedBefore, "2026-09-07T00:00:00.000100Z");
  assert.equal(state.inbox[0].preview, "Chat cleared for you");
  assert.equal(state.inbox[0].unreadCount, 0);
  assert.equal(state.clearing, false);
  assert.equal(state.optionsKey, null);
  assert.equal(state.armed, false);
  assert.deepEqual(harness.calls, { inbox: 1, load: 1, messages: 1, success: 1 });
});

for (const identityChange of ["account", "conversation"] as const) {
  test(`the extracted clear callback suppresses stale ${identityChange} completion UI`, async () => {
    const harness = clearHarness();
    const pending = harness.callback();
    harness.invalidate();
    harness.resolve({ clearedBefore: "2026-09-07T00:00:00.000100Z" });
    await pending;

    const state = harness.state();
    assert.deepEqual(state.messages.map((message) => message.body), ["old", "new"]);
    assert.equal(harness.calls.messages, 0);
    assert.equal(harness.calls.inbox, 0);
    assert.equal(harness.calls.load, 0);
    assert.equal(harness.calls.success, 0);
    assert.equal(state.optionsKey, "open");
    assert.equal(state.armed, true);
  });
}

test("the extracted removal callback preserves a confirmed tombstone when storage cleanup throws", async () => {
  const original = {
    ...textMessage("00000000-0000-4000-8000-000000000021", "2026-09-07T00:00:00.000000Z", "voice caption"),
    message_type: "voice" as const,
    body: null,
    attachment_path: `${conversationId}/voice/${viewerId}/00000000-0000-4000-8000-000000000022.webm`,
    attachment_mime: "audio/webm",
    voice_duration_ms: 1_000,
  };
  const tombstone = {
    ...original,
    message_type: "text" as const,
    body: "Message removed",
    attachment_path: null,
    attachment_mime: null,
    attachment_name: null,
    voice_duration_ms: null,
    removed_at: "2026-09-07T00:00:01.000000Z",
  };
  let messages: MessageRow[] = [original];
  const warnings: string[] = [];
  let cleanupCalls = 0;
  let loadCalls = 0;
  const callback = productionCallback("changeOwnMessage", {
    supabase: {
      storage: {
        from: (bucket: string) => {
          assert.equal(bucket, "conversation-voice-notes");
          return {
            remove: async (paths: string[]) => {
              cleanupCalls += 1;
              assert.deepEqual(paths, [`${conversationId}/voice/${viewerId}/00000000-0000-4000-8000-000000000022.webm`]);
              throw new TypeError("storage response lost");
            },
          };
        },
      },
    },
    viewerId,
    activeConversationId: conversationId,
    controlsEnabled: true,
    captureConversation: () => () => true,
    accountScope: { current: { capture: () => () => true } },
    editOwnMessage: async () => { throw new Error("edit should not run"); },
    removeOwnMessage: async () => ({
      message: tombstone,
      removedAttachment: {
        bucket: "conversation-voice-notes",
        path: `${conversationId}/voice/${viewerId}/00000000-0000-4000-8000-000000000022.webm`,
      },
    }),
    mergeMessageHistory,
    setMessages: (update: (currentMessages: typeof messages) => typeof messages) => {
      messages = update(messages);
    },
    toast: {
      warning: (message: string) => { warnings.push(message); },
    },
    loadInbox: () => { loadCalls += 1; },
  });

  await assert.doesNotReject(() => callback(original));
  assert.equal(cleanupCalls, 1);
  assert.equal(messages[0].body, "Message removed");
  assert.equal(messages[0].removed_at, "2026-09-07T00:00:01.000000Z");
  assert.deepEqual(warnings, ["Message removed; its stored file still needs cleanup."]);
  assert.equal(loadCalls, 1);
});
