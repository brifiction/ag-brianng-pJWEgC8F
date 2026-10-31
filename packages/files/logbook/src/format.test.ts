import { describe, expect, it } from 'vitest';
import { logbookFormat } from './format.ts';

describe('logbookFormat', () => {
  it.each([
    ['logbook.txt', 'text/plain', 'text'],
    ['logbook.json', 'application/json', 'json'],
    ['LOGBOOK.TXT', '', 'text'],
    ['logbook.json', '', 'json'],
    ['logbook.pdf', 'application/pdf', null],
    ['logbook.log', '', null],
  ])('%s (%s) is %s', (name, type, expected) => {
    expect(logbookFormat({ name, type })).toBe(expected);
  });
});
