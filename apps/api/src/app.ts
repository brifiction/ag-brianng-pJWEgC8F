import express from 'express';
import vehicles from './data/vehicles.json' with { type: 'json' };

/** Make → Model → Badge[] catalogue. */
export type VehicleCatalogue = Record<string, Record<string, string[]>>;

const catalogue: VehicleCatalogue = vehicles;

/** Builds the Express app without binding a port, so tests can mount it directly. */
export function createApp() {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/vehicles', (_req, res) => {
    res.json(catalogue);
  });

  return app;
}
