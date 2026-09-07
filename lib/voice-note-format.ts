export type VoiceNoteFormat = {
  mimeType: string;
  extension: string;
};

const PREFERRED_FORMATS: VoiceNoteFormat[] = [
  { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  { mimeType: "audio/webm", extension: "webm" },
  { mimeType: "audio/mp4;codecs=mp4a.40.2", extension: "m4a" },
  { mimeType: "audio/mp4", extension: "m4a" },
];

/**
 * Picks an audio-only container that the browser has explicitly said it can
 * record. WebM/Opus is preferred because it is broadly supported; Safari's
 * MP4 output remains a first-class fallback.
 */
export function preferredVoiceNoteFormat(
  isTypeSupported: (mimeType: string) => boolean
): VoiceNoteFormat | null {
  return (
    PREFERRED_FORMATS.find((format) => isTypeSupported(format.mimeType)) ?? null
  );
}

/** Returns a conventional filename extension without changing the MIME type. */
export function voiceNoteExtensionForMime(mimeType: string): string | null {
  const normalized = mimeType.toLowerCase().split(";", 1)[0].trim();

  if (normalized === "audio/webm" || normalized === "video/webm") {
    return "webm";
  }
  if (normalized === "audio/mp4" || normalized === "audio/x-m4a") {
    return "m4a";
  }
  return null;
}

/**
 * MediaRecorder implementations may report the configured MIME type either on
 * the recorder or on the individual final chunks. Keep that exact value for
 * uploads rather than relabeling a container we did not create.
 */
export function actualVoiceNoteMime(
  recorderMimeType: string,
  chunkMimeTypes: readonly string[]
): string | null {
  const candidates = [recorderMimeType, ...chunkMimeTypes].map((value) =>
    value.trim()
  );
  return candidates.find((value) => Boolean(voiceNoteExtensionForMime(value))) ?? null;
}
