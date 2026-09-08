"use client";

import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { LoaderCircle, Mic, Send, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createVoiceNoteRecorder, MAX_VOICE_NOTE_DURATION_MS } from "@/lib/voice-note-recorder";
import { createVoiceNoteSession, type VoiceNotePayload } from "@/lib/voice-note-session";
import VoiceNotePlayer from "./voice-note-player";

export type { VoiceNotePayload } from "@/lib/voice-note-session";
type VoiceNoteComposerProps = {
  conversationKey: string;
  sendEnabled: boolean;
  disabledReason?: string;
  onSend?: (note: VoiceNotePayload) => Promise<void> | void;
  disabled?: boolean;
  onActiveChange?: (active: boolean) => void;
  /** Existing attachment button and text/send controls are preserved when idle. */
  attachment?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Injected media boundary for deterministic, microphone-free verification. */
  recorderFactory?: typeof createVoiceNoteRecorder;
};
const iconButton = "nodeine-action grid size-[44px] shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-45";
const formatTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
const maximumMinutes = MAX_VOICE_NOTE_DURATION_MS / 60_000;
const durationLimitLabel = `${maximumMinutes} ${maximumMinutes === 1 ? "minute" : "minutes"}`;
const durationLimitTime = formatTime(MAX_VOICE_NOTE_DURATION_MS);

export default function VoiceNoteComposer({ conversationKey, sendEnabled, disabledReason, onSend, disabled = false, onActiveChange, attachment, children, className, recorderFactory = createVoiceNoteRecorder }: VoiceNoteComposerProps) {
  const [session] = useState(() => createVoiceNoteSession(recorderFactory()));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const { phase, note } = state;
  const active = phase !== "idle" && phase !== "error";
  const [elapsed, setElapsed] = useState(0);
  const micRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previouslyActive = useRef(false);
  const sendRef = useRef<HTMLButtonElement>(null);
  const previousPhase = useRef(phase);
  const lastVoiceFocus = useRef<HTMLElement | null>(null);
  const statusId = useId();

  useLayoutEffect(() => () => session.reset(), [session, conversationKey]);
  useLayoutEffect(() => { if (disabled) session.reset(); }, [disabled, session]);
  useEffect(() => { onActiveChange?.(active); }, [active, onActiveChange]);
  useEffect(() => {
    if (active && !previouslyActive.current) cancelRef.current?.focus({ preventScroll: true });
    if (!active && previouslyActive.current) micRef.current?.focus({ preventScroll: true });
    const removedControlHadFocus = lastVoiceFocus.current && !lastVoiceFocus.current.isConnected && document.activeElement === document.body;
    if (phase === "preview" && previousPhase.current !== "preview" && removedControlHadFocus) {
      const target = sendRef.current?.disabled ? cancelRef.current : sendRef.current;
      target?.focus({ preventScroll: true });
    }
    previouslyActive.current = active;
    previousPhase.current = phase;
  }, [active, phase]);
  useEffect(() => {
    if (phase !== "recording" || state.startedAt === null) return;
    const update = () => setElapsed(Math.min(MAX_VOICE_NOTE_DURATION_MS, Math.max(0, Date.now() - state.startedAt!)));
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [phase, state.startedAt]);

  const canSend = sendEnabled && Boolean(onSend) && !disabled && !state.deliveryUncertain;
  const levels = [...Array(Math.max(0, 28 - state.levels.length)).fill(0), ...state.levels];
  return (
    <div className={cn("min-w-0", className)} data-voice-phase={phase}>
      {!active ? (
        <div className="nodeine-chat-composer-row">
          {attachment}
          <button ref={micRef} type="button" onClick={() => { setElapsed(0); session.start(); }} disabled={disabled}
            className={cn(iconButton, "border border-cyan-300/20 text-cyan-200 hover:bg-cyan-300/10")}
            aria-label="Record voice note" title={`Record voice note (up to ${durationLimitLabel} or 4 MiB)`}>
            <Mic className="size-4" aria-hidden="true" />
          </button>
          {children}
          <span className="sr-only">Up to {durationLimitLabel} or 4 MiB. Recording starts when you press the microphone; send only when you choose.</span>
        </div>
      ) : (
        <section aria-label="Voice note recorder" className="min-w-0" onFocusCapture={event => { lastVoiceFocus.current = event.target as HTMLElement; }} onKeyDown={event => {
          if (event.key === "Escape" && phase !== "sending") { event.preventDefault(); session.reset(); }
        }}>
          <div className="nodeine-voice-row flex min-w-0 items-center gap-1.5">
            <button ref={cancelRef} type="button" onClick={() => session.reset()} disabled={phase === "sending"}
              className={cn(iconButton, "text-zinc-400 hover:bg-rose-300/10 hover:text-rose-200")}
              aria-label="Discard voice note" title="Discard voice note">
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
            {note ? (
              <VoiceNotePlayer key={note.url} src={note.url} mimeType={note.mimeType} durationMs={note.durationMs} outgoing className="nodeine-voice-content min-w-0 flex-1" label="Unsent voice note" />
            ) : (
              <div className="nodeine-voice-content flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#252d3a] px-3 text-zinc-100">
                {phase === "recording" ? <>
                  <span className="size-2 shrink-0 rounded-full bg-rose-300" aria-hidden="true" />
                  <span className="shrink-0 text-xs tabular-nums" aria-label={`Recorded ${formatTime(elapsed)} of ${durationLimitLabel}`}>{formatTime(elapsed)}<span className="text-zinc-400"> / {durationLimitTime}</span></span>
                  <div className="nodeine-live-waveform h-7 min-w-0 flex-1 items-center" aria-hidden="true" data-live-waveform>
                    {levels.map((level, index) => <span key={index} className="rounded-full bg-cyan-200" style={{ height: `${Math.max(2, Math.sqrt(level) * 28)}px` }} />)}
                  </div>
                </> : <>
                  <LoaderCircle className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
                  <span className="text-xs leading-4">{phase === "requesting" ? "Allow microphone access…" : "Finishing…"}</span>
                </>}
              </div>
            )}
            {phase === "recording" && <button type="button" className={cn(iconButton, "text-zinc-300 hover:bg-white/10")} onClick={() => session.stop()} aria-label="Stop and review voice note" title="Stop and review">
              <Square className="size-4 fill-current" aria-hidden="true" />
            </button>}
            <button ref={sendRef} type="button" className={cn(iconButton, "bg-[var(--chat-bubble,#8de6ed)] text-[var(--chat-ink,#0b2025)] hover:brightness-110")}
              disabled={!canSend || !["recording", "preview"].includes(phase)}
              onClick={() => { if (!onSend || !canSend) return; if (phase === "recording") session.stopAndSend(onSend); else void session.send(onSend); }}
              aria-label={phase === "sending" ? "Sending voice note" : "Send voice note"} title="Send voice note"
              aria-describedby={!canSend ? statusId : undefined}>
              {phase === "sending" ? <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
            </button>
          </div>
          <p className="sr-only" role="status" aria-live="polite">{phase === "recording" ? "Recording. Stop to review, send, or discard." : phase === "preview" ? "Voice note ready. Send or discard." : phase === "sending" ? "Sending voice note." : phase === "requesting" ? "Waiting for microphone permission." : "Finishing recording."}</p>
          {state.meterUnavailable && phase === "recording" && <p className="mt-1 text-xs text-zinc-400">Recording; live level display unavailable.</p>}
          {!canSend && <p id={statusId} className="mt-2 text-xs leading-5 text-amber-100">{state.deliveryUncertain ? "Delivery unconfirmed. Check the conversation before recording another note." : disabledReason ?? "Voice-note delivery is not activated. Recording stays on this device."}</p>}
        </section>
      )}
      {state.notice && <p className="mt-1 text-xs leading-5 text-zinc-400" role="status">{state.notice}</p>}
      {state.error && <p className="mt-2 text-xs leading-5 text-rose-200" role="alert">{state.error}</p>}
    </div>
  );
}
