import assert from "node:assert/strict";
import test from "node:test";
import { checkedMessageTimestamp, compareMessageTimestamps } from "../lib/message-timestamp";

test("a message after a clear cutoff remains newer even within the same millisecond", () => {
  const cutoff = "2026-09-07T12:00:00.123100+00:00";
  const incoming = "2026-09-07T12:00:00.123900+00:00";
  assert.equal(compareMessageTimestamps(incoming, cutoff), 1);
  assert.equal(compareMessageTimestamps(cutoff, incoming), -1);
  assert.equal(checkedMessageTimestamp(cutoff), cutoff);
});

test("timestamps normalize offsets and fractional trailing zeros without rounding", () => {
  assert.equal(compareMessageTimestamps("2026-09-07T05:00:00.123900-07:00", "2026-09-07T12:00:00.1239Z"), 0);
  assert.equal(compareMessageTimestamps("2026-09-08T00:15:00+05:30", "2026-09-07T18:45:00.000000Z"), 0);
  assert.equal(compareMessageTimestamps("2026-09-07T12:00:00.1Z", "2026-09-07T12:00:00.100001Z"), -1);
  assert.equal(compareMessageTimestamps("1969-12-31T23:59:59.999999Z", "1970-01-01T00:00:00Z"), -1);
  assert.equal(compareMessageTimestamps("9999-12-31T23:59:59.000001Z", "9999-12-31T23:59:59Z"), 1);
  assert.equal(checkedMessageTimestamp("2024-02-29T12:00:00.123456Z"), "2024-02-29T12:00:00.123456Z");
});

test("malformed or offset-free message timestamps are rejected", () => {
  for (const invalid of [
    "", "not-a-date", "2026-09-07", "2026-09-07T12:00:00", "2026-09-07 12:00:00Z",
    "2026-09-07T12:00:00.Z", "2026-09-07T12:00:00+24:00", "2026-09-07T12:00:00+00:60",
    "2026-09-07T12:00:60Z", "2026-13-07T12:00:00Z", "2026-09-00T12:00:00Z",
    "2026-09-07T12:00:00Z,created_at.gt.2027-01-01",
  ]) assert.throws(() => checkedMessageTimestamp(invalid), /Invalid message timestamp/);
});

test("message timestamps reject impossible calendar dates instead of normalizing them", () => {
  for (const invalid of [
    "2026-02-30T12:00:00.123456Z",
    "2026-02-29T12:00:00Z",
    "2026-04-31T12:00:00Z",
    "2026-09-07T24:00:00Z",
  ]) {
    assert.throws(() => checkedMessageTimestamp(invalid), /Invalid message timestamp/);
    assert.throws(() => compareMessageTimestamps(invalid, "2026-09-07T12:00:00Z"), /Invalid message timestamp/);
  }
});
