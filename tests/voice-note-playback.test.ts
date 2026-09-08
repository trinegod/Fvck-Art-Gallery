import assert from "node:assert/strict";
import test from "node:test";
import { connectVoiceNotePlayback, createVoiceNotePlayback, formatVoiceNoteTime } from "../lib/voice-note-playback";

class AudioFixture extends EventTarget {
  duration = 12;
  currentTime = 0;
  paused = true;
  readyState = 0;
  playCalls = 0;
  pauseCalls = 0;
  loadCalls = 0;
  playResult = async () => {
    this.paused = false;
    this.dispatchEvent(new Event("playing"));
  };
  play() { this.playCalls += 1; return this.playResult(); }
  pause() { this.pauseCalls += 1; this.paused = true; this.dispatchEvent(new Event("pause")); }
  load() { this.loadCalls += 1; this.readyState = 0; }
  metadata() { this.readyState = 1; this.dispatchEvent(new Event("loadedmetadata")); }
}

class FrameFixture {
  next = 0;
  callbacks = new Map<number, FrameRequestCallback>();
  request = (callback: FrameRequestCallback) => { this.callbacks.set(++this.next, callback); return this.next; };
  cancel = (id: number) => { this.callbacks.delete(id); };
  tick() { const pending = [...this.callbacks.values()]; this.callbacks.clear(); for (const callback of pending) callback(0); }
}

test("the playback cursor follows actual audio between sparse timeupdate events", async () => {
  const audio = new AudioFixture();
  const frames = new FrameFixture();
  const playback = createVoiceNotePlayback(audio, { frames });
  audio.metadata();
  await playback.toggle();
  for (const seconds of [0.016, 0.032, 0.048]) {
    audio.currentTime = seconds;
    frames.tick(); // No timeupdate event: the visual must not wait for one.
    assert.equal(playback.getState().currentTime, seconds);
    assert.equal(frames.callbacks.size, 1);
  }
  const unchanged = playback.getState().currentTime;
  frames.tick();
  assert.equal(playback.getState().currentTime, unchanged, "never invent progress beyond actual audio");
  await playback.toggle();
  assert.equal(frames.callbacks.size, 0);
  playback.dispose();
});

test("frame updates suspend for buffering and hidden tabs, and clean up on every stop path", async () => {
  for (const stop of ["pause", "ended", "error", "reload", "dispose"] as const) {
    const audio = new AudioFixture();
    const frames = new FrameFixture();
    const visibility = Object.assign(new EventTarget(), { hidden: false });
    const playback = createVoiceNotePlayback(audio, { frames, visibility });
    audio.metadata();
    await playback.toggle();
    assert.equal(frames.callbacks.size, 1);
    audio.dispatchEvent(new Event("waiting"));
    assert.equal(frames.callbacks.size, 0);
    audio.dispatchEvent(new Event("playing"));
    assert.equal(frames.callbacks.size, 1);
    visibility.hidden = true;
    visibility.dispatchEvent(new Event("visibilitychange"));
    assert.equal(frames.callbacks.size, 0);
    audio.currentTime = 6;
    visibility.hidden = false;
    visibility.dispatchEvent(new Event("visibilitychange"));
    assert.equal(playback.getState().currentTime, 6);
    assert.equal(frames.callbacks.size, 1);
    if (stop === "reload" || stop === "dispose") playback[stop]();
    else if (stop === "pause") audio.pause();
    else { audio.paused = true; audio.dispatchEvent(new Event(stop)); }
    assert.equal(frames.callbacks.size, 0, stop);
    playback.dispose();
    visibility.dispatchEvent(new Event("visibilitychange"));
    assert.equal(frames.callbacks.size, 0);
  }
});

test("frame sampling deduplicates frozen clocks and seeking updates immediately", async () => {
  const audio = new AudioFixture();
  const frames = new FrameFixture();
  let changes = 0;
  const playback = createVoiceNotePlayback(audio, { frames, onChange: () => changes++ });
  audio.metadata();
  await playback.toggle();
  const initialChanges = changes;
  for (let i = 0; i < 5; i++) frames.tick();
  assert.equal(changes, initialChanges);
  assert.equal(playback.seek(8.25), true);
  assert.equal(playback.getState().currentTime, 8.25);
  audio.currentTime = 8.266;
  frames.tick();
  assert.equal(playback.getState().currentTime, 8.266);
  playback.dispose();
});

test("playback starts only on request and real media events drive pause, progress and ended state", async () => {
  const audio = new AudioFixture();
  const playback = createVoiceNotePlayback(audio);
  assert.equal(audio.playCalls, 0);
  assert.equal(playback.getState().playing, false);
  audio.metadata();
  assert.equal(playback.getState().duration, 12);
  await playback.toggle();
  assert.equal(audio.playCalls, 1);
  assert.equal(playback.getState().playing, true);
  audio.currentTime = 4;
  audio.dispatchEvent(new Event("timeupdate"));
  assert.equal(playback.getState().currentTime, 4);
  await playback.toggle();
  assert.equal(playback.getState().playing, false);
  await playback.toggle();
  audio.currentTime = 12;
  audio.paused = true;
  audio.dispatchEvent(new Event("ended"));
  assert.equal(playback.getState().playing, false);
  assert.equal(playback.getState().currentTime, 12);
});

test("a rejected play request stays paused and exposes a retryable inline failure", async () => {
  const audio = new AudioFixture();
  audio.playResult = async () => { throw new DOMException("Blocked", "NotAllowedError"); };
  const playback = createVoiceNotePlayback(audio);
  await playback.toggle();
  assert.equal(playback.getState().playing, false);
  assert.equal(playback.getState().pending, false);
  assert.match(playback.getState().error ?? "", /blocked.*Play/i);
});

test("cancelled or disposed pending playback cannot restart when play resolves late", async () => {
  for (const stop of ["cancel", "dispose"]) {
    const audio = new AudioFixture();
    let finish!: () => void;
    audio.playResult = () => new Promise<void>((done) => { finish = done; }).then(() => {
      audio.paused = false;
      audio.dispatchEvent(new Event("playing"));
    });
    const playback = createVoiceNotePlayback(audio);
    const pending = playback.toggle();
    if (stop === "dispose") playback.dispose();
    else await playback.toggle();
    finish();
    await pending;
    assert.equal(audio.paused, true, stop);
    if (stop === "cancel") assert.equal(playback.getState().playing, false);
  }
});

test("seeking requires metadata, clamps real time, and uses a finite duration hint for WebM metadata", () => {
  const audio = new AudioFixture();
  audio.duration = Number.POSITIVE_INFINITY;
  const playback = createVoiceNotePlayback(audio, { durationMs: 24_000 });
  assert.equal(playback.getState().duration, 24);
  assert.equal(playback.seek(10), false);
  audio.metadata();
  assert.equal(playback.seek(10), true);
  assert.equal(audio.currentTime, 10);
  assert.equal(playback.seek(99), true);
  assert.equal(audio.currentTime, 24);
  assert.equal(playback.seek(-10), true);
  assert.equal(audio.currentTime, 0);
  assert.equal(playback.seek(Number.NaN), false);
  assert.equal(audio.playCalls, 0);
  playback.setDurationHint(Number.NaN);
  assert.equal(playback.getState().duration, 0);
  assert.equal(playback.seek(1), false);
  assert.equal(formatVoiceNoteTime(Number.POSITIVE_INFINITY), "0:00");
  assert.equal(formatVoiceNoteTime(-5), "0:00");
  assert.equal(formatVoiceNoteTime(65.7), "1:05");
});

test("native media failures stay legible and reload never resumes audio automatically", async () => {
  const audio = new AudioFixture();
  const playback = createVoiceNotePlayback(audio);
  audio.metadata();
  await playback.toggle();
  audio.dispatchEvent(new Event("error"));
  assert.equal(playback.getState().playing, false);
  assert.equal(playback.getState().ready, false);
  assert.match(playback.getState().error ?? "", /secure link expired/);
  playback.reload();
  assert.equal(audio.loadCalls, 1);
  assert.equal(audio.playCalls, 1);
  assert.equal(audio.paused, true);
  assert.equal(playback.getState().error, null);
  audio.metadata();
  audio.dispatchEvent(new Event("canplay"));
  assert.equal(playback.getState().ready, true);
  assert.equal(playback.getState().playing, false);
});

test("a late cancelled rejection does not interrupt a newer successful play request", async () => {
  const audio = new AudioFixture();
  let rejectOld!: (reason: Error) => void;
  audio.playResult = () => new Promise<void>((_resolve, reject) => { rejectOld = reject; });
  const playback = createVoiceNotePlayback(audio);
  const oldPlay = playback.toggle();
  await playback.toggle();
  audio.playResult = async () => { audio.paused = false; audio.dispatchEvent(new Event("playing")); };
  await playback.toggle();
  rejectOld(new Error("Old network request failed"));
  await oldPlay;
  assert.equal(playback.getState().playing, true);
  assert.equal(playback.getState().error, null);
  assert.equal(audio.paused, false);
});

test("duration hint updates preserve playback and finite metadata takes precedence", async () => {
  const audio = new AudioFixture();
  audio.duration = Number.NaN;
  const playback = createVoiceNotePlayback(audio, { durationMs: 10_000 });
  audio.metadata();
  await playback.toggle();
  audio.currentTime = 4;
  playback.setDurationHint(20_000);
  assert.equal(playback.getState().duration, 20);
  assert.equal(playback.getState().currentTime, 4);
  assert.equal(playback.getState().playing, true);
  assert.equal(audio.pauseCalls, 0);
  assert.equal(audio.loadCalls, 0);
  audio.duration = 15;
  audio.dispatchEvent(new Event("durationchange"));
  assert.equal(playback.getState().duration, 15);
});

test("a browser refusing a seek returns a readable error without throwing", () => {
  const audio = new AudioFixture();
  const playback = createVoiceNotePlayback(audio);
  audio.metadata();
  Object.defineProperty(audio, "currentTime", { get: () => 0, set: () => { throw new DOMException("Unavailable", "InvalidStateError"); } });
  assert.equal(playback.seek(4), false);
  assert.match(playback.getState().error ?? "", /Seeking is not available/);
});

test("the source connection detaches on scope exit, ignores late events and restores on effect replay", async () => {
  const sourceAttributes = new Map([["src", "blob:voice-preview"]]);
  const source = {
    getAttribute: (name: string) => sourceAttributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => sourceAttributes.set(name, value),
    removeAttribute: (name: string) => sourceAttributes.delete(name),
  };
  const audio = Object.assign(new AudioFixture(), {
    querySelector: (selector: string) => { assert.equal(selector, "source"); return source; },
    removeAttribute: (name: string) => { assert.equal(name, "src"); },
  });
  let updates = 0;
  const player = connectVoiceNotePlayback(audio as unknown as HTMLAudioElement, {
    src: "blob:voice-preview", onChange: () => { updates += 1; },
  });
  assert.equal(audio.loadCalls, 0);
  await player.toggle();
  player.dispose();
  assert.equal(source.getAttribute("src"), null);
  assert.equal(audio.paused, true);
  assert.equal(audio.loadCalls, 1);
  const afterDispose = updates;
  audio.dispatchEvent(new Event("timeupdate"));
  audio.dispatchEvent(new Event("error"));
  assert.equal(updates, afterDispose);
  player.dispose();
  assert.equal(audio.loadCalls, 1);
  const replay = connectVoiceNotePlayback(audio as unknown as HTMLAudioElement, { src: "blob:voice-preview" });
  assert.equal(source.getAttribute("src"), "blob:voice-preview");
  assert.equal(audio.loadCalls, 2);
  assert.equal(audio.playCalls, 1);
  assert.equal(replay.getState().playing, false);
  replay.dispose();
});

test("non-bubbling source errors use an audio capture listener with matching cleanup", () => {
  const audio = new AudioFixture();
  const added: Array<{ name: string; listener: EventListenerOrEventListenerObject | null; capture: boolean }> = [];
  const removed: typeof added = [];
  const originalAdd = audio.addEventListener.bind(audio);
  const originalRemove = audio.removeEventListener.bind(audio);
  audio.addEventListener = (name, listener, options) => {
    added.push({ name, listener, capture: typeof options === "boolean" ? options : Boolean(options?.capture) });
    originalAdd(name, listener, options);
  };
  audio.removeEventListener = (name, listener, options) => {
    removed.push({ name, listener, capture: typeof options === "boolean" ? options : Boolean(options?.capture) });
    originalRemove(name, listener, options);
  };
  const playback = createVoiceNotePlayback(audio);
  const capturedError = added.find((entry) => entry.name === "error" && entry.capture);
  assert.ok(capturedError);
  assert.equal(added.filter((entry) => entry.capture).length, 1);
  // Simulate the browser's capture phase; EventTarget alone has no parent/child tree.
  assert.equal(typeof capturedError.listener, "function");
  (capturedError.listener as EventListener)(new Event("error", { bubbles: false }));
  assert.match(playback.getState().error ?? "", /secure link expired/);
  playback.dispose();
  assert.deepEqual(removed, added);
});
