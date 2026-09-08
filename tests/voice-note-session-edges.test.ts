import assert from "node:assert/strict";
import test from "node:test";
import { createVoiceNoteSession } from "../lib/voice-note-session";
import {
  createVoiceNoteRecorder,
  type MediaRecorderLike,
  type MediaStreamLike,
  type VoiceNoteRecorderEvent,
} from "../lib/voice-note-recorder";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function sessionFixture(overrides: {
  createUrl?: (blob: Blob) => string;
  revokeUrl?: (url: string) => void;
  synchronousStop?: boolean;
} = {}) {
  let listener = (event: VoiceNoteRecorderEvent) => { void event; };
  const revoked: string[] = [];
  let urlCount = 0;
  const complete = () => listener({
    type: "completed", reason: "stopped",
    note: { blob: new Blob(["synthetic audio"], { type: "audio/webm" }), mimeType: "audio/webm", extension: "webm", durationMs: 2500 },
  });
  const session = createVoiceNoteSession({
    subscribe: fn => { listener = fn; return () => {}; },
    start: async () => ({ ok: true, format: { mimeType: "audio/webm", extension: "webm" } }),
    stop: () => { if (overrides.synchronousStop) complete(); return true; },
    discard: () => {},
  }, {
    createUrl: overrides.createUrl ?? (() => `blob:synthetic-note-${++urlCount}`),
    revokeUrl: overrides.revokeUrl ?? (url => { revoked.push(url); }),
    now: () => 1000,
  });
  const start = () => {
    session.start();
    listener({ type: "recording", format: { mimeType: "audio/webm", extension: "webm" } });
  };
  return { session, start, complete, revoked };
}

for (const synchronousStop of [false, true]) {
  test(`repeated Send cannot double-dispatch with ${synchronousStop ? "synchronous" : "asynchronous"} final recorder events`, async () => {
    const fixture = sessionFixture({ synchronousStop });
    const delivery = deferred<void>();
    let sends = 0;
    const sender = () => { sends += 1; return delivery.promise; };
    fixture.start();
    fixture.session.stopAndSend(sender);
    fixture.session.stopAndSend(sender);
    if (!synchronousStop) {
      assert.equal(sends, 0);
      fixture.complete();
    }
    await fixture.session.send(sender);
    assert.equal(sends, 1);
    assert.equal(fixture.session.getSnapshot().phase, "sending");
    delivery.resolve();
    await Promise.resolve();
    assert.equal(fixture.session.getSnapshot().phase, "idle");
    assert.deepEqual(fixture.revoked, ["blob:synthetic-note-1"]);
  });
}

for (const outcome of ["success", "unknown"] as const) {
  test(`scope reset isolates a new recording from a late ${outcome} delivery outcome`, async () => {
    const fixture = sessionFixture();
    const delivery = deferred<void>();
    fixture.start(); fixture.session.stop(); fixture.complete();
    const sending = fixture.session.send(() => delivery.promise);
    fixture.session.reset();
    fixture.start();
    const freshState = fixture.session.getSnapshot();
    if (outcome === "success") delivery.resolve();
    else delivery.reject(Object.assign(new Error("delivery unconfirmed"), { outcome: "unknown" }));
    await sending;
    assert.equal(fixture.session.getSnapshot(), freshState);
    assert.equal(freshState.phase, "recording");
    assert.equal(freshState.deliveryUncertain, false);
    assert.deepEqual(fixture.revoked, ["blob:synthetic-note-1"]);
  });
}

test("cancelling while final bytes are pending clears the queued send", async () => {
  const fixture = sessionFixture();
  let sends = 0;
  fixture.start();
  fixture.session.stopAndSend(() => { sends += 1; });
  fixture.session.reset();
  fixture.complete();
  await Promise.resolve();
  assert.equal(sends, 0);
  assert.equal(fixture.session.getSnapshot().phase, "idle");
  assert.equal(fixture.session.getSnapshot().note, null);
});

function realRecorderFixture(requestStream?: () => Promise<MediaStreamLike>) {
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let nextTimer = 0;
  let stoppedTracks = 0;
  let currentTime = 0;
  const nativeRecorders: MediaRecorderLike[] = [];
  const recorder = createVoiceNoteRecorder({
    requestStream: requestStream ?? (async () => ({ getTracks: () => [{ stop: () => { stoppedTracks += 1; } }] })),
    createRecorder: () => {
      const native: MediaRecorderLike = {
        state: "inactive", mimeType: "audio/webm", ondataavailable: null, onerror: null, onstop: null,
        start: () => { native.state = "recording"; },
        // Native stop completes later, after the final dataavailable event.
        stop: () => { native.state = "inactive"; },
      };
      nativeRecorders.push(native);
      return native;
    },
    isTypeSupported: mime => mime === "audio/webm;codecs=opus",
    now: () => currentTime,
    setTimer: (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimer: timer => { timers.delete(timer as number); },
    createBlob: (parts, options) => new Blob(parts, options),
    startLevelMonitor: () => ({ stop: () => {} }),
  });
  const session = createVoiceNoteSession(recorder, {
    createUrl: () => "blob:synthetic-duration-note", revokeUrl: () => {}, now: () => currentTime,
  });
  return {
    session,
    nativeRecorders,
    get stoppedTracks() { return stoppedTracks; },
    hitDurationLimit: () => {
      const duration = [...timers.values()].find(timer => timer.delay === 300_000);
      assert.ok(duration);
      currentTime = 300_000;
      duration.callback();
    },
    finalBytes: () => {
      const native = nativeRecorders.at(-1)!;
      native.ondataavailable?.({ data: new Blob(["synthetic final bytes"], { type: "audio/webm" }) } as BlobEvent);
      native.onstop?.(new Event("stop"));
    },
  };
}

for (const action of ["stop", "send"] as const) {
  test(`${action} during automatic duration-stop still consumes the final recording exactly once`, async () => {
    const fixture = realRecorderFixture();
    let sends = 0;
    fixture.session.start();
    await Promise.resolve();
    assert.equal(fixture.session.getSnapshot().phase, "recording");
    fixture.hitDurationLimit();
    if (action === "stop") fixture.session.stop();
    else fixture.session.stopAndSend(() => { sends += 1; });
    fixture.finalBytes();
    await Promise.resolve();
    assert.equal(fixture.session.getSnapshot().phase, action === "stop" ? "preview" : "idle");
    assert.equal(sends, action === "stop" ? 0 : 1);
    assert.ok(fixture.stoppedTracks >= 1, "the microphone is released before the final recording is used");
  });
}

test("late permission after scope cancellation never starts a recorder or contaminates the next request", async () => {
  const oldPermission = deferred<MediaStreamLike>();
  const newPermission = deferred<MediaStreamLike>();
  let request = 0;
  let oldTracksStopped = 0;
  const fixture = realRecorderFixture(() => ++request === 1 ? oldPermission.promise : newPermission.promise);
  fixture.session.start();
  fixture.session.reset();
  fixture.session.start();
  oldPermission.resolve({ getTracks: () => [{ stop: () => { oldTracksStopped += 1; } }] });
  await Promise.resolve();
  assert.equal(oldTracksStopped, 1);
  assert.equal(fixture.nativeRecorders.length, 0);
  assert.equal(fixture.session.getSnapshot().phase, "requesting");
  newPermission.resolve({ getTracks: () => [{ stop: () => {} }] });
  await Promise.resolve();
  assert.equal(fixture.nativeRecorders.length, 1);
  assert.equal(fixture.session.getSnapshot().phase, "recording");
  fixture.session.reset();
});

test("a preview URL allocation failure becomes a recoverable error and never dispatches a queued send", () => {
  const fixture = sessionFixture({ createUrl: () => { throw new Error("URL allocation failed"); } });
  let sends = 0;
  fixture.start();
  fixture.session.stopAndSend(() => { sends += 1; });
  assert.doesNotThrow(fixture.complete);
  assert.equal(fixture.session.getSnapshot().phase, "error");
  assert.equal(fixture.session.getSnapshot().note, null);
  assert.equal(sends, 0);
});

test("reset clears private preview state even if URL revocation fails", () => {
  const fixture = sessionFixture({ revokeUrl: () => { throw new Error("URL revocation failed"); } });
  fixture.start(); fixture.session.stop(); fixture.complete();
  assert.doesNotThrow(fixture.session.reset);
  assert.equal(fixture.session.getSnapshot().phase, "idle");
  assert.equal(fixture.session.getSnapshot().note, null);
});
