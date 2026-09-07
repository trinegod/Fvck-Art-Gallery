import assert from "node:assert/strict";
import test from "node:test";
import {
  actualVoiceNoteMime,
  preferredVoiceNoteFormat,
  voiceNoteExtensionForMime,
} from "../lib/voice-note-format";

test("voice-note format prefers WebM/Opus and retains the precise reported MIME", () => {
  const selected = preferredVoiceNoteFormat((mime) => mime === "audio/webm;codecs=opus");
  assert.deepEqual(selected, {
    mimeType: "audio/webm;codecs=opus",
    extension: "webm",
  });
  assert.equal(
    actualVoiceNoteMime("audio/webm;codecs=opus", ["audio/webm"]),
    "audio/webm;codecs=opus"
  );
});

test("voice-note format falls back to MP4 audio and generates an audio filename extension", () => {
  const selected = preferredVoiceNoteFormat((mime) => mime === "audio/mp4");
  assert.deepEqual(selected, { mimeType: "audio/mp4", extension: "m4a" });
  assert.equal(voiceNoteExtensionForMime("audio/mp4;codecs=mp4a.40.2"), "m4a");
  assert.equal(voiceNoteExtensionForMime("audio/webm"), "webm");
  assert.equal(voiceNoteExtensionForMime("application/octet-stream"), null);
});

test("voice-note format may use a chunk-reported MIME when a recorder omits it", () => {
  assert.equal(actualVoiceNoteMime("", ["", "audio/mp4"]), "audio/mp4");
});
