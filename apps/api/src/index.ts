import { createApp } from './app.ts';

/** Port to listen on; `PORT` overrides the default 4000. */
const port = Number(process.env.PORT ?? 4000);

createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
