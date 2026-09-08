import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const requireFromTest = createRequire(import.meta.url);

function loadProduction(modulePath: string): Record<string, unknown> {
  const exact = existsSync(modulePath) ? modulePath : [".tsx", ".ts"].map(extension => modulePath + extension).find(existsSync);
  assert.ok(exact, modulePath);
  const compiled = ts.transpileModule(readFileSync(exact, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} as Record<string, unknown> };
  const localRequire = (specifier: string): unknown => {
    // This is the external client boundary. Rendering never issues a request.
    if (specifier === "@/lib/supabase-browser") return { supabase: {} };
    if (specifier.startsWith("@/")) return loadProduction(resolve(process.cwd(), specifier.slice(2)));
    if (specifier.startsWith(".")) return loadProduction(resolve(dirname(exact), specifier));
    return requireFromTest(specifier);
  };
  new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

test("the shared control renders accurate personal mute state and a labeled 44px action", () => {
  const Control = loadProduction(resolve(process.cwd(), "app/messages/conversation-mute-control.tsx")).default as ComponentType<{
    viewerId: string; conversationId: string; mutedUntil: string | null; onMuteChanged: () => void; disabled?: boolean;
  }>;
  const render = (mutedUntil: string | null, disabled = false) => renderToStaticMarkup(createElement(Control, {
    viewerId: "viewer", conversationId: "conversation", mutedUntil, disabled, onMuteChanged: () => {},
  }));
  for (const expiry of [null, "invalid", "2000-01-01T00:00:00Z"]) {
    const html = render(expiry);
    assert.match(html, />Mute notifications</);
    assert.doesNotMatch(html, />Unmute notifications</);
    assert.match(html, /<button[^>]*\bmin-h-11\b/);
    assert.match(html, /aria-describedby=/);
    assert.match(html, /your account/);
    assert.match(html, /Messages and unread counts still appear/);
  }
  assert.match(render("2999-12-31T23:59:59Z"), />Unmute notifications</);
  assert.match(render(null, true), /<button[^>]*disabled=""/);
});
