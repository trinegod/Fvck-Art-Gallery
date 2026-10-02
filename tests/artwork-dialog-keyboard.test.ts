import assert from "node:assert/strict";
import test from "node:test";
import { artworkDialogDirection } from "../lib/artwork-dialog-keyboard";

const base = { key: "ArrowRight", defaultPrevented: false, modified: false, nestedDialog: false, ownsArrowKeys: false };

test("gallery arrow navigation belongs only to its active, unmodified view", () => {
  assert.equal(artworkDialogDirection(base), 1);
  assert.equal(artworkDialogDirection({ ...base, key: "ArrowLeft" }), -1);
  for (const key of ["Tab", "Escape", "Enter", "ArrowUp"]) {
    assert.equal(artworkDialogDirection({ ...base, key }), null);
  }
});

test("editing, native media, nested feedback and consumed keys do not browse artwork", () => {
  for (const reason of ["defaultPrevented", "modified", "nestedDialog", "ownsArrowKeys"] as const) {
    assert.equal(artworkDialogDirection({ ...base, [reason]: true }), null, reason);
    assert.equal(artworkDialogDirection({ ...base, key: "ArrowLeft", [reason]: true }), null, reason);
  }
});
