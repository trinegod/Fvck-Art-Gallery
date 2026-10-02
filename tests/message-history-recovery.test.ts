import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createAccountScope } from "../lib/activity-session";
import { createMessageDraftStore } from "../lib/message-drafts";
import { mergeMessageHistory, type MessageCursor } from "../lib/message-history";
import { compareMessageTimestamps } from "../lib/message-timestamp";
import type { MessageRow } from "../app/messages/messages-types";

const source = ts.createSourceFile("messages-view.tsx", readFileSync("app/messages/messages-view.tsx", "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const nodes: ts.Node[] = [];
const visit = (node: ts.Node) => { nodes.push(node); ts.forEachChild(node, visit); };
visit(source);
const historyEffect = nodes.find((node): node is ts.CallExpression => ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0].getText(source).includes("const controlsRequest = getMessageControls"))!;

function execute<T>(node: ts.Node, bindings: Record<string, unknown>): T {
  const compiled = ts.transpileModule(`exports.value = (${node.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exported = { value: undefined as T };
  new Function(...Object.keys(bindings), "require", "exports", compiled)(...Object.values(bindings), createRequire(import.meta.url), exported);
  return exported.value;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
const message = (id: string, created_at: string): MessageRow => ({ id, created_at, conversation_id: "group", sender_id: "other", body: "Synthetic message", message_type: "text", artwork_id: null, attachment_path: null, attachment_mime: null, attachment_name: null });
const newest = message("newest", "2026-09-30T12:00:00Z");
const oldest = message("oldest", "2026-09-29T12:00:00Z");
const cursor: MessageCursor = { id: newest.id, created_at: newest.created_at };

// Execute the production effect and callbacks; only its database/React state
// boundaries are fixtures. No browser session or live private data is used.
function harness(cutoff: string | null = null) {
  const scope = createAccountScope(); scope.setAccount("viewer");
  const draftStore = createMessageDraftStore(); draftStore.setAccount("viewer");
  draftStore.write("viewer", "group", "Keep this unfinished draft");
  const state: Record<string, unknown> = { messages: [], historyError: null, error: null };
  const requests: Array<{ before: MessageCursor | null; options: unknown; response: ReturnType<typeof deferred<{ rows: MessageRow[]; olderCursor: MessageCursor | null }>> }> = [];
  const loadOlderRef: { current: (() => Promise<void>) | null } = { current: null };
  const retryHistoryRef: { current: (() => Promise<void>) | null } = { current: null };
  const historyAnchor = { current: null };
  let incoming: ((payload: { eventType: string; new: MessageRow }) => Promise<void>) | null = null;
  const channel = { on: (_kind: string, _filter: unknown, callback: typeof incoming) => { incoming = callback; return channel; }, subscribe: () => channel };
  const bindings: Record<string, unknown> = {
    supabase: { channel: () => channel, removeChannel: () => {} }, viewerId: "viewer", activeConversationId: "group", activeClearedBefore: cutoff,
    conversationVersion: { current: 1 }, accountScope: { current: scope }, historyAnchor,
    lastHandledMessage: { current: null }, followingMessages: { current: true }, unseenMessageCount: { current: 0 },
    messagesScrollerRef: { current: { scrollHeight: 1200, scrollTop: 180 } }, loadOlderRef, retryHistoryRef,
    getMessageControls: async () => ({ enabled: true, clearedBefore: cutoff }),
    fetchMessagePage: (_db: unknown, _id: string, before: MessageCursor | null, options: unknown) => {
      const response = deferred<{ rows: MessageRow[]; olderCursor: MessageCursor | null }>();
      requests.push({ before, options, response }); return response.promise;
    },
    hydrateMessages: async (rows: MessageRow[]) => rows, loadSharedArtworkState: async () => {}, mergeMessageHistory, compareMessageTimestamps,
  };
  for (const match of source.text.matchAll(/\b(set[A-Z]\w*)\(/g)) {
    const key = match[1][3].toLowerCase() + match[1].slice(4);
    bindings[match[1]] = (value: unknown) => { state[key] = typeof value === "function" ? value(state[key]) : value; };
  }
  const dispose = execute<() => () => void>(historyEffect.arguments[0], bindings)();
  return { state, requests, loadOlderRef, retryHistoryRef, historyAnchor, draftStore, scope, dispose,
    incoming: (row: MessageRow) => incoming!({ eventType: "INSERT", new: row }) };
}

test("failed initial history is a dedicated retryable state, not an empty conversation or send error", async () => {
  const app = harness(); await flush();
  app.requests[0].response.reject(new Error("offline fixture")); await flush();
  assert.deepEqual(app.state.historyError, { key: "viewer:group", stage: "initial" });
  assert.equal(app.state.error, null);
  assert.equal(app.state.conversationLoading, false);
  assert.equal(typeof app.retryHistoryRef.current, "function");
  assert.equal(app.draftStore.getSnapshot().drafts.get("group")?.text, "Keep this unfinished draft");
  app.dispose();
});

test("retry is single-flight, uses the same clear cutoff, and merges an arrival without duplication", async () => {
  const cutoff = "2026-09-28T00:00:00Z";
  const app = harness(cutoff); await flush();
  app.requests[0].response.reject(new Error("offline fixture")); await flush();
  const retry = app.retryHistoryRef.current!();
  void app.retryHistoryRef.current!(); await flush();
  assert.equal(app.requests.length, 2);
  assert.deepEqual(app.requests[1].options, { controlsEnabled: true, clearedBefore: cutoff });
  assert.equal(app.state.conversationLoading, true);
  assert.deepEqual(app.state.historyError, { key: "viewer:group", stage: "initial" });
  await app.incoming(newest);
  app.requests[1].response.resolve({ rows: [oldest, newest], olderCursor: cursor }); await retry;
  assert.deepEqual((app.state.messages as MessageRow[]).map(row => row.id), ["oldest", "newest"]);
  assert.equal(app.state.historyError, null);
  assert.equal(app.state.conversationLoading, false);
  assert.equal(app.draftStore.getSnapshot().drafts.get("group")?.text, "Keep this unfinished draft");
  app.dispose();
});

test("an older-page failure retains loaded messages and retries its exact cursor with a scroll anchor", async () => {
  const app = harness(); await flush();
  app.requests[0].response.resolve({ rows: [newest], olderCursor: cursor }); await flush();
  const older = app.loadOlderRef.current!(); await flush();
  app.requests[1].response.reject(new Error("older page offline")); await older;
  assert.deepEqual(app.state.historyError, { key: "viewer:group", stage: "older" });
  assert.deepEqual(app.state.messages, [newest]);
  assert.deepEqual(app.state.olderCursor, cursor);
  const retry = app.retryHistoryRef.current!(); await flush();
  assert.deepEqual(app.requests[2].before, cursor);
  assert.deepEqual(app.state.messages, [newest]);
  app.requests[2].response.resolve({ rows: [oldest], olderCursor: null }); await retry;
  assert.deepEqual((app.state.messages as MessageRow[]).map(row => row.id), ["oldest", "newest"]);
  assert.deepEqual(app.historyAnchor.current, { height: 1200, top: 180 });
  assert.equal(app.state.historyError, null);
  app.dispose();
});

test("a successful empty retry clears the failure instead of leaving a permanent retry control", async () => {
  const app = harness(); await flush();
  app.requests[0].response.reject(new Error("offline fixture")); await flush();
  const retry = app.retryHistoryRef.current!(); await flush();
  app.requests[1].response.resolve({ rows: [], olderCursor: null }); await retry;
  assert.deepEqual(app.state.messages, []);
  assert.equal(app.state.historyError, null);
  assert.equal(app.state.olderCursor, null);
  await app.retryHistoryRef.current!();
  assert.equal(app.requests.length, 2, "there is no failed page to retry after success");
  app.dispose();
});

for (const identity of ["conversation", "account"] as const) for (const outcome of ["success", "failure"] as const) {
  test(`a late retry ${outcome} cannot change a new ${identity}`, async () => {
    const app = harness(); await flush();
    app.requests[0].response.reject(new Error("offline")); await flush();
    const previousRetry = app.retryHistoryRef.current!;
    const retry = previousRetry(); await flush();
    if (identity === "conversation") app.dispose();
    else app.scope.setAccount("another-viewer");
    const before = JSON.stringify(app.state);
    if (outcome === "success") app.requests[1].response.resolve({ rows: [newest], olderCursor: null });
    else app.requests[1].response.reject(new Error("late failure"));
    await retry; await previousRetry();
    assert.equal(JSON.stringify(app.state), before);
    assert.equal(app.requests.length, 2);
    if (identity === "conversation") assert.equal(app.retryHistoryRef.current, null);
    app.dispose();
  });
}

test("attachment implementation input is hidden from sequential focus while its labeled trigger remains", () => {
  const fileInput = nodes.find(node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "input" && node.getText(source).includes("ref={attachmentInputRef}"))!;
  assert.ok(fileInput.getText(source).includes("hidden"), "The native picker input should not create an invisible keyboard stop");
  assert.match(source.text, /aria-label="Add attachment"/);
  assert.match(source.text, /onClick=\{\(\) => attachmentInputRef\.current\?\.click\(\)\}/);
});

test("the visible history failure is scoped to the current account and conversation", () => {
  const declaration = nodes.find((node): node is ts.VariableDeclaration => ts.isVariableDeclaration(node) && node.name.getText(source) === "activeHistoryError");
  assert.ok(declaration?.initializer);
  const historyError = { key: "viewer:group", stage: "initial" };
  assert.equal(execute(declaration.initializer, { historyError, currentVoiceKey: "viewer:group" }), historyError);
  for (const currentVoiceKey of [null, "viewer:other-group", "other-viewer:group"]) {
    assert.equal(execute(declaration.initializer, { historyError, currentVoiceKey }), null);
  }
});

function renderedHistory(stage: "initial" | "older" | null, pending = false, cleared = false) {
  const activeHistoryError = stage ? { key: "viewer:group", stage } : null;
  const bindings: Record<string, unknown> = {
    activeHistoryError, conversationLoading: pending && stage !== "older", loadingOlder: pending && stage === "older",
    retryHistoryRef: { current: () => {} }, messages: [], activeClearedBefore: cleared ? "2026-09-28T00:00:00Z" : null,
    Button: ({ children, ...props }: { children?: ReactNode; variant?: string }) => { delete props.variant; return createElement("button", props, children); },
    LoaderCircle: () => null, MessageCircle: () => null,
    WorldLoadingScreen: ({ label }: { label: string }) => createElement("p", { role: "status" }, label),
  };
  const recovery = nodes.find((node): node is ts.VariableDeclaration => ts.isVariableDeclaration(node) && node.name.getText(source) === "historyRecovery");
  assert.ok(recovery?.initializer, "History recovery should have a distinct rendered state");
  bindings.historyRecovery = execute<ReactNode>(recovery.initializer, bindings);
  const history = nodes.find((node): node is ts.JsxExpression => ts.isJsxExpression(node) && Boolean(node.expression && ts.isConditionalExpression(node.expression) && node.expression.condition.getText(source) === "conversationLoading && !activeHistoryError"));
  assert.ok(history?.expression);
  return renderToStaticMarkup(execute<ReactNode>(history.expression, bindings));
}

test("the actual history JSX never describes a failed read as a new or cleared conversation", () => {
  for (const cleared of [false, true]) {
    const failed = renderedHistory("initial", false, cleared);
    assert.match(failed, /role="alert"/);
    assert.match(failed, /Retry messages/);
    assert.doesNotMatch(failed, /This is the beginning|A fresh page|Say something real/);
    assert.equal((failed.match(/<button/g) ?? []).length, 1);
  }
  assert.match(renderedHistory(null), /This is the beginning of this conversation/);
  assert.match(renderedHistory(null, false, true), /A fresh page for you/);
});

test("the actual retry JSX keeps a single disabled pending control and distinct older-page wording", () => {
  const pending = renderedHistory("initial", true);
  assert.match(pending, /Retrying messages/);
  assert.match(pending, /disabled=""/);
  assert.doesNotMatch(pending, /Opening your conversation|This is the beginning/);
  const older = renderedHistory("older");
  assert.match(older, /Older messages couldn’t be loaded/);
  assert.match(older, /Retry older messages/);
  assert.equal((older.match(/<button/g) ?? []).length, 1);
});
