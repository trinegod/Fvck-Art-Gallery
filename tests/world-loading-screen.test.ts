import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";
import ts from "typescript";
import type { WorldLoadingScreenProps } from "../app/components/world-loading-screen";

const requireFromTest = createRequire(import.meta.url);
const componentPath = resolve(process.cwd(), "app/components/world-loading-screen.tsx");
const css = postcss.parse(readFileSync(resolve(dirname(componentPath), "world-loading-screen.module.css"), "utf8"));

// Render the production components without a browser bundler. Only the CSS
// module import is replaced; SVG markup, props, and status semantics are real.
function loadComponent(path: string): ComponentType<WorldLoadingScreenProps> {
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const componentModule = { exports: {} as { default: ComponentType<WorldLoadingScreenProps> } };
  const localRequire = (specifier: string): unknown => {
    if (specifier.endsWith(".module.css")) {
      return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    }
    if (specifier.startsWith(".")) {
      return { __esModule: true, default: loadComponent(resolve(dirname(path), `${specifier}.tsx`)) };
    }
    return requireFromTest(specifier);
  };
  new Function("require", "module", "exports", compiled)(localRequire, componentModule, componentModule.exports);
  return componentModule.exports.default;
}

const WorldLoadingScreen = loadComponent(componentPath);

function declarations(selector: string) {
  const values = new Map<string, string>();
  css.walkRules(selector, (rule) => {
    if (rule.parent?.type !== "root") return;
    rule.walkDecls((declaration) => { values.set(declaration.prop, declaration.value); });
  });
  return values;
}

test("an inbox pending group uses an explicit viewport mode without nesting a main landmark", () => {
  const html = renderToStaticMarkup(createElement(WorldLoadingScreen, {
    variant: "viewport",
    label: "Opening your inbox…",
  }));
  assert.match(html, /^<div[^>]*data-world-loading="viewport"/);
  assert.doesNotMatch(html, /<main\b/);
  assert.equal(html.match(/role="status"/g)?.length, 1);
  assert.equal(html.match(/Opening your inbox…/g)?.length, 1);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-atomic="true"/);
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
  assert.match(html, /<svg[^>]*height="32"/);
});

test("viewport centering moves only the status group and cannot intercept loaded navigation", () => {
  const viewport = declarations(".viewport");
  const group = declarations(".viewport .status");
  assert.notEqual(viewport.get("position"), "fixed");
  assert.equal(viewport.get("background"), undefined);
  assert.equal(group.get("position"), "fixed");
  assert.equal(group.get("top"), "50dvh");
  assert.equal(group.get("left"), "50%");
  assert.equal(group.get("transform"), "translate(-50%, -50%)");
  assert.equal(group.get("pointer-events"), "none");
  assert.equal(group.get("width"), "max-content");
  assert.equal(group.get("max-width"), "calc(100% - 2.5rem)");
  assert.equal(group.get("inset"), undefined);
  assert.equal(group.get("z-index"), undefined);
});

test("standalone route fallbacks center within the current dynamic viewport", () => {
  const html = renderToStaticMarkup(createElement(WorldLoadingScreen, { label: "Opening NODEINE…" }));
  assert.match(html, /^<main[^>]*data-world-loading="centered"/);
  assert.match(html, /<svg[^>]*height="64"/);
  const centered = declarations(".centered");
  assert.equal(centered.get("min-height"), "100dvh");
  assert.equal(centered.get("place-items"), "center");
  assert.equal(centered.get("box-sizing"), "border-box");
  assert.equal(centered.get("padding"), "2rem 1.25rem");
  assert.notEqual(centered.get("position"), "fixed");
});

test("conversation panel loaders remain contained and do not use viewport coordinates", () => {
  const html = renderToStaticMarkup(createElement(WorldLoadingScreen, {
    variant: "inline",
    label: "Opening your conversation…",
    className: "min-h-full",
  }));
  assert.match(html, /^<div[^>]*data-world-loading="inline"/);
  assert.match(html, /class="inline min-h-full"/);
  assert.doesNotMatch(html, /class="viewport/);
  assert.equal(declarations(".inline").get("place-items"), "center");
  assert.notEqual(declarations(".inline").get("position"), "fixed");
  assert.notEqual(declarations(".status").get("position"), "fixed");
});

test("the actual messages route fallback uses the World Aperture and the approved inbox label", () => {
  const MessagesLoading = loadComponent(resolve(process.cwd(), "app/messages/loading.tsx"));
  const html = renderToStaticMarkup(createElement(MessagesLoading));
  assert.match(html, /Opening your inbox…/);
  assert.match(html, /worldLoadingAperture/);
  assert.equal(html.match(/role="status"/g)?.length, 1);
  assert.doesNotMatch(html, /animate-spin/);
});

test("the actual pending inbox selects viewport alignment while conversation loading stays in its panel", () => {
  const path = resolve(process.cwd(), "app/messages/messages-view.tsx");
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const loaders = new Map<string, Map<string, string>>();
  const visit = (node: ts.Node) => {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(source) === "WorldLoadingScreen") {
      const attributes = new Map<string, string>();
      for (const attribute of node.attributes.properties) {
        if (ts.isJsxAttribute(attribute) && attribute.initializer && ts.isStringLiteral(attribute.initializer)) {
          attributes.set(attribute.name.getText(source), attribute.initializer.text);
        }
      }
      loaders.set(attributes.get("label") ?? "", attributes);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const inbox = loaders.get("Opening your inbox…");
  assert.ok(inbox, "Expected the real inbox-pending loader");
  assert.equal(inbox.get("variant"), "viewport");
  assert.doesNotMatch(inbox.get("className") ?? "", /70[sd]?vh/);
  const conversation = loaders.get("Opening your conversation…");
  assert.ok(conversation, "Expected the contained conversation-pending loader");
  assert.equal(conversation.get("variant"), "inline");
});

test("the original orbit animates only without a reduced-motion preference", () => {
  let animations = 0;
  css.walkDecls("animation", (declaration) => {
    animations += 1;
    assert.equal(declaration.value, "world-loading-orbit 7.2s linear infinite");
    const media = declaration.parent?.parent;
    assert.ok(media && media.type === "atrule");
    assert.equal(media.params, "(prefers-reduced-motion: no-preference)");
  });
  assert.equal(animations, 1);
  const source = readFileSync(componentPath, "utf8");
  assert.doesNotMatch(source, /setTimeout|setInterval|useEffect|aria-modal|dialog/);
});
