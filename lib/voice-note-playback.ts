export type VoiceNotePlaybackState = {
  playing: boolean;
  pending: boolean;
  ready: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  scrubbing: boolean;
  rateError: string | null;
  error: string | null;
};

export type VoiceNoteAudio = Pick<HTMLAudioElement,
  "duration" | "currentTime" | "paused" | "readyState" | "play" | "pause" | "load"
> & Partial<Pick<HTMLAudioElement, "playbackRate" | "defaultPlaybackRate" | "preservesPitch">>
  & Pick<EventTarget, "addEventListener" | "removeEventListener">;

export const VOICE_NOTE_PLAYBACK_RATES = [1, 1.5, 2] as const;

type PlaybackFrames = {
  request: (callback: FrameRequestCallback) => number;
  cancel: (id: number) => void;
};
type PlaybackVisibility = Pick<Document, "hidden" | "addEventListener" | "removeEventListener">;
type PlaybackOptions = {
  durationMs?: number | null;
  onChange?: (state: VoiceNotePlaybackState) => void;
  frames?: PlaybackFrames;
  visibility?: PlaybackVisibility;
};

const AUDIO_LOAD_ERROR = "Audio could not load. Reload it; if its secure link expired, reopen this conversation to refresh it.";

function durationSeconds(metadata: number, durationMs?: number | null) {
  if (Number.isFinite(metadata) && metadata > 0) return metadata;
  return typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs > 0 ? durationMs / 1000 : 0;
}

export function initialVoiceNotePlayback(durationMs?: number | null): VoiceNotePlaybackState {
  return { playing: false, pending: false, ready: false, currentTime: 0, duration: durationSeconds(0, durationMs), playbackRate: 1, scrubbing: false, rateError: null, error: null };
}

export function formatVoiceNoteTime(seconds: number) {
  const whole = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** One audio element's lifetime. It never starts playback during construction. */
export function createVoiceNotePlayback(
  audio: VoiceNoteAudio,
  options: PlaybackOptions = {},
) {
  let state = initialVoiceNotePlayback(options.durationMs);
  let durationHint = options.durationMs;
  let disposed = false;
  let desiredPlaying = false;
  let playRequest = 0;
  let scrub: { time: number; resume: boolean } | null = null;
  const frames = options.frames ?? (typeof requestAnimationFrame === "function" && typeof cancelAnimationFrame === "function" ? {
    request: (callback: FrameRequestCallback) => requestAnimationFrame(callback),
    cancel: (id: number) => cancelAnimationFrame(id),
  } : undefined);
  const visibility = options.visibility ?? (typeof document !== "undefined" ? document : undefined);
  let frameId: number | null = null;
  const stopFrames = () => {
    if (frameId !== null) frames?.cancel(frameId);
    frameId = null;
  };
  const shouldAnimate = () => !disposed && state.playing && !state.pending && !state.error && !audio.paused && !visibility?.hidden;
  const scheduleFrame = () => {
    if (!frames || !shouldAnimate()) { stopFrames(); return; }
    if (frameId !== null) return;
    frameId = frames.request(() => {
      frameId = null;
      if (!shouldAnimate()) return;
      // Read the media clock, never extrapolate time or change playback speed.
      syncTime();
    });
  };
  const update = (patch: Partial<VoiceNotePlaybackState>) => {
    if (disposed) return;
    if (Object.entries(patch).some(([key, value]) => state[key as keyof VoiceNotePlaybackState] !== value)) {
      state = { ...state, ...patch };
      options.onChange?.(state);
    }
    scheduleFrame();
  };
  const readTime = () => {
    const duration = durationSeconds(audio.duration, durationHint);
    const current = Number.isFinite(audio.currentTime) && audio.currentTime > 0 ? audio.currentTime : 0;
    return { duration, currentTime: duration > 0 ? Math.min(current, duration) : current };
  };
  const syncTime = () => update({ ...readTime(), ready: audio.readyState > 0 });
  const readRate = () => typeof audio.playbackRate === "number" && Number.isFinite(audio.playbackRate) && audio.playbackRate > 0 ? audio.playbackRate : 1;
  const listeners: Record<string, EventListener> = {
    loadedmetadata: syncTime,
    durationchange: syncTime,
    timeupdate: syncTime,
    seeking: syncTime,
    seeked: syncTime,
    ratechange: () => update({ playbackRate: readRate() }),
    canplay: () => { syncTime(); update({ error: null }); },
    waiting: () => { if (desiredPlaying) update({ pending: true }); },
    error: () => {
      scrub = null;
      desiredPlaying = false;
      playRequest += 1;
      audio.pause();
      update({ playing: false, pending: false, ready: false, scrubbing: false, error: AUDIO_LOAD_ERROR });
    },
    playing: () => {
      if (!desiredPlaying) { audio.pause(); return; }
      update({ playing: true, pending: false, error: null });
    },
    pause: () => { if (!audio.paused) return; desiredPlaying = false; playRequest += 1; update({ ...readTime(), playing: false, pending: false }); },
    ended: () => { desiredPlaying = false; playRequest += 1; update({ ...readTime(), playing: false, pending: false }); },
  };
  // A failed child <source> emits a non-bubbling error; capture it at the audio element.
  for (const [name, listener] of Object.entries(listeners)) audio.addEventListener(name, listener, name === "error");
  const syncVisibility = () => {
    // A gesture interrupted by app switching must not leave controls disabled
    // or resume audio later without another explicit Play action.
    if (visibility?.hidden && scrub) {
      scrub = null;
      desiredPlaying = false;
      playRequest += 1;
      audio.pause();
      update({ scrubbing: false, playing: false, pending: false });
    }
    syncTime();
  };
  visibility?.addEventListener("visibilitychange", syncVisibility);
  syncTime();

  const controller = {
    getState: () => state,
    async toggle() {
      if (disposed || scrub) return;
      if (state.pending || !audio.paused) {
        desiredPlaying = false;
        playRequest += 1;
        audio.pause();
        update({ playing: false, pending: false });
        return;
      }
      const request = ++playRequest;
      desiredPlaying = true;
      try {
        if (state.duration > 0 && state.currentTime >= state.duration) audio.currentTime = 0;
        update({ pending: true, error: null });
        await audio.play();
        if (disposed || request !== playRequest) {
          if (disposed || !desiredPlaying) audio.pause();
          return;
        }
        update({ playing: !audio.paused, pending: false });
      } catch (error) {
        if (disposed || request !== playRequest) return;
        desiredPlaying = false;
        audio.pause();
        update({ playing: false, pending: false, error:
          error && typeof error === "object" && "name" in error && error.name === "NotAllowedError"
            ? "Playback was blocked. Press Play to try again."
            : AUDIO_LOAD_ERROR });
      }
    },
    seek(seconds: number) {
      if (disposed || !state.ready || state.error || state.duration <= 0 || !Number.isFinite(seconds)) return false;
      try {
        audio.currentTime = Math.max(0, Math.min(seconds, state.duration));
        syncTime();
        return true;
      } catch {
        update({ error: "Seeking is not available yet. Try playing this voice note first." });
        return false;
      }
    },
    beginScrub() {
      if (disposed || scrub || !state.ready || state.error || state.duration <= 0) return false;
      scrub = { time: readTime().currentTime, resume: desiredPlaying || !audio.paused };
      desiredPlaying = false;
      playRequest += 1;
      audio.pause();
      update({ ...readTime(), playing: false, pending: false, scrubbing: true });
      return true;
    },
    async endScrub(cancelled = false) {
      if (disposed || !scrub) return;
      const previous = scrub;
      scrub = null;
      if (cancelled) controller.seek(previous.time);
      update({ scrubbing: false });
      if (previous.resume && !state.error && state.currentTime < state.duration) await controller.toggle();
    },
    setRate(rate: number) {
      if (disposed || !VOICE_NOTE_PLAYBACK_RATES.some((allowed) => rate === allowed)) return false;
      const previousDefault = audio.defaultPlaybackRate;
      try {
        audio.playbackRate = rate;
        if (audio.playbackRate !== rate) throw new Error("Unsupported speed");
        audio.defaultPlaybackRate = rate;
        if ("preservesPitch" in audio) { try { audio.preservesPitch = true; } catch { /* Browser keeps its pitch policy. */ } }
        update({ playbackRate: readRate(), rateError: null });
        return true;
      } catch {
        try { audio.defaultPlaybackRate = previousDefault; } catch { /* Keep actual browser state. */ }
        update({ playbackRate: readRate(), rateError: "This browser could not change playback speed. Audio still plays at the displayed speed." });
        return false;
      }
    },
    reload() {
      if (disposed) return;
      scrub = null;
      desiredPlaying = false;
      playRequest += 1;
      audio.pause();
      update({ ...initialVoiceNotePlayback(durationHint), playbackRate: readRate() });
      try { audio.load(); } catch { update({ error: AUDIO_LOAD_ERROR }); }
    },
    setDurationHint(durationMs?: number | null) { durationHint = durationMs; syncTime(); },
    dispose() {
      disposed = true;
      scrub = null;
      stopFrames();
      state = { ...state, playing: false, pending: false, scrubbing: false };
      desiredPlaying = false;
      playRequest += 1;
      for (const [name, listener] of Object.entries(listeners)) audio.removeEventListener(name, listener, name === "error");
      visibility?.removeEventListener("visibilitychange", syncVisibility);
      audio.pause();
    },
  };
  return controller;
}

/** Restore sources after an effect replay; detach them when their scope ends. */
export function connectVoiceNotePlayback(
  audio: HTMLAudioElement,
  options: { src: string; durationMs?: number | null; onChange?: (state: VoiceNotePlaybackState) => void },
) {
  const source = audio.querySelector("source");
  const sourceElement = source ?? audio;
  if (sourceElement.getAttribute("src") !== options.src) {
    sourceElement.setAttribute("src", options.src);
    audio.load();
  }
  const playback = createVoiceNotePlayback(audio, options);
  let disconnected = false;
  return {
    ...playback,
    dispose() {
      if (disconnected) return;
      disconnected = true;
      playback.dispose();
      audio.removeAttribute("src");
      source?.removeAttribute("src");
      audio.load();
    },
  };
}
