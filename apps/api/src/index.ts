import { createApp } from './app.ts';

/** Port to listen on; `PORT` overrides the default 4000. */
const port = Number(process.env.PORT ?? 4000);

/** Web app origins from `WEB_ORIGINS` (comma-separated); unset or empty uses the local defaults. */
const origins = (process.env.WEB_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = origins.length > 0 ? origins : undefined;

createApp({ allowedOrigins }).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
