import { describe, expect, it } from 'vitest';
import { parseJsonLogbook } from './json-logbook.ts';

const entry = {
  date: '2024-03-12',
  odometerKm: 15020,
  description: 'Scheduled service #1',
  workshop: 'Brisbane Ford',
};

const DATE_PROBLEM = 'date must be a date in YYYY-MM-DD format';
const ODOMETER_PROBLEM = 'odometerKm must be a whole number, 0 or more';

describe('parseJsonLogbook', () => {
  it('returns entries in file order with unknown fields removed', () => {
    const second = { date: '2025-03-08', odometerKm: 30410, description: 'Service #2', extra: 1 };
    expect(parseJsonLogbook(JSON.stringify({ entries: [entry, second] }))).toEqual({
      ok: true,
      entries: [entry, { date: '2025-03-08', odometerKm: 30410, description: 'Service #2' }],
    });
  });

  it('accepts a leap day and an omitted workshop', () => {
    const delivery = { date: '2024-02-29', odometerKm: 0, description: 'Pre-delivery inspection' };
    expect(parseJsonLogbook(JSON.stringify({ entries: [delivery] }))).toEqual({
      ok: true,
      entries: [delivery],
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
    ['a missing date', { ...entry, date: undefined }, DATE_PROBLEM],
    ['a malformed date', { ...entry, date: '12/03/2024' }, DATE_PROBLEM],
    ['an impossible date', { ...entry, date: '2024-02-30' }, DATE_PROBLEM],
    ['a negative odometer', { ...entry, odometerKm: -1 }, ODOMETER_PROBLEM],
    ['a fractional odometer', { ...entry, odometerKm: 1.5 }, ODOMETER_PROBLEM],
    ['a string odometer', { ...entry, odometerKm: '15020' }, ODOMETER_PROBLEM],
    ['a blank description', { ...entry, description: '  ' }, 'description must not be blank'],
    ['a blank workshop', { ...entry, workshop: '' }, 'workshop must not be blank when present'],
  ])('names the first problem for %s', (_, bad, problem) => {
    expect(parseJsonLogbook(JSON.stringify({ entries: [entry, bad] }))).toEqual({
      ok: false,
      error: `Entry 2: ${problem}`,
    });
  });
});
