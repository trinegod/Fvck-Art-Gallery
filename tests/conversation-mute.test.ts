import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { isConversationMuted, setConversationMute } from "../lib/conversation-mute";

const conversationId = "00000000-0000-4000-8000-000000000001";
const viewerId = "00000000-0000-4000-8000-000000000002";
const mutedUntil = "2999-12-31T23:59:59.000Z";

function clientWithFetch(fetch: typeof globalThis.fetch) {
  return createClient("https://mute-test.invalid", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch },
  });
}

test("only a valid future mute pauses a conversation's notifications", () => {
  const now = Date.parse("2026-09-07T12:00:00Z");
  assert.equal(isConversationMuted(null, now), false);
  assert.equal(isConversationMuted(undefined, now), false);
  assert.equal(isConversationMuted("not-a-date", now), false);
  assert.equal(isConversationMuted("", now), false);
  assert.equal(isConversationMuted("2026-09-07T11:59:59Z", now), false);
  assert.equal(isConversationMuted("2026-09-07T12:00:00Z", now), false);
  assert.equal(isConversationMuted("2026-09-07T12:00:01Z", now), true);
});

test("mute and unmute return only the setting confirmed for the current member", async () => {
  for (const next of [mutedUntil, null]) {
    const client = clientWithFetch(async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/rpc/set_conversation_mute")) {
        assert.equal(init?.method, "POST");
        assert.deepEqual(JSON.parse(String(init?.body)), {
          target_conversation_id: conversationId,
          new_muted_until: next,
        });
        return new Response(null, { status: 204 });
      }
      assert.equal(url.pathname, "/rest/v1/conversation_members");
      assert.equal(url.searchParams.get("conversation_id"), `eq.${conversationId}`);
      assert.equal(url.searchParams.get("profile_id"), `eq.${viewerId}`);
      return Response.json({
        conversation_id: conversationId, profile_id: viewerId,
        muted_until: next ? "2999-12-31T23:59:59+00:00" : null,
      });
    });
    assert.equal(await setConversationMute(client, {
      conversationId, viewerId, mutedUntil: next, isCurrent: () => true,
    }), next);
  }
});

test("an account or conversation change cancels stale work before it can confirm a mute", async () => {
  for (const changedAt of ["before-request", "rpc", "readback"]) {
    let current = changedAt !== "before-request";
    const client = clientWithFetch(async (input) => {
      assert.equal(current, true, "A stale scope must not start another network request");
      const rpc = String(input).includes("/rpc/");
      if ((rpc && changedAt === "rpc") || (!rpc && changedAt === "readback")) current = false;
      return rpc ? new Response(null, { status: 204 }) : Response.json({
        conversation_id: conversationId, profile_id: viewerId, muted_until: mutedUntil,
      });
    });
    await assert.rejects(setConversationMute(client, {
      conversationId, viewerId, mutedUntil, isCurrent: () => current,
    }), { name: "AbortError" });
  }
});

test("failed or interrupted persistence never claims a confirmed mute or an uncommitted write", async () => {
  for (const failure of ["rpc-error", "network", "read-error", "malformed", "other-member", "different-setting"]) {
    const client = clientWithFetch(async (input) => {
      if (String(input).includes("/rpc/")) {
        if (failure === "network") throw new TypeError("Network interrupted after sending request");
        if (failure === "rpc-error") return Response.json({ code: "P0001", message: "Not a member" }, { status: 400 });
        return new Response(null, { status: 204 });
      }
      if (failure === "read-error") return Response.json({ code: "PGRST116", message: "Row unavailable" }, { status: 406 });
      if (failure === "malformed") return Response.json({ muted_until: "not-a-date" });
      return Response.json({
        conversation_id: conversationId,
        profile_id: failure === "other-member" ? "somebody-else" : viewerId,
        muted_until: failure === "different-setting" ? null : mutedUntil,
      });
    });
    await assert.rejects(setConversationMute(client, {
      conversationId, viewerId, mutedUntil, isCurrent: () => true,
    }), /couldn't be confirmed.*apply the same setting/i);
  }
});
