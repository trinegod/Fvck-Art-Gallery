"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { applyGroupMention, findGroupMentionQuery, groupMentionSuggestions } from "@/lib/group-mentions";
import type { Profile } from "./messages-types";
import GroupMentionSuggestions from "./group-mention-suggestions";

export default function GroupMessageInput({ value, onChange, members, group, allowEveryone, disabled }: {
  value: string;
  onChange: (value: string) => void;
  members: readonly Profile[];
  group: boolean;
  allowEveryone: boolean;
  disabled: boolean;
}) {
  const root = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const requestedCaret = useRef<{ value: string; caret: number } | null>(null);
  const [caret, setCaret] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [insertionError, setInsertionError] = useState<string | null>(null);
  const id = useId();
  const helpId = `${id}-help`;
  const suggestionsId = `${id}-suggestions`;
  const query = group && focused && !disabled && caret !== null && dismissed !== `${value}:${caret}` ? findGroupMentionQuery(value, caret) : null;
  const suggestions = query ? groupMentionSuggestions(query.query, members, allowEveryone) : [];

  useLayoutEffect(() => {
    const requested = requestedCaret.current;
    if (requested?.value !== value || !input.current) return;
    input.current.focus();
    input.current.setSelectionRange(requested.caret, requested.caret);
    requestedCaret.current = null;
  }, [value]);

  const dismiss = () => { setDismissed(`${value}:${caret}`); input.current?.focus(); };
  const choose = (username: string) => {
    if (!query || !suggestions.some(suggestion => suggestion.username === username)) return;
    const replacement = applyGroupMention(value, query, username);
    if (!replacement) { setInsertionError("There is not enough room for this mention. Shorten the message first."); return; }
    requestedCaret.current = replacement;
    setCaret(replacement.caret);
    setInsertionError(null);
    onChange(replacement.value);
  };

  return <div ref={root} className="nodeine-chat-composer-input relative flex min-w-0"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <label className="flex min-w-0 flex-1">
      <span className="sr-only">Message</span>
      <textarea ref={input} value={value} maxLength={2000} rows={1} disabled={disabled}
        aria-describedby={group ? helpId : undefined} aria-controls={suggestions.length ? suggestionsId : undefined}
        onFocus={event => { setFocused(true); setCaret(event.currentTarget.selectionStart); }}
        onSelect={event => setCaret(event.currentTarget.selectionStart === event.currentTarget.selectionEnd ? event.currentTarget.selectionStart : null)}
        onChange={event => { setCaret(event.currentTarget.selectionStart); setDismissed(null); setInsertionError(null); onChange(event.currentTarget.value); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (suggestions.length && !event.shiftKey) {
            if (event.key === "Escape") { event.preventDefault(); dismiss(); return; }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const buttons = root.current?.querySelectorAll<HTMLButtonElement>(`[role="group"] button`);
              buttons?.[event.key === "ArrowDown" ? 0 : buttons.length - 1]?.focus();
              return;
            }
            if (event.key === "Enter") { event.preventDefault(); choose(suggestions[0].username); return; }
          }
          if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
        }}
        placeholder={disabled ? "Uploading media..." : group ? "Message… @ to mention" : "Message..."}
        className="max-h-32 min-h-11 w-full resize-none rounded-2xl border border-white/12 bg-white/[.035] px-3 py-2.5 text-base leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-cyan-300 lg:text-sm" />
    </label>
    {group && <span id={helpId} className="sr-only">Type @ to mention up to 10 current members. {allowEveryone ? "Owners and admins can use @everyone. " : "Only owners and admins can use @everyone. "}Use Enter to insert the first suggestion, arrows or Tab to reach suggestion buttons, and Escape to dismiss. Joining members can read existing history.</span>}
    {suggestions.length > 0 && <GroupMentionSuggestions id={suggestionsId} suggestions={suggestions} onChoose={choose} onDismiss={dismiss} />}
    {insertionError && <span role="alert" className="absolute bottom-full left-0 right-0 rounded-lg bg-zinc-950 p-2 text-xs text-amber-200">{insertionError}</span>}
  </div>;
}
