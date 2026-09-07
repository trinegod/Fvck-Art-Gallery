"use client";

import { useRef, useState } from "react";
import { RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VoiceNotePlayerProps = {
  src: string;
  mimeType?: string | null;
  label?: string;
  className?: string;
};

/** A deliberately non-autoplaying, browser-native audio control. */
export default function VoiceNotePlayer({
  src,
  mimeType,
  label = "Voice note",
  className,
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState(false);

  const reloadAudio = () => {
    setAudioError(false);
    audioRef.current?.load();
  };

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-[#161c26] px-3 py-2 text-left",
        className
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cyan-300/12 text-cyan-200">
        <Volume2 className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-medium text-zinc-200">{label}</p>
        <audio
          ref={audioRef}
          controls
          preload="metadata"
          aria-label={label}
          className="block h-8 w-full min-w-0"
          onCanPlay={() => setAudioError(false)}
          onError={() => setAudioError(true)}
        >
          <source src={src} type={mimeType ?? undefined} />
          Your browser cannot play this voice note.
        </audio>
        {audioError && (
          <div className="mt-2 space-y-2" role="alert">
            <p className="text-xs leading-5 text-rose-200">
              Audio could not load. Try reloading it; if its secure link expired,
              reload this conversation to refresh it.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={reloadAudio}
            >
              <RotateCcw className="size-3.5" />
              Reload audio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
