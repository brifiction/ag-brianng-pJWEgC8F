/** How a logbook is written: plain text or JSON. */
export type LogbookFormat = 'text' | 'json';

/** Accepted logbook formats, with the extension and MIME type that identify each. */
export const LOGBOOK_FORMATS = [
  { format: 'text', extension: '.txt', type: 'text/plain' },
  { format: 'json', extension: '.json', type: 'application/json' },
] as const;

/**
 * Detects the format from the MIME type, falling back to the extension when none is reported.
 * @param file - The file's name and MIME type.
 * @returns `text`, `json`, or `null` when the format is not supported.
 */
export function logbookFormat(file: { name: string; type: string }): LogbookFormat | null {
  const name = file.name.toLowerCase();
  const match = LOGBOOK_FORMATS.find(
    ({ extension, type }) => file.type === type || (file.type === '' && name.endsWith(extension)),
  );
  return match?.format ?? null;
}
