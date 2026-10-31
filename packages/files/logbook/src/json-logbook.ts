/** One service record in a JSON logbook. */
export interface LogbookEntry {
  date: string;
  odometerKm: number;
  description: string;
  workshop?: string;
}

export type JsonLogbookResult =
  | { ok: true; entries: LogbookEntry[] }
  | { ok: false; error: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Rejects impossible dates such as `2024-02-30`. */
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/** @returns The entry's first problem, or `null` when it is valid. */
function entryProblem(entry: unknown): string | null {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return 'must be an object';
  }
  const { date, odometerKm, description, workshop } = entry as Record<string, unknown>;
  if (!isCalendarDate(date)) return 'date must be a date in YYYY-MM-DD format';
  if (!Number.isInteger(odometerKm) || (odometerKm as number) < 0) {
    return 'odometerKm must be a whole number, 0 or more';
  }
  if (!isText(description)) return 'description must not be blank';
  if (workshop !== undefined && !isText(workshop)) return 'workshop must not be blank when present';
  return null;
}

/** Keeps known fields only, so unknown ones are never passed on. */
function toEntry({ date, odometerKm, description, workshop }: LogbookEntry): LogbookEntry {
  return { date, odometerKm, description, ...(workshop === undefined ? {} : { workshop }) };
}

/** Parses JSON logbook text and checks every entry against the logbook JSON format. */
export function parseJsonLogbook(content: string): JsonLogbookResult {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return { ok: false, error: 'Logbook is not valid JSON' };
  }
  const entries = (data as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      ok: false,
      error: 'Logbook JSON must have an "entries" array with at least one entry',
    };
  }
  for (const [index, entry] of entries.entries()) {
    const problem = entryProblem(entry);
    if (problem) return { ok: false, error: `Entry ${index + 1}: ${problem}` };
  }
  return { ok: true, entries: (entries as LogbookEntry[]).map(toEntry) };
}
