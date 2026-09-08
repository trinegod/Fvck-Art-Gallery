import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { createAvatarCropSession } from "../lib/avatar-crop";

const requireFromTest = createRequire(import.meta.url);
const cache = new Map<string, Record<string, unknown>>();
function loadProduction(modulePath: string): Record<string, unknown> {
  const exact = existsSync(modulePath) ? modulePath : [".tsx", ".ts"].map(extension => modulePath + extension).find(existsSync);
  assert.ok(exact, modulePath);
  if (cache.has(exact)) return cache.get(exact)!;
  const compiled = ts.transpileModule(readFileSync(exact, "utf8"), { compilerOptions:{ module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX, esModuleInterop:true } }).outputText;
  const compiledModule = { exports:{} as Record<string, unknown> };
  const localRequire = (name:string):unknown => name.startsWith("@/") ? loadProduction(resolve(process.cwd(), name.slice(2))) : name.startsWith(".") ? loadProduction(resolve(dirname(exact), name)) : requireFromTest(name);
  new Function("require", "module", "exports", compiled)(localRequire, compiledModule, compiledModule.exports);
  cache.set(exact, compiledModule.exports); return compiledModule.exports;
}

test("the real shared editor renders labeled44px crop controls and local confirmation without reading the file", () => {
  const Editor = loadProduction(resolve(process.cwd(), "components/avatar-crop-editor.tsx")).default as ComponentType<{ file:File; onConfirm(file:File):void; onCancel():void }>;
  const file = new File(["not-read-on-render"], "photo.png", { type:"image/png" });
  file.arrayBuffer = async () => { throw new Error("Rendering must not read image bytes"); };
  const html = renderToStaticMarkup(createElement(Editor, { file, onConfirm:() => assert.fail("No confirmation during render"), onCancel:() => {} }));
  for (const label of ["Horizontal position", "Vertical position", "Zoom", "Reset", "Cancel", "Use avatar"]) assert.ok(html.includes(label), label);
  assert.equal((html.match(/type="range"/g) ?? []).length, 3);
  assert.match(html, /rounded-full/); assert.match(html, /touch-none/);
  assert.match(html, /min-h-\[44px\]/);
  for (const button of html.match(/<button\b[^>]*>/g) ?? []) {
    assert.match(button, /\bh-auto\b/, "enlarged text needs content-driven button height");
    assert.match(button, /min-h-\[44px\]/);
  }
  assert.match(html, /Opening image/);
  assert.match(html, /Save applies it/);
  assert.doesNotMatch(html, /role="dialog"|<form|<img|https?:\/\//);
});

test("the actual ready panel reflects crop changes through labeled native keyboard sliders", async t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "Image");
  class ImageAdapter {
    naturalWidth = 1; naturalHeight = 1;
    onload: (() => void) | null = null; onerror: (() => void) | null = null;
    set src(value:string) { if (value) queueMicrotask(() => this.onload?.()); }
  }
  Object.defineProperty(globalThis, "Image", { configurable:true, value:ImageAdapter });
  t.after(() => { if (previous) Object.defineProperty(globalThis, "Image", previous); else Reflect.deleteProperty(globalThis, "Image"); });
  const createSession = loadProduction(resolve(process.cwd(), "lib/avatar-crop.ts")).createAvatarCropSession as typeof createAvatarCropSession;
  const session = createSession(new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCwoAAAAASUVORK5CYII=", "base64")], "pixel.png", { type:"image/png" }));
  t.after(() => session.dispose());
  await session.start();
  assert.equal(session.getSnapshot().phase, "ready");
  session.setCrop({ x:83, y:21, zoom:1.75 });
  const Panel = loadProduction(resolve(process.cwd(), "components/avatar-crop-editor.tsx")).AvatarCropEditorPanel as ComponentType<{ session:ReturnType<typeof createAvatarCropSession>; onConfirm(file:File):void; onCancel():void }>;
  const html = renderToStaticMarkup(createElement(Panel, { session, onConfirm:() => {}, onCancel:() => {} }));
  assert.match(html, /aria-valuetext="83 percent from left"/);
  assert.match(html, /aria-valuetext="21 percent from top"/);
  assert.match(html, /aria-valuetext="175 percent zoom"/);
  assert.doesNotMatch(html, /disabled=""/);
  const inputs = Array.from(html.matchAll(/<input\b[^>]*>/g), match => match[0]);
  for (const input of inputs) {
    const id = input.match(/id="([^"]+)"/)?.[1];
    assert.ok(id); assert.ok(html.includes(`for="${id}"`));
    assert.match(input, /type="range"/); assert.match(input, /h-\[44px\]/);
  }
});
