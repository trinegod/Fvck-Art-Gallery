import assert from "node:assert/strict";
import test from "node:test";
import { CHAT_PALETTES, DEFAULT_CHAT_APPEARANCE, chatAppearanceKey, parseChatAppearance } from "../lib/chat-appearance";

test("missing, corrupt, and wrongly shaped browser preferences recover to defaults", () => {
  for (const value of [null, "", "broken", "null", "[]", "true", "42"]) {
    assert.deepEqual(parseChatAppearance(value), DEFAULT_CHAT_APPEARANCE);
  }
});

test("untrusted values cannot select prototype properties, inject a URL, or remove the dimming floor", () => {
  assert.deepEqual(parseChatAppearance(JSON.stringify({ palette: "__proto__", artworkId: "https://example.com/art.png", hidden: "true", dim: -100 })), {
    palette: "glacier", artworkId: null, customBackground: null, hidden: false, dim: 35,
  });
  assert.equal(parseChatAppearance('{"dim":1000}').dim, 85);
  assert.equal(parseChatAppearance('{"dim":"40"}').dim, 60);
});

test("all curated palettes and artwork references round-trip without content or URLs", () => {
  for (const palette of Object.keys(CHAT_PALETTES)) {
    const value = { palette, artworkId: "artwork-123", customBackground: null, hidden: true, dim: 45 };
    assert.deepEqual(parseChatAppearance(JSON.stringify(value)), value);
  }
});

test("appearance keys isolate accounts and conversations including delimiter characters", () => {
  assert.notEqual(chatAppearanceKey("alice", "room"), chatAppearanceKey("bob", "room"));
  assert.notEqual(chatAppearanceKey("alice", "one"), chatAppearanceKey("alice", "two"));
  assert.notEqual(chatAppearanceKey("alice:a", "b"), chatAppearanceKey("alice", "a:b"));
});

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test("opaque message and label pairs exceed the 4.5:1 normal-text contrast target", () => {
  const pairs = [...Object.values(CHAT_PALETTES), { background: "#252d3a", foreground: "#f2f3f8" }, { background: "#202632", foreground: "#c7cfde" }];
  for (const pair of pairs) {
    const values = [luminance(pair.background), luminance(pair.foreground)].sort((a, b) => b - a);
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5);
  }
});
