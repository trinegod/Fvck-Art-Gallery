import { checkedMessageTimestamp } from "./message-timestamp";

export type MessageDay = { dateTime: string; label: string; fullDate: string };

function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Derive boundaries from the currently displayed, ordered history, not page chunks. */
export function getMessageDayDividers(messages: readonly { id: string; created_at: string }[], now: Date) {
  const dividers = new Map<string, MessageDay>();
  const today = localDay(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDay(yesterday);
  const currentYear = now.getFullYear();
  const monthDay = new Intl.DateTimeFormat("en", { month: "long", day: "numeric" });
  const fullDate = new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric" });
  let previousDay: string | null = null;

  for (const message of messages) {
    // Defensive display fallback: don't invent a calendar label for invalid metadata.
    try { checkedMessageTimestamp(message.created_at); } catch { continue; }
    const date = new Date(message.created_at);
    const key = localDay(date);
    if (key === previousDay) continue;
    previousDay = key;
    dividers.set(message.id, {
      dateTime: key,
      label: key === today ? "Today" : key === yesterdayKey ? "Yesterday"
        : date.getFullYear() === currentYear ? monthDay.format(date) : fullDate.format(date),
      fullDate: fullDate.format(date),
    });
  }
  return dividers;
}

export function millisecondsUntilNextMessageDay(now: Date) {
  const next = new Date(now);
  // Calendar arithmetic, not +24h: daylight-saving days can be 23 or 25 hours.
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime() + 25;
}

type CalendarEnvironment = {
  now(): Date;
  schedule(callback: () => void, delay: number): unknown;
  cancel(timer: unknown): void;
  focus: Pick<Window, "addEventListener" | "removeEventListener">;
  visibility: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
};

/** One midnight timer; focus/resume also handles sleeping devices and zone changes. */
export function watchMessageDay(onChange: (now: Date) => void, environment: CalendarEnvironment = {
  now: () => new Date(),
  schedule: (callback, delay) => window.setTimeout(callback, delay),
  cancel: timer => window.clearTimeout(timer as number),
  focus: window,
  visibility: document,
}) {
  let active = true;
  let timer: unknown = null;
  let previous = "";
  const refresh = () => {
    if (!active) return;
    if (timer !== null) environment.cancel(timer);
    const now = environment.now();
    const signature = `${localDay(now)}:${now.getTimezoneOffset()}:${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
    if (signature !== previous) {
      previous = signature;
      onChange(now);
    }
    if (active) timer = environment.schedule(refresh, millisecondsUntilNextMessageDay(now));
  };
  const resume = () => { if (environment.visibility.visibilityState === "visible") refresh(); };
  environment.focus.addEventListener("focus", refresh);
  environment.focus.addEventListener("pageshow", refresh);
  environment.visibility.addEventListener("visibilitychange", resume);
  refresh();
  return () => {
    active = false;
    if (timer !== null) environment.cancel(timer);
    environment.focus.removeEventListener("focus", refresh);
    environment.focus.removeEventListener("pageshow", refresh);
    environment.visibility.removeEventListener("visibilitychange", resume);
  };
}
