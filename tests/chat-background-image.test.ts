import assert from "node:assert/strict";
import test from "node:test";
import { backgroundDimensions, MAX_BACKGROUND_DATA_LENGTH, MAX_BACKGROUND_FILE_BYTES, parseBackgroundData, prepareChatBackground, validateBackgroundFile } from "../lib/chat-background-image";
import { chatAppearanceKey, DEFAULT_CHAT_APPEARANCE, parseChatAppearance } from "../lib/chat-appearance";
import { createChatAppearanceStore } from "../lib/chat-appearance-store";

const jpeg = "data:image/jpeg;base64,/9j/2Q==";

type ImageRuntime = {
  canvases: Array<{ height: number; width: number }>;
  drawCalls: Array<{ height: number; width: number }>;
  fillCalls: Array<{ height: number; width: number }>;
  images: Array<{ onerror: (() => void) | null; onload: (() => void) | null; srcHistory: string[] }>;
  qualities: number[];
  revoked: string[];
  sources: string[];
};

function replaceProperty(target: object, name: PropertyKey, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, { configurable: true, value, writable: true });
  return () => {
    if (descriptor) Object.defineProperty(target, name, descriptor);
    else delete (target as Record<PropertyKey, unknown>)[name];
  };
}

async function withImageRuntime(
  options: { autoLoad?: boolean; encode?: (quality: number) => string; height?: number; width?: number },
  run: (runtime: ImageRuntime) => Promise<void>,
) {
  const runtime: ImageRuntime = {
    canvases: [], drawCalls: [], fillCalls: [], images: [], qualities: [], revoked: [], sources: [],
  };

  class FakeImage {
    naturalHeight = options.height ?? 3000;
    naturalWidth = options.width ?? 4000;
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;
    srcHistory: string[] = [];

    constructor() {
      runtime.images.push(this);
    }

    set src(value: string) {
      this.srcHistory.push(value);
      if (value && options.autoLoad !== false) queueMicrotask(() => this.onload?.());
    }
  }

  const restoreImage = replaceProperty(globalThis, "Image", FakeImage);
  const restoreDocument = replaceProperty(globalThis, "document", {
    createElement(name: string) {
      assert.equal(name, "canvas");
      const canvas = {
        height: 0,
        width: 0,
        getContext(kind: string) {
          assert.equal(kind, "2d");
          return {
            drawImage: (_photo: unknown, _x: number, _y: number, width: number, height: number) => {
              runtime.drawCalls.push({ width, height });
            },
            fillRect: (_x: number, _y: number, width: number, height: number) => {
              runtime.fillCalls.push({ width, height });
            },
            fillStyle: "",
          };
        },
        toDataURL: (type: string, quality: number) => {
          assert.equal(type, "image/jpeg");
          runtime.canvases.push({ width: canvas.width, height: canvas.height });
          runtime.qualities.push(quality);
          return options.encode?.(quality) ?? jpeg;
        },
      };
      return canvas;
    },
  });
  const restoreCreateUrl = replaceProperty(URL, "createObjectURL", (file: File) => {
    const source = `blob:mock/${file.size}`;
    runtime.sources.push(source);
    return source;
  });
  const restoreRevokeUrl = replaceProperty(URL, "revokeObjectURL", (source: string) => {
    runtime.revoked.push(source);
  });

  try {
    await run(runtime);
  } finally {
    restoreRevokeUrl();
    restoreCreateUrl();
    restoreDocument();
    restoreImage();
  }
}

test("device backgrounds accept only bounded raster files", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.doesNotThrow(() => validateBackgroundFile({ type, size: 1024 }));
  }
  for (const type of ["image/svg+xml", "image/gif", "image/heic", "text/html", ""]) {
    assert.throws(() => validateBackgroundFile({ type, size: 1024 }), /JPEG, PNG, or WebP/);
  }
  for (const size of [0, -1, NaN, Infinity, MAX_BACKGROUND_FILE_BYTES + 1]) {
    assert.throws(() => validateBackgroundFile({ type: "image/jpeg", size }), /8 MB/);
  }
});

test("stored image data rejects external URLs, SVG, CSS injection, corrupt types and oversize payloads", () => {
  assert.equal(parseBackgroundData(jpeg), jpeg);
  for (const value of [null, {}, "https://example.com/private.jpg?token=secret", "blob:local-photo", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/jpeg;base64,html", `${jpeg}\");url(https://example.com)`, jpeg + "A".repeat(MAX_BACKGROUND_DATA_LENGTH)]) {
    assert.equal(parseBackgroundData(value), null);
  }
});

test("background resizing preserves proportions, avoids upscaling, and rejects unsafe dimensions", () => {
  assert.deepEqual(backgroundDimensions(4000, 3000), { width: 1280, height: 960 });
  assert.deepEqual(backgroundDimensions(100, 200), { width: 100, height: 200 });
  assert.deepEqual(backgroundDimensions(1, 2000), { width: 1, height: 1280 });
  for (const [width, height] of [[0, 10], [1.5, 10], [Infinity, 10], [9000, 9000], [20001, 1]]) {
    assert.throws(() => backgroundDimensions(width, height));
  }
});

test("appearance migration preserves existing settings and normalizes the active background source", () => {
  const old = parseChatAppearance(JSON.stringify({ palette: "orchid", artworkId: "art-1", dim: 40, hidden: true }));
  assert.equal(old.customBackground, null);
  assert.equal(old.artworkId, "art-1");
  const device = parseChatAppearance(JSON.stringify({ ...old, customBackground: jpeg }));
  assert.equal(device.customBackground, jpeg);
  assert.equal(device.artworkId, null);
  assert.deepEqual(parseChatAppearance(" ".repeat(MAX_BACKGROUND_DATA_LENGTH + 1025)), DEFAULT_CHAT_APPEARANCE);
});

test("a local photo persists per viewer/conversation, hides without deleting, and resets completely", () => {
  const values = new Map<string, string>();
  const adapter = { getStorage: () => ({ getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } }), addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
  const store = createChatAppearanceStore(adapter);
  const key = chatAppearanceKey("viewer", "chat");
  store.updateAppearance(key, { customBackground: jpeg });
  const reloaded = createChatAppearanceStore(adapter);
  assert.equal(parseChatAppearance(reloaded.getSnapshot(key)).customBackground, jpeg);
  assert.equal(parseChatAppearance(reloaded.getSnapshot(chatAppearanceKey("someone-else", "chat"))).customBackground, null);
  assert.equal(parseChatAppearance(reloaded.getSnapshot(chatAppearanceKey("viewer", "other-chat"))).customBackground, null);
  reloaded.updateAppearance(key, { hidden: true });
  assert.equal(parseChatAppearance(reloaded.getSnapshot(key)).customBackground, jpeg);
  reloaded.updateAppearance(key, { artworkId: "art-2", customBackground: null });
  assert.equal(parseChatAppearance(reloaded.getSnapshot(key)).artworkId, "art-2");
  reloaded.updateAppearance(key, { customBackground: jpeg });
  reloaded.updateAppearance(key, DEFAULT_CHAT_APPEARANCE);
  assert.deepEqual(parseChatAppearance(reloaded.getSnapshot(key)), DEFAULT_CHAT_APPEARANCE);
});

test("storage quota failures preserve a temporary photo without reporting it saved", () => {
  const store = createChatAppearanceStore({ getStorage: () => ({ getItem: () => null, setItem: () => { throw new Error("Quota exceeded"); } }), addEventListener() {}, removeEventListener() {}, dispatchEvent() {} });
  const key = chatAppearanceKey("viewer", "chat");
  assert.equal(store.updateAppearance(key, { customBackground: jpeg }), false);
  assert.equal(store.getTemporarySnapshot(key), true);
  assert.equal(parseChatAppearance(store.getSnapshot(key)).customBackground, jpeg);
});

test("an already cancelled file selection exits before accessing browser image APIs", async () => {
  const request = new AbortController();
  request.abort();
  await assert.rejects(prepareChatBackground(new File(["image"], "image.jpg", { type: "image/jpeg" }), request.signal), { name: "AbortError" });
});

test("local background decoding re-encodes JPEG pixels and releases its temporary object URL", async () => {
  await withImageRuntime({}, async (runtime) => {
    const request = new AbortController();
    const prepared = await prepareChatBackground(
      new File(["source pixels"], "untrusted-original-name.png", { type: "image/png" }),
      request.signal,
    );

    assert.equal(prepared, jpeg);
    assert.deepEqual(runtime.sources, ["blob:mock/13"]);
    assert.deepEqual(runtime.revoked, runtime.sources);
    assert.deepEqual(runtime.canvases, [{ width: 1280, height: 960 }]);
    assert.deepEqual(runtime.drawCalls, [{ width: 1280, height: 960 }]);
    assert.deepEqual(runtime.fillCalls, [{ width: 1280, height: 960 }]);
    assert.deepEqual(runtime.qualities, [0.82]);
    assert.deepEqual(runtime.images[0]?.srcHistory, ["blob:mock/13", ""]);
  });
});

test("background encoding retries lower quality and dimensions before accepting a bounded JPEG", async () => {
  const oversizedJpeg = `data:image/jpeg;base64,/9j/${"A".repeat(MAX_BACKGROUND_DATA_LENGTH)}`;
  let attempts = 0;
  await withImageRuntime({
    encode: () => {
      attempts += 1;
      return attempts < 4 ? oversizedJpeg : jpeg;
    },
  }, async (runtime) => {
    const prepared = await prepareChatBackground(
      new File(["image"], "photo.jpeg", { type: "image/jpeg" }),
      new AbortController().signal,
    );

    assert.equal(prepared, jpeg);
    assert.deepEqual(runtime.qualities, [0.82, 0.65, 0.5, 0.82]);
    assert.deepEqual(runtime.canvases, [
      { width: 1280, height: 960 },
      { width: 1280, height: 960 },
      { width: 1280, height: 960 },
      { width: 960, height: 720 },
    ]);
    assert.deepEqual(runtime.revoked, runtime.sources);
  });
});

test("aborting while an image decode is pending clears the image and revokes its object URL once", async () => {
  await withImageRuntime({ autoLoad: false }, async (runtime) => {
    const request = new AbortController();
    const pending = prepareChatBackground(
      new File(["image"], "photo.webp", { type: "image/webp" }),
      request.signal,
    );

    assert.deepEqual(runtime.images[0]?.srcHistory, ["blob:mock/5"]);
    request.abort();
    await assert.rejects(pending, { name: "AbortError" });
    assert.deepEqual(runtime.images[0]?.srcHistory, ["blob:mock/5", "", ""]);
    assert.deepEqual(runtime.revoked, runtime.sources);
    assert.equal(runtime.revoked.length, 1);
  });
});
