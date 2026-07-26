"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link as LinkIcon, LoaderCircle, Share2 } from "lucide-react";

type ArtworkShareButtonProps = {
  artworkId: string;
  artworkTitle: string;
};

type ShareStatus = "idle" | "working" | "shared" | "copied" | "error";

const baseClassName =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();

  if (!copied) throw new Error("Could not copy the artwork link.");
}

export default function ArtworkShareButton({
  artworkId,
  artworkTitle,
}: ArtworkShareButtonProps) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  function scheduleReset() {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 2400);
  }

  async function handleShare() {
    const shareUrl = new URL(
      `/artwork/${encodeURIComponent(artworkId)}`,
      window.location.origin
    ).toString();
    const shareData = {
      title: `${artworkTitle} — NODEINE`,
      text: `Explore ${artworkTitle} on NODEINE.`,
      url: shareUrl,
    };
    const useNativeShare =
      typeof navigator.share === "function" &&
      window.matchMedia("(pointer: coarse)").matches;

    setStatus("working");

    try {
      if (useNativeShare) {
        await navigator.share(shareData);
        setStatus("shared");
      } else {
        await copyToClipboard(shareUrl);
        setStatus("copied");
      }
      scheduleReset();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
      scheduleReset();
    }
  }

  const completed = status === "shared" || status === "copied";
  const label =
    status === "working"
      ? "Sharing..."
      : status === "shared"
        ? "Shared"
        : status === "copied"
          ? "Link copied"
          : status === "error"
            ? "Try again"
            : "Share";

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={status === "working"}
      className={`${baseClassName} disabled:cursor-wait disabled:opacity-70 ${
        completed
          ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-200"
          : status === "error"
            ? "border-rose-300/40 text-rose-200"
            : "border-white/15 text-zinc-200 hover:border-cyan-300/70 hover:text-cyan-200"
      }`}
      aria-label={`Share ${artworkTitle}`}
      title="Share artwork"
      data-share-path={`/artwork/${encodeURIComponent(artworkId)}`}
    >
      {status === "working" ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : status === "copied" ? (
        <LinkIcon className="size-4" aria-hidden="true" />
      ) : completed ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Share2 className="size-4" aria-hidden="true" />
      )}
      <span aria-live="polite">{label}</span>
    </button>
  );
}
