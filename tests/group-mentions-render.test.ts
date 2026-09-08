import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { groupMentionSuggestions } from "../lib/group-mentions";

const requireFromTest = createRequire(import.meta.url);
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true };
function loadProduction(modulePath: string): Record<string, unknown> {
  const exact = existsSync(modulePath) ? modulePath : [".tsx", ".ts"].map(extension => modulePath + extension).find(existsSync);
  assert.ok(exact);
  const exported = { exports: {} as Record<string, unknown> };
  const localRequire = (specifier: string): unknown => {
    if (specifier.startsWith("@/")) return loadProduction(resolve(process.cwd(), specifier.slice(2)));
    if (specifier.startsWith(".")) return loadProduction(resolve(dirname(exact), specifier));
    return requireFromTest(specifier);
  };
  new Function("require", "module", "exports", ts.transpileModule(readFileSync(exact, "utf8"), { compilerOptions }).outputText)(localRequire, exported, exported.exports);
  return exported.exports;
}
function render(name: string, props: Record<string, unknown>) {
  const View = loadProduction(resolve(process.cwd(), `app/messages/${name}.tsx`)).default as ComponentType<Record<string, unknown>>;
  return renderToStaticMarkup(createElement(View, props));
}
const members = [{ id: "a", username: "ada", display_name: "Ada Example", avatar_url: null }];

test("the real composer preserves its draft,44px field,plain label and native message limit", () => {
  for (const group of [true, false]) {
    const html = render("group-message-input", { value: "Keep <draft> @ada", onChange: () => { throw new Error("Rendering changed the draft"); }, members, group, allowEveryone: false, disabled: false });
    assert.match(html, /<textarea[^>]*maxLength="2000"/);
    assert.match(html, /min-h-11/);
    assert.match(html, /<span class="sr-only">Message<\/span>/);
    assert.match(html, /Keep &lt;draft&gt; @ada/);
    assert.doesNotMatch(html, /role="group"|role="listbox"|role="combobox"/);
    if (group) assert.match(html, /Only owners and admins can use @everyone/);
    else assert.doesNotMatch(html, /@ to mention/);
  }
});

test("real suggestions use reachable44px ordinary buttons in a bounded overlay", () => {
  const html = render("group-mention-suggestions", { id: "synthetic-suggestions", suggestions: groupMentionSuggestions("", members, true), onChoose: () => {}, onDismiss: () => {} });
  assert.match(html, /role="group" aria-label="Mention suggestions"/);
  assert.equal([...html.matchAll(/<button[^>]*type="button"/g)].length, 2);
  assert.equal([...html.matchAll(/class="[^"]*min-h-11[^"]*"/g)].length, 2);
  assert.match(html, /absolute bottom-full left-0 right-0/);
  assert.match(html, /max-h-\[min\(40dvh,16rem\)\]/);
  assert.match(html, /@ada/);
  assert.match(html, /@everyone/);
  assert.doesNotMatch(html, /role="(?:menuitem|option)"/);
});

test("mention highlighting renders only valid current tokens and escapes all other body text", () => {
  const html = render("group-mention-text", { body: "<script>alert(1)</script> @ADA sales+@ada.example @gone @everyone", members, allowEveryone: false });
  assert.doesNotMatch(html, /<script>|<a\b/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.equal([...html.matchAll(/<strong\b/g)].length, 1);
  assert.match(html, />@ADA<\/strong>/);
  assert.match(html, /sales\+@ada\.example @gone @everyone/);
});

test("the actual textarea key handler inserts suggestions before sending and preserves IME/newlines", () => {
  const path = resolve(process.cwd(), "app/messages/group-message-input.tsx");
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  let handler: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "textarea") {
      const attribute = node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(source) === "onKeyDown");
      if (attribute && ts.isJsxAttribute(attribute) && attribute.initializer && ts.isJsxExpression(attribute.initializer)) handler = attribute.initializer.expression;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(handler);
  for (const scenario of [
    { key: "Enter", matches: true, shift: false, composing: false, choose: 1, submit: 0 },
    { key: "Enter", matches: false, shift: false, composing: false, choose: 0, submit: 1 },
    { key: "Enter", matches: true, shift: true, composing: false, choose: 0, submit: 0 },
    { key: "Enter", matches: true, shift: false, composing: true, choose: 0, submit: 0 },
    { key: "Escape", matches: true, shift: false, composing: false, choose: 0, submit: 0 },
  ]) {
    let chosen = 0;
    let submitted = 0;
    let dismissed = 0;
    const exported: { handle?: (event: unknown) => void } = {};
    new Function("suggestions", "choose", "dismiss", "root", "exports", ts.transpileModule(`exports.handle = ${handler.getText(source)};`, { compilerOptions }).outputText)(
      scenario.matches ? [{ username: "ada" }] : [],
      (name: string) => { assert.equal(name, "ada"); chosen++; },
      () => dismissed++, { current: null }, exported,
    );
    exported.handle!({ key: scenario.key, shiftKey: scenario.shift, nativeEvent: { isComposing: scenario.composing }, preventDefault: () => {}, currentTarget: { form: { requestSubmit: () => submitted++ } } });
    assert.equal(chosen, scenario.choose);
    assert.equal(submitted, scenario.submit);
    assert.equal(dismissed, scenario.key === "Escape" ? 1 : 0);
  }
});
