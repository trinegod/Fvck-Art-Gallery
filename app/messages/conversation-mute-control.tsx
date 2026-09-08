"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAccountScope } from "@/lib/activity-session";
import { CONVERSATION_MUTE_UNTIL, isConversationMuted, setConversationMute } from "@/lib/conversation-mute";
import { supabase } from "@/lib/supabase-browser";

type ConversationMuteControlProps = {
  viewerId: string;
  conversationId: string;
  mutedUntil: string | null;
  onMuteChanged: (mutedUntil: string | null) => void;
  disabled?: boolean;
};

type MuteRequest =
  | { status: "idle" }
  | { status: "saving" | "saved" | "error"; mutedUntil: string | null };

export default function ConversationMuteControl(props: ConversationMuteControlProps) {
  // A new account or chat gets fresh feedback, requests, and pending intent.
  return <ConversationMuteSession key={`${props.viewerId}:${props.conversationId}`} {...props} />;
}

function ConversationMuteSession({
  viewerId, conversationId, mutedUntil, onMuteChanged, disabled = false,
}: ConversationMuteControlProps) {
  const requestScope = useRef(createAccountScope());
  const saving = useRef(false);
  const [request, setRequest] = useState<MuteRequest>({ status: "idle" });
  const [now, setNow] = useState(Date.now);
  const helpId = useId();
  const errorId = useId();
  const muted = isConversationMuted(mutedUntil, now);
  const busy = request.status === "saving";
  const savedMatchesCurrent = request.status === "saved" && (request.mutedUntil === null
    ? mutedUntil === null
    : mutedUntil !== null && Date.parse(request.mutedUntil) === Date.parse(mutedUntil));

  useLayoutEffect(() => {
    const scope = requestScope.current;
    scope.setAccount(viewerId || null);
    return () => { scope.clear(); };
  }, [viewerId]);

  useEffect(() => {
    if (!mutedUntil || Date.parse(mutedUntil) <= now || !Number.isFinite(Date.parse(mutedUntil))) return;
    // Long-lived mutes exceed the browser timer range. A timed legacy mute
    // still changes back to "Mute" while its settings remain open.
    const delay = Math.min(2_147_483_647, Math.max(0, Date.parse(mutedUntil) - Date.now() + 1));
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [mutedUntil, now]);

  async function saveMute() {
    const client = supabase;
    if (!client || !viewerId || !conversationId || disabled || saving.current) return;
    const isCurrent = requestScope.current.capture(viewerId);
    if (!isCurrent()) return;
    // Retain absolute intent after an uncertain result: retrying must not
    // invert a setting that may already have committed on the server.
    const next = request.status === "error"
      ? request.mutedUntil
      : isConversationMuted(mutedUntil) ? null : CONVERSATION_MUTE_UNTIL;
    saving.current = true;
    setRequest({ status: "saving", mutedUntil: next });
    try {
      const confirmed = await setConversationMute(client, { conversationId, viewerId, mutedUntil: next, isCurrent });
      if (!isCurrent()) return;
      onMuteChanged(confirmed);
      setRequest({ status: "saved", mutedUntil: confirmed });
    } catch {
      if (!isCurrent()) return;
      setRequest({ status: "error", mutedUntil: next });
    } finally {
      if (isCurrent()) saving.current = false;
    }
  }

  return (
    <div className="min-w-0 space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left focus-visible:ring-cyan-300 motion-reduce:transition-none"
        disabled={disabled || busy || !supabase || !viewerId || !conversationId}
        aria-busy={busy}
        aria-describedby={`${helpId}${request.status === "error" ? ` ${errorId}` : ""}`}
        onClick={() => void saveMute()}
      >
        {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
          : muted ? <Bell aria-hidden="true" className="size-4" /> : <BellOff aria-hidden="true" className="size-4" />}
        {busy ? request.mutedUntil === null ? "Unmuting…" : "Muting…"
          : request.status === "error" ? request.mutedUntil === null ? "Retry unmute" : "Retry mute"
            : muted ? "Unmute notifications" : "Mute notifications"}
      </Button>
      <p id={helpId} className="text-xs leading-5 text-zinc-400">
        {muted ? "Notifications are muted for your account." : "Mute notifications for your account until you unmute."} Messages and unread counts still appear.
      </p>
      {request.status === "error" && <p id={errorId} role="alert" className="text-xs leading-5 text-amber-100">
        Mute setting couldn&apos;t be confirmed. Try again to apply the same setting.
      </p>}
      {savedMatchesCurrent && <p role="status" className="text-xs leading-5 text-cyan-200">
        {muted ? "Notifications muted until you unmute." : "Notifications unmuted."}
      </p>}
      {!supabase && <p role="status" className="text-xs leading-5 text-amber-100">Notification settings are unavailable.</p>}
    </div>
  );
}
