import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAccountScope } from "../lib/activity-session";

const source = ts.createSourceFile("admin.tsx", readFileSync("app/admin/page.tsx", "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
const nodes: ts.Node[] = [];
const visit = (node: ts.Node) => { nodes.push(node); ts.forEachChild(node, visit); };
visit(source);

function callback(name: string, bindings: Record<string, unknown>) {
  const node = nodes.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(node, `Production callback ${name}`);
  const compiled = ts.transpileModule(`exports.run = (${node.getText(source)});`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exported: { run?: (...args: unknown[]) => unknown } = {};
  new Function(...Object.keys(bindings), "exports", compiled)(...Object.values(bindings), exported);
  return exported.run!;
}

function avatarHarness(database?: SupabaseClient) {
  const scope = createAccountScope(); scope.setAccount("viewer");
  const state: Record<string, unknown> = {
    userId: "viewer", busy: false, profileLoadedFor: "viewer",
    profileAccountEpoch: 0, profileUsername: "viewer", profileDisplayName: "Draft name", profileBio: "Draft bio",
    profileAvatarFile: null, profileAvatarCrop: null, profileAvatarPreview: "https://fixture.invalid/saved.jpg",
    profileAvatarUrl: "https://fixture.invalid/saved.jpg", profileAvatarInputKey: 0,
  };
  const created: string[] = [], revoked: string[] = [];
  let previewFails = false;
  const bindings: Record<string, unknown> = {
    profileScope: { current: scope }, profileAvatarCropRef: { current: null }, profileAvatarObjectUrl: { current: null },
    profileSaveLock: { current: null }, supabase: database,
    profileAvatarInputRef: { current: null }, profileAvatarCropRegion: { current: null },
    URL: { createObjectURL: () => { if (previewFails) throw new Error("Preview unavailable"); const value = `blob:fixture-${created.length}`; created.push(value); return value; }, revokeObjectURL: (value: string) => revoked.push(value) },
  };
  for (const match of source.text.matchAll(/\bset([A-Z]\w*)\(/g)) {
    const name = match[1];
    const key = name[0].toLowerCase() + name.slice(1);
    bindings[`set${name}`] = (value: unknown) => { state[key] = typeof value === "function" ? value(state[key]) : value; };
  }
  const run = (name: string, ...args: unknown[]) => callback(name, { ...bindings, ...state })(...args);
  bindings.replaceProfileAvatarPreview = (url: string) => run("replaceProfileAvatarPreview", url);
  bindings.restoreProfileAvatarFocus = (candidate: unknown) => run("restoreProfileAvatarFocus", candidate);
  bindings.bindProfileAccount = (user: unknown) => run("bindProfileAccount", user);
  const effect = (marker: string) => {
    const call = nodes.find(node => ts.isCallExpression(node) && node.expression.getText(source) === "useEffect" && node.arguments[0].getText(source).includes(marker)) as ts.CallExpression | undefined;
    assert.ok(call);
    const exported: { setup?: () => (() => void) } = {};
    const compiled = ts.transpileModule(`exports.setup = ${call.arguments[0].getText(source)};`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function(...Object.keys(bindings), "exports", compiled)(...Object.values(bindings), exported);
    return exported.setup!();
  };
  return { state, scope, created, revoked, run, effect, failPreview: (failed: boolean) => { previewFails = failed; } };
}

test("selecting a profile photo opens local crop without replacing the saved preview or preparing an upload", () => {
  const app = avatarHarness();
  const file = new File(["synthetic"], "portrait.png", { type: "image/png" });
  app.run("selectProfileAvatar", file);
  assert.equal(app.state.profileAvatarFile, null);
  assert.equal(app.state.profileAvatarPreview, "https://fixture.invalid/saved.jpg");
  assert.equal((app.state.profileAvatarCrop as { file: File }).file, file);
  assert.deepEqual(app.created, []);
});

test("unmount releases the final prepared preview, even without another file selection", () => {
  const app = avatarHarness();
  app.run("selectProfileAvatar", new File(["source"], "photo.png", { type: "image/png" }));
  app.run("confirmProfileAvatar", new File(["crop"], "crop.jpg", { type: "image/jpeg" }), app.state.profileAvatarCrop);
  const cleanup = app.effect("profileAvatarObjectUrl.current) URL.revokeObjectURL");
  cleanup(); cleanup();
  assert.deepEqual(app.revoked, ["blob:fixture-0"]);
});

test("a newer auth event beats bootstrap and cleanup suppresses late profile bindings", async () => {
  const bootstrap = deferred<{ data: { user: { id: string } } }>();
  let emit!: (event: string, session: { user: { id: string } } | null) => void;
  let unsubscribed = false;
  const app = avatarHarness({ auth: {
    getUser: () => bootstrap.promise,
    onAuthStateChange: (callback: typeof emit) => { emit = callback; return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } }; },
  } } as unknown as SupabaseClient);
  const cleanup = app.effect("const bootstrap = client.auth.getUser()");
  emit("SIGNED_IN", { user: { id: "new-viewer" } });
  bootstrap.resolve({ data: { user: { id: "old-viewer" } } });
  await flush();
  assert.equal(app.state.userId, "new-viewer");
  cleanup();
  emit("SIGNED_IN", { user: { id: "late-viewer" } });
  assert.equal(app.state.userId, "new-viewer");
  assert.equal(unsubscribed, true);
  assert.equal(app.scope.account(), null);
});

test("a superseded crop cannot replace the newer file or the saved image", () => {
  const app = avatarHarness();
  const file = new File(["source"], "photo.png", { type: "image/png" });
  app.run("selectProfileAvatar", file);
  const old = app.state.profileAvatarCrop;
  app.run("selectProfileAvatar", file);
  const current = app.state.profileAvatarCrop;
  app.run("confirmProfileAvatar", file, old);
  app.run("cancelProfileAvatar", old);
  assert.equal(app.state.profileAvatarCrop, current);
  assert.equal(app.state.profileAvatarPreview, "https://fixture.invalid/saved.jpg");
  assert.deepEqual(app.created, []);
  app.run("cancelProfileAvatar", current);
  assert.equal(app.state.profileAvatarPreview, "https://fixture.invalid/saved.jpg");
});

test("a failed confirmed-preview URL keeps the original crop pending and permits a real retry", () => {
  const app = avatarHarness();
  app.run("selectProfileAvatar", new File(["original"], "source.png", { type: "image/png" }));
  const candidate = app.state.profileAvatarCrop;
  const crop = new File(["crop"], "avatar.jpg", { type: "image/jpeg" });
  app.failPreview(true);
  assert.throws(() => app.run("confirmProfileAvatar", crop, candidate), /Preview unavailable/);
  assert.equal(app.state.profileAvatarCrop, candidate);
  assert.equal(app.state.profileAvatarFile, null);
  assert.equal(app.state.profileAvatarPreview, "https://fixture.invalid/saved.jpg");
  app.failPreview(false);
  app.run("confirmProfileAvatar", crop, candidate);
  assert.equal(app.state.profileAvatarFile, crop);
  assert.equal(app.state.profileAvatarCrop, null);
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const database = (fetch: typeof globalThis.fetch) => createClient("https://fixture.invalid", "fixture-only", {
  auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

test("explicit profile save uploads the confirmed crop to a new own-folder version and saves only the viewer row", async () => {
  const requests: { url: URL; init: RequestInit | undefined }[] = [];
  const app = avatarHarness(database(async (input, init) => {
    const url = new URL(String(input)); requests.push({ url, init });
    if (url.pathname.includes("/storage/")) return json({});
    return json({ id: "viewer", ...JSON.parse(String(init?.body)) });
  }));
  app.run("selectProfileAvatar", new File(["original"], "source.png", { type: "image/png" }));
  const cropped = new File(["cropped"], "avatar.jpg", { type: "image/jpeg" });
  app.run("confirmProfileAvatar", cropped, app.state.profileAvatarCrop);
  assert.equal(requests.length, 0);
  await app.run("handleUpdateProfile", { preventDefault() {} });
  assert.equal(requests.length, 2);
  assert.match(requests[0].url.pathname, /^\/storage\/v1\/object\/artworks\/avatars\/viewer\/[0-9a-f-]+\.jpg$/);
  assert.equal(new Headers(requests[0].init?.headers).get("x-upsert"), "false");
  assert.equal(requests[1].url.searchParams.get("id"), "eq.viewer");
  assert.equal(app.state.profileAvatarFile, null);
  assert.equal(app.state.message, "Creator profile updated.");
  assert.equal(app.state.busy, false);
  assert.deepEqual(app.revoked, ["blob:fixture-0"]);
});

test("an empty prepared JPEG is rejected before any profile or storage request", async () => {
  let requests = 0;
  const app = avatarHarness(database(async () => { requests++; return json({}); }));
  app.state.profileAvatarFile = new File([], "empty.jpg", { type: "image/jpeg" });
  await app.run("handleUpdateProfile", { preventDefault() {} });
  assert.equal(requests, 0);
  assert.match(String(app.state.error), /crop.*again/);
});

for (const failure of ["upload", "profile"]) test(`a ${failure} transport failure keeps the cropped image and text draft for retry`, async () => {
  let uploads = 0, updates = 0;
  const app = avatarHarness(database(async (input) => {
    if (String(input).includes("/storage/")) {
      uploads++;
      if (failure === "upload") throw new TypeError("Connection lost");
      return json({});
    }
    updates++;
    throw new TypeError("Connection lost");
  }));
  app.run("selectProfileAvatar", new File(["original"], "source.png", { type: "image/png" }));
  const crop = new File(["crop"], "avatar.jpg", { type: "image/jpeg" });
  app.run("confirmProfileAvatar", crop, app.state.profileAvatarCrop);
  await app.run("handleUpdateProfile", { preventDefault() {} });
  assert.equal(uploads, 1);
  assert.equal(updates, failure === "upload" ? 0 : 1);
  assert.equal(app.state.profileAvatarFile, crop);
  assert.equal(app.state.profileAvatarPreview, "blob:fixture-0");
  assert.equal(app.state.profileAvatarUrl, "https://fixture.invalid/saved.jpg");
  assert.equal(app.state.profileDisplayName, "Draft name");
  assert.equal(app.state.busy, false);
  assert.equal(app.state.message, null);
  assert.match(String(app.state.error), /could not be confirmed.*kept/);
  assert.deepEqual(app.revoked, []);
});

test("an account change during avatar upload cannot update the old profile or restore its preview", async () => {
  const upload = deferred<Response>();
  let updates = 0;
  const app = avatarHarness(database(async input => {
    if (String(input).includes("/storage/")) return upload.promise;
    updates++; return json({});
  }));
  app.run("selectProfileAvatar", new File(["original"], "source.png", { type: "image/png" }));
  app.run("confirmProfileAvatar", new File(["crop"], "avatar.jpg", { type: "image/jpeg" }), app.state.profileAvatarCrop);
  const saving = app.run("handleUpdateProfile", { preventDefault() {} });
  await flush();
  app.run("bindProfileAccount", { id: "other-viewer" });
  upload.resolve(json({}));
  await saving;
  assert.equal(updates, 0);
  assert.equal(app.state.profileAvatarPreview, "");
  assert.equal(app.state.profileAvatarFile, null);
  assert.equal(app.state.message, null);
  assert.equal(app.state.busy, false);
  assert.deepEqual(app.revoked, ["blob:fixture-0"]);
});

test("late profile reads cannot overwrite a rebound account's form, including the same viewer", async () => {
  for (const nextId of ["viewer", "other-viewer"]) {
    const read = deferred<Response>();
    const app = avatarHarness(database(async () => read.promise));
    const loading = app.run("loadProfile");
    await flush();
    app.scope.clear();
    app.run("bindProfileAccount", { id: nextId });
    read.resolve(json({ id: "viewer", username: "old", display_name: "Old private draft", bio: "old", avatar_url: "old-image" }));
    await loading;
    assert.equal(app.state.profileDisplayName, "");
    assert.equal(app.state.profileAvatarPreview, "");
    assert.equal(app.state.profileLoadedFor, null);
  }
});

test("normal same-account events preserve the profile draft, but rebinding invalidates an old crop", () => {
  const app = avatarHarness();
  app.run("selectProfileAvatar", new File(["source"], "photo.png", { type: "image/png" }));
  const oldCrop = app.state.profileAvatarCrop;
  app.run("bindProfileAccount", { id: "viewer", email: "fixture@example.invalid" });
  assert.equal(app.state.profileDisplayName, "Draft name");
  assert.equal(app.state.profileAvatarCrop, oldCrop);
  assert.equal(app.state.profileAccountEpoch, 0);
  app.scope.clear();
  app.run("bindProfileAccount", { id: "viewer" });
  assert.equal(app.state.profileAccountEpoch, 1);
  assert.equal(app.state.profileAvatarPreview, "");
  assert.equal(app.state.profileAvatarCrop, null);
  app.run("confirmProfileAvatar", new File(["crop"], "crop.jpg", { type: "image/jpeg" }), oldCrop);
  assert.deepEqual(app.created, []);
});

test("crop confirmation prepares one preview; cancel keeps it, and a replacement releases its URL", () => {
  const app = avatarHarness();
  const sourceFile = new File(["source"], "portrait.png", { type: "image/png" });
  const cropped = new File(["crop"], "avatar.jpg", { type: "image/jpeg" });
  app.run("selectProfileAvatar", sourceFile);
  app.run("confirmProfileAvatar", cropped, app.state.profileAvatarCrop);
  assert.equal(app.state.profileAvatarFile, cropped);
  assert.equal(app.state.profileAvatarPreview, "blob:fixture-0");
  app.run("selectProfileAvatar", sourceFile);
  app.run("cancelProfileAvatar", app.state.profileAvatarCrop);
  assert.equal(app.state.profileAvatarCrop, null);
  assert.equal(app.state.profileAvatarPreview, "blob:fixture-0");
  app.run("selectProfileAvatar", sourceFile);
  app.run("confirmProfileAvatar", cropped, app.state.profileAvatarCrop);
  assert.equal(app.state.profileAvatarPreview, "blob:fixture-1");
  assert.deepEqual(app.revoked, ["blob:fixture-0"]);
  app.run("discardProfileAvatar");
  assert.equal(app.state.profileAvatarPreview, "https://fixture.invalid/saved.jpg");
  assert.equal(app.state.profileAvatarFile, null);
  assert.deepEqual(app.revoked, ["blob:fixture-0", "blob:fixture-1"]);
});

test("the real Studio profile form connects the shared crop editor and keeps Save disabled while cropping", () => {
  const editor = nodes.find(node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "AvatarCropEditor");
  assert.ok(editor, "Profile uploads must use the shared crop editor");
  assert.match(editor.getText(source), /file=\{profileAvatarCrop\.file\}/);
  assert.match(editor.getText(source), /confirmProfileAvatar\(file, profileAvatarCrop\)/);
  assert.match(editor.getText(source), /cancelProfileAvatar\(profileAvatarCrop\)/);
  const form = nodes.find(node => ts.isJsxElement(node) && node.openingElement.getText(source).includes("onSubmit={handleUpdateProfile}"));
  assert.ok(form);
  assert.match(form.getText(source), /disabled=\{busy \|\| Boolean\(profileAvatarCrop\) \|\| profileLoadedFor !== userId\}/);
  assert.match(form.getText(source), /Crop ready\. Save profile to apply it/);
  assert.match(form.getText(source), /Discard selected image/);
  assert.match(form.getText(source), /up to 8 MiB/);
  for (const label of ["Discard selected image", "Retry profile", "Save creator profile"]) {
    const button = nodes.find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === "Button" && node.children.some(child => child.getText(source).includes(label)));
    assert.ok(button && ts.isJsxElement(button), label);
    assert.match(button.openingElement.getText(source), /h-auto min-h-11 max-w-full whitespace-normal py-2/, label);
  }
});
