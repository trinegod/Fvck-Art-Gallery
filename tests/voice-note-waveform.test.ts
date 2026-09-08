import assert from "node:assert/strict";
import test from "node:test";
import { canAutoLoadVoiceNoteWaveform, createVoiceNoteWaveformLoader, voiceNotePlaybackDurationHint } from "../lib/voice-note-waveform";
import { createVoiceNotePlayback } from "../lib/voice-note-playback";

function decoded(channels: number[][], duration = 4) {
  return {
    duration,
    length: channels[0].length,
    numberOfChannels: channels.length,
    getChannelData: (channel: number) => Float32Array.from(channels[channel]),
  };
}

test("the loaded waveform is a real RMS envelope and silent audio stays flat", async () => {
  const loader = createVoiceNoteWaveformLoader({
    fetch: async () => new Response(new Uint8Array([1, 2, 3])),
    decode: async () => decoded([[0, 0.25, -0.5, 1], [0, -0.25, 0.5, -1]]),
  });
  const result = await loader.load("blob:voice-note", new AbortController().signal);
  assert.deepEqual(result, { bars: [0, 0.25, 0.5, 1], duration: 4 });
  const silent = createVoiceNoteWaveformLoader({
    fetch: async () => new Response(new Uint8Array([1])),
    decode: async () => decoded([[0, 0, 0, 0]]),
  });
  assert.deepEqual((await silent.load("blob:silence", new AbortController().signal))?.bars, [0, 0, 0, 0]);
});

test("oversize headers and streamed bodies stop before decoding, while network failures safely fall back", async () => {
  for (const response of [
    new Response(new Uint8Array([1]), { headers: { "content-length": String(4 * 1024 * 1024 + 1) } }),
    new Response(new Uint8Array(4 * 1024 * 1024 + 1)),
    new Response("expired", { status: 403 }),
  ]) {
    let decodes = 0;
    const loader = createVoiceNoteWaveformLoader({
      fetch: async () => response,
      decode: async () => { decodes += 1; return decoded([[1]]); },
    });
    assert.equal(await loader.load("blob:note", new AbortController().signal), null);
    assert.equal(decodes, 0);
  }
  const unavailable = createVoiceNoteWaveformLoader({
    fetch: async () => { throw new Error("CORS unavailable"); },
    decode: async () => decoded([[1]]),
  });
  assert.equal(await unavailable.load("blob:note", new AbortController().signal), null);
});

test("five-minute container rounding is accepted but invalid, longer, or oversized decoded audio is rejected", async () => {
  for (const duration of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 301.01]) {
    const loader = createVoiceNoteWaveformLoader({ fetch: async () => new Response(new Uint8Array([1])), decode: async () => decoded([[1]], duration) });
    assert.equal(await loader.load("blob:note", new AbortController().signal), null);
  }
  const rounded = createVoiceNoteWaveformLoader({ fetch: async () => new Response(new Uint8Array([1])), decode: async () => decoded([[0.01]], 300.04) });
  const result = await rounded.load("blob:note", new AbortController().signal);
  assert.equal(result?.duration, 300.04);
  assert.ok(result && result.bars[0] < 0.011, "quiet audio must not be normalized to full scale");
  const huge = createVoiceNoteWaveformLoader({
    fetch: async () => new Response(new Uint8Array([1])),
    decode: async () => ({ ...decoded([[1]]), length: 8_000 * 301 + 1 }),
  });
  assert.equal(await huge.load("blob:note", new AbortController().signal), null);
});

test("Stop then Send waits for the cancelled preview decode and builds the sent waveform without overlap", async () => {
  let finish!: (value: ReturnType<typeof decoded>) => void;
  let started!: () => void;
  const firstStarted = new Promise<void>((resolve) => { started = resolve; });
  let decodes = 0;
  let nativeActive = 0;
  let maxNativeActive = 0;
  const loader = createVoiceNoteWaveformLoader({
    fetch: async () => new Response(new Uint8Array([1])),
    decode: async () => {
      decodes += 1;
      nativeActive += 1;
      maxNativeActive = Math.max(maxNativeActive, nativeActive);
      if (decodes === 1) {
        started();
        return new Promise<ReturnType<typeof decoded>>((resolve) => { finish = resolve; }).finally(() => { nativeActive -= 1; });
      }
      nativeActive -= 1;
      return decoded([[0.25]]);
    },
  });
  const oldSource = new AbortController();
  const oldResult = loader.load("blob:old", oldSource.signal);
  await firstStarted;
  oldSource.abort();
  assert.equal(await oldResult, null);
  const sentResult = loader.load("blob:sent-note", new AbortController().signal);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(decodes, 1);
  finish(decoded([[1]]));
  assert.deepEqual((await sentResult)?.bars, [0.25]);
  assert.equal(decodes, 2);
  assert.equal(maxNativeActive, 1);
});

test("a stuck decode times out without blocking callers or starting more native decodes", { timeout: 1_000 }, async () => {
  let decodes = 0;
  let finish!: (value: ReturnType<typeof decoded>) => void;
  const loader = createVoiceNoteWaveformLoader({
    fetch: async () => new Response(new Uint8Array([1])),
    decode: () => {
      decodes += 1;
      return decodes === 1 ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve(decoded([[0.5]]));
    },
    timeoutMs: 20,
  });
  assert.equal(await loader.load("blob:stuck", new AbortController().signal), null);
  let fallbackFinished = false;
  const next = loader.load("blob:next", new AbortController().signal).then((result) => { fallbackFinished = true; return result; });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(fallbackFinished, true, "a known hung native decode must not cost every queued note another deadline");
  assert.equal(await next, null);
  assert.equal(decodes, 1);
  finish(decoded([[1]]));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual((await loader.load("blob:after-late-completion", new AbortController().signal))?.bars, [0.5]);
  assert.equal(decodes, 2);
});

test("leaving a sent note while it waits for the preview decode skips its later fetch", async () => {
  const fetched: string[] = [];
  let finish!: (value: ReturnType<typeof decoded>) => void;
  let started!: () => void;
  const began = new Promise<void>((resolve) => { started = resolve; });
  const loader = createVoiceNoteWaveformLoader({
    fetch: async (src) => { fetched.push(src); return new Response(new Uint8Array([1])); },
    decode: () => { started(); return new Promise((resolve) => { finish = resolve; }); },
  });
  const previewScope = new AbortController();
  const preview = loader.load("blob:preview", previewScope.signal);
  await began;
  previewScope.abort();
  assert.equal(await preview, null);
  const sentScope = new AbortController();
  const sent = loader.load("blob:sent", sentScope.signal);
  await new Promise<void>((resolve) => setImmediate(resolve));
  sentScope.abort();
  assert.equal(await sent, null);
  finish(decoded([[1]]));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(fetched, ["blob:preview"]);
});

test("the browser adapter creates only a small offline 8kHz context and never an audio output", async () => {
  const original = globalThis.OfflineAudioContext;
  const argumentsSeen: number[][] = [];
  class OfflineDecoder {
    constructor(...args: number[]) { argumentsSeen.push(args); }
    async decodeAudioData(bytes: ArrayBuffer) {
      assert.equal(bytes.byteLength, 3);
      return decoded([[0, 0.5]]);
    }
  }
  globalThis.OfflineAudioContext = OfflineDecoder as unknown as typeof OfflineAudioContext;
  try {
    const loader = createVoiceNoteWaveformLoader({ fetch: async () => new Response(new Uint8Array([1, 2, 3])) });
    assert.deepEqual(argumentsSeen, [], "creating the loader must not allocate an audio context");
    assert.deepEqual((await loader.load("blob:note", new AbortController().signal))?.bars, [0, 0.5]);
    assert.deepEqual(argumentsSeen, [[1, 1, 8_000]]);
  } finally {
    globalThis.OfflineAudioContext = original;
  }
});

test("unsupported offline decoding avoids downloading the note at all", async () => {
  const original = globalThis.OfflineAudioContext;
  globalThis.OfflineAudioContext = undefined as unknown as typeof OfflineAudioContext;
  let fetches = 0;
  try {
    const loader = createVoiceNoteWaveformLoader({ fetch: async () => { fetches += 1; return new Response(new Uint8Array([1])); } });
    assert.equal(await loader.load("blob:note", new AbortController().signal), null);
    assert.equal(fetches, 0);
  } finally {
    globalThis.OfflineAudioContext = original;
  }
});

test("queued notes decode one at a time and aborting a queued note skips its fetch", async () => {
  const fetched: string[] = [];
  let finish!: (value: ReturnType<typeof decoded>) => void;
  let started!: () => void;
  const began = new Promise<void>((resolve) => { started = resolve; });
  let decodeCount = 0;
  const loader = createVoiceNoteWaveformLoader({
    fetch: async (src) => { fetched.push(src); return new Response(new Uint8Array([1])); },
    decode: () => {
      decodeCount += 1;
      if (decodeCount === 1) { started(); return new Promise((resolve) => { finish = resolve; }); }
      return Promise.resolve(decoded([[0.5]]));
    },
  });
  const first = loader.load("blob:first", new AbortController().signal);
  await began;
  const cancelled = new AbortController();
  const second = loader.load("blob:cancelled", cancelled.signal);
  const third = loader.load("blob:third", new AbortController().signal);
  cancelled.abort();
  assert.equal(await second, null);
  assert.deepEqual(fetched, ["blob:first"]);
  finish(decoded([[1]]));
  assert.deepEqual((await first)?.bars, [1]);
  assert.deepEqual((await third)?.bars, [0.5]);
  assert.deepEqual(fetched, ["blob:first", "blob:third"]);
});

test("a stalled response stream is cancelled at the deadline and the next note can load", { timeout: 1_000 }, async () => {
  let cancelled = false;
  let fetches = 0;
  const loader = createVoiceNoteWaveformLoader({
    fetch: async () => {
      fetches += 1;
      return fetches === 1
        ? new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1])); }, cancel() { cancelled = true; } }))
        : new Response(new Uint8Array([1]));
    },
    decode: async () => decoded([[0.5]]),
    timeoutMs: 20,
  });
  assert.equal(await loader.load("blob:stalled", new AbortController().signal), null);
  assert.equal(cancelled, true);
  assert.deepEqual((await loader.load("blob:next", new AbortController().signal))?.bars, [0.5]);
});

test("incoming unknown-duration notes cannot auto-decode using claimed metadata, but native duration or own bounded recordings can", () => {
  const incoming = { src: "https://storage.example/authorized-note", outgoing: false, durationMs: 30_000, nativeDuration: Number.POSITIVE_INFINITY };
  assert.equal(canAutoLoadVoiceNoteWaveform(incoming), false);
  assert.equal(canAutoLoadVoiceNoteWaveform({ ...incoming, nativeDuration: Number.NaN }), false);
  assert.equal(canAutoLoadVoiceNoteWaveform({ ...incoming, nativeDuration: 0 }), false);
  assert.equal(canAutoLoadVoiceNoteWaveform({ ...incoming, nativeDuration: 30 }), true);
  assert.equal(canAutoLoadVoiceNoteWaveform({ ...incoming, nativeDuration: 300.04 }), true);
  assert.equal(canAutoLoadVoiceNoteWaveform({ ...incoming, nativeDuration: 301.01 }), false);
  assert.equal(canAutoLoadVoiceNoteWaveform({ ...incoming, outgoing: true }), true);
  assert.equal(canAutoLoadVoiceNoteWaveform({ ...incoming, outgoing: true, durationMs: 300_000 }), true);
  assert.equal(canAutoLoadVoiceNoteWaveform({ ...incoming, outgoing: true, durationMs: 300_001 }), false);
  assert.equal(canAutoLoadVoiceNoteWaveform({ ...incoming, outgoing: true, durationMs: null }), false);
  assert.equal(canAutoLoadVoiceNoteWaveform({ ...incoming, src: "blob:local-preview" }), true);
  assert.equal(canAutoLoadVoiceNoteWaveform({ ...incoming, src: "blob:local-preview", durationMs: 0 }), false);
});

test("decoded actual duration replaces a shorter saved hint so the entire waveform remains seekable", async () => {
  const loader = createVoiceNoteWaveformLoader({
    fetch: async () => new Response(new Uint8Array([1])),
    decode: async () => decoded([[0.25, 0.5]], 60),
  });
  const audio = Object.assign(new EventTarget(), {
    duration: Number.POSITIVE_INFINITY, currentTime: 0, paused: true, readyState: 1,
    play: async () => undefined, pause: () => undefined, load: () => undefined,
  });
  const playback = createVoiceNotePlayback(audio, { durationMs: 30_000 });
  assert.equal(playback.getState().duration, 30);
  const waveform = await loader.load("blob:actual-sixty-seconds", new AbortController().signal);
  playback.setDurationHint(voiceNotePlaybackDurationHint(30_000, waveform));
  assert.equal(playback.getState().duration, 60);
  assert.equal(playback.seek(45), true);
  assert.equal(audio.currentTime, 45);
  assert.equal(voiceNotePlaybackDurationHint(30_000, null), 30_000);
  assert.equal(voiceNotePlaybackDurationHint(Number.NaN, null), null);
  playback.dispose();
});
