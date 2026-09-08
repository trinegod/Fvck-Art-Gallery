import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { createAccountScope } from "../lib/activity-session";
import { fetchMessagePage, fetchViewerMemberships, mergeMessageHistory, MESSAGE_FIELDS } from "../lib/message-history";
import { getMessageControls } from "../lib/message-actions";
import { compareMessageTimestamps } from "../lib/message-timestamp";
import { VOICE_NOTE_BUCKET } from "../lib/voice-note-upload";
import type { MessageRow } from "../app/messages/messages-types";

const source = ts.createSourceFile("messages-view.tsx", readFileSync("app/messages/messages-view.tsx", "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const calls: ts.CallExpression[] = [];
const nodes: ts.Node[] = [];
const visit = (node: ts.Node) => { nodes.push(node); if (ts.isCallExpression(node)) calls.push(node); ts.forEachChild(node, visit); };
visit(source);
const authCallback = calls.find(call => call.expression.getText(source) === "observeAccount")!.arguments[1];
const historyEffect = calls.find(call => call.expression.getText(source) === "useEffect" && call.arguments[0].getText(source).includes("const controlsRequest = getMessageControls"))!;

function execute<T>(node: ts.Node, bindings: Record<string, unknown>): T {
  const expression = node.getText(source);
  const compiled = ts.transpileModule(`exports.value = (${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exported = { value: undefined as T };
  new Function(...Object.keys(bindings), "exports", compiled)(...Object.values(bindings), exported);
  return exported.value;
}
function namedCallback(name: string) {
  const declaration = nodes.find(node => ts.isVariableDeclaration(node) && node.name.getText(source) === name) as ts.VariableDeclaration | undefined;
  assert.ok(declaration?.initializer && ts.isCallExpression(declaration.initializer), name);
  return declaration.initializer.arguments[0];
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function message(id: string, sender: string): MessageRow {
  return { id, conversation_id: "group", sender_id: sender, body: "Synthetic stored message", message_type: "text", artwork_id: null, attachment_path: null, attachment_mime: null, attachment_name: null, created_at: "2026-09-08T00:00:00.000Z" };
}

// Execute the real auth observer callback, history effect, and effect dependency
// list. The small commit scheduler uses React's Object.is dependency comparison;
// only the database adapter is fake. No React-hook mocks or duplicated loaders.
function lifecycle(initialViewer: string | null, boundAccount = initialViewer) {
  const scope = createAccountScope();
  scope.setAccount(boundAccount);
  const state: Record<string, unknown> = { viewerId: initialViewer, accountEpoch: 0, messages: [], loadState: "ready" };
  const bindings: Record<string, unknown> = {
    scope, accountScope: { current: scope }, conversationVersion: { current: 1 },
    activeConversationId: "group", activeClearedBefore: null, MESSAGE_FIELDS, VOICE_NOTE_BUCKET,
    fetchMessagePage, fetchViewerMemberships, getMessageControls, mergeMessageHistory, compareMessageTimestamps,
  };
  for (const name of ["historyAnchor", "lastHandledMessage", "followingMessages", "unseenMessageCount", "messagesScrollerRef", "loadOlderRef", "voiceSendLock", "startedProfileRef"]) bindings[name] = { current: null };
  for (const match of source.text.matchAll(/\b(set[A-Z]\w*)\(/g)) {
    const key = match[1][3].toLowerCase() + match[1].slice(4);
    bindings[match[1]] = (value: unknown) => { state[key] = typeof value === "function" ? value(state[key]) : value; };
  }
  const pages: Array<{ account: string | null; response: ReturnType<typeof deferred<{ data: MessageRow[]; error: null }>> }> = [];
  const channel = { on: () => channel, subscribe: () => channel };
  bindings.supabase = {
    rpc: async (name: string) => ({ data: name === "nodeine_message_controls" ? { enabled: true, clearedBefore: null } : [], error: null }),
    channel: () => channel, removeChannel: () => {},
    from: (table: string) => {
      const account = scope.account();
      let limit = 0;
      const query = {
        select: () => query, eq: () => query, in: () => query, order: () => query,
        limit: (value: number) => { limit = value; return query; },
        then: (resolve: (result: { data: unknown[]; error: null }) => unknown) => {
          if (table === "messages" && limit === 201) {
            const response = deferred<{ data: MessageRow[]; error: null }>();
            pages.push({ account, response });
            return response.promise.then(resolve);
          }
          const data = table === "profiles" ? [{ id: account, username: "synthetic", display_name: "Synthetic viewer", avatar_url: null }]
            : table === "conversation_members" ? [{ conversation_id: "group", profile_id: account, role: "owner", last_read_at: null, muted_until: null, cleared_before: null }]
              : table === "conversations" ? [{ id: "group", kind: "group", title: "Synthetic group", avatar_path: null, updated_at: "2026-09-08T00:00:00.000Z" }] : [];
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return query;
    },
  };
  for (const name of ["isMissingMessagingError", "messagePreview"]) {
    const declaration = nodes.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)!;
    bindings[name] = execute(declaration, bindings);
  }
  for (const name of ["hydrateMessages", "loadSharedArtworkState", "loadPendingInvites", "loadInbox"]) bindings[name] = execute(namedCallback(name), bindings);
  let dependencies: unknown[] | null = null;
  let cleanup: (() => void) | undefined;
  return {
    state, pages,
    auth: (viewer: string | null) => execute<(value: string | null) => void>(authCallback, bindings)(viewer),
    rebind: () => { scope.clear(); (bindings.conversationVersion as { current: number }).current++; },
    commit: () => {
      const current = { ...bindings, viewerId: state.viewerId, accountEpoch: state.accountEpoch };
      const next = execute<unknown[]>(historyEffect.arguments[1], current);
      if (dependencies && next.every((value, index) => Object.is(value, dependencies![index]))) return;
      cleanup?.();
      dependencies = next;
      cleanup = execute<() => (() => void) | undefined>(historyEffect.arguments[0], current)();
    },
    dispose: () => cleanup?.(),
  };
}

test("a same-viewer account-scope rebind restarts the actual history effect without reopening the chat", async () => {
  const app = lifecycle("viewer-one");
  app.rebind();
  app.commit(); // Preserved viewer state, but auth setup has not rebound its scope.
  app.auth("viewer-one");
  app.commit();
  await flush();
  assert.equal(app.pages.length, 1, "the same visible viewer must still get a new history request");
  app.pages[0].response.resolve({ data: [message("one", "viewer-one"), message("two", "viewer-one")], error: null });
  await flush();
  assert.equal((app.state.messages as MessageRow[]).length, 2);
  app.dispose();
});

test("a changed viewer reloads history and a late previous-account page cannot restore private rows", async () => {
  const app = lifecycle("viewer-one");
  app.commit();
  await flush();
  assert.equal(app.pages.length, 1);
  app.auth("viewer-two");
  app.commit();
  await flush();
  assert.equal(app.pages.length, 2);
  app.pages[1].response.resolve({ data: [message("new", "viewer-two")], error: null });
  await flush();
  app.pages[0].response.resolve({ data: [message("old-private", "viewer-one")], error: null });
  await flush();
  assert.deepEqual((app.state.messages as MessageRow[]).map(row => row.id), ["new"]);
  app.dispose();
});

test("normal same-user auth events do not reset or reload a valid history scope", async () => {
  const app = lifecycle("viewer-one");
  app.commit();
  await flush();
  app.pages[0].response.resolve({ data: [message("kept", "viewer-one")], error: null });
  await flush();
  app.auth("viewer-one");
  app.commit();
  await flush();
  assert.equal(app.pages.length, 1);
  assert.deepEqual((app.state.messages as MessageRow[]).map(row => row.id), ["kept"]);
  app.dispose();
});

test("a same-viewer rebind discards an older in-flight page instead of merging it into the fresh scope", async () => {
  const app = lifecycle("viewer-one");
  app.commit();
  await flush();
  app.rebind();
  app.auth("viewer-one");
  app.commit();
  await flush();
  assert.equal(app.pages.length, 2);
  app.pages[1].response.resolve({ data: [message("fresh", "viewer-one")], error: null });
  await flush();
  app.pages[0].response.resolve({ data: [message("stale", "viewer-one")], error: null });
  await flush();
  assert.deepEqual((app.state.messages as MessageRow[]).map(row => row.id), ["fresh"]);
  app.dispose();
});

test("scope-bound readers restart on account epoch without resubscribing the auth observer", () => {
  for (const marker of ["const controlsRequest = getMessageControls", "async function checkVoiceDelivery", "const acknowledgement = createReadAcknowledgement", "return observeLatestMessageVisibility", '"start_direct_conversation"', "nodeine-group-invitations-"]) {
    const reader = calls.find(call => call.expression.getText(source) === "useEffect" && call.arguments[0].getText(source).includes(marker));
    assert.ok(reader, marker);
    assert.ok(ts.isArrayLiteralExpression(reader.arguments[1]));
    assert.ok(reader.arguments[1].elements.some(element => element.getText(source) === "accountEpoch"), marker);
  }
  const observer = calls.find(call => call.expression.getText(source) === "useEffect" && call.arguments[0].getText(source).includes("observeAccount("))!;
  assert.equal(observer.arguments[1].getText(source), "[loadInbox]");
  for (const name of ["loadInbox", "loadPendingInvites"]) {
    const declaration = nodes.find(node => ts.isVariableDeclaration(node) && node.name.getText(source) === name) as ts.VariableDeclaration;
    assert.ok(declaration.initializer && ts.isCallExpression(declaration.initializer));
    assert.doesNotMatch(declaration.initializer.arguments[1].getText(source), /accountEpoch/, name);
  }
});
