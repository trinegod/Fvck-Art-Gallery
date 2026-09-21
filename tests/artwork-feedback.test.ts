import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { anchorFromPoint, readArtworkComments, postArtworkComment, removeArtworkComment, UnknownCommentOutcome, type CommentAttempt } from "../lib/artwork-feedback";

const artworkId = "e7100000-0000-4000-8000-000000000001";
const userId = "e7100000-0000-4000-8000-000000000002";
const commentId = "e7100000-0000-4000-8000-000000000003";
const saved = {
  id: commentId, artwork_id: artworkId, user_id: userId, body: "The moonlight here is lovely.",
  created_at: "2026-09-20T12:00:00.123456+00:00", pin_x: 0.25, pin_y: 0.75,
  pin_src: "/artworks/moon.webp", profile: null,
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json" },
});
const client = (fetch: typeof globalThis.fetch) => createClient("https://fixture.invalid", "fixture-only", {
  auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
});
const attempt: CommentAttempt = {
  id: saved.id, artwork_id: artworkId, user_id: userId, body: saved.body,
  pin_x: saved.pin_x, pin_y: saved.pin_y, pin_src: saved.pin_src,
};

test("pinpoint placement is normalized against the actual image, excluding letterbox space", () => {
  const image = { left: 100, top: 200, width: 200, height: 400 };
  assert.deepEqual(anchorFromPoint(150, 500, image), { x: 0.25, y: 0.75 });
  assert.deepEqual(anchorFromPoint(300, 600, image), { x: 1, y: 1 });
  assert.equal(anchorFromPoint(99, 500, image), null);
  assert.equal(anchorFromPoint(150, 601, image), null);
  assert.equal(anchorFromPoint(150, 500, { ...image, width: 0 }), null);
  assert.equal(anchorFromPoint(Number.NaN, 500, image), null);
});

test("posting confirms the exact immutable comment and never changes its pinned source", async () => {
  const database = client(async (input, init) => {
    assert.equal(new URL(String(input)).pathname, "/rest/v1/comments");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), attempt);
    return json(saved, 201);
  });
  assert.deepEqual(await postArtworkComment(database, attempt), saved);
});

test("database decimal serialization of image coordinates still confirms the same post", async () => {
  const original = { ...attempt, pin_x: 0.32066218635667765, pin_y: 0.16075001095226274 };
  const serialized = { ...saved, pin_x: 0.320662186356678, pin_y: 0.160750010952263 };
  for (const duplicate of [false, true]) {
    const database = client(async (_input, init) => init?.method === "POST" && duplicate
      ? json({ code: "23505", message: "duplicate" }, 409)
      : json(serialized, init?.method === "POST" ? 201 : 200));
    assert.deepEqual(await postArtworkComment(database, original), serialized);
  }
});

test("coordinate reconciliation does not accept a moved point or an ordinary comment", async () => {
  for (const changed of [{ ...saved, pin_x: saved.pin_x + 0.000001 }, { ...saved, pin_x: null, pin_y: null, pin_src: null }]) {
    await assert.rejects(postArtworkComment(client(async () => json(changed)), attempt), UnknownCommentOutcome);
  }
});

test("a lost post response or duplicate retry reconciles the exact ID without creating another comment", async () => {
  for (const failure of ["transport", "duplicate"] as const) {
    let writes = 0;
    const database = client(async (input, init) => {
      if (init?.method === "POST") {
        writes++;
        if (failure === "transport") throw new Error("private transport details");
        return json({ code: "23505", message: "private constraint details" }, 409);
      }
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("id"), `eq.${commentId}`);
      assert.equal(url.searchParams.get("artwork_id"), `eq.${artworkId}`);
      assert.equal(url.searchParams.get("user_id"), `eq.${userId}`);
      return json(saved);
    });
    assert.deepEqual(await postArtworkComment(database, attempt), saved);
    assert.equal(writes, 1);
  }
});

test("delete confirms its affected row, and a zero-row response succeeds only after confirmed absence", async () => {
  for (const deleted of [true, false]) {
    const database = client(async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("id"), `eq.${commentId}`);
      if (init?.method === "DELETE") {
        assert.equal(url.searchParams.get("user_id"), `eq.${userId}`);
        return json(deleted ? [{ id: commentId }] : []);
      }
      assert.equal(url.searchParams.get("user_id"), null, "absence must not hide another author's row");
      return json(null);
    });
    await removeArtworkComment(database, commentId, userId);
  }
});

test("discussion reads every page in deterministic order and preserves old ordinary comments", async () => {
  const comments = Array.from({ length: 501 }, (_, index) => ({
    ...saved, id: `e7100000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  }));
  let requests = 0;
  const database = client(async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("artwork_id"), `eq.${artworkId}`);
    assert.equal(url.searchParams.get("order"), "created_at.asc,id.asc");
    assert.equal(url.searchParams.get("limit"), "500");
    requests++;
    if (requests === 1) return json(comments.slice(0, 500));
    assert.ok(url.searchParams.get("or")?.includes(comments[499].id));
    return json([{ ...comments[500], pin_x: undefined, pin_y: undefined, pin_src: undefined }]);
  });
  const result = await readArtworkComments(database, artworkId);
  assert.equal(result.length, 501);
  assert.equal(result[0].pin_x, 0.25);
  assert.equal(result[500].pin_x, null);
  assert.equal(result[500].pin_y, null);
  assert.equal(result[500].pin_src, null);
});

test("an unreadable later page fails the whole discussion instead of silently truncating it", async () => {
  let page = 0;
  const database = client(async () => {
    if (page++ === 0) return json(Array.from({ length: 500 }, (_, index) => ({
      ...saved, id: `e7100000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    })));
    return json({ code: "XX000", message: "sensitive backend details" }, 500);
  });
  await assert.rejects(readArtworkComments(database, artworkId), { message: "The discussion couldn't be loaded. Check your connection and retry." });
});

test("malformed, cross-artwork, and half-pinned responses cannot enter the public discussion", async () => {
  for (const row of [
    { ...saved, artwork_id: userId }, { ...saved, pin_y: null }, { ...saved, pin_src: null },
    { ...saved, pin_x: 1.1 }, { ...saved, pin_y: -0.1 }, { ...saved, created_at: "not-a-date" },
  ]) await assert.rejects(readArtworkComments(client(async () => json([row])), artworkId));
});

test("an invalid post never sends a request or downgrades pinpoint feedback to a general comment", async () => {
  let requests = 0;
  const database = client(async () => { requests++; return json(saved); });
  for (const value of [
    { ...attempt, id: "invalid" }, { ...attempt, body: " " }, { ...attempt, body: "🦊".repeat(501) },
    { ...attempt, pin_x: null }, { ...attempt, pin_src: null }, { ...attempt, pin_x: Number.NaN },
    { ...attempt, pin_y: Infinity }, { ...attempt, pin_src: "x".repeat(2049) },
  ]) await assert.rejects(postArtworkComment(database, value));
  assert.equal(requests, 0);
});

test("ordinary comments and 500 Unicode code points remain valid", async () => {
  const ordinary = { ...attempt, body: "🦊".repeat(500), pin_x: null, pin_y: null, pin_src: null };
  const database = client(async (_input, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), ordinary);
    return json({ ...saved, ...ordinary }, 201);
  });
  assert.equal((await postArtworkComment(database, ordinary)).body, ordinary.body);
});

test("unconfirmed or different committed attempts stay unknown and retain their original ID", async () => {
  for (const read of [null, { ...saved, body: "Different post" }, { ...saved, pin_x: null, pin_y: null, pin_src: null }, { ...saved, user_id: artworkId }]) {
    let writes = 0;
    const database = client(async (_input, init) => {
      if (init?.method === "POST") {
        writes++;
        return json({ code: "23505", message: "duplicate" }, 409);
      }
      return json(read);
    });
    await assert.rejects(postArtworkComment(database, attempt), UnknownCommentOutcome);
    assert.equal(writes, 1);
  }
});

test("explicit permission, schema, and constraint failures expose safe editable errors", async () => {
  for (const code of ["42501", "23514", "23503", "22023", "PGRST204"]) {
    let requests = 0;
    const database = client(async () => { requests++; return json({ code, message: "private backend details" }, 400); });
    await assert.rejects(postArtworkComment(database, attempt), (error: unknown) => error instanceof Error
      && !(error instanceof UnknownCommentOutcome) && !error.message.includes("private"));
    assert.equal(requests, 1);
  }
});

test("an unknown post retry reconciles a prior commit even when the image source now rejects that anchor", async () => {
  let writes = 0;
  const database = client(async (_input, init) => {
    if (init?.method === "POST") {
      if (++writes === 1) throw new Error("lost first response");
      return json({ code: "22023", message: "source changed before retry" }, 400);
    }
    return writes === 1 ? json(null) : json(saved);
  });
  await assert.rejects(postArtworkComment(database, attempt), UnknownCommentOutcome);
  assert.deepEqual(await postArtworkComment(database, attempt, { previousOutcomeUnknown: true }), saved);
  assert.equal(writes, 2);
});

test("a later permission rejection plus an empty or failed read cannot release an uncertain attempt", async () => {
  for (const unavailable of [false, true]) {
    let writes = 0;
    const database = client(async (_input, init) => {
      if (init?.method === "POST") {
        if (++writes === 1) throw new Error("first request timed out");
        return json({ code: "42501", message: "permission changed" }, 403);
      }
      return unavailable ? json({ code: "42501", message: "read denied" }, 403) : json(null);
    });
    await assert.rejects(postArtworkComment(database, attempt), UnknownCommentOutcome);
    await assert.rejects(postArtworkComment(database, attempt, { previousOutcomeUnknown: true }), UnknownCommentOutcome);
    assert.equal(writes, 2);
  }
});

test("zero-row deletion cannot pretend to remove another author's public comment", async () => {
  const database = client(async (_input, init) => init?.method === "DELETE"
    ? json([]) : json({ id: commentId, user_id: artworkId }));
  await assert.rejects(removeArtworkComment(database, commentId, userId), { message: "This comment wasn't removed. Only its author can remove it; sign in and retry." });
});

test("an ambiguous deletion keeps the visible comment until absence is confirmed", async () => {
  for (const resolved of [true, false]) {
    let writes = 0;
    const database = client(async (_input, init) => {
      if (init?.method === "DELETE") { writes++; throw new Error("offline"); }
      return resolved ? json(null) : json({ code: "42501", message: "denied" }, 403);
    });
    if (resolved) await removeArtworkComment(database, commentId, userId);
    else await assert.rejects(removeArtworkComment(database, commentId, userId), UnknownCommentOutcome);
    assert.equal(writes, 1);
  }
});
