import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { catalogue } from './catalogue.ts';
import { errorHandler } from './errors.ts';
import { logbooksRouter } from './logbooks.ts';

/** Where uploads wait while a request is handled, unless the caller picks another folder. */
const DEFAULT_UPLOAD_DIR = join(tmpdir(), 'autograb-logbooks');

/** Settings for {@link createApp}. */
export interface AppOptions {
  /** Folder for uploads while a request is handled. */
  uploadDir?: string;
  /** Most logbook uploads one IP address may send per minute. */
  uploadsPerMinute?: number;
}

/**
 * Builds the Express app without binding a port, so tests can mount it directly.
 * @param options - Optional settings; every field has a default.
 * @returns The configured Express app.
 */
export function createApp({
  uploadDir = DEFAULT_UPLOAD_DIR,
  uploadsPerMinute = 30,
}: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/vehicles', (_request, response) => {
    response.json(catalogue);
  });

  app.use('/api', logbooksRouter(uploadDir, uploadsPerMinute));
  app.use(errorHandler);

  return app;
}
