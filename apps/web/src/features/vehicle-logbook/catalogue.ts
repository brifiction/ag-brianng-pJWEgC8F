/** Make key → Model → Badges, as served by `GET /api/vehicles`. */
export type VehicleCatalogue = Record<string, Record<string, string[]>>;

/** A vehicle as chosen in the form. `make` is the catalogue key, e.g. "ford". */
export interface Vehicle {
  make: string;
  model: string;
  badge: string;
}

/** Common vehicles offered as one-click presets. */
export const QUICK_SELECTS: readonly Vehicle[] = [
  { make: 'ford', model: 'Ranger', badge: 'Raptor' },
  { make: 'tesla', model: 'Model 3', badge: 'Performance' },
  { make: 'bmw', model: '130d', badge: 'xDrive 26d' },
];

/** Display labels for make keys that are not simply capitalised. */
const MAKE_LABELS: Record<string, string> = { ford: 'Ford', bmw: 'BMW', tesla: 'Tesla' };

/**
 * Display label for a make key; unknown keys are capitalised.
 * @param make - Make key, e.g. "bmw".
 * @returns The display label, e.g. "BMW".
 */
export function makeLabel(make: string): string {
  return MAKE_LABELS[make] ?? make.charAt(0).toUpperCase() + make.slice(1);
}

/**
 * Full display name, e.g. "Ford Ranger Raptor".
 * @param vehicle - The vehicle to name.
 * @returns Make label, model and badge, separated by spaces.
 */
export function vehicleLabel({ make, model, badge }: Vehicle): string {
  return `${makeLabel(make)} ${model} ${badge}`;
}

/**
 * All make keys, in catalogue order.
 * @param catalogue - The vehicle catalogue.
 * @returns Make keys.
 */
export function getMakes(catalogue: VehicleCatalogue): string[] {
  return Object.keys(catalogue);
}

/**
 * Models of one make; empty when the make is unknown.
 * @param catalogue - The vehicle catalogue.
 * @param make - Make key.
 * @returns Model names.
 */
export function getModels(catalogue: VehicleCatalogue, make: string): string[] {
  return Object.keys(catalogue[make] ?? {});
}

/**
 * Badges of one model; empty when the make or model is unknown.
 * @param catalogue - The vehicle catalogue.
 * @param make - Make key.
 * @param model - Model name.
 * @returns Badge names.
 */
export function getBadges(catalogue: VehicleCatalogue, make: string, model: string): string[] {
  return catalogue[make]?.[model] ?? [];
}

/**
 * True when the combination exists in the catalogue. Badges are unique per model only.
 * @param catalogue - The vehicle catalogue.
 * @param vehicle - The vehicle to check.
 * @returns Whether the vehicle exists.
 */
export function isValidVehicle(catalogue: VehicleCatalogue, vehicle: Vehicle): boolean {
  return getBadges(catalogue, vehicle.make, vehicle.model).includes(vehicle.badge);
}

/**
 * True when make, model and badge all match.
 * @param a - First vehicle.
 * @param b - Second vehicle.
 * @returns Whether all three parts match.
 */
export function isSameVehicle(a: Vehicle, b: Vehicle): boolean {
  return a.make === b.make && a.model === b.model && a.badge === b.badge;
}
