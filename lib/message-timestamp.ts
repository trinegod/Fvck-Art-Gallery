const timestampPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function parseTimestamp(value: string) {
  const match = timestampPattern.exec(value);
  if (!match) throw new Error("Invalid message timestamp");
  const wallTime = Date.parse(`${match[1]}Z`);
  if (!Number.isFinite(wallTime) || new Date(wallTime).toISOString().slice(0, 19) !== match[1]) {
    throw new Error("Invalid message timestamp");
  }
  const milliseconds = Date.parse(`${match[1]}${match[3]}`);
  if (!Number.isFinite(milliseconds)) throw new Error("Invalid message timestamp");
  // Keep the fraction as decimal digits: Date truncates PostgreSQL microseconds,
  // while a single numeric microsecond epoch loses precision for distant dates.
  return { milliseconds, fraction: (match[2] ?? "").replace(/0+$/, "") };
}

/** Validate a database timestamp without changing the precision sent back to SQL. */
export function checkedMessageTimestamp(value: string): string {
  parseTimestamp(value);
  return value;
}

/** Compare ISO instants across UTC offsets without dropping fractional precision. */
export function compareMessageTimestamps(left: string, right: string): -1 | 0 | 1 {
  const first = parseTimestamp(left);
  const second = parseTimestamp(right);
  if (first.milliseconds !== second.milliseconds) return first.milliseconds < second.milliseconds ? -1 : 1;
  if (first.fraction === second.fraction) return 0;
  return first.fraction < second.fraction ? -1 : 1;
}
