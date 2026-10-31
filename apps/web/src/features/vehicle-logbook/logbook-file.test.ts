import { MAX_LOGBOOK_BYTES } from '@autograb/logbook';
import { describe, expect, it, vi } from 'vitest';
import { LOGBOOK_ACCEPT, validateLogbook } from './logbook-file.ts';

/**
 * A plain-text file; name and type can be overridden.
 * @param content - File bytes or text.
 * @param name - File name.
 * @param type - MIME type.
 * @returns The file.
 */
const textFile = (content: BlobPart, name = 'logbook.txt', type = 'text/plain') =>
  new File([content], name, { type });

/**
 * A JSON file; name and type can be overridden.
 * @param content - File text.
 * @param name - File name.
 * @param type - MIME type.
 * @returns The file.
 */
const jsonFile = (content: string, name = 'logbook.json', type = 'application/json') =>
  new File([content], name, { type });

const validJson = JSON.stringify({
  entries: [{ date: '2024-03-12', odometerKm: 15020, description: 'Service #1' }],
});

describe('LOGBOOK_ACCEPT', () => {
  it('lists every accepted extension and MIME type', () => {
    expect(LOGBOOK_ACCEPT).toBe('.txt,text/plain,.json,application/json');
  });
});

describe('validateLogbook', () => {
  it('requires a file', async () => {
    await expect(validateLogbook(null)).resolves.toBe('Attach a logbook');
  });

  it('accepts a text file and a valid JSON logbook', async () => {
    await expect(validateLogbook(textFile('2024-03-12 Service #1 ✓'))).resolves.toBe(true);
    await expect(validateLogbook(jsonFile(validJson))).resolves.toBe(true);
    await expect(validateLogbook(jsonFile(validJson, 'logbook.json', ''))).resolves.toBe(true);
  });

  it.each([
    [
      'an unsupported type',
      textFile('%PDF', 'logbook.pdf', 'application/pdf'),
      'Logbook must be a plain text (.txt) or JSON (.json) file',
    ],
    ['an empty file', textFile(''), 'Logbook is empty'],
    [
      'a file over 1 MB',
      textFile(new Uint8Array(MAX_LOGBOOK_BYTES + 1)),
      'Logbook must be 1 MB or smaller',
    ],
    [
      'text that is not UTF-8',
      textFile(new Uint8Array([0xff, 0xfe, 0xfd])),
      'Logbook must be UTF-8 encoded text',
    ],
    ['invalid JSON', jsonFile('not json'), 'Logbook is not valid JSON'],
  ])('reports %s', async (_, file, message) => {
    await expect(validateLogbook(file)).resolves.toBe(message);
  });

  it('never reads a file that is too large', async () => {
    const file = textFile(new Uint8Array(MAX_LOGBOOK_BYTES + 1));
    const read = vi.spyOn(file, 'arrayBuffer');
    await expect(validateLogbook(file)).resolves.toBe('Logbook must be 1 MB or smaller');
    expect(read).not.toHaveBeenCalled();
  });
});
