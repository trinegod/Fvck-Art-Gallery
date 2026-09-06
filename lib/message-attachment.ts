import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageRow } from "../app/messages/messages-types";
import { MESSAGE_FIELDS } from "./message-history";

/** Account-scoped persistence continues when the UI switches conversations. */
export async function persistMessageAttachment(
  database: SupabaseClient,
  input: {
    accountId: string; conversationId: string; path: string; file: File;
    mime: string; caption: string | null; messageType: "image" | "video";
  },
  isAccountCurrent: () => boolean,
) {
  if (!isAccountCurrent()) return null;
  const {error: uploadError} = await database.storage.from("conversation-media").upload(input.path, input.file, {contentType: input.mime, upsert: false});
  if (!isAccountCurrent()) return null;
  if (uploadError) throw new Error(`Media wasn't uploaded: ${uploadError.message}`);
  const {data, error: messageError} = await database.from("messages").insert({
    conversation_id: input.conversationId,
    sender_id: input.accountId,
    body: input.caption,
    message_type: input.messageType,
    attachment_path: input.path,
    attachment_mime: input.mime,
    attachment_name: input.file.name.slice(0, 180),
  }).select(MESSAGE_FIELDS).single();
  if (!isAccountCurrent()) return null;
  if (messageError) {
    const cleanup = await database.storage.from("conversation-media").remove([input.path]);
    throw new Error(cleanup.error
      ? "Media wasn't sent and its uploaded file could not be removed. Please contact support before retrying."
      : `Media wasn't sent: ${messageError.message}`);
  }
  return data as MessageRow;
}
