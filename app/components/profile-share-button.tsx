"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link as LinkIcon, LoaderCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

type ProfileShareButtonProps = {
  creatorName: string;
  creatorUsername: string;
};

type ShareStatus = "idle" | "working" | "shared" | "copied" | "error";

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

  if (!copied) throw new Error("Could not copy the creator profile link.");
}

export default function ProfileShareButton({
  creatorName,
  creatorUsername,
}: ProfileShareButtonProps) {
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
      `/creator/${encodeURIComponent(creatorUsername)}`,
      window.location.origin
    ).toString();
    const shareData = {
      title: `${creatorName} — NODEINE`,
      text: `Explore @${creatorUsername}'s visual archive on NODEINE.`,
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
        toast.success("Creator profile shared");
      } else {
        await copyToClipboard(shareUrl);
        setStatus("copied");
        toast.success("Profile link copied");
      }
      scheduleReset();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
      toast.error("Couldn't share this profile", {
        description: "Please try again.",
      });
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
            : "Share profile";

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={status === "working"}
      className={`nodeine-action inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-wait disabled:opacity-70 ${
        completed
          ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-200"
          : status === "error"
            ? "border-rose-300/40 text-rose-200"
            : "border-white/15 text-zinc-200 hover:border-cyan-300/60 hover:text-cyan-200"
      }`}
      aria-label={`Share ${creatorName}'s profile`}
      title="Share creator profile"
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
