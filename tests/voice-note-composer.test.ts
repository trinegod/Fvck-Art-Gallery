import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { createElement, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import postcss from "postcss";
import { MAX_VOICE_NOTE_DURATION_MS } from "../lib/voice-note-upload";

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
  assert.equal(elements(composer).filter(element => tag(element) === "GroupMessageInput").length, 1, "the tested message field remains inside the real voice composer");
});

test("sent voice players receive real duration and direction with a voice-only preferred bubble width", () => {
  const players = elements(messagesSource).filter(element => tag(element) === "VoiceNotePlayer");
  assert.equal(players.length, 1);
  const player = players[0];
  assert.equal(expressionAttribute(player, "src")?.getText(), "message.attachmentUrl");
  assert.equal(expressionAttribute(player, "durationMs")?.getText(), "message.voice_duration_ms");
  assert.equal(expressionAttribute(player, "outgoing")?.getText(), "mine");
  const wrapper = ancestors(player).find(element => {
    if (tag(element) !== "div") return false;
    const classes = expressionAttribute(element, "className");
    return classes && ts.isTemplateExpression(classes) && descendants(classes, ts.isConditionalExpression).some(node =>
      ts.isStringLiteral(node.whenTrue) && node.whenTrue.text === "w-72");
  });
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

test("the recording cluster is bounded and its real sample columns fill the available trace width", () => {
  // Static regression for the browser-reproduced 1398px row with only 138px of
  // signal in a 1138px trace. This checks the real CSS/JSX contract, not geometry;
  // browser measurements separately verify narrow widths and enlarged text.
  const source = parse(readFileSync(resolve(process.cwd(), "app/messages/voice-note-composer.tsx"), "utf8"));
  const css = postcss.parse(readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8"));
  const declarations = (selector: string) => {
    const values = new Map<string, string>();
    css.walkRules(selector, rule => { rule.walkDecls(declaration => { values.set(declaration.prop, declaration.value); }); });
    return values;
  };
  const row = elements(source).find(element => literalAttribute(element, "className")?.split(/\s+/).includes("nodeine-voice-row"));
  assert.ok(row);
  const rowStyles = declarations(".nodeine-voice-row");
  assert.equal(rowStyles.get("max-width"), "500px", "desktop recording must not stretch across the conversation");
  assert.equal(rowStyles.get("width"), "100%", "small conversations keep their available width");
  const trace = elements(row).find(element => attribute(element, "data-live-waveform"));
  assert.ok(trace);
  assert.ok(literalAttribute(trace, "className")?.split(/\s+/).includes("nodeine-live-waveform"));
  const traceStyles = declarations(".nodeine-live-waveform");
  assert.equal(traceStyles.get("display"), "grid");
  assert.equal(traceStyles.get("grid-template-columns"), "repeat(28, minmax(0, 1fr))");
  assert.equal(traceStyles.get("column-gap"), "min(2px, 2%)", "gaps must shrink with the trace instead of exceeding a narrow available width");
  const sample = elements(trace).find(element => tag(element) === "span");
  assert.ok(sample);
  assert.doesNotMatch(literalAttribute(sample, "className") ?? "", /(?:^|\s)(?:min-)?w-\[/, "fixed sample widths recreate the cropped/mostly empty trace");
});

test("recording instructions follow the shared duration ceiling rather than hard-coded one-minute copy", () => {
  const rendered = renderedComposer();
  const mic = rendered.find(element => literalAttribute(element, "aria-label") === "Record voice note")!;
  const minutes = MAX_VOICE_NOTE_DURATION_MS / 60_000;
  const limitLabel = `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  assert.equal(literalAttribute(mic, "title"), `Record voice note (up to ${limitLabel} or 4 MiB)`);
  const instructions = rendered.filter(element => ts.isJsxElement(element) && literalAttribute(element, "class") === "sr-only")
    .flatMap(element => ts.isJsxElement(element) ? element.children.filter(ts.isJsxText).map(child => child.text) : []).join(" ");
  assert.ok(instructions.includes(`Up to ${limitLabel} or 4 MiB.`), "screen-reader instructions report the same duration and file ceiling");
  const source = readFileSync(resolve(process.cwd(), "app/messages/voice-note-composer.tsx"), "utf8");
  assert.equal(/\b1 minute\b|\/ 1:00/.test(source), false, "timer, accessible text and tooltip must all follow the shared limit");
});

test("enlarged text gives the live waveform its own readable line without wrapping ordinary phone text", () => {
  // Browser baseline: 320px viewport, 32px root text, 238px cluster left only
  // 17.82px for all 28 bars. This static contract supplements that geometry loop.
  const css = postcss.parse(readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8"));
  let narrow: postcss.AtRule | undefined;
  css.walkAtRules("container", rule => { if (rule.params.replace(/\s+/g, "") === "(width<12rem)") narrow = rule; });
  assert.ok(narrow, "a text-relative narrow threshold must protect the live trace from the enlarged timer");
  const narrowRule = narrow;
  const values = (selector: string) => {
    const declarations = new Map<string, string>();
    narrowRule.walkRules(selector, rule => { rule.walkDecls(declaration => { declarations.set(declaration.prop, declaration.value); }); });
    return declarations;
  };
  const content = values(".nodeine-voice-content:has([data-live-waveform])");
  assert.equal(content.get("flex-wrap"), "wrap", "only the active recording content should wrap, not the preview player");
  assert.equal(content.get("padding-block"), "8px");
  const trace = values(".nodeine-live-waveform");
  assert.equal(trace.get("flex-basis"), "100%", "the trace gets the complete recording content width");
  assert.equal(trace.get("height"), "28px", "the existing 28px signal scale stays visible without excessive vertical space");
  assert.ok(238 < 12 * 32, "the observed 200% text case enters this rule");
  assert.ok(278 >= 12 * 16, "ordinary 320px-phone text retains its existing one-line content");
});
