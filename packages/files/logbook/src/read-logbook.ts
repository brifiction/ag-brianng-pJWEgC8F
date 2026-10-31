import { logbookFormat } from './format.ts';
import { type LogbookEntry, parseJsonLogbook } from './json-logbook.ts';

/** Maximum logbook size in bytes (1 MB). */
export const MAX_LOGBOOK_BYTES = 1024 * 1024;

/**
 * What is known about a file before its content is read, e.g. a browser `File` or upload metadata.
 */
export interface LogbookFile {
  name: string;
  type: string;
  size: number;
}

/** A readable logbook: its text, plus the parsed entries for JSON. */
export type Logbook =
  | { format: 'text'; content: string }
  | { format: 'json'; content: string; entries: LogbookEntry[] };

/** Why a logbook was rejected. The API maps each code to an HTTP status. */
export type LogbookProblemCode =
  | 'UNSUPPORTED_TYPE'
  | 'EMPTY'
  | 'TOO_LARGE'
  | 'NOT_UTF8'
  | 'INVALID_JSON';

/** A rejected logbook: a stable code plus a message to show the user. */
export interface LogbookProblem {
  code: LogbookProblemCode;
  message: string;
}

/** The readable logbook, or the first problem found. */
export type LogbookResult = { ok: true; logbook: Logbook } | { ok: false; problem: LogbookProblem };

/**
 * Checks the type and size, which are known before the content is read.
 * @param file - The file's name, MIME type and size.
 * @returns The first problem, or `null` when the file can be read.
 */
export function checkLogbookFile(file: LogbookFile): LogbookProblem | null {
  if (!logbookFormat(file)) {
    return {
      code: 'UNSUPPORTED_TYPE',
      message: 'Logbook must be a plain text (.txt) or JSON (.json) file',
    };
  }
  if (file.size === 0) return { code: 'EMPTY', message: 'Logbook is empty' };
  if (file.size > MAX_LOGBOOK_BYTES) {
    return { code: 'TOO_LARGE', message: 'Logbook must be 1 MB or smaller' };
  }
  return null;
}

/**
 * Decodes bytes as strict UTF-8.
 * @param bytes - Raw file content.
 * @returns The text, or `null` when the bytes are not valid UTF-8.
 */
function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Parses JSON logbook text into a readable logbook, or an INVALID_JSON problem.
 * @param content - JSON logbook text.
 * @returns The logbook, or an `INVALID_JSON` problem.
 */
function readJsonLogbook(content: string): LogbookResult {
  const result = parseJsonLogbook(content);
  if (!result.ok) return { ok: false, problem: { code: 'INVALID_JSON', message: result.error } };
  return { ok: true, logbook: { format: 'json', content, entries: result.entries } };
}

/**
 * Applies every logbook rule and returns the readable logbook, or the first problem found.
 * @param file - The file's name, MIME type and size.
 * @param bytes - Raw file content.
 * @returns The readable logbook, or the first problem found.
 */
export function readLogbook(file: LogbookFile, bytes: Uint8Array): LogbookResult {
  /** Copied field by field: spreading a browser `File` drops its prototype getters. */
  const problem = checkLogbookFile({ name: file.name, type: file.type, size: bytes.byteLength });
  if (problem) return { ok: false, problem };

  const content = decodeUtf8(bytes);
  if (content === null) {
    return {
      ok: false,
      problem: { code: 'NOT_UTF8', message: 'Logbook must be UTF-8 encoded text' },
    };
  }

  if (logbookFormat(file) === 'json') return readJsonLogbook(content);
  return { ok: true, logbook: { format: 'text', content } };
}
