"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MessageRow } from "./messages-types";

type MessageActionsDialogProps = {
  message: MessageRow;
  enabled: boolean;
  onEdit: (body: string) => Promise<void>;
  onRemove: () => Promise<void>;
};

type Panel = "actions" | "edit" | "remove";

export default function MessageActionsDialog({
  message,
  enabled,
  onEdit,
  onRemove,
}: MessageActionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("actions");
  const [draft, setDraft] = useState(message.body ?? "");
  const [pending, setPending] = useState<"edit" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const removed = message.removed_at !== null && message.removed_at !== undefined;
  const canEdit =
    message.message_type === "text" &&
    message.body !== null &&
    !removed;
  const canRemove = !removed;

  const changeOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPanel("actions");
      setDraft(message.body ?? "");
      setError(null);
    } else {
      // The dialog stays mounted across realtime updates, so opening it must
      // use the current message text rather than its initial mount value.
      setDraft(message.body ?? "");
    }
  };

  const showPanel = (nextPanel: Panel) => {
    setPanel(nextPanel);
    setError(null);
    if (nextPanel === "edit") setDraft(message.body ?? "");
  };

  const editMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > 2_000 || pending) return;

    setPending("edit");
    setError(null);
    try {
      await onEdit(body);
      changeOpen(false);
    } catch (editError) {
      setError(
        editError instanceof Error
          ? editError.message
          : "Message could not be edited. Please try again."
      );
    } finally {
      setPending(null);
    }
  };

  const removeMessage = async () => {
    if (pending) return;
    setPending("remove");
    setError(null);
    try {
      await onRemove();
      changeOpen(false);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Message could not be removed. Please try again."
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 text-zinc-400 hover:text-white"
            disabled={!enabled || pending !== null}
            aria-label="Message options"
            title={
              enabled
                ? "Message options"
                : "Message controls are not available yet"
            }
          />
        }
      >
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Message options</span>
      </DialogTrigger>

      <DialogContent className="max-h-[85svh] overflow-y-auto border border-white/10 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/70 ring-0 [&_[data-slot=dialog-close]]:size-11">
        {panel === "actions" ? (
          <>
            <DialogHeader className="pr-10">
              <DialogTitle>Message options</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Changes apply to this message in the conversation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 justify-start border-white/15 text-zinc-100 hover:bg-white/10"
                  onClick={() => showPanel("edit")}
                >
                  <Pencil className="size-4" />
                  Edit text
                </Button>
              )}
              {canRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  className="min-h-11 justify-start"
                  onClick={() => showPanel("remove")}
                >
                  <Trash2 className="size-4" />
                  Remove for everyone
                </Button>
              )}
            </div>
          </>
        ) : panel === "edit" ? (
          <>
            <DialogHeader className="pr-10">
              <DialogTitle>Edit message</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Your updated text will replace the original message.
              </DialogDescription>
            </DialogHeader>
            <form className="grid gap-3" onSubmit={(event) => void editMessage(event)}>
              <label className="grid gap-2 text-sm text-zinc-200">
                Message
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={2_000}
                  rows={4}
                  autoFocus
                  disabled={pending !== null}
                  className="min-h-28 w-full resize-y rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300 disabled:opacity-60"
                />
              </label>
              <p className="text-right text-xs text-zinc-500">{draft.trim().length}/2000</p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 border-white/15 text-zinc-200"
                  disabled={pending !== null}
                  onClick={() => showPanel("actions")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="min-h-11"
                  disabled={!draft.trim() || pending !== null}
                >
                  {pending === "edit" && <LoaderCircle className="animate-spin" />}
                  Save edit
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader className="pr-10">
              <DialogTitle>Remove this message?</DialogTitle>
              <DialogDescription className="text-zinc-400">
                This removes it from the conversation for everyone. It cannot
                recall voice notes or other content already played, downloaded,
                or saved.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 border-white/15 text-zinc-200"
                disabled={pending !== null}
                onClick={() => showPanel("actions")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-11"
                disabled={pending !== null}
                onClick={() => void removeMessage()}
              >
                {pending === "remove" && <LoaderCircle className="animate-spin" />}
                Remove for everyone
              </Button>
            </div>
          </>
        )}
        {error && (
          <p className="text-sm leading-6 text-rose-200" role="alert">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
