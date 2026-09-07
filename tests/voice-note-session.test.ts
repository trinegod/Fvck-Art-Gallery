import assert from "node:assert/strict";
import test from "node:test";
import { createVoiceNoteSession } from "../lib/voice-note-session";
import type { VoiceNoteRecorderEvent } from "../lib/voice-note-recorder";

function fixture() {
  let listener = (event: VoiceNoteRecorderEvent) => { void event; };
  let starts = 0;
  let discards = 0;
  const revoked: string[] = [];
  const recorder = {
    subscribe: (fn: typeof listener) => { listener = fn; return () => {}; },
    start: async () => { starts++; return { ok: true as const, format: { mimeType: "audio/webm", extension: "webm" } }; },
    stop: () => true,
    discard: () => { discards++; },
  };
  const session = createVoiceNoteSession(recorder, {
    createUrl: () => "blob:private-local-note", revokeUrl: url => revoked.push(url), now: () => 100,
  });
  const recording = () => listener({ type: "recording", format: { mimeType: "audio/webm", extension: "webm" } });
  const complete = (reason: "stopped" | "max-duration" = "stopped") => listener({ type: "completed", reason, note: { blob: new Blob(["audio"], { type: "audio/webm" }), mimeType: "audio/webm", extension: "webm", durationMs: 3200 } });
  return { session, recording, complete, emit: (event: VoiceNoteRecorderEvent) => listener(event), revoked, counts: () => ({ starts, discards }) };
}

test("the first microphone action requests recording immediately; mounting and reset never request it", () => {
  const f = fixture();
  assert.equal(f.counts().starts, 0);
  f.session.start();
  assert.equal(f.counts().starts, 1);
  assert.equal(f.session.getSnapshot().phase, "requesting");
  f.session.start();
  assert.equal(f.counts().starts, 1);
  f.session.reset();
  f.session.reset(); // Strict Mode cleanup/replay is safe.
  assert.equal(f.session.getSnapshot().phase, "idle");
  assert.equal(f.counts().starts, 1);
});

test("live bars contain bounded real samples, not artificial activity", () => {
  const f = fixture(); f.session.start(); f.recording();
  f.emit({ type: "level", level: 0 }); f.emit({ type: "level", level: .8 });
  assert.deepEqual(f.session.getSnapshot().levels.slice(-2), [0, .8]);
  for (let i = 0; i < 90; i++) f.emit({ type: "level", level: .3 });
  assert.equal(f.session.getSnapshot().levels.length, 28);
  f.emit({ type: "level-unavailable" });
  assert.equal(f.session.getSnapshot().meterUnavailable, true);
  f.session.reset();
  assert.equal(f.session.getSnapshot().levels.length, 0);
});

test("send while recording waits for final bytes and sends once; stop alone only previews", async () => {
  const f = fixture(); const sent: number[] = [];
  f.session.start(); f.recording();
  f.session.stopAndSend(note => { sent.push(note.durationMs); });
  assert.equal(f.session.getSnapshot().phase, "stopping");
  assert.equal(sent.length, 0);
  f.complete(); await Promise.resolve();
  assert.deepEqual(sent, [3200]);
  assert.equal(f.session.getSnapshot().phase, "idle");
  assert.deepEqual(f.revoked, ["blob:private-local-note"]);
  f.session.start(); f.recording(); f.session.stop(); f.complete();
  assert.equal(f.session.getSnapshot().phase, "preview");
  assert.equal(sent.length, 1);
});

test("maximum duration stops to preview, never automatically sends", () => {
  const f = fixture(); f.session.start(); f.recording(); f.complete("max-duration");
  assert.equal(f.session.getSnapshot().phase, "preview");
  assert.match(f.session.getSnapshot().notice ?? "", /1:00/);
});

test("confirmed failure preserves local preview for retry; unknown outcome prevents duplicate send", async () => {
  const f = fixture(); f.session.start(); f.recording(); f.session.stop(); f.complete();
  await f.session.send(async () => { throw new Error("Network unavailable"); });
  assert.equal(f.session.getSnapshot().phase, "preview");
  assert.ok(f.session.getSnapshot().note);
  await f.session.send(async () => { throw Object.assign(new Error("Check the conversation before trying again."), { outcome: "unknown" }); });
  assert.equal(f.session.getSnapshot().deliveryUncertain, true);
  let sent = 0;
  await f.session.send(() => { sent++; });
  assert.equal(sent, 0);
});

test("scope cleanup invalidates in-flight delivery and revokes its local URL", async () => {
  const f = fixture(); f.session.start(); f.recording(); f.session.stop(); f.complete();
  let resolve!: () => void;
  const pending = f.session.send(() => new Promise<void>(done => { resolve = done; }));
  f.session.reset();
  const afterReset = f.session.getSnapshot();
  resolve(); await pending;
  assert.equal(f.session.getSnapshot(), afterReset);
  assert.equal(f.revoked.length, 1);
});
