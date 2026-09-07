import assert from "node:assert/strict";
import test from "node:test";
import {
  createVoiceNoteRecorder,
  type MediaRecorderLike,
  type MediaStreamLike,
  type VoiceNoteRecorderDependencies,
  type VoiceNoteRecorderEvent,
} from "../lib/voice-note-recorder";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

class FakeTimers {
  private nextId = 0;
  private callbacks = new Map<number, () => void>();

  set = (callback: () => void) => {
    const id = ++this.nextId;
    this.callbacks.set(id, callback);
    return id;
  };

  clear = (id: unknown) => {
    this.callbacks.delete(id as number);
  };

  fireAll() {
    const callbacks = [...this.callbacks.entries()];
    this.callbacks.clear();
    callbacks.forEach(([, callback]) => callback());
  }

  get size() {
    return this.callbacks.size;
  }
}

class FakeTrack {
  stopped = 0;

  stop() {
    this.stopped += 1;
  }
}

class FakeRecorder implements MediaRecorderLike {
  state = "inactive";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  startTimeslice: number | undefined;

  constructor(public mimeType: string) {}

  start(timeslice?: number) {
    this.startTimeslice = timeslice;
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.onstop?.(new Event("stop"));
  }

  data(data: Blob) {
    this.ondataavailable?.({ data } as BlobEvent);
  }
}

function setup({
  supported = ["audio/webm;codecs=opus"],
  stream,
  now = 10,
}: {
  supported?: string[];
  stream?: MediaStreamLike;
  now?: number;
} = {}) {
  const timers = new FakeTimers();
  const tracks = [new FakeTrack()];
  const mediaStream = stream ?? { getTracks: () => tracks };
  const recorders: FakeRecorder[] = [];
  const events: VoiceNoteRecorderEvent[] = [];
  let currentTime = now;
  const dependencies: VoiceNoteRecorderDependencies = {
    requestStream: async () => mediaStream,
    createRecorder: (_stream, mimeType) => {
      const recorder = new FakeRecorder(mimeType);
      recorders.push(recorder);
      return recorder;
    },
    isTypeSupported: (mimeType) => supported.includes(mimeType),
    now: () => currentTime,
    setTimer: (callback) => timers.set(callback),
    clearTimer: (timer) => timers.clear(timer),
    createBlob: (parts, options) => new Blob(parts, options),
  };
  const recorder = createVoiceNoteRecorder(dependencies, {
    onEvent: (event) => events.push(event),
  });
  return {
    recorder,
    recorders,
    events,
    timers,
    tracks,
    setTime: (value: number) => {
      currentTime = value;
    },
  };
}

test("recording is not requested until an explicit start and stop produces a local WebM note", async () => {
  const fixture = setup();
  assert.equal(fixture.recorders.length, 0);
  assert.equal(fixture.events.length, 0);

  const started = await fixture.recorder.start();
  assert.deepEqual(started, {
    ok: true,
    format: { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  });
  assert.equal(fixture.recorders.length, 1);
  assert.equal(fixture.recorders[0].startTimeslice, 1000);
  fixture.setTime(2_300);
  fixture.recorders[0].data(new Blob(["voice"], { type: "audio/webm;codecs=opus" }));
  assert.equal(fixture.recorder.stop(), true);

  const completed = fixture.events.at(-1);
  assert.equal(completed?.type, "completed");
  if (completed?.type !== "completed") throw new Error("expected completed event");
  assert.equal(completed.note.durationMs, 2_290);
  assert.equal(completed.note.mimeType, "audio/webm;codecs=opus");
  assert.equal(completed.note.extension, "webm");
  assert.equal(fixture.tracks[0].stopped, 1);
  assert.equal(fixture.timers.size, 0);
});

test("the default recorder accepts 4 MiB but stops and releases the microphone on byte overflow", async () => {
  const fixture = setup();
  await fixture.recorder.start();
  fixture.recorders[0].data(new Blob([new Uint8Array(4 * 1024 * 1024)], { type: "audio/webm" }));
  assert.equal(fixture.events.at(-1)?.type, "recording");
  fixture.recorders[0].data(new Blob([new Uint8Array(1)], { type: "audio/webm" }));

  const failed = fixture.events.at(-1);
  assert.equal(failed?.type, "failed");
  if (failed?.type !== "failed") throw new Error("expected size-limit failure");
  assert.equal(failed.failure.kind, "too-large");
  assert.match(failed.failure.message, /4 MiB/);
  assert.equal(fixture.tracks[0].stopped, 1);
  assert.equal(fixture.timers.size, 0);
});

test("a pending permission request can be cancelled and a late stream is immediately released", async () => {
  const request = deferred<MediaStreamLike>();
  const track = new FakeTrack();
  const fixture = setup();
  const dependencies: VoiceNoteRecorderDependencies = {
    requestStream: () => request.promise,
    createRecorder: (_stream, mimeType) => new FakeRecorder(mimeType),
    isTypeSupported: (mimeType) => mimeType === "audio/webm;codecs=opus",
    now: () => 0,
    setTimer: (callback) => fixture.timers.set(callback),
    clearTimer: (timer) => fixture.timers.clear(timer),
    createBlob: (parts, options) => new Blob(parts, options),
  };
  const events: VoiceNoteRecorderEvent[] = [];
  const recorder = createVoiceNoteRecorder(dependencies, {
    onEvent: (event) => events.push(event),
  });

  const starting = recorder.start();
  assert.equal(recorder.cancelPendingRequest(), true);
  request.resolve({ getTracks: () => [track] });
  assert.deepEqual(await starting, { ok: false, cancelled: true });
  assert.deepEqual(events, [{ type: "request-cancelled", reason: "cancelled" }]);
  assert.equal(track.stopped, 1);
  assert.equal(fixture.timers.size, 0);
});

test("discard and unmount cleanup stop microphone tracks and remove recorder timers", async () => {
  const fixture = setup();
  await fixture.recorder.start();
  assert.equal(fixture.timers.size, 1, "only the recording ceiling remains after permission resolves");
  fixture.recorder.dispose();
  assert.equal(fixture.tracks[0].stopped, 1);
  assert.equal(fixture.timers.size, 0);
  assert.equal(fixture.recorder.isRecording, false);
});

test("reversible cleanup permits a fresh recorder session after Strict Mode-style effect replay", async () => {
  const fixture = setup();
  await fixture.recorder.start();
  fixture.recorder.discard();
  const replayedStart = await fixture.recorder.start();

  assert.equal(replayedStart.ok, true);
  assert.equal(fixture.recorders.length, 2);
  assert.equal(fixture.recorder.isRecording, true);
});

test("a permission request timeout returns the UI to a retryable state and releases a late stream", async () => {
  const request = deferred<MediaStreamLike>();
  const timers = new FakeTimers();
  const track = new FakeTrack();
  const events: VoiceNoteRecorderEvent[] = [];
  const recorder = createVoiceNoteRecorder(
    {
      requestStream: () => request.promise,
      createRecorder: (_stream, mimeType) => new FakeRecorder(mimeType),
      isTypeSupported: (mimeType) => mimeType === "audio/webm;codecs=opus",
      now: () => 0,
      setTimer: (callback) => timers.set(callback),
      clearTimer: (timer) => timers.clear(timer),
      createBlob: (parts, options) => new Blob(parts, options),
    },
    { onEvent: (event) => events.push(event) }
  );

  const starting = recorder.start();
  timers.fireAll();
  request.resolve({ getTracks: () => [track] });
  assert.deepEqual(await starting, { ok: false, cancelled: true });
  assert.deepEqual(events, [{ type: "request-cancelled", reason: "timed-out" }]);
  assert.equal(track.stopped, 1);
});

test("denied permission and unsupported MediaRecorder both surface clear retryable failures", async () => {
  const denied = setup();
  const deniedDependencies: VoiceNoteRecorderDependencies = {
    requestStream: async () => {
      const error = new Error("denied");
      error.name = "NotAllowedError";
      throw error;
    },
    createRecorder: (_stream, mimeType) => new FakeRecorder(mimeType),
    isTypeSupported: (mimeType) => mimeType === "audio/webm;codecs=opus",
    now: () => 0,
    setTimer: (callback) => denied.timers.set(callback),
    clearTimer: (timer) => denied.timers.clear(timer),
    createBlob: (parts, options) => new Blob(parts, options),
  };
  const deniedEvents: VoiceNoteRecorderEvent[] = [];
  const deniedRecorder = createVoiceNoteRecorder(deniedDependencies, {
    onEvent: (event) => deniedEvents.push(event),
  });
  const result = await deniedRecorder.start();
  assert.equal(result.ok, false);
  assert.ok("failure" in result && result.failure.kind === "denied");
  assert.equal(deniedEvents[0].type, "failed");

  const unsupported = setup({ supported: [] });
  const unsupportedResult = await unsupported.recorder.start();
  assert.equal(unsupportedResult.ok, false);
  assert.ok("failure" in unsupportedResult && unsupportedResult.failure.kind === "unsupported");
  assert.equal(unsupported.recorders.length, 0);
});

test("the duration ceiling finishes a preview and the byte ceiling discards oversized audio", async () => {
  const duration = setup();
  await duration.recorder.start();
  duration.recorders[0].data(
    new Blob(["voice"], { type: "audio/webm;codecs=opus" })
  );
  duration.setTime(60_050);
  duration.timers.fireAll();
  const completed = duration.events.at(-1);
  assert.equal(completed?.type, "completed");
  if (completed?.type !== "completed") throw new Error("expected completed event");
  assert.equal(completed.reason, "max-duration");
  assert.equal(completed.note.durationMs, 60_000);

  const size = setup();
  const smallLimitRecorder = createVoiceNoteRecorder(
    {
      requestStream: async () => ({ getTracks: () => [] }),
      createRecorder: (_stream, mimeType) => {
        const recorder = new FakeRecorder(mimeType);
        size.recorders.push(recorder);
        return recorder;
      },
      isTypeSupported: (mimeType) => mimeType === "audio/webm;codecs=opus",
      now: () => 0,
      setTimer: (callback) => size.timers.set(callback),
      clearTimer: (timer) => size.timers.clear(timer),
      createBlob: (parts, options) => new Blob(parts, options),
    },
    { maxBytes: 3, onEvent: (event) => size.events.push(event) }
  );
  await smallLimitRecorder.start();
  size.recorders[0].data(new Blob(["four"], { type: "audio/webm;codecs=opus" }));
  const failed = size.events.at(-1);
  assert.equal(failed?.type, "failed");
  if (failed?.type !== "failed") throw new Error("expected failed event");
  assert.equal(failed.failure.kind, "too-large");
});

test("MP4 is selected when WebM is unavailable", async () => {
  const fixture = setup({ supported: ["audio/mp4"] });
  const started = await fixture.recorder.start();
  assert.deepEqual(started, {
    ok: true,
    format: { mimeType: "audio/mp4", extension: "m4a" },
  });
  fixture.recorders[0].data(new Blob(["voice"], { type: "audio/mp4" }));
  fixture.recorder.stop();
  const completed = fixture.events.at(-1);
  assert.equal(completed?.type, "completed");
  if (completed?.type !== "completed") throw new Error("expected completed event");
  assert.equal(completed.note.mimeType, "audio/mp4");
  assert.equal(completed.note.extension, "m4a");
});
