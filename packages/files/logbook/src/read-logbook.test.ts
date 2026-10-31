import { describe, expect, it } from 'vitest';
import { checkLogbookFile, MAX_LOGBOOK_BYTES, readLogbook } from './read-logbook.ts';

/**
 * UTF-8 bytes of a string.
 * @param text - The text to encode.
 * @returns Its UTF-8 bytes.
 */
const encode = (text: string) => new TextEncoder().encode(text);

const textFile = { name: 'logbook.txt', type: 'text/plain', size: 0 };
const jsonFile = { name: 'logbook.json', type: 'application/json', size: 0 };

const validJson = JSON.stringify({
  entries: [{ date: '2024-03-12', odometerKm: 15020, description: 'Service #1' }],
});

describe('checkLogbookFile', () => {
  it('accepts a supported, non-empty file up to 1 MB', () => {
    expect(checkLogbookFile({ ...textFile, size: MAX_LOGBOOK_BYTES })).toBeNull();
  });

  it.each([
    [{ name: 'logbook.pdf', type: 'application/pdf', size: 10 }, 'UNSUPPORTED_TYPE'],
    [{ ...textFile, size: 0 }, 'EMPTY'],
    [{ ...textFile, size: MAX_LOGBOOK_BYTES + 1 }, 'TOO_LARGE'],
  ])('reports %o as %s', (file, code) => {
    expect(checkLogbookFile(file)?.code).toBe(code);
  });
});

describe('readLogbook', () => {
  it('reads a text logbook as-is', () => {
    const content = '2024-03-12  Service #1 ✓\n';
    expect(readLogbook(textFile, encode(content))).toEqual({
      ok: true,
      logbook: { format: 'text', content },
    });
  });

  it('reads a JSON logbook with its parsed entries', () => {
    expect(readLogbook(jsonFile, encode(validJson))).toEqual({
      ok: true,
      logbook: {
        format: 'json',
        content: validJson,
        entries: [{ date: '2024-03-12', odometerKm: 15020, description: 'Service #1' }],
      },
    });
  });

  it('treats plain text as text even if it looks like JSON', () => {
    const result = readLogbook(textFile, encode('{"entries": []}'));
    expect(result.ok && result.logbook.format).toBe('text');
  });

  it('reads files whose name and type are getters, like a browser File', () => {
    const getterFile = Object.create({
      get name() {
        return 'logbook.json';
      },
      get type() {
        return 'application/json';
      },
      get size() {
        return 0;
      },
    });
    const result = readLogbook(getterFile, encode(validJson));
    expect(result.ok && result.logbook.format).toBe('json');
  });

  it('measures size from the content, not the reported size', () => {
    const result = readLogbook({ ...textFile, size: 1 }, new Uint8Array(MAX_LOGBOOK_BYTES + 1));
    expect(result).toMatchObject({ ok: false, problem: { code: 'TOO_LARGE' } });
  });

  it.each([
    [
      'an unsupported type',
      { name: 'a.png', type: 'image/png', size: 0 },
      encode('x'),
      'UNSUPPORTED_TYPE',
    ],
    ['empty content', textFile, new Uint8Array(), 'EMPTY'],
    ['invalid UTF-8', textFile, new Uint8Array([0xff, 0xfe, 0xfd]), 'NOT_UTF8'],
    ['invalid JSON', jsonFile, encode('not json'), 'INVALID_JSON'],
    ['JSON that breaks the format', jsonFile, encode('{"entries":[{}]}'), 'INVALID_JSON'],
  ])('rejects %s', (_, file, bytes, code) => {
    expect(readLogbook(file, bytes)).toMatchObject({ ok: false, problem: { code } });
  });

  it('passes the JSON problem message through', () => {
    expect(readLogbook(jsonFile, encode('{"entries":[{}]}'))).toEqual({
      ok: false,
      problem: {
        code: 'INVALID_JSON',
        message: 'Entry 1: date must be a date in YYYY-MM-DD format',
      },
    });
  });
});
