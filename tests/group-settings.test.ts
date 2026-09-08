import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { createElement, Fragment, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createAccountScope } from "../lib/activity-session";

const path = resolve(process.cwd(), "app/messages/group-settings-dialog.tsx");
const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const requireFromTest = createRequire(import.meta.url);
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true };

function loadModule(modulePath: string): Record<string, unknown> {
  const exact = existsSync(modulePath) ? modulePath : [".tsx", ".ts"].map((extension) => modulePath + extension).find(existsSync);
  assert.ok(exact, modulePath);
  const compiled = ts.transpileModule(readFileSync(exact, "utf8"), { compilerOptions }).outputText;
  const loadedModule = { exports: {} as Record<string, unknown> };
  const localRequire = (specifier: string): unknown => {
    if (specifier === "@/lib/supabase-browser") return { supabase: null };
    if (specifier.startsWith("@/")) return loadModule(resolve(process.cwd(), specifier.slice(2)));
    if (specifier.startsWith(".")) return loadModule(resolve(dirname(exact), specifier));
    return requireFromTest(specifier);
  };
  new Function("require", "module", "exports", compiled)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

// Render the actual JSX with explicit ready/loading/error fixtures. Shared
// buttons, inputs, avatars and icons are real; only the dialog portal boundary
// is flattened for SSR. This cannot prove focus trapping or browser geometry.
function renderSettings(overrides: Record<string, unknown> = {}) {
  const session = source.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "GroupSettingsSession");
  assert.ok(session?.body);
  const returned = session.body.statements.filter(ts.isReturnStatement).at(-1)?.expression;
  assert.ok(returned);
  const imports = source.statements.filter(ts.isImportDeclaration).map((node) => node.getText(source)).join("\n");
  const helpers = source.statements.filter((node) =>
    (ts.isFunctionDeclaration(node) && ["roleLabel", "RoleIcon"].includes(node.name?.text ?? "")) ||
    (ts.isVariableStatement(node) && node.declarationList.declarations.some((declaration) => declaration.name.getText(source) === "reportReasons"))
  ).map((node) => node.getText(source)).join("\n");
  const compiled = ts.transpileModule(`${imports}\n${helpers}\nexports.View = () => ${returned.getText(source)};`, { compilerOptions }).outputText;
  const noop = () => {};
  const bindings: Record<string, unknown> = {
    open: true, onOpenChange: noop, loading: false, loadError: null, loadGroupData: noop,
    conversation: { title: "A very long group name".repeat(4), avatar_path: null },
    removeAvatar: false, avatarUrl: null, avatarPreviewUrl: null, avatarFile: null, cropSource: null, detailsError: null, title: "Group", viewerId: "viewer",
    viewerRole: "owner", canManage: true, canChangeRoles: true, savingDetails: false,
    avatarInput: { current: null }, cropRegion: { current: null }, restoreAvatarFocus: noop,
    memberships: [{ profile_id: "viewer", role: "owner" }, { profile_id: "other", role: "member" }],
    profileById: new Map([["other", { display_name: "A long member name", username: "member" }]]),
    invites: [{ id: "invite", invited_profile_id: "invited" }], busyKey: null,
    inviteSearch: "", inviteCandidates: [], viewerMembership: { muted_until: null }, reporting: false,
    reportTarget: "", reportReason: "spam", reportDetails: "",
    saveDetails: noop, setTitle: noop, setAvatarFile: noop, setRemoveAvatar: noop, setAvatarUrl: noop, setAvatarPreviewUrl: noop, setCropSource: noop, setDetailsError: noop,
    changeRole: noop, removeMember: noop, cancelInvite: noop, setInviteSearch: noop, inviteProfile: noop,
    muteChanged: noop, leaveGroup: noop, submitReport: noop, setReportTarget: noop, setReportReason: noop, setReportDetails: noop,
    ...overrides,
  };
  const div = ({ children, className }: { children?: ReactNode; className?: string }) => createElement("div", { className }, children);
  const localRequire = (specifier: string): unknown => {
    if (specifier === "@/components/ui/dialog") return {
      Dialog: ({ children }: { children?: ReactNode }) => createElement(Fragment, null, children),
      DialogContent: div, DialogHeader: div,
      DialogTitle: ({ children }: { children?: ReactNode }) => createElement("h2", null, children),
      DialogDescription: ({ children }: { children?: ReactNode }) => createElement("p", null, children),
    };
    if (specifier === "@/lib/supabase-browser") return { supabase: null };
    if (specifier.startsWith("@/")) return loadModule(resolve(process.cwd(), specifier.slice(2)));
    if (specifier.startsWith(".")) return loadModule(resolve(dirname(path), specifier));
    return requireFromTest(specifier);
  };
  const exported: { View?: ComponentType } = {};
  const keys = Object.keys(bindings);
  new Function(...keys, "require", "exports", compiled)(...keys.map((key) => bindings[key]), localRequire, exported);
  assert.ok(exported.View);
  return renderToStaticMarkup(createElement(exported.View));
}

// Run production callbacks at their Supabase boundary with deferred responses.
// This does not contact a database or duplicate the implementation under test.
function callback(name: string, bindings: Record<string, unknown>) {
  let declaration: ts.FunctionDeclaration | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) declaration = node;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(declaration, `Expected production callback ${name}`);
  const text = declaration.getText(source).replace(new RegExp(`^async function\\s+${name}`), "async function");
  const compiled = ts.transpileModule(`exports.callback = ${text};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exported: { callback?: (...args: unknown[]) => Promise<void> } = {};
  const keys = Object.keys(bindings);
  new Function(...keys, "exports", compiled)(...keys.map((key) => bindings[key]), exported);
  assert.ok(exported.callback);
  return exported.callback;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function loadingHarness(initialMemberships: Array<{ profile_id: string; role: string }> = [], separateInvites = false) {
  const scope = createAccountScope();
  scope.setAccount("viewer");
  type Response = { data: Array<{ id?: string; profile_id?: string; role?: string }>; error: { message: string; code?: string } | null };
  const response = deferred<Response>();
  const inviteResponse = separateInvites ? deferred<Response>() : response;
  const membershipsRef = { current: initialMemberships };
  const writes: unknown[] = [];
  const queryFor = (table: string) => {
    const query = {
      select: () => query,
      eq: () => query,
      order: () => table === "conversation_members" ? response.promise : inviteResponse.promise,
    };
    return query;
  };
  const load = callback("loadGroupData", {
    supabase: { from: queryFor },
    conversation: { id: "group" },
    viewerId: "viewer",
    requestScope: { current: scope },
    membershipsRef,
    setLoading: (value: unknown) => { writes.push(["loading", value]); },
    setLoadError: (value: unknown) => { writes.push(["error", value]); },
    setMemberships: (value: unknown) => { writes.push(["members", value]); },
    setInvites: (value: unknown) => { writes.push(["invites", value]); },
    toast: { error: () => { writes.push(["toast"]); } },
  });
  return { load, scope, response, inviteResponse, writes };
}

test("closing or switching group/account suppresses a late membership response", async () => {
  const harness = loadingHarness();
  const pending = harness.load();
  const beforeClosing = [...harness.writes];
  harness.scope.clear();
  harness.response.resolve({ data: [{ id: "old-private-member" }], error: null });
  await pending;
  assert.deepEqual(harness.writes, beforeClosing);
});

test("current group data loads normally and a failed refresh exposes a recoverable error", async () => {
  const ready = loadingHarness();
  const readyRequest = ready.load();
  ready.response.resolve({ data: [{ id: "current-member", profile_id: "viewer", role: "owner" }], error: null });
  await readyRequest;
  assert.ok(ready.writes.some((value) => JSON.stringify(value) === '["members",[{"id":"current-member","profile_id":"viewer","role":"owner"}]]'));
  assert.ok(ready.writes.some((value) => JSON.stringify(value) === '["loading",false]'));

  const failed = loadingHarness();
  const failedRequest = failed.load();
  failed.response.resolve({ data: [], error: { message: "Connection unavailable" } });
  await failedRequest;
  assert.ok(failed.writes.some((value) => JSON.stringify(value) === '["error","Connection unavailable"]'));
  assert.ok(failed.writes.some((value) => JSON.stringify(value) === '["loading",false]'));
});

test("late group mutations cannot change the new dialog or navigate away from a new conversation", async () => {
  for (const name of ["inviteProfile", "cancelInvite", "changeRole", "removeMember", "submitReport", "leaveGroup", "saveDetails"]) {
    const scope = createAccountScope();
    scope.setAccount("viewer");
    const response = deferred<{ error: null }>();
    const writes: string[] = [];
    const record = (name: string) => () => { writes.push(name); };
    const run = callback(name, {
      supabase: { rpc: () => response.promise },
      requestScope: { current: scope },
      viewerId: "viewer",
      conversation: { id: "group", title: "Group", avatar_path: null },
      busyKey: null, viewerRole: "member", muted: false,
      reporting: false, reportTarget: "", reportReason: "spam", reportDetails: "",
      savingDetails: false, title: "Group", avatarFile: null, removeAvatar: false, canManage: true, cropSource: null,
      saveLock: { current: false }, preparedUpload: { current: null }, confirmedAvatarPath: { current: null },
      profileById: new Map(),
      window: { confirm: () => true },
      setBusyKey: record("busy"), setSavingDetails: record("saving"),
      setReporting: record("reporting"), setReportTarget: record("target"),
      setReportDetails: record("details"), setInviteSearch: record("search"),
      setAvatarFile: record("avatar"), setRemoveAvatar: record("remove-avatar"), setDetailsError: record("details-error"), setAvatarPreviewUrl: record("preview"), setAvatarUrl: record("avatar-url"),
      loadGroupData: record("load"), onConversationChanged: record("changed"),
      onOpenChange: record("open"), onLeft: record("left"),
      toast: { success: record("success"), error: record("error") },
    });
    const pending = run({ preventDefault() {} }, "member");
    const beforeClosing = [...writes];
    scope.clear();
    response.resolve({ error: null });
    await pending;
    assert.deepEqual(writes, beforeClosing, name);
  }
});

test("rendered group settings keep 44px member controls and a narrow-screen reflow path", () => {
  const html = renderSettings();
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
  assert.ok(buttons.length >= 7);
  for (const button of buttons) assert.match(button, /\b(?:min-h-11|size-11)\b/, button);
  assert.match(html, /<article[^>]*\bflex-wrap\b/);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.match(html, /<select[^>]*aria-label="Report target"/);
  assert.match(html, /<select[^>]*aria-label="Report reason"/);
  assert.match(html, /<textarea[^>]*aria-label="Report details \(optional\)"/);
});

test("rendered member permissions and pending/error states remain understandable", () => {
  const member = renderSettings({ viewerRole: "member", canManage: false, canChangeRoles: false });
  assert.doesNotMatch(member, /Make admin|Make member|Remove member|Cancel invitation|Save group details|Delete group/);
  assert.match(member, /Leave group/);
  assert.match(member, /Submit report/);
  const admin = renderSettings({
    viewerRole: "admin", canChangeRoles: false,
    memberships: [{ profile_id: "viewer", role: "admin" }, { profile_id: "owner", role: "owner" }, { profile_id: "other-admin", role: "admin" }, { profile_id: "other", role: "member" }],
  });
  assert.doesNotMatch(admin, /Make admin|Make member/);
  assert.equal(admin.match(/title="Remove member"/g)?.length, 1);
  const pending = renderSettings({ loading: true });
  assert.match(pending, /role="status"/);
  assert.match(pending, /Loading group settings/);
  assert.doesNotMatch(pending, /Make admin|Submit report/);
  const failed = renderSettings({ loadError: "Connection unavailable", memberships: [] });
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Connection unavailable/);
  assert.match(failed, /Try again/);
  assert.doesNotMatch(failed, /Make admin|Submit report/);
});

test("only the newest group refresh applies even when both requests complete", async () => {
  const harness = loadingHarness();
  const first = harness.load();
  const second = harness.load();
  harness.response.resolve({ data: [{ id: "current-member", profile_id: "viewer", role: "owner" }], error: null });
  await Promise.all([first, second]);
  assert.equal(harness.writes.filter((value) => Array.isArray(value) && value[0] === "members").length, 1);
});

test("group settings explain that mute is personal and allow muting an expired value", () => {
  const html = renderSettings({ viewerMembership: { muted_until: "2000-01-01T00:00:00Z" } });
  assert.match(html, />Mute notifications</);
  assert.match(html, /your account/);
  assert.match(html, /Messages and unread counts still appear/);
});

test("a current successful leave still closes settings and returns to the inbox", async () => {
  const scope = createAccountScope();
  scope.setAccount("viewer");
  const calls: unknown[] = [];
  const leave = callback("leaveGroup", {
    supabase: { rpc: async (name: string, args: unknown) => { calls.push([name, args]); return { error: null }; } },
    requestScope: { current: scope }, viewerId: "viewer", conversation: { id: "group", title: "Group" },
    viewerRole: "member", busyKey: null, window: { confirm: () => true },
    setBusyKey: () => {}, onOpenChange: (open: boolean) => { calls.push(["open", open]); },
    onLeft: () => { calls.push(["inbox"]); }, toast: { success: () => {}, error: () => { assert.fail("Leave should succeed"); } },
  });
  await leave();
  assert.deepEqual(calls, [["leave_group", { target_conversation_id: "group" }], ["open", false], ["inbox"]]);
});

function avatarSaveHarness(overrides: Record<string, unknown> = {}) {
  const scope = createAccountScope(); scope.setAccount("viewer");
  const writes: Array<[string, unknown]> = [];
  const file = new File(["encoded-jpeg-fixture"], "avatar.jpg", { type: "image/jpeg" });
  const upload = deferred<{ error: null }>();
  const rpc = deferred<{ error: { message: string } | null }>();
  const saveLock = { current: false };
  const preparedUpload = { current: null };
  const confirmedAvatarPath = { current: "group/avatars/saved.jpg" };
  const storage = {
    upload: (path: string, value: File, options: unknown) => { writes.push(["upload", [path, value, options]]); return upload.promise; },
    createSignedUrl: async () => ({ data: { signedUrl: "https://example.test/confirmed-avatar" }, error: null }),
    remove: () => { assert.fail("No uncertain or prior avatar may be deleted"); },
  };
  const bindings = {
    supabase: { storage: { from: () => storage }, rpc: (name: string, args: unknown) => { writes.push([name, args]); return rpc.promise; } },
    requestScope: { current: scope }, viewerId: "viewer",
    conversation: { id: "group", avatar_path: "group/avatars/saved.jpg" },
    title: " Group ", canManage: true, savingDetails: false, cropSource: null,
    avatarFile: file, removeAvatar: false, saveLock, preparedUpload, confirmedAvatarPath,
    safeFileName: () => "new.jpg",
    setSavingDetails: (value: unknown) => writes.push(["saving", value]),
    setDetailsError: (value: unknown) => writes.push(["error", value]),
    setAvatarFile: (value: unknown) => writes.push(["file", value]),
    setRemoveAvatar: (value: unknown) => writes.push(["remove", value]),
    setAvatarUrl: (value: unknown) => writes.push(["url", value]),
    setAvatarPreviewUrl: (value: unknown) => writes.push(["preview", value]),
    onConversationChanged: async () => { writes.push(["refresh", null]); },
    toast: { success: (value: unknown) => writes.push(["success", value]) },
    ...overrides,
  };
  const run = (nextRender: Record<string, unknown> = {}) => callback("saveDetails", { ...bindings, ...nextRender })({ preventDefault() {} });
  return { run, file, scope, upload, rpc, writes, saveLock, preparedUpload, confirmedAvatarPath, storage };
}

test("group avatar save uploads the confirmed crop once and blocks rapid double-submit", async () => {
  const h = avatarSaveHarness();
  const pending = h.run(); await h.run();
  assert.equal(h.writes.filter(([name]) => name === "upload").length, 1);
  assert.deepEqual(h.writes.find(([name]) => name === "upload")?.[1], ["group/avatars/new.jpg", h.file, { contentType: "image/jpeg", upsert: false }]);
  h.upload.resolve({ error: null }); await Promise.resolve();
  h.rpc.resolve({ error: null }); await pending;
  assert.ok(h.writes.some(([name]) => name === "success"));
  assert.deepEqual(h.writes.find(([name]) => name === "url"), ["url", "https://example.test/confirmed-avatar"]);
  assert.equal(h.saveLock.current, false);
});

test("uncertain group save preserves the crop and uploaded path for retry without deleting either image", async () => {
  const h = avatarSaveHarness(); const pending = h.run();
  h.upload.resolve({ error: null }); await Promise.resolve();
  h.rpc.resolve({ error: { message: "Connection interrupted" } }); await pending;
  assert.ok(h.writes.some(([name, value]) => name === "error" && String(value).includes("draft is kept")));
  assert.ok(!h.writes.some(([name]) => ["file", "preview", "success"].includes(name)));
  assert.deepEqual(h.preparedUpload.current, { file: h.file, path: "group/avatars/new.jpg" });
  await h.run();
  assert.equal(h.writes.filter(([name]) => name === "upload").length, 1);
  assert.equal(h.saveLock.current, false);
});

test("late crop upload cannot write group details after switching account or closing", async () => {
  const h = avatarSaveHarness(); const pending = h.run(); const before = [...h.writes];
  h.scope.clear(); h.scope.setAccount("viewer");
  h.upload.resolve({ error: null }); await pending;
  assert.deepEqual(h.writes, before);
});

test("unconfirmed crops and ordinary members cannot invoke avatar save", async () => {
  for (const overrides of [{ cropSource: {} }, { canManage: false }, { avatarFile: new File([], "empty.jpg", { type: "image/jpeg" }) }]) {
    const h = avatarSaveHarness(overrides); await h.run();
    assert.ok(!h.writes.some(([name]) => name === "upload" || name === "update_group_details"));
  }
});

test("saved avatar with failed display refresh is reported saved, not as a failed upload", async () => {
  const h = avatarSaveHarness({ onConversationChanged: async () => { throw new Error("Offline"); } });
  const pending = h.run(); h.upload.resolve({ error: null }); await Promise.resolve(); h.rpc.resolve({ error: null }); await pending;
  assert.ok(h.writes.some(([name, value]) => name === "error" && String(value).startsWith("Group details saved")));
  assert.ok(h.writes.some(([name]) => name === "success"));
  assert.ok(h.writes.some(([name, value]) => name === "file" && value === null));
});

test("an older initial avatar URL cannot overwrite a newly confirmed group image", () => {
  let completion: ts.ArrowFunction | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isArrowFunction(node) && node.body.getText(source).includes("confirmedAvatarPath.current === requestedAvatarPath")) completion = node;
    ts.forEachChild(node, visit);
  };
  visit(source); assert.ok(completion);
  const writes: unknown[] = [];
  const confirmedAvatarPath = { current: "new.jpg" };
  const compiled = ts.transpileModule(`exports.run = ${completion.getText(source)};`, { compilerOptions }).outputText;
  const exported: { run?: (value: unknown) => void } = {};
  new Function("cancelled", "confirmedAvatarPath", "requestedAvatarPath", "setAvatarUrl", "exports", compiled)(
    false, confirmedAvatarPath, "old.jpg", (value: unknown) => writes.push(value), exported);
  assert.ok(exported.run); exported.run({ data: { signedUrl: "https://example.test/old" } });
  assert.deepEqual(writes, []);
  confirmedAvatarPath.current = "old.jpg";
  exported.run({ data: { signedUrl: "https://example.test/old" } });
  assert.deepEqual(writes, ["https://example.test/old"]);
});

test("a later title-only save keeps the confirmed avatar when parent display refresh failed", async () => {
  const h = avatarSaveHarness({ onConversationChanged: async () => { throw new Error("Offline"); } });
  const pending = h.run(); h.upload.resolve({ error: null }); await Promise.resolve(); h.rpc.resolve({ error: null }); await pending;
  await h.run({ avatarFile: null, title: "Renamed after saved image" });
  const saves = h.writes.filter(([name]) => name === "update_group_details");
  assert.equal(saves.length, 2);
  assert.deepEqual(saves[1][1], { target_conversation_id: "group", new_title: "Renamed after saved image", new_avatar_path: "group/avatars/new.jpg" });
  assert.equal(h.writes.filter(([name]) => name === "upload").length, 1);
});

test("routine membership refresh never replaces the established crop with a loading screen", async () => {
  const h = loadingHarness([{ profile_id: "viewer", role: "owner" }]);
  const pending = h.load();
  assert.ok(!h.writes.some(value => JSON.stringify(value) === '["loading",true]'));
  h.response.resolve({ data: [], error: { message: "Connection unavailable" } });
  await pending;
  assert.ok(!h.writes.some(value => Array.isArray(value) && value[0] === "members"));
  const html = renderSettings({ loadError: "Connection unavailable", cropSource: new File(["source"], "source.jpg", { type: "image/jpeg" }) });
  assert.match(html, /role="alert"/);
  assert.match(html, /Try again/);
  assert.match(html, /data-avatar-crop-editor/);
  assert.match(html, /Save group details/);
});

test("authoritative membership loss clears private lists despite an invitation failure", async () => {
  const h = loadingHarness([{ profile_id: "viewer", role: "owner" }], true);
  const pending = h.load();
  h.response.resolve({ data: [], error: null });
  h.inviteResponse.resolve({ data: [], error: { message: "No invitation access", code: "42501" } });
  await pending;
  assert.ok(h.writes.some(value => JSON.stringify(value) === '["members",[]]'));
  assert.ok(h.writes.some(value => JSON.stringify(value) === '["invites",[]]'));
  assert.ok(h.writes.some(value => Array.isArray(value) && value[0] === "error"));
});

test("a membership permission denial clears previously loaded private lists", async () => {
  const h = loadingHarness([{ profile_id: "viewer", role: "owner" }]);
  const pending = h.load();
  h.response.resolve({ data: [], error: { message: "Permission denied", code: "42501" } });
  await pending;
  assert.ok(h.writes.some(value => JSON.stringify(value) === '["members",[]]'));
  assert.ok(h.writes.some(value => JSON.stringify(value) === '["invites",[]]'));
});

test("an authoritative demotion applies before failed invitation refresh and drops manager-only invitations", async () => {
  const h = loadingHarness([{ profile_id: "viewer", role: "owner" }], true);
  const pending = h.load();
  const currentMembers = [{ profile_id: "viewer", role: "member" }];
  h.response.resolve({ data: currentMembers, error: null });
  h.inviteResponse.resolve({ data: [], error: { message: "No invitation access", code: "42501" } });
  await pending;
  assert.ok(h.writes.some(value => JSON.stringify(value) === JSON.stringify(["members", currentMembers])));
  assert.ok(h.writes.some(value => JSON.stringify(value) === '["invites",[]]'));
  const html = renderSettings({ memberships: currentMembers, viewerRole: "member", canManage: false, canChangeRoles: false, loadError: "No invitation access" });
  assert.doesNotMatch(html, /Save group details|Cancel invitation|Make admin/);
  assert.match(html, /Leave group/);
});
