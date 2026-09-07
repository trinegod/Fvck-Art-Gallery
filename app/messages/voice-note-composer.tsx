"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, RotateCcw, Send, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createVoiceNoteRecorder,
  MAX_VOICE_NOTE_DURATION_MS,
  type VoiceNoteRecorderEvent,
  type VoiceNoteRecorderFailure,
} from "@/lib/voice-note-recorder";
import VoiceNotePlayer from "./voice-note-player";

export type VoiceNotePayload = {
  file: File;
  mimeType: string;
  extension: string;
  durationMs: number;
};

type VoiceNoteComposerProps = {
  /** Changes when an account or conversation changes, invalidating local audio. */
  conversationKey: string;
  /** Enables the explicit Send action; recording and local preview remain usable when false. */
  sendEnabled: boolean;
  /** Honest explanation shown alongside the disabled Send action. */
  disabledReason?: string;
  /** Parent-owned persistence. The component never accesses Supabase. */
  onSend?: (voiceNote: VoiceNotePayload) => Promise<void> | void;
  /** Temporarily disable all actions (for example, while another composer action runs). */
  disabled?: boolean;
  className?: string;
};

type ComposerPhase =
  | "idle"
  | "requesting"
  | "recording"
  | "stopping"
  | "preview"
  | "sending"
  | "error";

type LocalPreview = VoiceNotePayload & { url: string };

function formatDuration(durationMs: number) {
  const totalSeconds = Math.ceil(Math.max(0, durationMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function failureMessage(failure: VoiceNoteRecorderFailure) {
  return failure.message;
}

export default function VoiceNoteComposer({
  conversationKey,
  sendEnabled,
  disabledReason,
  onSend,
  disabled = false,
  className,
}: VoiceNoteComposerProps) {
  const [phase, setPhase] = useState<ComposerPhase>("idle");
  const [preview, setPreview] = useState<LocalPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const previewUrlRef = useRef<string | null>(null);
  const instanceRef = useRef(0);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const revokePreview = useCallback(() => {
    revokePreviewUrl();
    setPreview(null);
  }, [revokePreviewUrl]);

  const [recorder] = useState(() => createVoiceNoteRecorder());

  const handleRecorderEvent = useCallback((event: VoiceNoteRecorderEvent) => {
    if (event.type === "recording") {
      setPhase("recording");
      setError(null);
      setRecordingStartedAt(Date.now());
      setElapsedMs(0);
      return;
    }
    if (event.type === "request-cancelled") {
      setRecordingStartedAt(null);
      setElapsedMs(0);
      if (event.reason === "timed-out") {
        setPhase("error");
        setError("Microphone permission request timed out. Check your browser and try again.");
      } else {
        setPhase("idle");
        setError(null);
      }
      return;
    }
    if (event.type === "failed") {
      setPhase("error");
      setError(failureMessage(event.failure));
      setRecordingStartedAt(null);
      setElapsedMs(0);
      return;
    }

    const note = event.note;
    const file = new File(
      [note.blob],
      `voice-note-${Date.now()}.${note.extension}`,
      { type: note.mimeType }
    );
    revokePreview();
    const url = URL.createObjectURL(note.blob);
    previewUrlRef.current = url;
    setPreview({ ...note, file, url });
    setPhase("preview");
    setRecordingStartedAt(null);
    setElapsedMs(note.durationMs);
    setError(
      event.reason === "max-duration"
        ? "Maximum voice-note length reached (1:00). Review it before sending."
        : null
    );
  }, [revokePreview]);

  useLayoutEffect(
    () => recorder.subscribe(handleRecorderEvent),
    [recorder, handleRecorderEvent]
  );

  const resetComposer = useCallback(() => {
    recorder.discard();
    revokePreview();
    setPhase("idle");
    setError(null);
    setRecordingStartedAt(null);
    setElapsedMs(0);
  }, [recorder, revokePreview]);

  useEffect(() => {
    if (phase !== "recording" || recordingStartedAt === null) return;
    const update = () =>
      setElapsedMs(
        Math.min(MAX_VOICE_NOTE_DURATION_MS, Date.now() - recordingStartedAt)
      );
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [phase, recordingStartedAt]);

  useLayoutEffect(() => {
    // A locally captured blob must never bleed into a different account/chat.
    const instance = ++instanceRef.current;
    recorder.discard();
    revokePreviewUrl();
    queueMicrotask(() => {
      if (instance !== instanceRef.current) return;
      setPreview(null);
      setPhase("idle");
      setError(null);
      setRecordingStartedAt(null);
      setElapsedMs(0);
    });
    return () => {
      instanceRef.current += 1;
      recorder.discard();
      revokePreviewUrl();
    };
  }, [conversationKey, recorder, revokePreviewUrl]);

  useLayoutEffect(() => {
    if (!disabled) return;
    const instance = ++instanceRef.current;
    recorder.discard();
    revokePreviewUrl();
    queueMicrotask(() => {
      if (instance !== instanceRef.current) return;
      setPreview(null);
      setPhase("idle");
      setError(null);
      setRecordingStartedAt(null);
      setElapsedMs(0);
    });
  }, [disabled, recorder, revokePreviewUrl]);

  const startRecording = () => {
    if (
      disabled ||
      phase === "requesting" ||
      phase === "recording" ||
      phase === "stopping" ||
      phase === "sending"
    ) {
      return;
    }
    resetComposer();
    setPhase("requesting");
    void recorder.start();
  };

  const stopRecording = () => {
    if (recorder.stop()) {
      setPhase("stopping");
    }
  };

  const sendPreview = async () => {
    if (!preview || disabled || !sendEnabled || !onSend || phase === "sending") {
      return;
    }
    const instance = instanceRef.current;
    setPhase("sending");
    setError(null);
    try {
      await onSend(preview);
      if (instance !== instanceRef.current) return;
      revokePreview();
      setPhase("idle");
      setElapsedMs(0);
    } catch (sendError) {
      if (instance !== instanceRef.current) return;
      setPhase("preview");
      const uncertain =
        typeof sendError === "object" &&
        sendError !== null &&
        "outcome" in sendError &&
        sendError.outcome === "unknown";
      setError(
        uncertain && sendError instanceof Error
          ? sendError.message
          : sendError instanceof Error
          ? `Voice note wasn't sent: ${sendError.message}`
          : "Voice note wasn't sent. Please try again."
      );
    }
  };

  const canRecord =
    !disabled &&
    phase !== "requesting" &&
    phase !== "recording" &&
    phase !== "stopping" &&
    phase !== "sending";
  const sendUnavailable = !sendEnabled || !onSend;
  const sendUnavailableMessage =
    disabledReason ??
    "Voice-note sending is not activated yet. You can still record and review a note locally.";

  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-300",
        className
      )}
      aria-label="Voice note"
    >
      {phase === "preview" || phase === "sending" ? (
        <div className="space-y-3">
          {preview && (
            <VoiceNotePlayer
              src={preview.url}
              mimeType={preview.mimeType}
              label={`Voice note, ${formatDuration(preview.durationMs)}`}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={disabled || phase === "sending"}
              onClick={resetComposer}
            >
              <Trash2 className="size-3.5" />
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              disabled={disabled || sendUnavailable || phase === "sending"}
              onClick={() => void sendPreview()}
              aria-describedby={sendUnavailable ? "voice-note-send-status" : undefined}
            >
              {phase === "sending" ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Send />
              )}
              {phase === "sending" ? "Sending" : "Send voice note"}
            </Button>
          </div>
          {sendUnavailable && (
            <p
              id="voice-note-send-status"
              className="text-xs leading-5 text-amber-200/80"
            >
              {sendUnavailableMessage}
            </p>
          )}
        </div>
      ) : phase === "requesting" ? (
        <div className="flex flex-wrap items-center gap-3">
          <LoaderCircle className="size-4 animate-spin text-cyan-200" aria-hidden="true" />
          <p className="flex-1 text-xs leading-5 text-zinc-400">
            Waiting for microphone permission…
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => recorder.cancelPendingRequest()}
          >
            Cancel
          </Button>
        </div>
      ) : phase === "recording" || phase === "stopping" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 font-medium text-rose-200">
            <span className="size-2 rounded-full bg-rose-300" aria-hidden="true" />
            {phase === "stopping"
              ? "Finalizing voice note…"
              : `Recording ${formatDuration(elapsedMs)} / 1:00`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={disabled || phase === "stopping"}
            onClick={stopRecording}
          >
            <Square className="size-3.5 fill-current" />
            Stop
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11"
            disabled={phase === "stopping"}
            onClick={resetComposer}
          >
            <Trash2 className="size-3.5" />
            Discard
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={!canRecord}
            onClick={startRecording}
          >
            {phase === "error" ? <RotateCcw /> : <Mic />}
            {phase === "error" ? "Try recording again" : "Record voice note"}
          </Button>
          <p className="text-xs leading-5 text-zinc-500">
            Up to 1 minute or 4 MiB. You review audio before it is sent.
          </p>
        </div>
      )}
      {error && (
        <p className="mt-2 text-xs leading-5 text-rose-200" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
