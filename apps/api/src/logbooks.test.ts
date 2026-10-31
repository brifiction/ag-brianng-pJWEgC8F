import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_LOGBOOK_BYTES } from '@autograb/logbook';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { uploadPath } from './logbooks.ts';

/** Fresh upload folder per run, so the clean-up check sees only this suite's files. */
let uploadDir: string;
/** App under test, writing uploads to {@link uploadDir}. */
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  uploadDir = await mkdtemp(join(tmpdir(), 'logbooks-test-'));
  app = createApp({ uploadDir });
});

afterEach(async () => {
  expect(await readdir(uploadDir), 'AC-09.6: no upload left on disk').toEqual([]);
});

afterAll(async () => {
  await rm(uploadDir, { recursive: true, force: true });
});

const JSON_LOGBOOK = JSON.stringify({
  entries: [{ date: '2024-03-12', odometerKm: 15020, description: 'Service #1' }],
});

/**
 * A file to attach to the upload.
 * @param content - File content.
 * @param filename - File name.
 * @param contentType - MIME type.
 * @returns The content plus supertest's attach options.
 */
const file = (content: string | Buffer, filename: string, contentType: string) => ({
  content: Buffer.from(content),
  options: { filename, contentType },
});

/**
 * Posts a logbook upload.
 * @param fields - Form fields to send; defaults to Ford Ranger Raptor.
 * @param logbook - File to attach, or `null` to send none.
 * @returns The pending supertest request.
 */
function upload(
  fields: Record<string, string> = { make: 'ford', model: 'Ranger', badge: 'Raptor' },
  logbook: ReturnType<typeof file> | null = file(JSON_LOGBOOK, 'logbook.json', 'application/json'),
) {
  const post = request(app).post('/api/logbooks');
  for (const [name, value] of Object.entries(fields)) post.field(name, value);
  if (logbook) post.attach('logbook', logbook.content, logbook.options);
  return post;
}

describe('POST /api/logbooks', () => {
  it('AC-09.7 echoes a JSON logbook with its parsed entries', async () => {
    const response = await upload();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      make: 'ford',
      model: 'Ranger',
      badge: 'Raptor',
      logbook: {
        format: 'json',
        content: JSON_LOGBOOK,
        entries: [{ date: '2024-03-12', odometerKm: 15020, description: 'Service #1' }],
      },
    });
  });

  it('AC-09.7 echoes a text logbook exactly', async () => {
    const content = 'Line 1\n  <b>kept as text</b> ✓\n';
    const response = await upload(undefined, file(content, 'logbook.txt', 'text/plain'));
    expect(response.status).toBe(200);
    expect(response.body.logbook).toEqual({ format: 'text', content });
  });

  it('accepts the sample logbook in the repo', async () => {
    const sample = await readFile(join(import.meta.dirname, '../../../samples/logbook.json'));
    const response = await upload(undefined, file(sample, 'logbook.json', 'application/json'));
    expect(response.status).toBe(200);
    expect(response.body.logbook.entries).toHaveLength(3);
  });

  it.each([
    [{ make: 'ford', model: 'Ranger', badge: 'XR8' }, 'badge', 'Unknown badge "XR8"'],
    [{ make: 'ford', model: 'Model 3', badge: 'Performance' }, 'model', 'Unknown model "Model 3"'],
    [{ make: 'holden', model: 'Ute', badge: 'SS' }, 'make', 'Unknown make "holden"'],
  ])('AC-09.1 rejects a vehicle not in the catalogue: %o', async (fields, field, message) => {
    const response = await upload(fields);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: 'INVALID_VEHICLE', message, field } });
  });

  it('AC-09.2 rejects a missing field', async () => {
    const response = await upload({ make: 'ford', model: 'Ranger' });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'MISSING_FIELD', field: 'badge' });
  });

  it('AC-09.3 rejects a file that is neither text nor JSON with 415', async () => {
    const response = await upload(undefined, file('%PDF', 'logbook.pdf', 'application/pdf'));
    expect(response.status).toBe(415);
    expect(response.body.error).toMatchObject({ code: 'UNSUPPORTED_TYPE', field: 'logbook' });
  });

  it('AC-09.4 rejects a file over 1 MB with 413', async () => {
    const big = Buffer.alloc(MAX_LOGBOOK_BYTES + 1, 'a');
    const response = await upload(undefined, file(big, 'logbook.txt', 'text/plain'));
    expect(response.status).toBe(413);
    expect(response.body.error).toMatchObject({ code: 'TOO_LARGE', field: 'logbook' });
  });

  it('AC-09.5 rejects a missing file', async () => {
    const response = await upload(undefined, null);
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'MISSING_FILE', field: 'logbook' });
  });

  it('AC-09.5 rejects an empty file', async () => {
    const response = await upload(undefined, file('', 'logbook.txt', 'text/plain'));
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'EMPTY' });
  });

  it('AC-09.8 rejects JSON that breaks the logbook format, naming the problem', async () => {
    const broken = JSON.stringify({ entries: [{ odometerKm: 1, description: 'x' }] });
    const response = await upload(undefined, file(broken, 'logbook.json', 'application/json'));
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: 'INVALID_JSON',
      message: 'Entry 1: date must be a date in YYYY-MM-DD format',
      field: 'logbook',
    });
  });

  it('rejects text that is not UTF-8', async () => {
    const bytes = Buffer.from([0xff, 0xfe, 0xfd]);
    const response = await upload(undefined, file(bytes, 'logbook.txt', 'text/plain'));
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'NOT_UTF8' });
  });

  it('rejects more than one file', async () => {
    const response = await upload().attach('logbook', Buffer.from('second'), {
      filename: 'b.txt',
      contentType: 'text/plain',
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: 'INVALID_UPLOAD' });
  });
});

describe('rate limiting', () => {
  it('answers 429 with a JSON error once an IP passes its upload limit', async () => {
    const limited = createApp({ uploadDir, uploadsPerMinute: 1 });
    /**
     * Sends an upload without a badge, so it fails fast with 400 until the limit is reached.
     * @returns The pending request.
     */
    const send = () =>
      request(limited).post('/api/logbooks').field('make', 'ford').field('model', 'Ranger');

    expect((await send()).status).toBe(400);
    const response = await send();
    expect(response.status).toBe(429);
    expect(response.body.error).toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });
});

describe('uploadPath', () => {
  it('keeps uploads inside the upload folder', () => {
    expect(uploadPath('/srv/uploads', 'a1b2c3')).toBe('/srv/uploads/a1b2c3');
  });

  it.each(['../escape', '../../etc/passwd', '/etc/passwd', '..'])('rejects %s', (name) => {
    expect(() => uploadPath('/srv/uploads', name)).toThrow('Send one logbook file');
  });
});

describe('GET /api/vehicles', () => {
  it('returns the catalogue', async () => {
    const response = await request(app).get('/api/vehicles');
    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toEqual(['ford', 'bmw', 'tesla']);
    expect(response.body.ford.Ranger).toEqual(['Raptor', 'Raptor X', 'Wildtrak']);
  });
});
