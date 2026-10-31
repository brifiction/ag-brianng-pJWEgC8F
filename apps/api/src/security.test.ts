import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.ts';

/** The only origin this app trusts in these tests. */
const WEB_ORIGIN = 'https://app.example.com';

/** App under test, trusting only {@link WEB_ORIGIN}. */
const app = createApp({ allowedOrigins: [WEB_ORIGIN] });

describe('security headers', () => {
  it('sets Helmet headers, hides Express and disables caching', async () => {
    const response = await request(app).get('/api/vehicles');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('sets them on unknown routes too', async () => {
    const response = await request(app).get('/nope');
    expect(response.status).toBe(404);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CORS and origin check', () => {
  it('allows the web app origin, and tells the browser so', async () => {
    const response = await request(app).get('/api/vehicles').set('Origin', WEB_ORIGIN);
    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
  });

  it('answers the browser preflight for the web app origin', async () => {
    const response = await request(app)
      .options('/api/logbooks')
      .set('Origin', WEB_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
  });

  it.each(['https://evil.example.com', 'null'])(
    'rejects other origins with 403: %s',
    async (origin) => {
      const response = await request(app).post('/api/logbooks').set('Origin', origin);
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: { code: 'FORBIDDEN_ORIGIN', message: 'Requests from this site are not allowed' },
      });
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    },
  );

  it('lets requests without an Origin through (not from a browser)', async () => {
    const response = await request(app).get('/api/vehicles');
    expect(response.status).toBe(200);
  });
});
