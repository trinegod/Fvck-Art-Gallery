import assert from "node:assert/strict";
import test from "node:test";
import {
  MessageActionError,
  clearMyConversation,
  editOwnMessage,
  getMessageControls,
  removeOwnMessage,
  type MessageActionsRpcClient,
} from "../lib/message-actions";

const message = {
  id: "00000000-0000-4000-8000-000000000001",
  conversation_id: "00000000-0000-4000-8000-000000000002",
  sender_id: "00000000-0000-4000-8000-000000000003",
  body: "Original note",
  message_type: "text",
  artwork_id: null,
  attachment_path: null,
  attachment_mime: null,
  attachment_name: null,
  created_at: "2026-09-07T00:00:00.000Z",
};

function clientWith(
  handler: (name: string, arguments_: Record<string, unknown>) => unknown
) {
  const calls: Array<{ name: string; arguments_: Record<string, unknown> }> = [];
  const client: MessageActionsRpcClient = {
    rpc: async (name, arguments_) => {
      calls.push({ name, arguments_ });
      return { data: handler(name, arguments_), error: null };
    },
  };
  return { client, calls };
}

test("message controls validates a member-scoped capability result", async () => {
  const { client, calls } = clientWith(() => ({
    enabled: true,
    clearedBefore: "2026-09-07T01:02:03.000Z",
  }));
  assert.deepEqual(
    await getMessageControls(client, message.conversation_id),
    { enabled: true, clearedBefore: "2026-09-07T01:02:03.000Z" }
  );
  assert.deepEqual(calls, [{
    name: "nodeine_message_controls",
    arguments_: { target_conversation_id: message.conversation_id },
  }]);
});

test("a missing capability RPC is an honest pre-migration disabled state", async () => {
  const client: MessageActionsRpcClient = {
    rpc: async () => ({
      data: null,
      error: { code: "PGRST202", message: "Could not find function" },
    }),
  };
  assert.deepEqual(await getMessageControls(client, message.conversation_id), {
    enabled: false,
    clearedBefore: null,
    reason: "Message controls are not available until the migration is applied.",
  });
});

test("an unverifiable capability result is gated rather than leaving controls enabled", async () => {
  const client: MessageActionsRpcClient = {
    rpc: async () => {
      throw new TypeError("Network interrupted");
    },
  };
  assert.deepEqual(await getMessageControls(client, message.conversation_id), {
    enabled: false,
    clearedBefore: null,
    reason: "Message controls may be unavailable. Refresh the conversation before retrying.",
  });
});

test("a malformed server cutoff is gated before it can affect history filtering", async () => {
  const { client } = clientWith(() => ({ enabled: true, clearedBefore: "not-a-date" }));
  assert.deepEqual(await getMessageControls(client, message.conversation_id), {
    enabled: false,
    clearedBefore: null,
    reason: "Message controls returned an invalid capability response.",
  });
});

test("editing trims locally, validates length, and returns only a confirmed message", async () => {
  const { client, calls } = clientWith(() => ({ ...message, body: "Edited", edited_at: "2026-09-07T01:00:00.000Z" }));
  const updated = await editOwnMessage(client, message, "  Edited  ");
  assert.equal(updated.body, "Edited");
  assert.deepEqual(calls[0], {
    name: "edit_own_message",
    arguments_: { target_message_id: message.id, new_body: "Edited" },
  });

  await assert.rejects(
    () => editOwnMessage(client, message, "   "),
    (error: unknown) => error instanceof MessageActionError && error.outcome === "rejected"
  );
  assert.equal(calls.length, 1, "invalid text must not call the mutation RPC");
});

test("message removal exposes an attachment only after a confirmed tombstone", async () => {
  const tombstone = {
    ...message,
    body: "Message removed",
    attachment_path: null,
    removed_at: "2026-09-07T01:00:00.000Z",
  };
  const { client, calls } = clientWith(() => ({
    message: tombstone,
    removedAttachment: {
      bucket: "conversation-voice-notes",
      path: `${message.conversation_id}/voice/${message.sender_id}/00000000-0000-4000-8000-000000000004.webm`,
    },
  }));
  const removed = await removeOwnMessage(client, message);
  assert.equal(removed.message.body, "Message removed");
  assert.deepEqual(removed.removedAttachment, {
    bucket: "conversation-voice-notes",
    path: `${message.conversation_id}/voice/${message.sender_id}/00000000-0000-4000-8000-000000000004.webm`,
  });
  assert.deepEqual(calls[0], {
    name: "remove_own_message",
    arguments_: { target_message_id: message.id },
  });
});

test("known rejections and unknown outcomes are distinguishable without attachment cleanup", async () => {
  const rejected: MessageActionsRpcClient = {
    rpc: async () => ({ data: null, error: { code: "P0001", message: "Not your message" } }),
  };
  await assert.rejects(
    () => removeOwnMessage(rejected, message),
    (error: unknown) => error instanceof MessageActionError && error.outcome === "rejected"
  );

  const uncertain: MessageActionsRpcClient = {
    rpc: async () => {
      throw new TypeError("Network lost after request");
    },
  };
  await assert.rejects(
    () => removeOwnMessage(uncertain, message),
    (error: unknown) => error instanceof MessageActionError && error.outcome === "unknown"
  );
});

test("a mismatched tombstone response is unknown and cannot authorize cleanup", async () => {
  const { client } = clientWith(() => ({
    message: {
      ...message,
      conversation_id: "00000000-0000-4000-8000-000000000099",
      body: "Message removed",
      removed_at: "2026-09-07T01:00:00.000Z",
    },
    removedAttachment: {
      bucket: "conversation-voice-notes",
      path: `${message.conversation_id}/voice/${message.sender_id}/00000000-0000-4000-8000-000000000004.webm`,
    },
  }));
  await assert.rejects(
    () => removeOwnMessage(client, message),
    (error: unknown) => error instanceof MessageActionError && error.outcome === "unknown"
  );
});

test("legacy media and an unbounded voice path never become cleanup instructions", async () => {
  const tombstone = {
    ...message,
    body: "Message removed",
    removed_at: "2026-09-07T01:00:00.000Z",
  };
  const { client } = clientWith(() => ({
    message: tombstone,
    removedAttachment: {
      bucket: "conversation-media",
      path: "avatars/someone-else.png",
    },
  }));
  await assert.rejects(
    () => removeOwnMessage(client, message),
    (error: unknown) => error instanceof MessageActionError && error.outcome === "unknown"
  );

  const { client: wrongVoicePath } = clientWith(() => ({
    message: tombstone,
    removedAttachment: {
      bucket: "conversation-voice-notes",
      path: `${message.conversation_id}/voice/00000000-0000-4000-8000-000000000099/00000000-0000-4000-8000-000000000004.webm`,
    },
  }));
  await assert.rejects(
    () => removeOwnMessage(wrongVoicePath, message),
    (error: unknown) => error instanceof MessageActionError && error.outcome === "unknown"
  );
});

test("clear conversation accepts only a server-issued cutoff", async () => {
  const { client, calls } = clientWith(() => ({
    clearedBefore: "2026-09-07T02:00:00.000Z",
  }));
  assert.deepEqual(await clearMyConversation(client, message.conversation_id), {
    clearedBefore: "2026-09-07T02:00:00.000Z",
  });
  assert.deepEqual(calls[0], {
    name: "clear_my_conversation",
    arguments_: { target_conversation_id: message.conversation_id },
  });
});
