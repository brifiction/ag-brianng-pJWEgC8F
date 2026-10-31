import { checkLogbookFile, LOGBOOK_FORMATS, readLogbook } from '@autograb/logbook';

/** Value for the file input's `accept` attribute, e.g. `.txt,text/plain,.json,application/json`. */
export const LOGBOOK_ACCEPT = LOGBOOK_FORMATS.flatMap(({ extension, type }) => [
  extension,
  type,
]).join(',');

/**
 * Validates a chosen file against the shared logbook rules.
 * Type and size are checked first, so an oversized file is never read into memory.
 * @returns An error message, or `true` when the file is valid.
 */
export async function validateLogbook(file: File | null): Promise<string | true> {
  if (!file) return 'Attach a logbook';

  const problem = checkLogbookFile(file);
  if (problem) return problem.message;

  const result = readLogbook(file, new Uint8Array(await file.arrayBuffer()));
  return result.ok || result.problem.message;
}
