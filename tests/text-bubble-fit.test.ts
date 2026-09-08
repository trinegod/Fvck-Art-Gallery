import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Inspect the actual content container, not a second version of the layout.
// The browser regression separately measures short text against its padding.
const source = ts.createSourceFile("messages-view.tsx", readFileSync("app/messages/messages-view.tsx", "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
let container: ts.JsxOpeningElement | undefined;
function visit(node: ts.Node) {
  if (ts.isJsxOpeningElement(node) && node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "data-message-content")) container = node;
  ts.forEachChild(node, visit);
}
visit(source);
function classes(message_type: string, mine: boolean, removed_at: string | null = null): string {
  assert.ok(container);
  const attribute = container.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "className") as ts.JsxAttribute | undefined;
  assert.ok(attribute?.initializer && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression, "Content must size independently of timestamp, actions and sender metadata");
  return new Function("message", "mine", `return (${attribute.initializer.expression.getText(source)});`)({ message_type, removed_at }, mine);
}

test("short incoming/outgoing text fits its own contents independently of wider metadata", () => {
  for (const mine of [true, false]) {
    assert.match(classes("text", mine), /\bw-fit\b/);
    assert.match(classes("text", mine), /\bmax-w-full\b/, "long text must still wrap at the available message width");
  }
  assert.match(classes("text", true), /\bml-auto\b/);
  assert.doesNotMatch(classes("text", false), /\bml-auto\b/);
});

test("voice and visual attachments retain their deliberate playback/card widths", () => {
  for (const kind of ["voice", "image", "video", "artwork"]) assert.doesNotMatch(classes(kind, true), /\bw-fit\b/);
  assert.match(classes("voice", true, "2026-09-08T00:00:00Z"), /\bw-fit\b/, "a removed attachment is now only a compact tombstone");
});
