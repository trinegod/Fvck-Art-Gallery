/** Linear RMS amplitude, not a speech detector or a calibrated loudness measure. */
export function voiceNoteLevelFromSamples(samples: Float32Array): number | null {
  if (!samples.length) return null;
  let squares = 0;
  for (const sample of samples) {
    if (!Number.isFinite(sample)) return null;
    squares += sample * sample;
  }
  return Math.min(1, Math.sqrt(squares / samples.length));
}

export type VoiceNoteLevelCallbacks = {
  onLevel: (level: number) => void;
  onUnavailable: () => void;
};

export type VoiceNoteLevelMonitor = { stop: () => void };

type VoiceNoteAnalyser = {
  fftSize: number;
  getFloatTimeDomainData: (samples: Float32Array<ArrayBuffer>) => void;
  disconnect: () => void;
};

type VoiceNoteAudioSource = {
  connect: (analyser: VoiceNoteAnalyser) => void;
  disconnect: () => void;
};

type VoiceNoteAudioContext = {
  readonly state: string;
  createAnalyser: () => VoiceNoteAnalyser;
  createSource: (stream: unknown) => VoiceNoteAudioSource;
  resume: () => Promise<void>;
  close: () => Promise<void>;
};

export type VoiceNoteLevelDependencies = {
  createContext: () => VoiceNoteAudioContext;
  setTimer: (callback: () => void, delayMs: number) => unknown;
  clearTimer: (timer: unknown) => void;
};

/** Browser APIs remain lazy so importing the recorder during SSR is safe. */
export function browserVoiceNoteLevelDependencies(): VoiceNoteLevelDependencies {
  return {
    createContext: () => {
      const AudioContextConstructor = window.AudioContext
        ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) throw new Error("Audio analysis is unavailable");
      const context = new AudioContextConstructor();
      return {
        get state() { return context.state; },
        createAnalyser: () => context.createAnalyser(),
        createSource: (stream) => {
          const source = context.createMediaStreamSource(stream as MediaStream);
          return {
            connect: (analyser) => { source.connect(analyser as AnalyserNode); },
            disconnect: () => source.disconnect(),
          };
        },
        resume: () => context.resume(),
        close: () => context.close(),
      };
    },
    setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimer: (timer) => window.clearTimeout(timer as number),
  };
}

/**
 * Measures the existing microphone stream; never acquires another stream or sends
 * audio to speakers. Analyser output may remain unconnected per the Web Audio API:
 * https://www.w3.org/TR/webaudio/#AnalyserNode
 */
export function createVoiceNoteLevelMonitor(
  stream: unknown,
  callbacks: VoiceNoteLevelCallbacks,
  dependencies: VoiceNoteLevelDependencies = browserVoiceNoteLevelDependencies(),
): VoiceNoteLevelMonitor {
  let active = true;
  let context: VoiceNoteAudioContext | null = null;
  let source: VoiceNoteAudioSource | null = null;
  let analyser: VoiceNoteAnalyser | null = null;
  let sampleTimer: unknown = null;
  let startupTimer: unknown = null;
  const samples = new Float32Array(2048);

  const clearTimer = (timer: unknown) => {
    if (timer === null) return;
    try { dependencies.clearTimer(timer); } catch { /* Continue releasing audio resources. */ }
  };

  const stop = () => {
    if (!active) return;
    active = false;
    clearTimer(sampleTimer);
    clearTimer(startupTimer);
    sampleTimer = null;
    startupTimer = null;
    try { source?.disconnect(); } catch { /* The source may already be disconnected. */ }
    try { analyser?.disconnect(); } catch { /* Still close its owning context. */ }
    try { void context?.close().catch(() => {}); } catch { /* Cleanup is best effort. */ }
    source = null;
    analyser = null;
    context = null;
  };

  const unavailable = () => {
    if (!active) return;
    stop();
    callbacks.onUnavailable();
  };

  const sample = () => {
    sampleTimer = null;
    if (!active) return;
    try {
      if (context?.state !== "running" || !analyser) {
        unavailable();
        return;
      }
      // An unsuccessful/incomplete read must not recycle a previous active frame.
      samples.fill(NaN);
      analyser.getFloatTimeDomainData(samples);
      const level = voiceNoteLevelFromSamples(samples);
      if (level === null) {
        unavailable();
        return;
      }
      callbacks.onLevel(level);
      if (active) sampleTimer = dependencies.setTimer(sample, 50);
    } catch {
      unavailable();
    }
  };

  const beginSampling = () => {
    if (!active) return;
    clearTimer(startupTimer);
    startupTimer = null;
    if (context?.state !== "running") {
      unavailable();
      return;
    }
    sampleTimer = dependencies.setTimer(sample, 50);
  };

  try {
    context = dependencies.createContext();
    analyser = context.createAnalyser();
    analyser.fftSize = samples.length;
    source = context.createSource(stream);
    source.connect(analyser);
    // Intentionally no analyser.connect(), gain node, or context.destination.
    if (context.state === "running") {
      beginSampling();
    } else {
      startupTimer = dependencies.setTimer(unavailable, 1500);
      void context.resume().then(beginSampling).catch(unavailable);
    }
  } catch {
    unavailable();
  }

  return { stop };
}
