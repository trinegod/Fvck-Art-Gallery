import assert from "node:assert/strict";
import test from "node:test";
import { mobileDestinationForPath, mobileGroupForPath, mobileNavigationGroups } from "../lib/mobile-navigation";

test("the dock retains all destinations and gives creation its own section", () => {
  assert.deepEqual(mobileNavigationGroups.map((group) => group.label), ["Explore", "Create", "You"]);
  assert.deepEqual(mobileNavigationGroups[1].destinations.map((item) => item.href), ["/forge", "/admin", "/threads/new"]);
  const ids = mobileNavigationGroups.flatMap((group) => group.destinations.map((item) => item.id));
  assert.equal(new Set(ids).size, 10);
});

test("deep links choose the right section without prefix collisions", () => {
  for (const [path, destination, group] of [
    ["/feed", "feed", 0], ["/discover", "discover", 0], ["/", "archive", 0],
    ["/worlds/ashigara", "archive", 0], ["/threads", "threads", 0],
    ["/threads/chronicle/edit", "threads", 0], ["/threads/new", "new-thread", 1],
    ["/forge", "forge", 1], ["/admin", "publish", 1], ["/saved", "saved", 2],
    ["/messages/conversation", "messages", 2], ["/activity", "activity", 2],
    ["/creator/artist", "profile", 2], ["/feed-lab", null, 0],
    ["/threads/new-era", "threads", 0], ["/administer", null, 0], ["/artwork/work", null, 0],
  ] as const) {
    assert.equal(mobileDestinationForPath(path), destination, path);
    assert.equal(mobileGroupForPath(path), group, path);
  }
});

test("signed-out profile fallback does not make Publish part of You", () => {
  assert.equal(mobileNavigationGroups[2].destinations[3].href, "/admin");
  assert.equal(mobileDestinationForPath("/admin"), "publish");
  assert.equal(mobileGroupForPath("/admin"), 1);
});
