import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOwnedWorldThreadDrafts } from "../lib/world-threads";

type DraftRow = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  summary: string | null;
  visibility: string;
  updated_at: string;
};

const rows: DraftRow[] = [
  { id: "older", owner_id: "owner", title: "Old path", slug: "old-path", summary: null, visibility: "draft", updated_at: "2026-09-01T12:00:00Z" },
  { id: "other", owner_id: "someone-else", title: "Private elsewhere", slug: "private-elsewhere", summary: "Not yours", visibility: "draft", updated_at: "2026-09-06T12:00:00Z" },
  { id: "public", owner_id: "owner", title: "Published path", slug: "published-path", summary: null, visibility: "public", updated_at: "2026-09-05T12:00:00Z" },
  { id: "newer", owner_id: "owner", title: "Moonlit lineage", slug: "moonlit-lineage", summary: "Continue the story", visibility: "draft", updated_at: "2026-09-04T12:00:00Z" },
];

// The fake is the database boundary: real filtering, ordering and paging over
// independent fixture rows. Tests exercise the public list operation.
function database({
  userId = "owner" as string | null,
  queryError = null as Error | null,
} = {}) {
  return {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) },
    from(table: string) {
      assert.equal(table, "world_threads");
      let selected = [...rows];
      const ordering: Array<{ field: keyof DraftRow; ascending: boolean }> = [];
      const query = {
        select() { return query; },
        eq(field: keyof DraftRow, value: string) {
          selected = selected.filter((row) => row[field] === value);
          return query;
        },
        order(field: keyof DraftRow, { ascending }: { ascending: boolean }) {
          ordering.push({ field, ascending });
          return query;
        },
        async range(start: number, end: number) {
          selected.sort((left, right) => {
            for (const { field, ascending } of ordering) {
              const comparison = String(left[field]).localeCompare(String(right[field]));
              if (comparison) return ascending ? comparison : -comparison;
            }
            return 0;
          });
          return { data: selected.slice(start, end + 1), error: queryError };
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

test("Your work returns only the signed-in owner's private drafts, newest first", async () => {
  const result = await getOwnedWorldThreadDrafts(database(), "owner");
  assert.deepEqual(result, {
    drafts: [
      { id: "newer", title: "Moonlit lineage", slug: "moonlit-lineage", summary: "Continue the story", updatedAt: "2026-09-04T12:00:00Z" },
      { id: "older", title: "Old path", slug: "old-path", summary: null, updatedAt: "2026-09-01T12:00:00Z" },
    ],
    hasMore: false,
  });
});

test("older drafts stay reachable without repeating the first page", async () => {
  const first = await getOwnedWorldThreadDrafts(database(), "owner", { pageSize: 1 });
  const second = await getOwnedWorldThreadDrafts(database(), "owner", { pageSize: 1, offset: 1 });
  assert.deepEqual(first.drafts.map((draft) => draft.id), ["newer"]);
  assert.equal(first.hasMore, true);
  assert.deepEqual(second.drafts.map((draft) => draft.id), ["older"]);
  assert.equal(second.hasMore, false);
});

test("signed-out and changed-account callers cannot resume the previous owner's drafts", async () => {
  assert.deepEqual(await getOwnedWorldThreadDrafts(database({ userId: null }), "owner"), { drafts: [], hasMore: false });
  assert.deepEqual(await getOwnedWorldThreadDrafts(database({ userId: "someone-else" }), "owner"), { drafts: [], hasMore: false });
});

test("a failed private list is an error, not a misleading empty workspace", async () => {
  await assert.rejects(
    getOwnedWorldThreadDrafts(database({ queryError: new Error("Temporary database failure") }), "owner"),
    /Temporary database failure/
  );
});
