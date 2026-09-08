export type VoiceNoteWaveform = { bars: number[]; duration: number };

type DecodedVoiceAudio = Pick<AudioBuffer, "duration" | "length" | "numberOfChannels" | "getChannelData">;
type WaveformDependencies = {
  fetch: (src: string, options: RequestInit) => Promise<Response>;
  decode: (bytes: ArrayBuffer) => Promise<DecodedVoiceAudio>;
  timeoutMs?: number;
};

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const DECODE_SAMPLE_RATE = 8_000;
const MAX_DECODE_SECONDS = 301; // Allow one second of container/encoder rounding.

/** Incoming claimed duration is not enough to trigger unsolicited native decoding. */
export function canAutoLoadVoiceNoteWaveform(options: {
  src: string; outgoing: boolean; durationMs?: number | null; nativeDuration: number;
}) {
  if (Number.isFinite(options.nativeDuration) && options.nativeDuration > 0) return options.nativeDuration <= MAX_DECODE_SECONDS;
  return (options.outgoing || options.src.startsWith("blob:"))
    && typeof options.durationMs === "number" && Number.isFinite(options.durationMs)
    && options.durationMs > 0 && options.durationMs <= 300_000;
}

/** Decoded audio duration supersedes an informational saved hint; native media metadata still wins in playback. */
export function voiceNotePlaybackDurationHint(recordedDurationMs: number | null | undefined, waveform: VoiceNoteWaveform | null) {
  if (waveform && Number.isFinite(waveform.duration) && waveform.duration > 0 && waveform.duration <= MAX_DECODE_SECONDS) return waveform.duration * 1000;
  return typeof recordedDurationMs === "number" && Number.isFinite(recordedDurationMs) && recordedDurationMs > 0 ? recordedDurationMs : null;
}

function offlineContextConstructor() {
  return globalThis.OfflineAudioContext
    ?? (globalThis as typeof globalThis & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
}

function interruptible<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Waveform request ended", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener("abort", abort); resolve(value); },
      (error) => { signal.removeEventListener("abort", abort); reject(error); },
    );
    if (signal.aborted) abort();
  });
}

async function readBoundedAudio(response: Response, signal: AbortSignal): Promise<ArrayBuffer | null> {
  if (!response.ok || !response.body || Number(response.headers.get("content-length")) > MAX_FILE_BYTES) {
    void response.body?.cancel().catch(() => undefined);
    return null;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await interruptible(reader.read(), signal);
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FILE_BYTES) return null;
      chunks.push(value);
    }
    if (!size) return null;
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes.buffer;
  } finally {
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function envelope(audio: DecodedVoiceAudio): VoiceNoteWaveform | null {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0 || audio.duration > MAX_DECODE_SECONDS
    || !Number.isInteger(audio.length) || audio.length <= 0 || audio.length > DECODE_SAMPLE_RATE * MAX_DECODE_SECONDS
    || !Number.isInteger(audio.numberOfChannels) || audio.numberOfChannels < 1 || audio.numberOfChannels > 2) return null;
  const channels = Array.from({ length: audio.numberOfChannels }, (_, channel) => audio.getChannelData(channel));
  const count = Math.min(48, audio.length);
  const bars = Array.from({ length: count }, (_, bin) => {
    const start = Math.floor(bin * audio.length / count);
    const end = Math.floor((bin + 1) * audio.length / count);
    let sum = 0;
    for (const channel of channels) {
      for (let sample = start; sample < end; sample += 1) {
        const value = Number.isFinite(channel[sample]) ? Math.max(-1, Math.min(1, channel[sample])) : 0;
        sum += value * value;
      }
    }
    return Math.sqrt(sum / ((end - start) * channels.length));
  });
  return { bars, duration: audio.duration };
}

/** Fetch only an already-authorized note URL; decoding never connects to audio output. */
export function createVoiceNoteWaveformLoader(dependencies: Partial<WaveformDependencies> = {}) {
  const fetchAudio = dependencies.fetch ?? ((src: string, options: RequestInit) => fetch(src, options));
  const decodeAudio = dependencies.decode ?? ((bytes: ArrayBuffer) => {
    const OfflineContext = offlineContextConstructor();
    if (!OfflineContext) return Promise.reject(new Error("Offline audio decoding unavailable"));
    return new OfflineContext(1, 1, DECODE_SAMPLE_RATE).decodeAudioData(bytes);
  });
  let queue = Promise.resolve();
  let activeDecode: Promise<DecodedVoiceAudio> | null = null;
  let timedOutDecode: Promise<DecodedVoiceAudio> | null = null;
  const process = async (src: string, signal: AbortSignal): Promise<VoiceNoteWaveform | null> => {
    if (signal.aborted || (activeDecode && activeDecode === timedOutDecode) || (!dependencies.decode && !offlineContextConstructor())) return null;
    const request = new AbortController();
    const abort = () => request.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(() => {
      if (activeDecode) timedOutDecode = activeDecode;
      abort();
    }, dependencies.timeoutMs ?? 15_000);
    try {
      // A cancelled preview may still be decoding when its sent bubble mounts.
      // Wait within this request's deadline; never overlap uncancellable native decodes.
      if (activeDecode) await interruptible(activeDecode.then(() => undefined, () => undefined), request.signal);
      if (request.signal.aborted) return null;
      const response = await interruptible(fetchAudio(src, { signal: request.signal, credentials: "same-origin", cache: "no-store" }), request.signal);
      const bytes = await readBoundedAudio(response, request.signal);
      if (!bytes || request.signal.aborted) return null;
      const decoding = Promise.resolve().then(() => decodeAudio(bytes));
      activeDecode = decoding;
      const release = () => {
        if (activeDecode === decoding) activeDecode = null;
        if (timedOutDecode === decoding) timedOutDecode = null;
      };
      void decoding.then(release, release);
      const audio = await interruptible(decoding, request.signal);
      return request.signal.aborted ? null : envelope(audio);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      request.abort();
    }
  };
  return {
    load(src: string, signal: AbortSignal): Promise<VoiceNoteWaveform | null> {
      const result = queue.then(() => process(src, signal));
      queue = result.then(() => undefined);
      return interruptible(result, signal).catch(() => null);
    },
  };
}

// A single page-wide queue; only tiny envelopes remain in mounted players, never signed URLs or audio caches.
const waveformLoader = createVoiceNoteWaveformLoader();
export const loadVoiceNoteWaveform = waveformLoader.load;
