import { describe, expect, it } from 'vitest';
import {
  logbookFormat,
  MAX_LOGBOOK_BYTES,
  parseJsonLogbook,
  validateLogbook,
} from './logbook-file.ts';

const textFile = (content: BlobPart, name = 'logbook.txt', type = 'text/plain') =>
  new File([content], name, { type });

const jsonFile = (data: unknown, name = 'logbook.json', type = 'application/json') =>
  new File([typeof data === 'string' ? data : JSON.stringify(data)], name, { type });

const entry = {
  date: '2024-03-12',
  odometerKm: 15020,
  description: 'Scheduled service #1',
  workshop: 'Brisbane Ford',
};

describe('logbookFormat', () => {
  it.each([
    ['logbook.txt', 'text/plain', 'text'],
    ['logbook.json', 'application/json', 'json'],
    ['LOGBOOK.TXT', '', 'text'],
    ['logbook.json', '', 'json'],
    ['logbook.pdf', 'application/pdf', null],
    ['logbook.log', '', null],
  ])('%s (%s) is %s', (name, type, expected) => {
    expect(logbookFormat(new File(['x'], name, { type }))).toBe(expected);
  });
});

describe('parseJsonLogbook', () => {
  it('returns entries in file order with unknown fields removed', () => {
    const second = { date: '2025-03-08', odometerKm: 30410, description: 'Service #2', extra: 1 };
    expect(parseJsonLogbook(JSON.stringify({ entries: [entry, second] }))).toEqual({
      ok: true,
      entries: [entry, { date: '2025-03-08', odometerKm: 30410, description: 'Service #2' }],
    });
  });

  it('rejects text that is not JSON', () => {
    expect(parseJsonLogbook('{ entries: ')).toEqual({
      ok: false,
      error: 'Logbook is not valid JSON',
    });
  });

  it.each([
    ['an array', '[]'],
    ['null', 'null'],
    ['no entries', '{}'],
    ['empty entries', '{"entries":[]}'],
  ])('rejects %s', (_, content) => {
    expect(parseJsonLogbook(content)).toEqual({
      ok: false,
      error: 'Logbook JSON must have an "entries" array with at least one entry',
    });
  });

  it.each([
    ['a non-object entry', 'oops', 'must be an object'],
    ['a missing date', { ...entry, date: undefined }, 'date must be a date in YYYY-MM-DD format'],
    [
      'a malformed date',
      { ...entry, date: '12/03/2024' },
      'date must be a date in YYYY-MM-DD format',
    ],
    [
      'an impossible date',
      { ...entry, date: '2024-02-30' },
      'date must be a date in YYYY-MM-DD format',
    ],
    [
      'a negative odometer',
      { ...entry, odometerKm: -1 },
      'odometerKm must be a whole number, 0 or more',
    ],
    [
      'a fractional odometer',
      { ...entry, odometerKm: 1.5 },
      'odometerKm must be a whole number, 0 or more',
    ],
    [
      'a string odometer',
      { ...entry, odometerKm: '15020' },
      'odometerKm must be a whole number, 0 or more',
    ],
    ['a blank description', { ...entry, description: '  ' }, 'description must not be blank'],
    ['a blank workshop', { ...entry, workshop: '' }, 'workshop must not be blank when present'],
  ])('names the first problem for %s', (_, bad, problem) => {
    expect(parseJsonLogbook(JSON.stringify({ entries: [entry, bad] }))).toEqual({
      ok: false,
      error: `Entry 2: ${problem}`,
    });
  });

  it('accepts a leap day and an omitted workshop', () => {
    const noWorkshop = {
      date: '2024-02-29',
      odometerKm: 0,
      description: 'Pre-delivery inspection',
    };
    expect(parseJsonLogbook(JSON.stringify({ entries: [noWorkshop] }))).toEqual({
      ok: true,
      entries: [noWorkshop],
    });
  });
});

describe('validateLogbook', () => {
  it('accepts a non-empty UTF-8 text file', async () => {
    await expect(validateLogbook(textFile('2024-03-12 Service #1 ✓'))).resolves.toBe(true);
  });

  it('accepts a valid JSON logbook', async () => {
    await expect(validateLogbook(jsonFile({ entries: [entry] }))).resolves.toBe(true);
  });

  it('accepts a .json file with no reported type', async () => {
    await expect(validateLogbook(jsonFile({ entries: [entry] }, 'logbook.json', ''))).resolves.toBe(
      true,
    );
  });

  it('requires a file', async () => {
    await expect(validateLogbook(null)).resolves.toBe('Attach a logbook');
  });

  it.each([
    ['a PDF', textFile('%PDF', 'logbook.pdf', 'application/pdf')],
    ['an image', textFile('png', 'logbook.png', 'image/png')],
    ['an untyped file with another extension', textFile('ok', 'logbook.log', '')],
  ])('rejects %s', async (_, file) => {
    await expect(validateLogbook(file)).resolves.toBe(
      'Logbook must be a plain text (.txt) or JSON (.json) file',
    );
  });

  it('rejects an empty file', async () => {
    await expect(validateLogbook(textFile(''))).resolves.toBe('Logbook is empty');
  });

  it('accepts exactly 1 MB and rejects anything larger', async () => {
    await expect(validateLogbook(textFile(new Uint8Array(MAX_LOGBOOK_BYTES)))).resolves.toBe(true);
    await expect(validateLogbook(textFile(new Uint8Array(MAX_LOGBOOK_BYTES + 1)))).resolves.toBe(
      'Logbook must be 1 MB or smaller',
    );
  });

  it('rejects text that is not valid UTF-8', async () => {
    await expect(validateLogbook(textFile(new Uint8Array([0xff, 0xfe, 0xfd])))).resolves.toBe(
      'Logbook must be UTF-8 encoded text',
    );
  });

  it('rejects invalid JSON and JSON that breaks the format', async () => {
    await expect(validateLogbook(jsonFile('not json'))).resolves.toBe('Logbook is not valid JSON');
    await expect(
      validateLogbook(jsonFile({ entries: [{ ...entry, date: 'soon' }] })),
    ).resolves.toBe('Entry 1: date must be a date in YYYY-MM-DD format');
  });

  it('treats plain text as text even if it looks like JSON', async () => {
    await expect(validateLogbook(textFile('{"entries": []}'))).resolves.toBe(true);
  });
});
