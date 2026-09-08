import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

const requireFromTest = createRequire(import.meta.url);
const sectionPath = resolve(process.cwd(), "app/messages/group-description-section.tsx");
const conversationId = "f7200000-0000-4000-8000-000000000001";
const viewerId = "f7200000-0000-4000-8000-000000000002";
const firstVersion = "2026-09-08T10:00:00.123456+00:00";
const nextVersion = "2026-09-08T10:00:00.123457+00:00";
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json" },
});
const ready = (description: string, canEdit = true, version = firstVersion, cid = conversationId) => ({
  conversation_id: cid, description, can_edit: canEdit, updated_at: version,
});
type Props = { conversationId: string; viewerId: string; canManage: boolean };
type UiElement = React.ReactElement<Record<string, unknown>>;
type Hook = { value?: unknown; deps?: readonly unknown[]; cleanup?: () => void };

/**
 * Approved narrow hook adapter: execute the actual component, its effects and
 * JSX callbacks, then use real ReactDOMServer for rendered output. Supabase's
 * actual client/helper/scope run against a fake transport. No copied handlers
 * or injected state slots. This does NOT model React scheduling, DOM focus,
 * pointer/keyboard synthesis, hydration, or actual browser layout.
 */
function mount(fetch: typeof globalThis.fetch, props: Props = { conversationId, viewerId, canManage: true }) {
  const hooks: Hook[] = [];
  const effects: (() => void)[] = [];
  let cursor = 0, dirty = true, mounted = true, tree: React.ReactNode;
  const localWindow = new EventTarget();
  const database = createClient("https://fixture.invalid", "fixture-only", {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
  });
  const slot = () => hooks[cursor++] ?? (hooks[cursor - 1] = {});
  const same = (before?: readonly unknown[], after?: readonly unknown[]) =>
    !!before && !!after && before.length === after.length && before.every((value, index) => Object.is(value, after[index]));
  const effect = (run: () => void | (() => void), deps?: readonly unknown[]) => {
    const state = slot();
    if (!same(state.deps, deps)) {
      state.deps = deps;
      effects.push(() => { state.cleanup?.(); state.cleanup = run() || undefined; });
    }
  };
  const hookAdapter = {
    ...React,
    useState(initial: unknown) {
      const state = slot();
      if (!("value" in state)) state.value = typeof initial === "function" ? initial() : initial;
      return [state.value, (next: unknown) => {
        if (!mounted) return;
        state.value = typeof next === "function" ? next(state.value) : next; dirty = true;
      }];
    },
    useRef(initial: unknown) { const state = slot(); return state.value ?? (state.value = { current: initial }); },
    useCallback(callback: unknown, deps?: readonly unknown[]) {
      const state = slot();
      if (!same(state.deps, deps)) { state.deps = deps; state.value = callback; }
      return state.value;
    },
    useEffect: effect,
    useLayoutEffect: effect,
  };
  const cache = new Map<string, Record<string, unknown>>();
  function load(modulePath: string): Record<string, unknown> {
    const exact = existsSync(modulePath) ? modulePath : [".tsx", ".ts"].map(extension => modulePath + extension).find(existsSync);
    assert.ok(exact, modulePath);
    if (cache.has(exact)) return cache.get(exact)!;
    const output = { exports: {} as Record<string, unknown> };
    const localRequire = (name: string): unknown => {
      if (name === "react" && exact === sectionPath) return hookAdapter;
      if (name === "@/lib/supabase-browser") return { supabase: database };
      if (name.startsWith("@/")) return load(resolve(process.cwd(), name.slice(2)));
      if (name.startsWith(".")) return load(resolve(dirname(exact), name));
      return requireFromTest(name);
    };
    new Function("require", "module", "exports", "window", ts.transpileModule(readFileSync(exact, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText)(localRequire, output, output.exports, localWindow);
    cache.set(exact, output.exports);
    return output.exports;
  }
  const Section = load(sectionPath).default as (props: Props) => React.ReactNode;
  const render = () => {
    if (!mounted || !dirty) return;
    cursor = 0; dirty = false; tree = Section(props);
    for (const commit of effects.splice(0)) commit();
  };
  render();
  function elements(node: React.ReactNode = tree): UiElement[] {
    if (Array.isArray(node)) return node.flatMap(child => elements(child));
    if (!React.isValidElement<Record<string, unknown>>(node)) return [];
    return [node, ...elements((node.props.children ?? null) as React.ReactNode)];
  }
  const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join("")
    : React.isValidElement<Record<string, unknown>>(node) ? text(node.props.children)
      : typeof node === "string" || typeof node === "number" ? String(node) : "";
  return {
    async flush() { for (let i = 0; i < 6; i++) { await new Promise(resolve => setImmediate(resolve)); render(); } },
    html() { render(); return renderToStaticMarkup(tree); },
    textarea() { render(); const field = elements().find(node => node.type === "textarea"); assert.ok(field, "description field is visible"); return field; },
    change(value: string) { const field = this.textarea(); (field.props.onChange as (event: unknown) => void)({ target: { value } }); render(); },
    submit() { render(); const form = elements().find(node => node.type === "form"); assert.ok(form); return (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault() {} }); },
    button(label: string) { render(); const button = elements().find(node => node.props.type && text(node.props.children) === label); assert.ok(button, label); return button; },
    click(label: string) { const button = this.button(label); assert.equal(Boolean(button.props.disabled), false, `${label} enabled`); (button.props.onClick as () => void)(); render(); },
    focus() { localWindow.dispatchEvent(new Event("focus")); render(); },
    unmount() { mounted = false; for (const state of hooks) state.cleanup?.(); },
  };
}

test("denied refresh removes previously loaded member About instead of leaking stale ready data", async t => {
  let reads = 0;
  const view = mount(async () => ++reads === 1 ? json(ready("Private member description", false))
    : json({ code: "P0001", message: "Only current group members can read the group About." }, 400),
  { conversationId, viewerId, canManage: false });
  t.after(() => view.unmount());
  await view.flush();
  assert.match(view.html(), /Private member description/);
  view.click("Refresh description");
  await view.flush();
  assert.doesNotMatch(view.html(), /Private member description/, "denied current membership invalidates cached private text");
  assert.match(view.html(), /role="alert"/);
  assert.doesNotMatch(view.html(), /<textarea|Save description/);
});

test("member rendering remains read-only unless both current UI and server authority allow editing", async t => {
  for (const [canManage, serverCanEdit] of [[false, true], [true, false], [false, false]]) {
    const view = mount(async () => json(ready("Paragraph one\n<script>not markup</script>", serverCanEdit)),
      { conversationId, viewerId, canManage });
    t.after(() => view.unmount());
    await view.flush();
    const html = view.html();
    assert.match(html, /Paragraph one/);
    assert.match(html, /whitespace-pre-wrap break-words/);
    assert.match(html, /&lt;script&gt;not markup&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<textarea|<form|Save description|<script>/);
    assert.match(html, /Refresh description/);
  }
});

test("owner edits use the real form callback, preserve exact version and confirm only the saved response", async t => {
  let resolveSave: ((value: Response) => void) | undefined;
  const view = mount(async (input, init) => {
    if (String(input).endsWith("get_group_description")) return json(ready("Saved text"));
    assert.deepEqual(JSON.parse(String(init?.body)), {
      target_conversation_id: conversationId, new_description: "Owner draft", expected_updated_at: firstVersion,
    });
    return new Promise<Response>(resolve => { resolveSave = resolve; });
  });
  t.after(() => view.unmount());
  await view.flush();
  assert.match(view.html(), /<label[^>]*>Group description/);
  assert.match(view.html(), /aria-describedby="group-about-count"/);
  assert.equal(view.button("Save description").props.disabled, true);
  view.change("Owner draft");
  const saving = view.submit();
  await view.flush();
  assert.equal(view.textarea().props.disabled, true);
  assert.match(view.html(), /Saving description…/);
  assert.doesNotMatch(view.html(), /Group description saved/);
  assert.ok(resolveSave);
  resolveSave(json(ready("Owner draft", true, nextVersion)));
  await saving; await view.flush();
  assert.equal(view.textarea().props.value, "Owner draft");
  assert.equal(view.button("Save description").props.disabled, true);
  assert.match(view.html(), /role="status"[^>]*>Group description saved\. Members can see it in Group details\./);
});

test("conflict refresh shows the newer description while keeping a draft until explicit review", async t => {
  let reads = 0, writes = 0;
  const view = mount(async (input, init) => {
    if (String(input).endsWith("get_group_description")) return json(++reads === 1
      ? ready("Original") : ready("Another admin's latest", true, nextVersion));
    if (++writes === 1) return json({ code: "40001", message: "Group About changed. Refresh it before saving again." }, 400);
    assert.deepEqual(JSON.parse(String(init?.body)), {
      target_conversation_id: conversationId, new_description: "My draft", expected_updated_at: nextVersion,
    });
    return json(ready("My draft", true, "2026-09-08T10:00:00.123458+00:00"));
  });
  t.after(() => view.unmount());
  await view.flush(); view.change("My draft"); await view.submit(); await view.flush();
  assert.equal(view.textarea().props.value, "My draft");
  assert.equal(view.button("Save description").props.disabled, true);
  view.click("Review latest description"); await view.flush();
  assert.equal(view.textarea().props.value, "My draft");
  assert.match(view.html(), /Another admin&#x27;s latest/);
  assert.equal(view.button("Save description").props.disabled, true);
  view.click("Keep my draft");
  assert.equal(view.button("Save description").props.disabled, false);
  await view.submit(); await view.flush();
  assert.match(view.html(), /Group description saved/);
});

test("review can adopt the newer description without sending the abandoned draft", async t => {
  let reads = 0, writes = 0;
  const view = mount(async input => String(input).endsWith("get_group_description")
    ? json(++reads === 1 ? ready("Original") : ready("Latest", true, nextVersion))
    : (writes++, json({ code: "40001", message: "Refresh and review" }, 400)));
  t.after(() => view.unmount());
  await view.flush(); view.change("Unsaved draft"); await view.submit(); await view.flush();
  view.click("Review latest description"); await view.flush();
  view.click("Use latest");
  assert.equal(view.textarea().props.value, "Latest");
  assert.equal(view.button("Save description").props.disabled, true);
  assert.doesNotMatch(view.html(), /Unsaved draft|Keep my draft|role="alert"/);
  assert.equal(writes, 1, "reviewing never writes a replacement");
});

test("unknown save must reconcile with a read before retry and recognizes an already-saved draft", async t => {
  let writes = 0;
  let serverText = "Before";
  const view = mount(async (input, init) => {
    if (String(input).endsWith("get_group_description")) return json(ready(serverText, true, writes ? nextVersion : firstVersion));
    writes++; serverText = JSON.parse(String(init?.body)).new_description;
    throw new Error("response lost after server commit");
  });
  t.after(() => view.unmount());
  await view.flush(); view.change("Possibly saved"); await view.submit(); await view.flush();
  assert.equal(view.textarea().props.value, "Possibly saved");
  assert.equal(view.button("Save description").props.disabled, true);
  assert.match(view.html(), /role="alert"/);
  assert.doesNotMatch(view.html(), /Group description saved/);
  await view.submit();
  assert.equal(writes, 1, "actual callback refuses an unconfirmed immediate resend");
  view.click("Review latest description"); await view.flush();
  assert.equal(view.textarea().props.value, "Possibly saved");
  assert.equal(view.button("Save description").props.disabled, true);
  assert.doesNotMatch(view.html(), /role="alert"|Keep my draft/);
  assert.equal(writes, 1);
});

test("focus refreshes a clean editor but never replaces a dirty description draft", async t => {
  let serverText = "Initial";
  const view = mount(async () => json(ready(serverText)));
  t.after(() => view.unmount());
  await view.flush(); serverText = "Changed remotely"; view.focus(); await view.flush();
  assert.equal(view.textarea().props.value, "Changed remotely");
  view.change("Local unsaved draft"); serverText = "Changed again"; view.focus(); await view.flush();
  assert.equal(view.textarea().props.value, "Local unsaved draft");
  assert.doesNotMatch(view.html(), /Changed again|Keep my draft/);
});

test("parent-key account and conversation remounts discard delayed reads and invalidate old save callbacks", async t => {
  let oldResponse: ((value: Response) => void) | undefined;
  const old = mount(async () => new Promise<Response>(resolve => { oldResponse = resolve; }));
  await old.flush(); old.unmount();
  const newCid = "f7200000-0000-4000-8000-000000000003";
  const newer = mount(async () => json(ready("New account's group", true, firstVersion, newCid)),
    { conversationId: newCid, viewerId: "f7200000-0000-4000-8000-000000000004", canManage: true });
  t.after(() => newer.unmount());
  await newer.flush(); assert.ok(oldResponse); oldResponse(json(ready("Former account secret"))); await newer.flush();
  assert.equal(newer.textarea().props.value, "New account's group");
  assert.doesNotMatch(newer.html(), /Former account secret/);

  let mutations = 0;
  const loadedOld = mount(async input => {
    if (String(input).endsWith("get_group_description")) return json(ready("Old ready description"));
    mutations++; return json(ready("Old draft"));
  });
  await loadedOld.flush(); loadedOld.change("Old draft"); loadedOld.unmount();
  await loadedOld.submit();
  assert.equal(mutations, 0, "an expired production submit callback cannot start a request");
});

test("parent-key role remount drops an admin draft and never applies its delayed save result", async t => {
  let finishOldSave: ((value: Response) => void) | undefined;
  const admin = mount(async input => String(input).endsWith("get_group_description") ? json(ready("Original"))
    : new Promise<Response>(resolve => { finishOldSave = resolve; }));
  await admin.flush(); admin.change("Former admin draft"); const pending = admin.submit(); await admin.flush(); admin.unmount();
  const member = mount(async () => json(ready("Current shared description", false)), { conversationId, viewerId, canManage: false });
  t.after(() => member.unmount());
  await member.flush(); assert.ok(finishOldSave); finishOldSave(json(ready("Former admin draft", true, nextVersion)));
  await pending; await member.flush();
  assert.match(member.html(), /Current shared description/);
  assert.doesNotMatch(member.html(), /Former admin draft|Group description saved|<textarea|Save description/);
});

test("a denied refresh also removes an owner's retained draft and saved confirmation", async t => {
  let denied = false;
  const view = mount(async input => denied
    ? json({ code: "42501", message: "permission denied for get_group_description" }, 403)
    : json(ready(String(input).endsWith("get_group_description") ? "Private original" : "Private draft")));
  t.after(() => view.unmount());
  await view.flush(); view.change("Private draft"); await view.submit(); await view.flush();
  assert.match(view.html(), /Group description saved/);
  denied = true; view.focus(); await view.flush();
  assert.doesNotMatch(view.html(), /Private original|Private draft|Group description saved|<textarea/);
  assert.match(view.html(), /permission denied/);
});

test("missing deployment is visibly unavailable and oversized drafts cannot submit", async t => {
  const absent = mount(async () => json({ code: "PGRST202", message: "Could not find public.get_group_description" }, 404));
  t.after(() => absent.unmount()); await absent.flush();
  assert.match(absent.html(), /unavailable until its database update/);
  assert.doesNotMatch(absent.html(), /<textarea|Save description/);
  let writes = 0;
  const view = mount(async input => {
    if (String(input).endsWith("update_group_description")) writes++;
    return json(ready("Existing"));
  });
  t.after(() => view.unmount()); await view.flush(); view.change("🦊".repeat(501));
  assert.equal(view.textarea().props["aria-invalid"], true);
  assert.equal(view.button("Save description").props.disabled, true);
  await view.submit(); await view.flush();
  assert.equal(writes, 0);
  assert.match(view.html(), /500 characters or fewer/);
  assert.equal(view.textarea().props.value, "🦊".repeat(501));
});
