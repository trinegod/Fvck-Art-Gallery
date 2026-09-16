import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getMessageDayDividers, millisecondsUntilNextMessageDay, watchMessageDay } from "../lib/message-days";
import { mergeMessageHistory } from "../lib/message-history";
import MessageDayDivider from "../app/messages/message-day-divider";
import type { MessageRow } from "../app/messages/messages-types";

function inZone(zone: string, run: () => void) {
  const original = process.env.TZ;
  process.env.TZ = zone;
  try { run(); } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
}

const row = (id: string, created_at: string, message_type: MessageRow["message_type"] = "text"): MessageRow => ({
  id, created_at, message_type, conversation_id: "chat", sender_id: "viewer", body: "Synthetic",
  artwork_id: null, attachment_path: null, attachment_mime: null, attachment_name: null,
});

test("local day labels cover Today, Yesterday, calendar dates and prior years", () => inZone("America/Phoenix", () => {
  const days = getMessageDayDividers([
    row("old", "2025-09-12T18:00:00Z"), row("date", "2026-09-12T18:00:00Z"),
    row("yesterday", "2026-09-14T18:00:00Z"), row("today", "2026-09-15T18:00:00Z"),
    row("today-again", "2026-09-15T19:00:00Z"),
  ], new Date("2026-09-15T20:00:00Z"));
  assert.deepEqual([...days.values()].map(day => day.label), ["September 12, 2025", "September 12", "Yesterday", "Today"]);
  assert.equal(days.get("today")?.dateTime, "2026-09-15");
  assert.equal(days.get("today")?.fullDate, "September 15, 2026");
  assert.equal(days.has("today-again"), false);
}));

test("UTC midnight is not a new day for a viewer still on the previous local date", () => inZone("America/Phoenix", () => {
  const days = getMessageDayDividers([
    row("before", "2026-09-15T23:59:59.999999Z"), row("after", "2026-09-16T00:00:00Z"),
  ], new Date("2026-09-16T01:00:00Z"));
  assert.deepEqual([...days.keys()], ["before"]);
  assert.equal(days.get("before")?.label, "Today");
  assert.equal(days.get("before")?.dateTime, "2026-09-15");
}));

test("a real local midnight inserts one boundary even when both timestamps share the UTC date", () => inZone("America/Phoenix", () => {
  const days = getMessageDayDividers([
    row("before", "2026-09-15T06:59:59.999999Z"), row("after", "2026-09-15T07:00:00Z"),
  ], new Date("2026-09-15T07:01:00Z"));
  assert.deepEqual([...days.values()].map(day => day.label), ["Yesterday", "Today"]);
}));

test("the same instant follows the actual viewer's zone, including large positive offsets", () => {
  for (const [zone, date] of [["America/Phoenix", "2026-09-14"], ["Asia/Tokyo", "2026-09-15"], ["Pacific/Kiritimati", "2026-09-15"]]) {
    inZone(zone, () => {
      const days = getMessageDayDividers([row("one", "2026-09-15T06:30:00Z")], new Date("2026-09-15T06:45:00Z"));
      assert.equal(days.get("one")?.dateTime, date);
      assert.equal(days.get("one")?.label, "Today");
    });
  }
});

test("different ISO offsets for the same instant do not produce a duplicate divider", () => inZone("UTC", () => {
  const days = getMessageDayDividers([row("first", "2026-09-15T07:00:00Z"), row("same", "2026-09-15T00:00:00-07:00")], new Date("2026-09-15T08:00:00Z"));
  assert.equal(days.size, 1);
}));

test("Yesterday crosses month, leap-day and year boundaries using calendar arithmetic", () => inZone("UTC", () => {
  for (const [now, previous] of [["2026-01-01", "2025-12-31"], ["2024-03-01", "2024-02-29"], ["2026-03-01", "2026-02-28"]]) {
    assert.equal(getMessageDayDividers([row("previous", `${previous}T12:00:00Z`)], new Date(`${now}T13:00:00Z`)).get("previous")?.label, "Yesterday");
  }
}));

test("DST days schedule the next local midnight, not a fixed 24-hour interval", () => inZone("America/New_York", () => {
  for (const [midnight, hours] of [["2026-03-08T00:00:00-05:00", 23], ["2026-11-01T00:00:00-04:00", 25]] as const) {
    assert.equal(millisecondsUntilNextMessageDay(new Date(midnight)), hours * 3_600_000 + 25);
    const now = new Date(midnight);
    now.setDate(now.getDate() + 1);
    assert.equal(getMessageDayDividers([row("previous", midnight)], now).get("previous")?.label, "Yesterday");
  }
}));

test("loading older rows moves the initial same-day divider instead of duplicating it", () => inZone("UTC", () => {
  const newer = [row("middle", "2026-09-15T12:00:00Z"), row("latest", "2026-09-15T15:00:00Z")];
  const older = [row("prior-day", "2026-09-14T12:00:00Z"), row("first", "2026-09-15T01:00:00Z")];
  const now = new Date("2026-09-15T16:00:00Z");
  assert.deepEqual([...getMessageDayDividers(newer, now).keys()], ["middle"]);
  const merged = mergeMessageHistory(newer, older);
  assert.deepEqual([...getMessageDayDividers(merged, now).keys()], ["prior-day", "first"]);
  assert.deepEqual(merged.map(message => message.id), ["prior-day", "first", "middle", "latest"]);
}));

test("all message types and removed messages participate, without changing message identity", () => inZone("UTC", () => {
  const messages = [row("text", "2026-09-15T12:00:00Z"), row("voice", "2026-09-15T13:00:00Z", "voice"),
    row("image", "2026-09-15T14:00:00Z", "image"), row("artwork", "2026-09-15T15:00:00Z", "artwork"),
    {...row("removed", "2026-09-16T12:00:00Z"), removed_at: "2026-09-16T13:00:00Z"}, row("video", "2026-09-16T14:00:00Z", "video")];
  const before = structuredClone(messages);
  const dividers = getMessageDayDividers(messages, new Date("2026-09-16T15:00:00Z"));
  assert.deepEqual([...dividers.keys()], ["text", "removed"]);
  assert.deepEqual(messages, before);
}));

test("empty and invalid timestamps do not invent dates or break the next valid boundary", () => inZone("UTC", () => {
  const now = new Date("2026-09-15T12:00:00Z");
  assert.equal(getMessageDayDividers([], now).size, 0);
  const days = getMessageDayDividers([row("bad", "no date"), row("impossible", "2026-02-30T12:00:00Z"),
    row("valid", "2026-09-15T08:00:00Z"), row("bad-again", ""), row("same", "2026-09-15T09:00:00Z")], now);
  assert.deepEqual([...days.keys()], ["valid"]);
}));

test("separator markup stays noninteractive, centered, readable and gives the exact calendar date", () => {
  const html = renderToStaticMarkup(createElement(MessageDayDivider, { day: {dateTime: "2026-09-15", label: "Today", fullDate: "September 15, 2026"} }));
  assert.match(html, /dateTime="2026-09-15"/);
  assert.match(html, /aria-label="Today, September 15, 2026"/);
  assert.match(html, /justify-center/);
  assert.match(html, /bg-\[#202632\]/);
  assert.equal((html.match(/aria-hidden="true"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /button|tabindex|sticky|animate|aria-live/i);
  const dated = renderToStaticMarkup(createElement(MessageDayDivider, { day: {dateTime: "2026-09-12", label: "September 12", fullDate: "September 12, 2026"} }));
  assert.match(dated, /aria-label="September 12, 2026"/);
});

test("production dividers use visible history and stable message fragments, outside every message type", () => {
  const source = readFileSync("app/messages/messages-view.tsx", "utf8");
  assert.match(source, /getMessageDayDividers\(messages, calendarNow\)/);
  assert.match(source, /<Fragment key=\{message.id\}>\s*\{dayDividers.has\(message.id\)/);
  assert.match(source, /if \(!focusedConversation\) return;\s*return watchMessageDay\(setCalendarNow\)/);
});

test("calendar clock updates at midnight/resume, avoids same-day rerenders, and releases timers/listeners", () => inZone("UTC", () => {
  let now = new Date("2026-09-15T23:59:59Z");
  let serial = 0;
  const timers = new Map<number, {callback: () => void; delay: number}>();
  const focus = new EventTarget();
  const visibility = Object.assign(new EventTarget(), {visibilityState: "visible" as DocumentVisibilityState});
  const observed: string[] = [];
  const stop = watchMessageDay(date => observed.push(date.toISOString()), {
    now: () => now, focus, visibility,
    schedule: (callback, delay) => { timers.set(++serial, {callback, delay}); return serial; },
    cancel: timer => { timers.delete(timer as number); },
  });
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 1025);
  focus.dispatchEvent(new Event("focus"));
  assert.equal(observed.length, 1);
  assert.equal(timers.size, 1);
  now = new Date("2026-09-16T00:00:00.025Z");
  [...timers.values()][0].callback();
  assert.equal(observed.length, 2);
  visibility.visibilityState = "hidden";
  now = new Date("2026-09-18T10:00:00Z");
  visibility.dispatchEvent(new Event("visibilitychange"));
  assert.equal(observed.length, 2);
  visibility.visibilityState = "visible";
  visibility.dispatchEvent(new Event("visibilitychange"));
  assert.equal(observed.length, 3);
  assert.equal(timers.size, 1);
  const late = [...timers.values()][0].callback;
  stop();
  now = new Date("2026-09-19T10:00:00Z");
  focus.dispatchEvent(new Event("focus"));
  focus.dispatchEvent(new Event("pageshow"));
  visibility.dispatchEvent(new Event("visibilitychange"));
  late();
  assert.equal(observed.length, 3);
  assert.equal(timers.size, 0);
}));

test("resuming in another time zone regroups history even if today's calendar date is unchanged", () => inZone("America/Phoenix", () => {
  const focus = new EventTarget();
  const visibility = Object.assign(new EventTarget(), {visibilityState: "visible" as DocumentVisibilityState});
  let changes = 0;
  const stop = watchMessageDay(() => { changes += 1; }, {
    now: () => new Date("2026-09-15T08:00:00Z"), focus, visibility,
    schedule: () => 1, cancel() {},
  });
  process.env.TZ = "Asia/Tokyo";
  focus.dispatchEvent(new Event("pageshow"));
  assert.equal(changes, 2);
  stop();
}));
