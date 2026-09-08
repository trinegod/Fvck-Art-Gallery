import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { fetchGroupInvitationStatus, groupMembershipNeedsRefresh, groupMembershipSummary, type GroupInvitationStatus } from "../lib/group-membership-status";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAccountScope } from "../lib/activity-session";
import type { MembershipRow } from "../app/messages/messages-types";

const path = resolve(process.cwd(), "app/messages/messages-view.tsx");
const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const requireFromTest = createRequire(import.meta.url);
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true };

function loadProduction(modulePath: string): Record<string, unknown> {
  const exact = existsSync(modulePath) ? modulePath : [".tsx", ".ts"].map(extension => modulePath + extension).find(existsSync);
  assert.ok(exact, modulePath);
  const loaded = { exports: {} as Record<string, unknown> };
  const compiled = ts.transpileModule(readFileSync(exact, "utf8"), { compilerOptions }).outputText;
  const localRequire = (specifier: string): unknown => {
    if (specifier.startsWith("@/")) return loadProduction(resolve(process.cwd(), specifier.slice(2)));
    if (specifier.startsWith(".")) return loadProduction(resolve(dirname(exact), specifier));
    return requireFromTest(specifier);
  };
  new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

// These actual production modules replace the initial JSX-only reproduction.
// This diagnoses visible information, not live RLS, delivery or browser geometry.
function renderMemberStatus(invitations: GroupInvitationStatus = { state: "ready", count: 2 }) {
  const Status = loadProduction(resolve(process.cwd(), "app/messages/group-membership-status.tsx")).default as ComponentType<Record<string, unknown>>;
  return renderToStaticMarkup(createElement(Status, { title: "The District", memberCount: 1, invitations, onOpen: () => {} }));
}

function renderIncomingInvitations(search = "", busyId: string | null = null) {
  const Invitations = loadProduction(resolve(process.cwd(), "app/messages/group-invitations.tsx")).default as ComponentType<Record<string, unknown>>;
  return renderToStaticMarkup(createElement(Invitations, {
    search,
    invites: [{ invite_id: "synthetic-invite", conversation_id: "synthetic-group", conversation_title: "The District", invited_by: "synthetic-sender" }],
    profiles: new Map([["synthetic-sender", { display_name: "Ada Example", username: "ada" }]]),
    busyId,
    onRespond: () => {},
  }));
}

test("a sender sees one joined member and two invitations without counting invitees as members", () => {
  const html = renderMemberStatus();
  assert.match(html, /1 member/);
  assert.match(html, /2 (?:invited|pending invitations?)/);
  assert.doesNotMatch(html, /3 members/);
});

test("a recipient can identify the group and inviter and explicitly join or decline", () => {
  const html = renderIncomingInvitations();
  assert.match(html, /The District/);
  assert.match(html, /Invited by Ada Example/);
  assert.match(html, />Join group<\/button>/);
  assert.match(html, />Decline<\/button>/);
});

test("searching for the invited group does not hide the recipient's pending invitation", () => {
  const html = renderIncomingInvitations("District");
  assert.match(html, /The District/);
  assert.match(html, />Join group<\/button>/);
});

test("join consent explains existing history and saving retains named controls", () => {
  const html = renderIncomingInvitations("", "synthetic-invite");
  assert.match(html, /read this group&#x27;s existing messages/);
  assert.match(html, /invitation alone does not add you/);
  assert.match(html, /role="status"/);
  assert.match(html, /Saving your response/);
  assert.equal([...html.matchAll(/<button[^>]*disabled=""/g)].length, 2);
  assert.match(html, />Join group<\/button>/);
  assert.match(html, />Decline<\/button>/);
});

test("invitation status never invents zero while loading, failing, or lacking manager visibility", () => {
  for (const state of [{ state: "loading" }, { state: "error", message: "Unavailable" }] as GroupInvitationStatus[]) {
    assert.doesNotMatch(renderMemberStatus(state), /0 invited/);
  }
  assert.match(renderMemberStatus({ state: "error", message: "Unavailable" }), /retry/);
  assert.equal(groupMembershipSummary(2), "2 members", "regular members do not receive an invented pending count");
  assert.equal(groupMembershipSummary(2, { state: "ready", count: 0 }), "2 members · 0 invited");
});

test("the authorized pending-count query uses exact server count and distinguishes failed reads", async () => {
  for (const result of [{ count: 2, error: null }, { count: 0, error: null }, { count: null, error: null }, { count: null, error: { message: "denied" } }]) {
    const filters: unknown[] = [];
    const query = {
      select: (fields: string, options: unknown) => { assert.equal(fields, "id"); assert.deepEqual(options, { count: "exact", head: true }); return query; },
      eq: (key: string, value: string) => { filters.push([key, value]); return query; },
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    const database = { from: (table: string) => { assert.equal(table, "conversation_invites"); return query; } } as unknown as SupabaseClient;
    const status = await fetchGroupInvitationStatus(database, "synthetic-group");
    assert.deepEqual(filters, [["conversation_id", "synthetic-group"], ["status", "pending"]]);
    assert.equal(status.state, result.count === null ? "error" : "ready");
    if (status.state === "ready") assert.equal(status.count, result.count);
  }
});

test("the real inbox uses the tested membership and invitation modules", () => {
  const tags: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node)) tags.push(node.tagName.getText(source));
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(tags.filter(tag => tag === "GroupMembershipStatus").length, 1);
  assert.equal(tags.filter(tag => tag === "GroupInvitations").length, 1);
});

test("both recipient invitation decisions retain at least 44px targets", () => {
  const html = renderIncomingInvitations();
  const buttons = [...html.matchAll(/<button\b[^>]*class="([^"]*)"[^>]*>(Join group|Decline)<\/button>/g)];
  assert.equal(buttons.length, 2);
  for (const [, classes, label] of buttons) {
    assert.match(classes, /(?:^|\s)(?:min-h-11|h-11|size-11|min-h-\[44px\])(?:\s|$)/, label);
  }
});

test("read receipts do not reload group details, but membership, role and mute changes do", () => {
  const member = { conversation_id: "group", profile_id: "viewer", role: "member", muted_until: null, last_read_at: "earlier" } as MembershipRow;
  assert.equal(groupMembershipNeedsRefresh([member], { eventType: "UPDATE", new: { ...member, last_read_at: "later" } }), false);
  assert.equal(groupMembershipNeedsRefresh([member], { eventType: "UPDATE", new: { ...member, role: "admin" } }), true);
  assert.equal(groupMembershipNeedsRefresh([member], { eventType: "UPDATE", new: { ...member, muted_until: "2099-01-01" } }), true);
  assert.equal(groupMembershipNeedsRefresh([member], { eventType: "INSERT", new: {} }), true);
  assert.equal(groupMembershipNeedsRefresh([member], { eventType: "DELETE", new: {} }), true);
});

function productionCallback(name: string, bindings: Record<string, unknown>) {
  let callback: ts.Node | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) callback = node;
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name && node.initializer && ts.isCallExpression(node.initializer)) callback = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(callback, name);
  const expression = callback.getText(source).replace(new RegExp(`^async function\\s+${name}`), "async function");
  const exported: { callback?: (...args: unknown[]) => Promise<void> } = {};
  const keys = Object.keys(bindings);
  new Function(...keys, "exports", ts.transpileModule(`exports.callback = ${expression};`, { compilerOptions }).outputText)(...keys.map(key => bindings[key]), exported);
  assert.ok(exported.callback);
  return exported.callback;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

test("late invitation counts cannot replace a changed conversation, role or account", async () => {
  for (const change of ["conversation", "role", "account"]) {
    const scope = createAccountScope();
    scope.setAccount("viewer");
    const conversationVersion = { current: 1 };
    const groupInvitationVersion = { current: 1 };
    const response = deferred<{ count: number; error: null }>();
    const writes: Array<{ status: GroupInvitationStatus }> = [];
    const query = { select: () => query, eq: () => query, then: response.promise.then.bind(response.promise) };
    const run = productionCallback("refreshGroupInvitations", {
      supabase: { from: () => query }, viewerId: "viewer", activeConversationId: "group", currentVoiceKey: "viewer:group", canManageActiveGroup: true,
      accountScope: { current: scope }, conversationVersion, groupInvitationVersion, fetchGroupInvitationStatus,
      setGroupInvitationStatus: (status: { status: GroupInvitationStatus }) => writes.push(status),
    });
    const pending = run();
    if (change === "conversation") conversationVersion.current++;
    if (change === "role") groupInvitationVersion.current++;
    if (change === "account") scope.setAccount("other");
    response.resolve({ count: 2, error: null });
    await pending;
    assert.deepEqual(writes.map(write => write.status.state), ["loading"], change);
  }
});

test("joining keeps the invitation locked through refresh and cannot navigate over a newer chat", async () => {
  const scope = createAccountScope();
  scope.setAccount("viewer");
  const rpc = deferred<{ data: string; error: null }>();
  const refresh = deferred<void>();
  const conversationVersion = { current: 1 };
  const busy: Array<string | null> = [];
  const selected: unknown[] = [];
  let invitations = [{ invite_id: "invite" }];
  let refreshing = false;
  const run = productionCallback("respondToInvite", {
    supabase: { rpc: () => rpc.promise }, viewerId: "viewer", busyInviteId: null, accountScope: { current: scope }, conversationVersion,
    setBusyInviteId: (value: string | null) => busy.push(value),
    setPendingInvites: (update: (current: typeof invitations) => typeof invitations) => { invitations = update(invitations); },
    loadInbox: () => { refreshing = true; return refresh.promise; }, loadPendingInvites: async () => {},
    selectConversation: (id: unknown) => selected.push(id), toast: { success: () => {}, error: () => {} },
  });
  const pending = run("invite", true);
  rpc.resolve({ data: "joined-group", error: null });
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(refreshing, true);
  assert.deepEqual(busy, ["invite"], "no duplicate response window during refresh");
  assert.deepEqual(invitations, [], "the committed invitation disappears immediately");
  conversationVersion.current++;
  refresh.resolve();
  await pending;
  assert.deepEqual(selected, [], "joining in the background must not replace the newer chat");
  assert.deepEqual(busy, ["invite", null]);
});
