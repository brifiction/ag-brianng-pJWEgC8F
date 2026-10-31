/** One service record in a JSON logbook. */
export interface LogbookEntry {
  date: string;
  odometerKm: number;
  description: string;
  workshop?: string;
}

export type LogbookFormat = 'text' | 'json';

export type JsonLogbookResult =
  | { ok: true; entries: LogbookEntry[] }
  | { ok: false; error: string };

/** Maximum logbook size in bytes (1 MB). */
export const MAX_LOGBOOK_BYTES = 1024 * 1024;

/** Value for the file input's `accept` attribute. */
export const LOGBOOK_ACCEPT = '.txt,.json,text/plain,application/json';

const FORMATS = [
  { format: 'text', extension: '.txt', type: 'text/plain' },
  { format: 'json', extension: '.json', type: 'application/json' },
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Detects the format from the MIME type, falling back to the extension when the browser reports none. */
export function logbookFormat(file: File): LogbookFormat | null {
  const name = file.name.toLowerCase();
  const match = FORMATS.find(
    ({ extension, type }) => file.type === type || (file.type === '' && name.endsWith(extension)),
  );
  return match?.format ?? null;
}

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

/** Keeps known fields only, so unknown ones never reach the UI. */
function toEntry({ date, odometerKm, description, workshop }: LogbookEntry): LogbookEntry {
  return { date, odometerKm, description, ...(workshop === undefined ? {} : { workshop }) };
}

/** Parses JSON logbook text and checks it against the logbook JSON format. */
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

/** @returns The file text, or `null` when it is not valid UTF-8. */
async function readUtf8(file: File): Promise<string | null> {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Validates a logbook against the upload rules.
 * @returns An error message, or `true` when the file is valid.
 */
export async function validateLogbook(file: File | null): Promise<string | true> {
  if (!file) return 'Attach a logbook';
  const format = logbookFormat(file);
  if (!format) return 'Logbook must be a plain text (.txt) or JSON (.json) file';
  if (file.size === 0) return 'Logbook is empty';
  if (file.size > MAX_LOGBOOK_BYTES) return 'Logbook must be 1 MB or smaller';
  const content = await readUtf8(file);
  if (content === null) return 'Logbook must be UTF-8 encoded text';
  if (format === 'json') {
    const result = parseJsonLogbook(content);
    if (!result.ok) return result.error;
  }
  return true;
}
