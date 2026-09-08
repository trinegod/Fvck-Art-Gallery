import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { avatarCropRect, moveAvatarCrop, readAvatarImageDimensions, prepareAvatarImage, createAvatarCropSession } from "../lib/avatar-crop";

test("square avatar crops cover portrait and landscape images and clamp every edge", () => {
  assert.deepEqual(avatarCropRect(1200, 800, { x: 50, y: 50, zoom: 1 }), { x: 200, y: 0, size: 800 });
  assert.deepEqual(avatarCropRect(800, 1200, { x: 0, y: 100, zoom: 2 }), { x: 0, y: 800, size: 400 });
  assert.deepEqual(avatarCropRect(1200, 800, { x: 200, y: -10, zoom: 0 }), { x: 400, y: 0, size: 800 });
  assert.deepEqual(avatarCropRect(100, 100, { x: NaN, y: Infinity, zoom: NaN }), { x: 0, y: 0, size: 100 });
  assert.throws(() => avatarCropRect(0, 100, { x: 50, y: 50, zoom: 1 }));
});

test("dragging moves the photo with the pointer and never exposes empty pixels", () => {
  assert.deepEqual(moveAvatarCrop(1200, 800, { x: 50, y: 50, zoom: 1 }, 50, 80, 200), { x: 0, y: 50, zoom: 1 });
  assert.deepEqual(moveAvatarCrop(800, 1200, { x: 50, y: 50, zoom: 2 }, -200, -200, 200), { x: 100, y: 100, zoom: 2 });
});

function png(width = 1200, height = 800) {
  const bytes = new Uint8Array(45);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width); view.setUint32(20, height);
  bytes.set([73, 69, 78, 68], 37);
  return bytes;
}

test("headers reject oversized or disguised files before native image decoding", () => {
  assert.deepEqual(readAvatarImageDimensions(png(), "image/png"), { width: 1200, height: 800 });
  assert.deepEqual(readAvatarImageDimensions(new Uint8Array([255,216,255,192,0,11,8,3,32,4,176,1,1,17,0,255,217]), "image/jpeg"), { width: 1200, height: 800 });
  for (const bytes of [png(8193, 2), png(6000, 4001)]) assert.throws(() => readAvatarImageDimensions(bytes, "image/png"), /24 megapixels/);
  assert.throws(() => readAvatarImageDimensions(new TextEncoder().encode('<svg width="100"/>'), "image/png"), /JPEG, PNG, or WebP/);
  assert.throws(() => readAvatarImageDimensions(png().slice(0, 22), "image/png"));
  assert.throws(() => readAvatarImageDimensions(png(), "image/gif"));
  assert.throws(() => readAvatarImageDimensions(png(), "image/jpeg"));
});

function webp(chunk: string, payload: number[]) {
  const bytes = new Uint8Array(20 + payload.length + payload.length % 2);
  bytes.set(new TextEncoder().encode("RIFF")); bytes.set(new TextEncoder().encode("WEBP"), 8);
  bytes.set(new TextEncoder().encode(chunk), 12);
  const view = new DataView(bytes.buffer); view.setUint32(4, bytes.length - 8, true); view.setUint32(16, payload.length, true);
  bytes.set(payload, 20);
  return bytes;
}

test("WebP preflight handles lossy and lossless dimensions and rejects animation and unsafe headers", () => {
  assert.deepEqual(readAvatarImageDimensions(webp("VP8 ", [0,0,0,157,1,42,176,4,32,3]), "image/webp"), { width:1200, height:800 });
  // Independently packed VP8L width-1=1199, height-1=799.
  assert.deepEqual(readAvatarImageDimensions(webp("VP8L", [47,175,196,199,0]), "image/webp"), { width:1200, height:800 });
  assert.throws(() => readAvatarImageDimensions(webp("VP8X", [2,0,0,0,175,4,0,31,3,0]), "image/webp"), /still/);
  assert.throws(() => readAvatarImageDimensions(webp("VP8 ", [0,0,0,157,1,42,255,63,255,63]), "image/webp"), /24 megapixels/);
});

const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };
function runtime(t: TestContext, options: { automatic?: boolean; blob?: Blob | null; holdEncoding?: boolean; decodedWidth?: number; decodedHeight?: number } = {}) {
  const urls: string[] = [], revoked: string[] = [], draws: number[][] = [], encoded: { width:number; height:number; type:string; quality?:number }[] = [];
  const images: FakeImage[] = [];
  const encodings: ((blob: Blob | null) => void)[] = [];
  class FakeImage {
    naturalWidth = options.decodedWidth ?? 1200; naturalHeight = options.decodedHeight ?? 800;
    onload: (() => void) | null = null; onerror: (() => void) | null = null;
    value = "";
    constructor() { images.push(this); }
    get src() { return this.value; }
    set src(value: string) { this.value = value; if (value && options.automatic !== false) queueMicrotask(() => this.onload?.()); }
  }
  const makeCanvas = () => {
    const canvas = { width:0, height:0, getContext: () => ({ fillStyle:"", fillRect() {}, drawImage: (_image: unknown, ...numbers: number[]) => draws.push(numbers) }), toBlob: (callback: (blob: Blob | null) => void, type:string, quality?:number) => {
      encoded.push({ width:canvas.width, height:canvas.height, type, quality });
      if (options.holdEncoding) encodings.push(callback); else callback(options.blob === undefined ? new Blob(["encoded-pixels"], { type:"image/jpeg" }) : options.blob);
    } };
    return canvas;
  };
  for (const [object, property, value] of [[globalThis,"Image",FakeImage],[globalThis,"document",{ createElement: () => makeCanvas() }],[URL,"createObjectURL",() => { const url = `blob:avatar/${urls.length}`; urls.push(url); return url; }],[URL,"revokeObjectURL",(url:string) => revoked.push(url)]] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(object, property);
    Object.defineProperty(object, property, { configurable:true, writable:true, value });
    t.after(() => { if (descriptor) Object.defineProperty(object, property, descriptor); else Reflect.deleteProperty(object, property); });
  }
  return { images, urls, revoked, draws, encoded, encodings, makeCanvas };
}

test("local preparation draws the selected square and exports only a bounded new512 JPEG", async t => {
  const browser = runtime(t);
  const controller = new AbortController();
  const image = await prepareAvatarImage(new File([png()], "original-private-name.png", { type:"image/png" }), controller.signal);
  const output = await image.exportFile({ x:100, y:0, zoom:2 }, controller.signal);
  assert.equal(output.type, "image/jpeg"); assert.equal(output.name, "avatar.jpg"); assert.ok(output.size <= 2 * 1024 * 1024);
  assert.deepEqual(browser.draws, [[800,0,400,400,0,0,512,512]]);
  assert.deepEqual(browser.encoded, [{ width:512, height:512, type:"image/jpeg", quality:0.9 }]);
  image.dispose(); image.dispose();
  assert.deepEqual(browser.revoked, browser.urls); assert.equal(browser.images[0].src, "");
});

test("the editor keeps its crop after encoding failure and confirms exactly once after retry", async t => {
  const options: { blob: Blob | null } = { blob:null };
  runtime(t, options);
  const session = createAvatarCropSession(new File([png()], "photo.png", { type:"image/png" }));
  await session.start();
  session.setCrop({ x:83, y:21, zoom:2 });
  const confirmed: File[] = [];
  await session.confirm(file => confirmed.push(file));
  assert.equal(session.getSnapshot().phase, "ready");
  assert.match(session.getSnapshot().error!, /crop is kept/);
  assert.deepEqual(session.getSnapshot().crop, { x:83, y:21, zoom:2 });
  assert.equal(confirmed.length, 0);
  options.blob = new Blob(["pixels"], { type:"image/jpeg" });
  await session.confirm(file => confirmed.push(file));
  await session.confirm(file => confirmed.push(file));
  assert.equal(confirmed.length, 1);
  session.dispose();
});

test("unsupported, oversized, and header-bomb images never reach native decode", async t => {
  const browser = runtime(t);
  const signal = new AbortController().signal;
  for (const file of [new File([png()], "fake.svg", { type:"image/svg+xml" }), new File([new Uint8Array(8 * 1024 * 1024 + 1)], "big.png", { type:"image/png" }), new File([png(8000, 8000)], "bomb.png", { type:"image/png" })]) {
    await assert.rejects(prepareAvatarImage(file, signal));
  }
  assert.deepEqual(browser.urls, []); assert.equal(browser.images.length, 0);
});

test("an aborted decode is detached and revoked, and its late callback cannot return an image", async t => {
  const browser = runtime(t, { automatic:false });
  const controller = new AbortController();
  const pending = prepareAvatarImage(new File([png()], "photo.png", { type:"image/png" }), controller.signal);
  await flush();
  assert.equal(browser.images.length, 1);
  const lateLoad = browser.images[0].onload;
  controller.abort();
  await assert.rejects(pending, { name:"AbortError" });
  lateLoad?.();
  assert.equal(browser.images[0].src, ""); assert.equal(browser.images[0].onload, null);
  assert.deepEqual(browser.revoked, browser.urls);
});

test("cancel or unmount during encoding suppresses confirmation and releases its image", async t => {
  const browser = runtime(t, { holdEncoding:true });
  const session = createAvatarCropSession(new File([png()], "photo.png", { type:"image/png" }));
  await session.start();
  let confirms = 0;
  const pending = session.confirm(() => confirms++);
  assert.equal(session.getSnapshot().phase, "encoding");
  session.dispose();
  browser.encodings[0](new Blob(["late-private-crop"], { type:"image/jpeg" }));
  await pending;
  assert.equal(confirms, 0); assert.deepEqual(browser.revoked, browser.urls);
});

test("effect replay restarts preparation and rejects the former decode without leaking URLs", async t => {
  const browser = runtime(t, { automatic:false });
  const session = createAvatarCropSession(new File([png()], "photo.png", { type:"image/png" }));
  const first = session.start(); await flush();
  const oldLoad = browser.images[0].onload;
  session.dispose();
  const second = session.start(); await flush();
  oldLoad?.(); await first;
  assert.equal(session.getSnapshot().phase, "loading");
  browser.images[1].onload?.(); await second;
  assert.equal(session.getSnapshot().phase, "ready");
  session.dispose(); assert.deepEqual(browser.revoked, browser.urls);
});

test("decoded dimensions are checked again, including browser orientation or unexpected decoder results", async t => {
  const browser = runtime(t, { decodedWidth:9000 });
  await assert.rejects(prepareAvatarImage(new File([png()], "photo.png", { type:"image/png" }), new AbortController().signal), /24 megapixels/);
  assert.deepEqual(browser.revoked, browser.urls);
});

test("subscriber cancellation at confirmation prevents a stale parent callback", async t => {
  const browser = runtime(t);
  const session = createAvatarCropSession(new File([png()], "photo.png", { type:"image/png" }));
  await session.start();
  session.subscribe(() => { if (session.getSnapshot().phase === "confirmed") session.dispose(); });
  await session.confirm(() => assert.fail("Cancelled scope must not confirm"));
  assert.deepEqual(browser.revoked, browser.urls);
});

test("decode timeout releases the source instead of leaving the editor pending forever", async t => {
  t.mock.timers.enable({ apis:["setTimeout"] });
  const browser = runtime(t, { automatic:false });
  const session = createAvatarCropSession(new File([png()], "photo.png", { type:"image/png" }));
  const opening = session.start(); await flush();
  t.mock.timers.tick(15_000); await opening;
  assert.equal(session.getSnapshot().phase, "error");
  assert.match(session.getSnapshot().error!, /timed out/);
  assert.deepEqual(browser.revoked, browser.urls);
  session.dispose();
});

test("encoding timeout preserves crop and rejects duplicate confirmation while pending", async t => {
  t.mock.timers.enable({ apis:["setTimeout"] });
  const browser = runtime(t, { holdEncoding:true });
  const session = createAvatarCropSession(new File([png()], "photo.png", { type:"image/png" }));
  await session.start(); session.setCrop({ x:31, y:88, zoom:2.5 });
  const encoding = session.confirm(() => assert.fail("Timed-out output must not confirm"));
  await session.confirm(() => assert.fail("Duplicate confirmation must be ignored"));
  assert.equal(browser.encodings.length, 1);
  t.mock.timers.tick(10_000); await encoding;
  assert.equal(session.getSnapshot().phase, "ready");
  assert.match(session.getSnapshot().error!, /timed out/);
  assert.deepEqual(session.getSnapshot().crop, { x:31, y:88, zoom:2.5 });
  browser.encodings[0](new Blob(["late"], { type:"image/jpeg" }));
  session.dispose(); assert.deepEqual(browser.revoked, browser.urls);
});

test("parent preview creation failure returns the actual session to ready without losing its crop", async t => {
  runtime(t);
  const session = createAvatarCropSession(new File([png()], "photo.png", { type:"image/png" }));
  await session.start(); session.setCrop({ x:81, y:32, zoom:2.2 });
  await assert.doesNotReject(session.confirm(() => { throw new Error("Preview unavailable"); }));
  assert.equal(session.getSnapshot().phase, "ready");
  assert.deepEqual(session.getSnapshot().crop, { x:81, y:32, zoom:2.2 });
  assert.match(session.getSnapshot().error!, /crop is kept.*try again/i);
  let confirms = 0;
  await session.confirm(() => confirms++);
  assert.equal(confirms, 1); assert.equal(session.getSnapshot().phase, "confirmed");
  session.dispose();
});

test("JPEG metadata does not become output metadata and crop coordinates follow native oriented dimensions", async t => {
  const browser = runtime(t, { decodedWidth:800, decodedHeight:1200 });
  // APP1 is safely skipped. The native decoder is the orientation authority;
  // this adapter models a90-degree orientation, not real-browser EXIF support.
  const source = new Uint8Array([255,216,255,225,0,8,69,120,105,102,0,0,255,192,0,11,8,3,32,4,176,1,1,17,0,255,217]);
  assert.deepEqual(readAvatarImageDimensions(source, "image/jpeg"), { width:1200, height:800 });
  const signal = new AbortController().signal;
  const image = await prepareAvatarImage(new File([source], "private-exif.jpg", { type:"image/jpeg" }), signal);
  assert.equal(image.width, 800); assert.equal(image.height, 1200);
  const output = await image.exportFile({ x:50, y:50, zoom:1 }, signal);
  assert.deepEqual(browser.draws, [[0,200,800,800,0,0,512,512]]);
  assert.equal(await output.text(), "encoded-pixels");
  image.dispose(); assert.deepEqual(browser.revoked, browser.urls);
});
