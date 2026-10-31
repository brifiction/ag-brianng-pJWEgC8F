import vehicles from './data/vehicles.json' with { type: 'json' };

/** Make → Model → Badge[] catalogue. */
export type VehicleCatalogue = Record<string, Record<string, string[]>>;

/** A vehicle as submitted by the form. `make` is the catalogue key, e.g. "ford". */
export interface Vehicle {
  make: string;
  model: string;
  badge: string;
}

/** The brief's vehicle data, typed. */
export const catalogue: VehicleCatalogue = vehicles;

/**
 * Finds the first part of a vehicle that is not in the catalogue.
 * @param vehicle - The submitted vehicle.
 * @returns `make`, `model` or `badge`, or `null` when the vehicle exists.
 */
export function findInvalidField(vehicle: Vehicle): keyof Vehicle | null {
  const models = catalogue[vehicle.make];
  if (!models) return 'make';
  const badges = models[vehicle.model];
  if (!badges) return 'model';
  return badges.includes(vehicle.badge) ? null : 'badge';
}
