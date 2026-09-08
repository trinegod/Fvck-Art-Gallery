"use client";

import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAccountScope } from "@/lib/activity-session";
import { supabase } from "@/lib/supabase-browser";
import { cleanGroupDescription, fetchGroupDescription, GROUP_DESCRIPTION_LIMIT, GroupDescriptionError, type GroupDescriptionState, updateGroupDescription } from "@/lib/group-description";

export default function GroupDescriptionSection({ conversationId, viewerId, canManage }: {
  conversationId: string; viewerId: string; canManage: boolean;
}) {
  const scope = useRef(createAccountScope());
  const draftRef = useRef("");
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const readVersion = useRef(0);
  const [data, setData] = useState<GroupDescriptionState | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewLatest, setReviewLatest] = useState(false);
  const [mustRefresh, setMustRefresh] = useState(false);
  useLayoutEffect(() => {
    const current = scope.current;
    const requests = readVersion;
    current.setAccount(viewerId);
    return () => { current.clear(); requests.current++; };
  }, [viewerId, conversationId, canManage]);

  const refresh = useCallback(async () => {
    if (!supabase || savingRef.current) return;
    const current = scope.current.capture(viewerId);
    const version = ++readVersion.current;
    const isCurrent = () => current() && readVersion.current === version;
    setLoading(true); setError(null);
    try {
      const next = await fetchGroupDescription(supabase, conversationId, isCurrent);
      if (!isCurrent() || !next) return;
      setData(next);
      if (next.state === "ready") {
        const preserve = dirtyRef.current && draftRef.current !== next.description;
        setReviewLatest(preserve);
        setMustRefresh(false);
        if (!preserve) {
          draftRef.current = next.description; dirtyRef.current = false;
          setDraft(next.description);
        }
      }
    } catch (failure) {
      if (isCurrent()) {
        if (failure instanceof GroupDescriptionError && failure.outcome === "rejected") {
          // A denied current read invalidates previously authorized private data.
          // Do not wait for the parent membership subscription to catch up.
          setData(null); setDraft(""); draftRef.current = ""; dirtyRef.current = false;
          setReviewLatest(false); setMustRefresh(false); setNotice(null);
        }
        setError(failure instanceof Error ? failure.message : "Group About could not be loaded. Try again.");
      }
    } finally { if (isCurrent()) setLoading(false); }
  }, [conversationId, viewerId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void refresh(); });
    const onFocus = () => { if (!dirtyRef.current && !savingRef.current) void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [refresh, canManage]);

  async function saveDescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || data?.state !== "ready" || !canManage || !data.canEdit || savingRef.current || loading || reviewLatest || mustRefresh) return;
    const isCurrent = scope.current.capture(viewerId);
    if (!isCurrent()) return;
    let clean: string;
    try { clean = cleanGroupDescription(draft); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Check the description length."); return; }
    savingRef.current = true; readVersion.current++;
    setSaving(true); setError(null); setNotice(null);
    try {
      const saved = await updateGroupDescription(supabase, conversationId, clean, data.updatedAt, isCurrent);
      if (!isCurrent() || !saved) return;
      setData(saved); setDraft(saved.description); draftRef.current = saved.description; dirtyRef.current = false;
      setNotice("Group description saved. Members can see it in Group details.");
    } catch (failure) {
      if (!isCurrent()) return;
      setError(failure instanceof Error ? failure.message : "Saving was not confirmed. Refresh before retrying.");
      if (!(failure instanceof GroupDescriptionError) || failure.outcome === "unknown" || failure.outcome === "conflict") setMustRefresh(true);
    } finally { if (isCurrent()) { savingRef.current = false; setSaving(false); } }
  }

  const editable = canManage && data?.state === "ready" && data.canEdit;
  const count = Array.from(draft).length;
  return <section className="space-y-3 px-5 py-5 sm:px-6" aria-labelledby="group-about-heading">
    <h3 id="group-about-heading" className="text-sm font-medium text-white">About this group</h3>
    <p className="text-xs leading-5 text-zinc-400">A shared description of what this space is for. Only the owner and admins can change it.</p>
    {loading && <p role="status" className="flex items-center gap-2 text-xs text-zinc-400"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading group description…</p>}
    {data?.state === "unavailable" && <p className="text-sm text-amber-100">{data.message}</p>}
    {data?.state === "ready" && (editable ? <form onSubmit={saveDescription} className="space-y-3">
      <label className="block text-sm text-zinc-200">Group description
        <textarea value={draft} onChange={event => { const value = event.target.value; setDraft(value); draftRef.current = value; dirtyRef.current = value !== data.description; setNotice(null); }}
          rows={4} disabled={saving} aria-describedby="group-about-count" aria-invalid={count > GROUP_DESCRIPTION_LIMIT}
          placeholder="What brings your group together?"
          className="mt-2 min-h-28 w-full resize-y rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-base leading-6 text-white outline-none focus:border-cyan-300 disabled:opacity-60" />
      </label>
      <p id="group-about-count" className={`text-right text-xs ${count > GROUP_DESCRIPTION_LIMIT ? "text-amber-200" : "text-zinc-400"}`}>{count}/{GROUP_DESCRIPTION_LIMIT} characters</p>
      {reviewLatest && <div className="space-y-2 rounded-xl border border-amber-200/20 p-3">
        <p className="text-sm text-amber-100">Review the latest saved description before replacing it with your draft.</p>
        <p className="whitespace-pre-wrap break-words text-sm text-zinc-300">{data.description || "No description set."}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal py-2" onClick={() => { setDraft(data.description); draftRef.current = data.description; dirtyRef.current = false; setReviewLatest(false); setError(null); }}>Use latest</Button>
          <Button type="button" variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal py-2" onClick={() => { setReviewLatest(false); setError(null); }}>Keep my draft</Button>
        </div>
      </div>}
      <Button type="submit" className="h-auto min-h-11 max-w-full whitespace-normal py-2" disabled={saving || loading || reviewLatest || mustRefresh || draft === data.description || count > GROUP_DESCRIPTION_LIMIT}>
        {saving ? "Saving description…" : "Save description"}
      </Button>
    </form> : <p className="whitespace-pre-wrap break-words rounded-xl border border-white/8 bg-black/25 p-3 text-sm leading-6 text-zinc-200">{data.description || "No description yet."}</p>)}
    {error && <p role="alert" className="text-sm leading-5 text-amber-100">{error}</p>}
    {notice && <p role="status" className="text-sm text-cyan-200">{notice}</p>}
    {(error || data?.state === "unavailable" || (data?.state === "ready" && !editable)) && <Button type="button" variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal py-2" disabled={saving || loading} onClick={() => void refresh()}>{mustRefresh ? "Review latest description" : "Refresh description"}</Button>}
  </section>;
}
