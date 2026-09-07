import assert from "node:assert/strict";
import test from "node:test";
import {
  browserVoiceNoteLevelDependencies,
  createVoiceNoteLevelMonitor,
  voiceNoteLevelFromSamples,
  type VoiceNoteLevelDependencies,
} from "../lib/voice-note-level";

test("live input level is the bounded RMS of actual time-domain samples", () => {
  assert.equal(voiceNoteLevelFromSamples(new Float32Array([0, 0, 0, 0])), 0);
  assert.equal(voiceNoteLevelFromSamples(new Float32Array([0.5, -0.5, 0.5, -0.5])), 0.5);
  assert.equal(voiceNoteLevelFromSamples(new Float32Array([1, 0, 0, 0])), 0.5);
  assert.equal(voiceNoteLevelFromSamples(new Float32Array([2, -2])), 1);
});

test("missing or invalid samples are unavailable, never invented silence or activity", () => {
  assert.equal(voiceNoteLevelFromSamples(new Float32Array()), null);
  assert.equal(voiceNoteLevelFromSamples(new Float32Array([0.5, NaN])), null);
  assert.equal(voiceNoteLevelFromSamples(new Float32Array([Infinity])), null);
});

function monitorFixture({ state = "running", resume }: { state?: string; resume?: () => Promise<void> } = {}) {
  const timers = new Map<number, { callback: () => void; delay: number }>();
  let nextTimer = 0;
  let currentState = state;
  let sampleValue = 0.5;
  let readError = false;
  let closed = 0;
  let sourceDisconnected = 0;
  let analyserDisconnected = 0;
  let unavailable = 0;
  const levels: number[] = [];
  const connections: unknown[] = [];
  const analyser = {
    fftSize: 2048,
    getFloatTimeDomainData: (samples: Float32Array) => {
      if (readError) throw new Error("analyser failed");
      samples.fill(sampleValue);
    },
    disconnect: () => { analyserDisconnected += 1; },
  };
  const dependencies: VoiceNoteLevelDependencies = {
    createContext: () => ({
      get state() { return currentState; },
      createAnalyser: () => analyser,
      createSource: () => ({
        connect: (target) => { connections.push(target); },
        disconnect: () => { sourceDisconnected += 1; },
      }),
      resume: resume ?? (async () => { currentState = "running"; }),
      close: async () => { closed += 1; currentState = "closed"; },
    }),
    setTimer: (callback, delay) => {
      const id = ++nextTimer;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimer: (timer) => { timers.delete(timer as number); },
  };
  return {
    analyser,
    connections,
    timers,
    levels,
    dependencies,
    callbacks: { onLevel: (level: number) => levels.push(level), onUnavailable: () => { unavailable += 1; } },
    get closed() { return closed; },
    get unavailable() { return unavailable; },
    get disconnected() { return [sourceDisconnected, analyserDisconnected]; },
    setSamples: (value: number) => { sampleValue = value; },
    setReadError: () => { readError = true; },
    setState: (value: string) => { currentState = value; },
    fire: (delay: number) => {
      const timer = [...timers.entries()].find(([, value]) => value.delay === delay);
      assert.ok(timer, `expected timer with delay ${delay}`);
      timers.delete(timer[0]);
      timer[1].callback();
    },
  };
}

test("the live monitor connects only microphone-to-analyser and stops every owned resource", () => {
  const fixture = monitorFixture();
  const monitor = createVoiceNoteLevelMonitor({}, fixture.callbacks, fixture.dependencies);
  assert.deepEqual(fixture.connections, [fixture.analyser], "there is no speaker destination connection");
  assert.deepEqual(fixture.levels, [], "no level is emitted before actual samples are read");
  fixture.fire(50);
  assert.deepEqual(fixture.levels, [0.5]);
  fixture.setSamples(0);
  fixture.fire(50);
  assert.deepEqual(fixture.levels, [0.5, 0]);
  const queued = [...fixture.timers.values()][0].callback;
  monitor.stop();
  monitor.stop();
  queued();
  assert.equal(fixture.closed, 1);
  assert.deepEqual(fixture.disconnected, [1, 1]);
  assert.equal(fixture.timers.size, 0);
  assert.deepEqual(fixture.levels, [0.5, 0], "late callbacks cannot invent new activity");
  assert.equal(fixture.unavailable, 0);
});

test("pending audio resume is cancellable and cannot restart sampling after cleanup", async () => {
  let resolveResume!: () => void;
  const fixture = monitorFixture({
    state: "suspended",
    resume: () => new Promise<void>((resolve) => { resolveResume = resolve; }),
  });
  const monitor = createVoiceNoteLevelMonitor({}, fixture.callbacks, fixture.dependencies);
  assert.deepEqual(fixture.levels, []);
  monitor.stop();
  resolveResume();
  await Promise.resolve();
  assert.equal(fixture.timers.size, 0);
  assert.equal(fixture.closed, 1);
  assert.deepEqual(fixture.disconnected, [1, 1]);
  assert.equal(fixture.unavailable, 0);
  assert.deepEqual(fixture.levels, []);
});

test("resumed audio starts sampling only after the context actually runs", async () => {
  const fixture = monitorFixture({ state: "suspended" });
  const monitor = createVoiceNoteLevelMonitor({}, fixture.callbacks, fixture.dependencies);
  assert.deepEqual(fixture.levels, []);
  await Promise.resolve();
  assert.equal([...fixture.timers.values()].some((timer) => timer.delay === 1500), false);
  fixture.fire(50);
  assert.deepEqual(fixture.levels, [0.5]);
  monitor.stop();
});

test("resume failure or timeout reports unavailable once and never manufactures a level", async () => {
  for (const reason of ["rejected", "timeout"] as const) {
    const fixture = monitorFixture({
      state: "suspended",
      resume: () => reason === "rejected" ? Promise.reject(new Error("resume denied")) : new Promise(() => {}),
    });
    const monitor = createVoiceNoteLevelMonitor({}, fixture.callbacks, fixture.dependencies);
    if (reason === "timeout") fixture.fire(1500);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(fixture.unavailable, 1, reason);
    assert.deepEqual(fixture.levels, [], reason);
    assert.equal(fixture.closed, 1, reason);
    assert.equal(fixture.timers.size, 0, reason);
    monitor.stop();
    assert.equal(fixture.closed, 1, reason);
  }
});

test("analysis failure, invalid samples, and interrupted contexts stop without recycling activity", () => {
  for (const reason of ["read-error", "invalid-samples", "interrupted"] as const) {
    const fixture = monitorFixture();
    createVoiceNoteLevelMonitor({}, fixture.callbacks, fixture.dependencies);
    fixture.fire(50);
    if (reason === "read-error") fixture.setReadError();
    if (reason === "invalid-samples") fixture.setSamples(NaN);
    if (reason === "interrupted") fixture.setState("interrupted");
    fixture.fire(50);
    assert.deepEqual(fixture.levels, [0.5], reason);
    assert.equal(fixture.unavailable, 1, reason);
    assert.equal(fixture.closed, 1, reason);
    assert.deepEqual(fixture.disconnected, [1, 1], reason);
    assert.equal(fixture.timers.size, 0, reason);
  }
});

test("partial setup failure closes allocated context and analyser without requesting another microphone", () => {
  const fixture = monitorFixture();
  createVoiceNoteLevelMonitor({}, fixture.callbacks, {
    ...fixture.dependencies,
    createContext: () => ({
      ...fixture.dependencies.createContext(),
      createSource: () => { throw new Error("cannot attach microphone"); },
    }),
  });
  assert.equal(fixture.unavailable, 1);
  assert.equal(fixture.closed, 1);
  assert.deepEqual(fixture.disconnected, [0, 1]);
  assert.equal(fixture.timers.size, 0);
  assert.deepEqual(fixture.levels, []);
});

test("a throwing disconnect or rejected close cannot prevent the remaining resource cleanup", async () => {
  const fixture = monitorFixture();
  const context = fixture.dependencies.createContext();
  const monitor = createVoiceNoteLevelMonitor({}, fixture.callbacks, {
    ...fixture.dependencies,
    createContext: () => ({
      ...context,
      createSource: (stream) => {
        const source = context.createSource(stream);
        return { ...source, disconnect: () => { source.disconnect(); throw new Error("already disconnected"); } };
      },
      close: async () => { await context.close(); throw new Error("close interrupted"); },
    }),
  });
  monitor.stop();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(fixture.disconnected, [1, 1]);
  assert.equal(fixture.closed, 1);
  assert.equal(fixture.timers.size, 0);
});

test("stopping from a level callback cannot schedule another sample", () => {
  const fixture = monitorFixture();
  const monitor = createVoiceNoteLevelMonitor({}, {
    ...fixture.callbacks,
    onLevel: () => monitor.stop(),
  }, fixture.dependencies);
  fixture.fire(50);
  assert.equal(fixture.closed, 1);
  assert.equal(fixture.timers.size, 0);
});

test("browser defaults lazily bind the existing stream and never access a speaker destination", () => {
  const fixture = monitorFixture();
  const stream = {};
  let contexts = 0;
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  // Creating dependencies must not touch window or allocate audio during SSR.
  const browserDependencies = browserVoiceNoteLevelDependencies();
  class FakeAudioContext {
    state = "running";
    constructor() { contexts += 1; }
    get destination(): never { throw new Error("speaker access is forbidden"); }
    createAnalyser() { return fixture.analyser; }
    createMediaStreamSource(value: unknown) {
      assert.equal(value, stream, "the same explicitly acquired microphone is analysed");
      return fixture.dependencies.createContext().createSource(value);
    }
    resume() { return Promise.resolve(); }
    close() { return fixture.dependencies.createContext().close(); }
  }
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    AudioContext: FakeAudioContext,
    setTimeout: fixture.dependencies.setTimer,
    clearTimeout: fixture.dependencies.clearTimer,
  } });
  try {
    assert.equal(contexts, 0);
    const monitor = createVoiceNoteLevelMonitor(stream, fixture.callbacks, browserDependencies);
    assert.equal(contexts, 1);
    fixture.fire(50);
    assert.deepEqual(fixture.levels, [0.5]);
    assert.deepEqual(fixture.connections, [fixture.analyser]);
    monitor.stop();
    assert.equal(fixture.closed, 1);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
