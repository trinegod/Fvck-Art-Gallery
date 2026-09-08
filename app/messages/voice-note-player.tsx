"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { LoaderCircle, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { connectVoiceNotePlayback, formatVoiceNoteTime, initialVoiceNotePlayback, VOICE_NOTE_PLAYBACK_RATES } from "@/lib/voice-note-playback";
import { canAutoLoadVoiceNoteWaveform, loadVoiceNoteWaveform, voiceNotePlaybackDurationHint, type VoiceNoteWaveform } from "@/lib/voice-note-waveform";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<ReturnType<typeof connectVoiceNotePlayback> | null>(null);
  const requestWaveformRef = useRef<(() => void) | null>(null);
  const explicitlyPlayed = useRef(false);
  const initialDurationHint = useRef(durationMs);
  const scrubPointer = useRef<number | null>(null);
  const [playback, setPlayback] = useState(() => initialVoiceNotePlayback(durationMs));
  const [waveform, setWaveform] = useState<VoiceNoteWaveform | null>(null);
  const [waveformUnavailable, setWaveformUnavailable] = useState(false);
  const waveformDescriptionId = useId();
  const durationHint = voiceNotePlaybackDurationHint(durationMs, waveform);

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
    playerRef.current?.setDurationHint(durationHint);
  }, [durationHint]);

  useEffect(() => {
    const container = containerRef.current;
    const audio = audioRef.current;
    if (!container || !audio || waveform || typeof IntersectionObserver === "undefined") return;
    let request: AbortController | null = null;
    let finished = false;
    let visible = false;
    const loadIfAllowed = () => {
      if (!visible || request || finished) return;
      if (!explicitlyPlayed.current && !canAutoLoadVoiceNoteWaveform({ src, outgoing, durationMs, nativeDuration: audio.duration })) return;
      const active = new AbortController();
      request = active;
      void loadVoiceNoteWaveform(src, active.signal).then((result) => {
        if (active.signal.aborted) return;
        finished = true;
        setWaveform(result);
        setWaveformUnavailable(!result);
        observer.disconnect();
      });
    };
    requestWaveformRef.current = loadIfAllowed;
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (!visible) { request?.abort(); request = null; }
      else loadIfAllowed();
    }, { threshold: 0 });
    observer.observe(container);
    audio.addEventListener("loadedmetadata", loadIfAllowed);
    audio.addEventListener("durationchange", loadIfAllowed);
    return () => {
      observer.disconnect();
      request?.abort();
      requestWaveformRef.current = null;
      audio.removeEventListener("loadedmetadata", loadIfAllowed);
      audio.removeEventListener("durationchange", loadIfAllowed);
    };
  }, [src, outgoing, durationMs, waveform]);

  const current = formatVoiceNoteTime(playback.currentTime);
  const duration = formatVoiceNoteTime(playback.duration);
  const progress = playback.duration > 0 ? Math.min(100, playback.currentTime / playback.duration * 100) : 0;
  const canSeek = playback.ready && playback.duration > 0 && !playback.error;
  const playLabel = playback.pending ? `Cancel playback of ${label}` : `${playback.playing ? "Pause" : "Play"} ${label}`;
  const nextRate = VOICE_NOTE_PLAYBACK_RATES[(VOICE_NOTE_PLAYBACK_RATES.findIndex((rate) => rate === playback.playbackRate) + 1) % VOICE_NOTE_PLAYBACK_RATES.length];
  const finishScrub = (cancelled = false) => {
    scrubPointer.current = null;
    void playerRef.current?.endScrub(cancelled);
  };

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={label}
      data-voice-player={outgoing ? "outgoing" : "incoming"}
      style={{
        backgroundColor: outgoing ? "var(--chat-bubble, #8de6ed)" : "#252d3a",
        color: outgoing ? "var(--chat-ink, #0b2025)" : "#f2f3f8",
      }}
      className={cn("nodeine-voice-player w-full min-w-0 max-w-sm rounded-2xl border border-current/10 px-2 py-1 text-left", outgoing ? "rounded-br-md" : "rounded-bl-md", className)}
    >
      <audio ref={audioRef} preload="metadata" hidden>
        <source src={src} type={mimeType ?? undefined} />
      </audio>
      <div className="nodeine-voice-controls">
        <button
          type="button"
          aria-label={playLabel}
          aria-busy={playback.pending || undefined}
          disabled={playback.scrubbing}
          title={playLabel}
          onClick={() => {
            explicitlyPlayed.current = true;
            requestWaveformRef.current?.();
            void playerRef.current?.toggle();
          }}
          className="grid size-[44px] shrink-0 place-items-center rounded-full hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {playback.pending ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : playback.playing ? <Pause className="size-5" fill="currentColor" aria-hidden="true" /> : <Play className="size-5" fill="currentColor" aria-hidden="true" />}
        </button>
        <div className="nodeine-voice-seek relative h-[44px] min-w-0 rounded-md focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-current">
          {waveform ? (
            <div className="pointer-events-none absolute inset-x-[10px] top-1/2 h-[24px] -translate-y-1/2" data-voice-visual="waveform" aria-hidden="true">
              <svg viewBox={`0 0 ${waveform.bars.length * 4} 24`} preserveAspectRatio="none" className="h-full w-full overflow-visible" fill="currentColor">
                <path d={`M0 12H${waveform.bars.length * 4}`} stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
                {waveform.bars.map((amplitude, index) => {
                  const height = Math.sqrt(amplitude) * 22;
                  return <rect key={index} x={index * 4 + 1} y={(24 - height) / 2} width={2} height={height} rx={1} opacity={progress > index / waveform.bars.length * 100 ? 1 : 0.4} />;
                })}
              </svg>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-[10px] top-1/2 h-1 -translate-y-1/2 rounded-full" data-voice-visual="progress" aria-hidden="true">
              <span className="absolute inset-0 rounded-full bg-current opacity-25" />
              <span className="absolute inset-y-0 left-0 rounded-full bg-current" style={{ width: `${progress}%` }} />
            </div>
          )}
          <span className="sr-only" id={waveformDescriptionId}>
            {waveform ? "Waveform measured from this audio recording." : waveformUnavailable ? "Playback progress. Waveform unavailable for this audio." : "Playback progress. Audio waveform not loaded."}
            {" Drag the handle or tap the waveform to seek. Arrow keys adjust one second; Home and End jump to either end."}
          </span>
          <input
            type="range"
            min={0}
            max={playback.duration || 1}
            step="any"
            value={playback.duration > 0 ? playback.currentTime : 0}
            disabled={!canSeek}
            aria-label={`Seek ${label}`}
            aria-describedby={waveformDescriptionId}
            aria-valuetext={`${current} elapsed${playback.duration > 0 ? ` of ${duration}` : "; duration not available yet"}`}
            title={playback.duration > 0 ? `Duration ${duration}` : "Duration not available yet"}
            onChange={(event) => playerRef.current?.seek(event.currentTarget.valueAsNumber)}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0 || !playerRef.current?.beginScrub()) return;
              scrubPointer.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={(event) => { if (scrubPointer.current === event.pointerId) finishScrub(); }}
            onPointerCancel={(event) => { if (scrubPointer.current === event.pointerId) finishScrub(true); }}
            onLostPointerCapture={(event) => { if (scrubPointer.current === event.pointerId) finishScrub(); }}
            onBlur={() => { if (scrubPointer.current !== null) finishScrub(true); }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && scrubPointer.current !== null) { event.preventDefault(); finishScrub(true); return; }
              const deltas: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
              const next = event.key === "Home" ? 0 : event.key === "End" ? playback.duration : event.key in deltas ? playback.currentTime + deltas[event.key] : null;
              if (next !== null) { event.preventDefault(); playerRef.current?.seek(next); }
            }}
            className="nodeine-voice-range absolute inset-0 m-0 h-full w-full min-w-0 disabled:cursor-default"
          />
          {playback.scrubbing && <span
            className="pointer-events-none absolute bottom-full left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-current/20 px-2 py-1 font-mono text-xs tabular-nums"
            style={{ backgroundColor: outgoing ? "var(--chat-bubble, #8de6ed)" : "#252d3a" }}
            aria-hidden="true"
          >{current} / {duration}</span>}
        </div>
        <span data-voice-time className="nodeine-voice-time pointer-events-none flex min-h-[44px] min-w-[4ch] shrink-0 items-center justify-end font-mono text-xs tabular-nums" aria-hidden="true">
          {playback.currentTime > 0 ? current : duration}
        </span>
        <button
          type="button"
          className="nodeine-voice-speed grid size-[44px] place-items-center rounded-full font-mono text-xs font-semibold tabular-nums hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          aria-label={`Playback speed ${playback.playbackRate}×. Change to ${nextRate}×`}
          title={`Playback speed: ${playback.playbackRate}×. Click for ${nextRate}×`}
          disabled={playback.scrubbing}
          onClick={() => playerRef.current?.setRate(nextRate)}
        >
          <span className="rounded-full border border-current/25 px-1 py-0.5">{playback.playbackRate}×</span>
        </button>
      </div>
      {playback.rateError && <p className="px-1 pb-1 text-xs leading-5" role="status">{playback.rateError}</p>}
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
