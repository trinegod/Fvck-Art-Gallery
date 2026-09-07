"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { LoaderCircle, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { connectVoiceNotePlayback, formatVoiceNoteTime, initialVoiceNotePlayback } from "@/lib/voice-note-playback";

type VoiceNotePlayerProps = {
  src: string;
  mimeType?: string | null;
  durationMs?: number | null;
  outgoing?: boolean;
  label?: string;
  className?: string;
};

export default function VoiceNotePlayer(props: VoiceNotePlayerProps) {
  return <VoiceNotePlayerSession key={JSON.stringify([props.src, props.mimeType ?? null])} {...props} />;
}

function VoiceNotePlayerSession({
  src,
  mimeType,
  durationMs,
  outgoing = false,
  label = "Voice note",
  className,
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<ReturnType<typeof connectVoiceNotePlayback> | null>(null);
  const initialDurationHint = useRef(durationMs);
  const [playback, setPlayback] = useState(() => initialVoiceNotePlayback(durationMs));

  useLayoutEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const player = connectVoiceNotePlayback(audio, { src, durationMs: initialDurationHint.current, onChange: setPlayback });
    playerRef.current = player;
    return () => {
      playerRef.current = null;
      player.dispose();
    };
  }, [src, mimeType]);

  useLayoutEffect(() => {
    playerRef.current?.setDurationHint(durationMs);
  }, [durationMs]);

  const current = formatVoiceNoteTime(playback.currentTime);
  const duration = formatVoiceNoteTime(playback.duration);
  const progress = playback.duration > 0 ? Math.min(100, playback.currentTime / playback.duration * 100) : 0;
  const canSeek = playback.ready && playback.duration > 0 && !playback.error;
  const playLabel = playback.pending ? `Cancel playback of ${label}` : `${playback.playing ? "Pause" : "Play"} ${label}`;

  return (
    <div
      role="group"
      aria-label={label}
      data-voice-player={outgoing ? "outgoing" : "incoming"}
      style={{
        backgroundColor: outgoing ? "var(--chat-bubble, #8de6ed)" : "#252d3a",
        color: outgoing ? "var(--chat-ink, #0b2025)" : "#f2f3f8",
      }}
      className={cn("w-full min-w-0 max-w-sm rounded-2xl border border-current/10 px-2 py-1 text-left", outgoing ? "rounded-br-md" : "rounded-bl-md", className)}
    >
      <audio ref={audioRef} preload="metadata" hidden>
        <source src={src} type={mimeType ?? undefined} />
      </audio>
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label={playLabel}
          aria-busy={playback.pending || undefined}
          title={playLabel}
          onClick={() => void playerRef.current?.toggle()}
          className="grid size-[44px] shrink-0 place-items-center rounded-full hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {playback.pending ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : playback.playing ? <Pause className="size-5" fill="currentColor" aria-hidden="true" /> : <Play className="size-5" fill="currentColor" aria-hidden="true" />}
        </button>
        <div className="relative h-11 min-w-0 flex-1 rounded-md focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-current">
          <div className="pointer-events-none absolute inset-x-1 top-3 h-1 rounded-full" aria-hidden="true">
            <span className="absolute inset-0 rounded-full bg-current opacity-25" />
            <span className="absolute inset-y-0 left-0 rounded-full bg-current" style={{ width: `${progress}%` }} />
            <span className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" style={{ left: `${progress}%` }} />
          </div>
          <span className="pointer-events-none absolute bottom-0 right-1 max-w-full truncate font-mono text-xs tabular-nums" aria-hidden="true">
            {playback.currentTime > 0 ? current : duration}
          </span>
          <input
            type="range"
            min={0}
            max={playback.duration || 1}
            step={0.1}
            value={playback.duration > 0 ? playback.currentTime : 0}
            disabled={!canSeek}
            aria-label={`Seek ${label}`}
            aria-valuetext={`${current} elapsed${playback.duration > 0 ? ` of ${duration}` : "; duration not available yet"}`}
            title={playback.duration > 0 ? `Duration ${duration}` : "Duration not available yet"}
            onChange={(event) => playerRef.current?.seek(event.currentTarget.valueAsNumber)}
            className="absolute inset-0 m-0 h-full w-full min-w-0 cursor-pointer opacity-0 disabled:cursor-default"
          />
        </div>
      </div>
      {playback.error && (
        <div className="space-y-1 px-1 pb-1" role="alert">
          <p className="break-words text-xs leading-5">{playback.error}</p>
          <button type="button" onClick={() => playerRef.current?.reload()} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-current">
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reload audio
          </button>
        </div>
      )}
    </div>
  );
}
