import type { VoiceNoteRecorder, VoiceNoteRecorderEvent } from "./voice-note-recorder";

export type VoiceNotePayload = { file: File; mimeType: string; extension: string; durationMs: number };
type Sender = (note: VoiceNotePayload) => Promise<void> | void;
type Phase = "idle" | "requesting" | "recording" | "stopping" | "preview" | "sending" | "error";
export type VoiceNoteSessionState = {
  phase: Phase;
  note: (VoiceNotePayload & { url: string }) | null;
  startedAt: number | null;
  levels: number[];
  meterUnavailable: boolean;
  error: string | null;
  notice: string | null;
  deliveryUncertain: boolean;
};
const initialState = (): VoiceNoteSessionState => ({ phase: "idle", note: null, startedAt: null, levels: [], meterUnavailable: false, error: null, notice: null, deliveryUncertain: false });

/** Owns the inline interaction, not delivery/authentication. Start is called
 * directly by the microphone button; rendering/subscribing never captures audio. */
export function createVoiceNoteSession(
  recorder: Pick<VoiceNoteRecorder, "subscribe" | "start" | "stop" | "discard">,
  resources = { createUrl: (blob: Blob) => URL.createObjectURL(blob), revokeUrl: (url: string) => URL.revokeObjectURL(url), now: () => Date.now() },
) {
  let state = initialState();
  const getSnapshot = () => state;
  let generation = 0;
  let sendAfterStop: Sender | null = null;
  const listeners = new Set<() => void>();
  const update = (patch: Partial<VoiceNoteSessionState>) => {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  };
  const reset = () => {
    generation++;
    sendAfterStop = null;
    recorder.discard();
    const previousUrl = state.note?.url;
    state = initialState();
    try { if (previousUrl) resources.revokeUrl(previousUrl); } catch { /* Clear private UI even if browser cleanup fails. */ }
    listeners.forEach(listener => listener());
  };
  const send = async (sender: Sender) => {
    if (state.phase !== "preview" || !state.note || state.deliveryUncertain) return;
    const note = state.note;
    const instance = generation;
    update({ phase: "sending", error: null, notice: null });
    try {
      await sender(note);
      if (instance === generation) reset();
    } catch (error) {
      if (instance !== generation) return;
      const uncertain = typeof error === "object" && error !== null && "outcome" in error && error.outcome === "unknown";
      update({ phase: "preview", deliveryUncertain: uncertain, error: error instanceof Error ? error.message : "Voice note could not be sent. Please try again." });
    }
  };
  const handleEvent = (event: VoiceNoteRecorderEvent) => {
    if (event.type === "recording") {
      if (state.phase === "requesting") update({ phase: "recording", startedAt: resources.now() });
    } else if (event.type === "level") {
      if (state.phase === "recording" && Number.isFinite(event.level)) {
        update({ levels: [...state.levels.slice(-27), Math.max(0, Math.min(1, event.level))] });
      }
    } else if (event.type === "level-unavailable") {
      if (state.phase === "recording") update({ meterUnavailable: true, levels: [] });
    } else if (event.type === "request-cancelled") {
      if (state.phase !== "requesting") return;
      if (event.reason === "cancelled") reset();
      else update({ phase: "error", error: "Microphone permission timed out. Check your browser and try again." });
    } else if (event.type === "failed") {
      if (!["requesting", "recording", "stopping"].includes(state.phase)) return;
      sendAfterStop = null;
      update({ phase: "error", error: event.failure.message, levels: [], startedAt: null });
    } else if (event.type === "completed") {
      if (state.phase !== "recording" && state.phase !== "stopping") return;
      const pendingSend = sendAfterStop;
      sendAfterStop = null;
      const { blob, ...metadata } = event.note;
      let note: VoiceNoteSessionState["note"];
      try {
        const file = new File([blob], `voice-note-${resources.now()}.${metadata.extension}`, { type: metadata.mimeType });
        note = { ...metadata, file, url: resources.createUrl(blob) };
      } catch {
        update({ phase: "error", startedAt: null, levels: [], error: "Your browser could not prepare the voice note. Please record it again." });
        return;
      }
      update({ phase: "preview", note, startedAt: null, levels: [], notice: event.reason === "max-duration" ? "1:00 limit reached. Send or discard this note." : null });
      if (pendingSend) void send(pendingSend);
    }
  };
  recorder.subscribe(handleEvent);

  const stop = () => {
    if (state.phase !== "recording") return;
    update({ phase: "stopping", levels: [] });
    if (!recorder.stop() && getSnapshot().phase === "stopping") {
      sendAfterStop = null;
      update({ phase: "error", error: "Recording stopped unexpectedly. Please try again." });
    }
  };
  return {
    getSnapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start: () => {
      if (state.phase !== "idle" && state.phase !== "error") return;
      reset();
      update({ phase: "requesting" });
      void recorder.start();
    },
    stop,
    stopAndSend: (sender: Sender) => {
      if (state.phase !== "recording") return;
      sendAfterStop = sender;
      stop();
    },
    send,
    reset,
  };
}
