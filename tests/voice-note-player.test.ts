import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const requireFromTest = createRequire(import.meta.url);
const cache = new Map<string, Record<string, unknown>>();

function loadProduction(modulePath: string): Record<string, unknown> {
  const exact = existsSync(modulePath) ? modulePath : [".tsx", ".ts"].map((extension) => modulePath + extension).find(existsSync);
  assert.ok(exact, modulePath);
  if (cache.has(exact)) return cache.get(exact)!;
  const compiled = ts.transpileModule(readFileSync(exact, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const componentModule = { exports: {} as Record<string, unknown> };
  const localRequire = (specifier: string): unknown => {
    if (specifier.startsWith("@/")) return loadProduction(resolve(process.cwd(), specifier.slice(2)));
    if (specifier.startsWith(".")) return loadProduction(resolve(dirname(exact), specifier));
    return requireFromTest(specifier);
  };
  new Function("require", "module", "exports", compiled)(localRequire, componentModule, componentModule.exports);
  cache.set(exact, componentModule.exports);
  return componentModule.exports;
}

const Player = loadProduction(resolve(process.cwd(), "app/messages/voice-note-player.tsx")).default as ComponentType<{
  src: string; mimeType?: string; durationMs?: number; outgoing?: boolean; label?: string; className?: string;
}>;

test("the real player renders themed custom controls without native audio controls or autoplay", () => {
  const html = renderToStaticMarkup(createElement(Player, { src: "blob:test", mimeType: "audio/webm", durationMs: 24_000, outgoing: true, className: "preview-player" }));
  assert.doesNotMatch(html, /<audio[^>]*\bcontrols(?:=|\s)|\bautoplay=/i);
  assert.match(html, /<button[^>]*aria-label="Play Voice note"/);
  assert.match(html, /<input[^>]*type="range"/);
  assert.match(html, /aria-label="Seek Voice note"/);
  assert.match(html, /0:24/);
  assert.match(html, /var\(--chat-bubble, #8de6ed\)/);
  assert.match(html, /var\(--chat-ink, #0b2025\)/);
  assert.match(html, /preview-player/);
  assert.match(html, /data-voice-visual="progress"/);
  assert.match(html, /Playback progress\. Audio waveform not loaded\./);
  assert.match(html, /<audio[^>]*hidden=""/);
  assert.match(html, /<source[^>]*type="audio\/webm"/);
  const incoming = renderToStaticMarkup(createElement(Player, { src: "blob:test", label: "Voice preview" }));
  assert.match(incoming, /background-color:#252d3a;color:#f2f3f8/);
  assert.match(incoming, /aria-label="Play Voice preview"/);
});
