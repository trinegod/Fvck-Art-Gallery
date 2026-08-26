import assert from "node:assert/strict";
import test from "node:test";
import {
  validateWorldThreadDraft,
  worldThreadItemAnchor,
  type WorldThreadDraft,
} from "../lib/world-threads";

test("builds stable artwork-based lineage anchors", () => {
  assert.equal(
    worldThreadItemAnchor("766265af-4837-5852-9b20-b028e66db9b6"),
    "piece-766265af-4837-5852-9b20-b028e66db9b6"
  );
});

function draft(
  overrides: Partial<WorldThreadDraft> = {}
): WorldThreadDraft {
  return {
    title: "Moonlit lineage",
    summary: "A visual path through inherited armor.",
    visibility: "draft",
    allowForks: true,
    items: [
      { artworkId: "art-one", relationType: "mood", note: " Begins here. " },
      { artworkId: "art-two", relationType: "origin", note: " Carries on. " },
    ],
    ...overrides,
  };
}

test("normalizes the first item to the sole origin", () => {
  const result = validateWorldThreadDraft(draft());

  assert.equal(result.error, null);
  assert.equal(result.value?.items[0].relationType, "origin");
  assert.equal(result.value?.items[1].relationType, "mood");
  assert.equal(result.value?.items[0].note, "Begins here.");
});

test("accepts continuity as a film relationship", () => {
  const result = validateWorldThreadDraft(
    draft({
      items: [
        { artworkId: "shot-one", relationType: "origin", note: "Opening shot." },
        { artworkId: "shot-two", relationType: "continuity", note: "Action continues." },
      ],
    })
  );

  assert.equal(result.error, null);
  assert.equal(result.value?.items[1].relationType, "continuity");
});

test("rejects duplicate artwork", () => {
  const result = validateWorldThreadDraft(
    draft({
      items: [
        { artworkId: "same", relationType: "origin", note: "" },
        { artworkId: "same", relationType: "lore", note: "" },
      ],
    })
  );

  assert.match(result.error ?? "", /only once/i);
});

test("rejects incomplete and oversized paths", () => {
  assert.match(
    validateWorldThreadDraft(draft({ items: [] })).error ?? "",
    /between 2 and 12/i
  );
  assert.match(
    validateWorldThreadDraft(
      draft({
        items: Array.from({ length: 13 }, (_, index) => ({
          artworkId: `art-${index}`,
          relationType: index === 0 ? "origin" : "lore",
          note: "",
        })),
      })
    ).error ?? "",
    /between 2 and 12/i
  );
});

test("trims identity fields and rejects invalid titles", () => {
  const valid = validateWorldThreadDraft(
    draft({ title: "  Ashigara signals  ", summary: "  Gold and midnight.  " })
  );
  assert.equal(valid.value?.title, "Ashigara signals");
  assert.equal(valid.value?.summary, "Gold and midnight.");

  assert.match(
    validateWorldThreadDraft(draft({ title: "x" })).error ?? "",
    /between 2 and 80/i
  );
});
