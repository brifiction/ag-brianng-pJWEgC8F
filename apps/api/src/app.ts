import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { catalogue } from './catalogue.ts';
import { errorHandler } from './errors.ts';
import { logbooksRouter } from './logbooks.ts';
import { securityMiddleware } from './security.ts';

/** Where uploads wait while a request is handled, unless the caller picks another folder. */
const DEFAULT_UPLOAD_DIR = join(tmpdir(), 'autograb-logbooks');

/** The web app's local origins: Vite dev server and `vite preview`. */
const DEFAULT_WEB_ORIGINS = ['http://localhost:5173', 'http://localhost:4173'];

/** Settings for {@link createApp}. */
export interface AppOptions {
  /** Folder for uploads while a request is handled. */
  uploadDir?: string;
  /** Most logbook uploads one IP address may send per minute. */
  uploadsPerMinute?: number;
  /** Origins allowed to call the API from a browser: the web app's. */
  allowedOrigins?: readonly string[];
}

/**
 * Builds the Express app without binding a port, so tests can mount it directly.
 * @param options - Optional settings; every field has a default.
 * @returns The configured Express app.
 */
export function createApp({
  uploadDir = DEFAULT_UPLOAD_DIR,
  uploadsPerMinute = 30,
  allowedOrigins = DEFAULT_WEB_ORIGINS,
}: AppOptions = {}) {
  const app = express();
  app.use(securityMiddleware(allowedOrigins));

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
