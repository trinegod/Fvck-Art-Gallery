import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Load the real client component and its local imports without a Next server.
// Browser interaction and final media bytes are covered by their separate seams.
const requireFromTest = createRequire(import.meta.url);
const cache = new Map<string, Record<string, unknown>>();
function loadProduction(modulePath: string): Record<string, unknown> {
  const exact = existsSync(modulePath) ? modulePath : [".tsx", ".ts"].map(extension => modulePath + extension).find(existsSync);
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

const Composer = loadProduction(resolve(process.cwd(), "app/messages/voice-note-composer.tsx")).default as ComponentType<{
  conversationKey: string; sendEnabled: boolean; disabled?: boolean; attachment?: ReactNode; children?: ReactNode;
}>;
const parse = (text: string) => ts.createSourceFile("review.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
type Element = ts.JsxElement | ts.JsxSelfClosingElement;
const opening = (element: Element) => ts.isJsxElement(element) ? element.openingElement : element;
const tag = (element: Element) => opening(element).tagName.getText();
function descendants<T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T): T[] {
  const found: T[] = [];
  const visit = (node: ts.Node) => { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); };
  visit(root);
  return found;
}
const elements = (root: ts.Node) => descendants(root, (node): node is Element => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node));
function attribute(element: Element, name: string) {
  return opening(element).attributes.properties.find((node): node is ts.JsxAttribute => ts.isJsxAttribute(node) && node.name.getText() === name);
}
function literalAttribute(element: Element, name: string) {
  const value = attribute(element, name)?.initializer;
  return value && ts.isStringLiteral(value) ? value.text : undefined;
}
function expressionAttribute(element: Element, name: string) {
  const value = attribute(element, name)?.initializer;
  return value && ts.isJsxExpression(value) ? value.expression : undefined;
}
function ancestors(element: ts.Node): Element[] {
  const found: Element[] = [];
  for (let parent = element.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent)) found.push(parent);
  }
  return found;
}
function visibleText(element: Element): string {
  if (literalAttribute(element, "class")?.split(/\s+/).includes("sr-only") || literalAttribute(element, "aria-hidden") === "true") return "";
  if (!ts.isJsxElement(element)) return "";
  return element.children.map(child => ts.isJsxText(child) ? child.text : ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) ? visibleText(child) : "").join("");
}
function renderedComposer(disabled = false) {
  const html = renderToStaticMarkup(createElement(Composer, {
    conversationKey: "synthetic-account:synthetic-conversation", sendEnabled: false, disabled,
    attachment: createElement("button", { type: "button", "aria-label": "Add attachment" }, "+"),
  },
  createElement("label", null, createElement("span", { className: "sr-only" }, "Message"), createElement("textarea", { defaultValue: "Keep this text draft", "aria-label": "Message" })),
  createElement("button", { type: "submit", "aria-label": "Send message" }, "Send")));
  return elements(parse(`const rendered = (${html});`));
}

test("the actual idle composer exposes one icon-only microphone action with no voice dialog or extra Record prompt", () => {
  const rendered = renderedComposer();
  const mic = rendered.filter(element => tag(element) === "button" && literalAttribute(element, "aria-label") === "Record voice note");
  assert.equal(mic.length, 1);
  assert.equal(literalAttribute(mic[0], "type"), "button");
  assert.equal(attribute(mic[0], "disabled"), undefined, "delivery gating still permits local recording and preview");
  assert.equal(visibleText(mic[0]), "", "the microphone is an icon, not a second visible Record step");
  assert.equal(elements(mic[0]).filter(element => tag(element) === "svg").length, 1);
  assert.equal(rendered.some(element => tag(element) === "dialog" || literalAttribute(element, "role") === "dialog"), false);
  assert.equal(rendered.filter(element => tag(element) === "button").length, 3, "only attachment, microphone and the supplied text Send action render");
  assert.doesNotMatch(visibleText(rendered[0]), /record|microphone|preview/i);
});

test("actual rendering preserves attachment and text slots and honors the capture-disabled state", () => {
  const rendered = renderedComposer(true);
  assert.equal(rendered.filter(element => literalAttribute(element, "aria-label") === "Add attachment").length, 1);
  const textareas = rendered.filter(element => tag(element) === "textarea");
  assert.equal(textareas.length, 1);
  assert.equal(visibleText(textareas[0]), "Keep this text draft");
  assert.equal(rendered.filter(element => literalAttribute(element, "aria-label") === "Send message").length, 1);
  const mic = rendered.find(element => literalAttribute(element, "aria-label") === "Record voice note")!;
  assert.ok(attribute(mic, "disabled"));
});

test("rendering the production composer never accesses browser capture or audio APIs", () => {
  const globals = ["navigator", "window", "MediaRecorder", "AudioContext", "webkitAudioContext"];
  const descriptors = new Map(globals.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const accesses: string[] = [];
  try {
    for (const name of globals) Object.defineProperty(globalThis, name, {
      configurable: true,
      get: () => { accesses.push(name); throw new Error(`Unexpected browser access during render: ${name}`); },
    });
    assert.doesNotThrow(() => renderedComposer());
    assert.deepEqual(accesses, []);
  } finally {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});

const messagesSource = parse(readFileSync(resolve(process.cwd(), "app/messages/messages-view.tsx"), "utf8"));
test("the production voice composer is inside the real message form, never a dialog", () => {
  const composers = elements(messagesSource).filter(element => tag(element) === "VoiceNoteComposer");
  assert.equal(composers.length, 1);
  const composer = composers[0];
  const parents = ancestors(composer);
  const form = parents.find(element => tag(element) === "form");
  assert.ok(form);
  assert.equal(expressionAttribute(form, "onSubmit")?.getText(), "sendMessage");
  assert.equal(parents.some(element => /^Dialog/.test(tag(element))), false);
  assert.equal(expressionAttribute(composer, "key")?.getText(), "currentVoiceKey");
  assert.ok(attribute(composer, "attachment"));
  assert.equal(elements(composer).filter(element => tag(element) === "textarea").length, 1);
});

test("sent voice players receive real duration and direction with a voice-only preferred bubble width", () => {
  const players = elements(messagesSource).filter(element => tag(element) === "VoiceNotePlayer");
  assert.equal(players.length, 1);
  const player = players[0];
  assert.equal(expressionAttribute(player, "src")?.getText(), "message.attachmentUrl");
  assert.equal(expressionAttribute(player, "durationMs")?.getText(), "message.voice_duration_ms");
  assert.equal(expressionAttribute(player, "outgoing")?.getText(), "mine");
  const wrapper = ancestors(player).find(element => tag(element) === "div");
  assert.ok(wrapper);
  const className = expressionAttribute(wrapper, "className");
  assert.ok(className && ts.isTemplateExpression(className));
  const preferredWidth = descendants(className, ts.isConditionalExpression).find(node =>
    ts.isStringLiteral(node.whenTrue) && node.whenTrue.text === "w-72");
  assert.ok(preferredWidth, "custom controls need a preferred width inside the shrink-to-fit message wrapper");
  assert.equal(preferredWidth.condition.getText(), 'message.message_type === "voice"');
  assert.ok(ts.isStringLiteral(preferredWidth.whenFalse) && preferredWidth.whenFalse.text === "", "ordinary messages retain their natural width");
  assert.match(className.head.text, /max-w-\[min\(82%,42rem\)\]/, "the preferred voice width remains capped by the conversation");
});
