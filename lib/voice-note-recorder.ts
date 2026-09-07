import {
  actualVoiceNoteMime,
  preferredVoiceNoteFormat,
  voiceNoteExtensionForMime,
  type VoiceNoteFormat,
} from "./voice-note-format";

export const MAX_VOICE_NOTE_DURATION_MS = 60_000;
export const MAX_VOICE_NOTE_BYTES = 5 * 1024 * 1024;
export const MICROPHONE_REQUEST_TIMEOUT_MS = 15_000;

export type VoiceNote = {
  blob: Blob;
  mimeType: string;
  extension: string;
  durationMs: number;
};

export type VoiceNoteRecorderFailureKind =
  | "denied"
  | "unsupported"
  | "failed"
  | "too-large";

export type VoiceNoteRecorderFailure = {
  kind: VoiceNoteRecorderFailureKind;
  message: string;
};

export type VoiceNoteRecorderEvent =
  | { type: "recording"; format: VoiceNoteFormat }
  | { type: "request-cancelled"; reason: "cancelled" | "timed-out" }
  | { type: "completed"; note: VoiceNote; reason: "stopped" | "max-duration" }
  | { type: "failed"; failure: VoiceNoteRecorderFailure };

export type MediaStreamTrackLike = {
  stop: () => void;
};

export type MediaStreamLike = {
  getTracks: () => MediaStreamTrackLike[];
};

export type MediaRecorderLike = {
  mimeType: string;
  state: "inactive" | "recording" | "paused" | string;
  ondataavailable: ((event: BlobEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onstop: ((event: Event) => void) | null;
  start: (timeslice?: number) => void;
  stop: () => void;
};

export type VoiceNoteTimer = unknown;

export type VoiceNoteRecorderDependencies = {
  requestStream: () => Promise<MediaStreamLike>;
  createRecorder: (stream: MediaStreamLike, mimeType: string) => MediaRecorderLike;
  isTypeSupported: (mimeType: string) => boolean;
  now: () => number;
  setTimer: (callback: () => void, delayMs: number) => VoiceNoteTimer;
  clearTimer: (timer: VoiceNoteTimer) => void;
  createBlob: (parts: BlobPart[], options: BlobPropertyBag) => Blob;
};

export type VoiceNoteRecorderOptions = {
  maxBytes?: number;
  maxDurationMs?: number;
  requestTimeoutMs?: number;
  onEvent?: (event: VoiceNoteRecorderEvent) => void;
};

export type VoiceNoteRecorderStartResult =
  | { ok: true; format: VoiceNoteFormat }
  | { ok: false; failure: VoiceNoteRecorderFailure }
  | { ok: false; cancelled: true };

function mediaError(message: string, kind: VoiceNoteRecorderFailureKind = "failed") {
  return { kind, message } as VoiceNoteRecorderFailure;
}

export function describeVoiceNoteError(error: unknown): VoiceNoteRecorderFailure {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String(error.name)
      : "";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return mediaError(
      "Microphone access was denied. Allow it in your browser settings, then try again.",
      "denied"
    );
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return mediaError("No microphone was found. Connect one and try again.");
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return mediaError(
      "Your microphone is busy or unavailable. Close other apps using it and try again."
    );
  }
  if (name === "AbortError") {
    return mediaError("Microphone setup was interrupted. Please try again.");
  }
  if (name === "NotSupportedError") {
    return mediaError("Voice notes are not supported by this browser.", "unsupported");
  }

  return mediaError("Voice recording could not start. Please try again.");
}

/**
 * Browser-only defaults are deliberately lazy: importing this module on the
 * server never touches navigator, MediaRecorder, or window.
 */
export function browserVoiceNoteRecorderDependencies(): VoiceNoteRecorderDependencies {
  return {
    requestStream: () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        const error = new Error("getUserMedia is unavailable");
        error.name = "NotSupportedError";
        return Promise.reject(error);
      }
      return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    },
    createRecorder: (stream, mimeType) => new MediaRecorder(stream as MediaStream, { mimeType }),
    isTypeSupported: (mimeType) =>
      typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType),
    now: () => Date.now(),
    setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimer: (timer) => window.clearTimeout(timer as number),
    createBlob: (parts, options) => new Blob(parts, options),
  };
}

/**
 * Owns one in-browser microphone recording. It has no UI or persistence
 * dependency, which makes every browser/media edge case testable through the
 * injected seams above.
 */
export class VoiceNoteRecorder {
  private readonly maxBytes: number;
  private readonly maxDurationMs: number;
  private readonly requestTimeoutMs: number;
  private requestToken = 0;
  private stream: MediaStreamLike | null = null;
  private recorder: MediaRecorderLike | null = null;
  private chunks: Blob[] = [];
  private bytes = 0;
  private startedAt = 0;
  private durationTimer: VoiceNoteTimer | null = null;
  private requestTimer: VoiceNoteTimer | null = null;
  private stopping = false;
  private stopReason: "stopped" | "max-duration" = "stopped";
  private byteLimitExceeded = false;
  private disposed = false;
  private listeners = new Set<(event: VoiceNoteRecorderEvent) => void>();

  constructor(
    private readonly dependencies: VoiceNoteRecorderDependencies,
    private readonly options: VoiceNoteRecorderOptions = {}
  ) {
    this.maxBytes = options.maxBytes ?? MAX_VOICE_NOTE_BYTES;
    this.maxDurationMs = options.maxDurationMs ?? MAX_VOICE_NOTE_DURATION_MS;
    this.requestTimeoutMs =
      options.requestTimeoutMs ?? MICROPHONE_REQUEST_TIMEOUT_MS;
  }

  get isRequestPending() {
    return this.requestTimer !== null;
  }

  get isRecording() {
    return this.recorder !== null && !this.stopping;
  }

  subscribe(listener: (event: VoiceNoteRecorderEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(): Promise<VoiceNoteRecorderStartResult> {
    if (this.disposed) {
      return { ok: false, failure: mediaError("Voice recorder is no longer available.") };
    }
    if (this.isRequestPending || this.recorder) {
      return { ok: false, failure: mediaError("A voice recording is already in progress.") };
    }

    const format = preferredVoiceNoteFormat(this.dependencies.isTypeSupported);
    if (!format) {
      const failure = mediaError(
        "Voice notes are not supported by this browser.",
        "unsupported"
      );
      this.emit({ type: "failed", failure });
      return { ok: false, failure };
    }

    const token = ++this.requestToken;
    this.requestTimer = this.dependencies.setTimer(() => {
      if (token !== this.requestToken || this.recorder || this.disposed) return;
      this.requestToken += 1;
      this.clearRequestTimer();
      this.emit({ type: "request-cancelled", reason: "timed-out" });
    }, this.requestTimeoutMs);

    let stream: MediaStreamLike;
    try {
      stream = await this.dependencies.requestStream();
    } catch (error) {
      if (token !== this.requestToken || this.disposed) {
        return { ok: false, cancelled: true };
      }
      this.clearRequestTimer();
      const failure = describeVoiceNoteError(error);
      this.emit({ type: "failed", failure });
      return { ok: false, failure };
    }

    if (token !== this.requestToken || this.disposed) {
      this.stopTracks(stream);
      return { ok: false, cancelled: true };
    }

    this.clearRequestTimer();
    this.stream = stream;

    let recorder: MediaRecorderLike;
    try {
      recorder = this.dependencies.createRecorder(stream, format.mimeType);
    } catch (error) {
      this.releaseResources();
      const failure = describeVoiceNoteError(error);
      this.emit({ type: "failed", failure });
      return { ok: false, failure };
    }

    if (token !== this.requestToken || this.disposed) {
      this.stopTracks(stream);
      return { ok: false, cancelled: true };
    }

    this.recorder = recorder;
    this.chunks = [];
    this.bytes = 0;
    this.byteLimitExceeded = false;
    this.stopping = false;
    this.stopReason = "stopped";
    this.startedAt = this.dependencies.now();
    recorder.ondataavailable = (event) => this.onData(event.data);
    recorder.onerror = (event) => this.onRecorderError(event.error ?? event);
    recorder.onstop = () => this.onRecorderStop(this.stopReason);

    try {
      // Chunking lets us enforce the byte ceiling before an oversized note is
      // held in memory. The final dataavailable event is still handled below.
      recorder.start(1000);
    } catch (error) {
      this.releaseResources();
      const failure = describeVoiceNoteError(error);
      this.emit({ type: "failed", failure });
      return { ok: false, failure };
    }

    this.durationTimer = this.dependencies.setTimer(() => {
      this.stop("max-duration");
    }, this.maxDurationMs);
    this.emit({ type: "recording", format });
    return { ok: true, format };
  }

  cancelPendingRequest() {
    if (!this.isRequestPending || this.recorder) return false;
    this.requestToken += 1;
    this.clearRequestTimer();
    this.emit({ type: "request-cancelled", reason: "cancelled" });
    return true;
  }

  stop(reason: "stopped" | "max-duration" = "stopped") {
    const recorder = this.recorder;
    if (!recorder || this.stopping) return false;

    this.stopping = true;
    this.stopReason = reason;
    this.clearDurationTimer();
    try {
      if (recorder.state !== "inactive") recorder.stop();
      else this.onRecorderStop(reason);
    } catch (error) {
      this.releaseResources();
      this.emit({ type: "failed", failure: describeVoiceNoteError(error) });
      return false;
    }
    this.stopTracks(this.stream);
    return true;
  }

  discard() {
    this.requestToken += 1;
    this.clearRequestTimer();
    this.clearDurationTimer();
    const recorder = this.recorder;
    this.recorder = null;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        // Resource cleanup must remain best-effort even for a broken recorder.
      }
    }
    this.stopTracks(this.stream);
    this.stream = null;
    this.chunks = [];
    this.bytes = 0;
    this.stopping = false;
  }

  dispose() {
    this.disposed = true;
    this.discard();
  }

  private onData(chunk: Blob) {
    if (!this.recorder || this.stopping && this.byteLimitExceeded) return;
    if (!chunk.size) return;
    this.chunks.push(chunk);
    this.bytes += chunk.size;
    if (this.bytes > this.maxBytes) {
      this.byteLimitExceeded = true;
      this.stop("stopped");
    }
  }

  private onRecorderError(error: unknown) {
    this.releaseResources();
    this.emit({ type: "failed", failure: describeVoiceNoteError(error) });
  }

  private onRecorderStop(reason: "stopped" | "max-duration" = "stopped") {
    const recorder = this.recorder;
    if (!recorder) return;
    this.clearDurationTimer();

    const durationMs = Math.min(
      this.maxDurationMs,
      Math.max(0, this.dependencies.now() - this.startedAt)
    );
    const mimeType = actualVoiceNoteMime(
      recorder.mimeType,
      this.chunks.map((chunk) => chunk.type)
    );
    const extension = mimeType ? voiceNoteExtensionForMime(mimeType) : null;

    if (this.byteLimitExceeded || this.bytes > this.maxBytes) {
      this.releaseResources();
      this.emit({
        type: "failed",
        failure: mediaError(
          "Voice notes must be 5 MB or smaller. Try a shorter recording.",
          "too-large"
        ),
      });
      return;
    }
    if (!this.chunks.length || !mimeType || !extension) {
      this.releaseResources();
      this.emit({
        type: "failed",
        failure: mediaError(
          "Your browser did not provide a usable audio format. Please try again."
        ),
      });
      return;
    }

    const blob = this.dependencies.createBlob(this.chunks, { type: mimeType });
    if (blob.size > this.maxBytes) {
      this.releaseResources();
      this.emit({
        type: "failed",
        failure: mediaError(
          "Voice notes must be 5 MB or smaller. Try a shorter recording.",
          "too-large"
        ),
      });
      return;
    }

    this.releaseResources();
    this.emit({
      type: "completed",
      note: { blob, mimeType, extension, durationMs },
      reason,
    });
  }

  private clearRequestTimer() {
    if (this.requestTimer !== null) {
      this.dependencies.clearTimer(this.requestTimer);
      this.requestTimer = null;
    }
  }

  private clearDurationTimer() {
    if (this.durationTimer !== null) {
      this.dependencies.clearTimer(this.durationTimer);
      this.durationTimer = null;
    }
  }

  private releaseResources() {
    this.clearRequestTimer();
    this.clearDurationTimer();
    const recorder = this.recorder;
    this.recorder = null;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
    }
    this.stopTracks(this.stream);
    this.stream = null;
    this.chunks = [];
    this.bytes = 0;
    this.stopping = false;
  }

  private stopTracks(stream: MediaStreamLike | null) {
    stream?.getTracks().forEach((track) => track.stop());
  }

  private emit(event: VoiceNoteRecorderEvent) {
    this.options.onEvent?.(event);
    this.listeners.forEach((listener) => listener(event));
  }
}

export function createVoiceNoteRecorder(
  dependencies: VoiceNoteRecorderDependencies = browserVoiceNoteRecorderDependencies(),
  options: VoiceNoteRecorderOptions = {}
) {
  return new VoiceNoteRecorder(dependencies, options);
}
