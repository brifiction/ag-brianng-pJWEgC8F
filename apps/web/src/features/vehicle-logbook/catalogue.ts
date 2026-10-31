/** Make key → Model → Badges, as served by `GET /api/vehicles`. */
export type VehicleCatalogue = Record<string, Record<string, string[]>>;

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

const MAKE_LABELS: Record<string, string> = { ford: 'Ford', bmw: 'BMW', tesla: 'Tesla' };

/** Display label for a make key; unknown keys are capitalised. */
export function makeLabel(make: string): string {
  return MAKE_LABELS[make] ?? make.charAt(0).toUpperCase() + make.slice(1);
}

/** Full display name, e.g. "Ford Ranger Raptor". */
export function vehicleLabel({ make, model, badge }: Vehicle): string {
  return `${makeLabel(make)} ${model} ${badge}`;
}

export function getMakes(catalogue: VehicleCatalogue): string[] {
  return Object.keys(catalogue);
}

export function getModels(catalogue: VehicleCatalogue, make: string): string[] {
  return Object.keys(catalogue[make] ?? {});
}

export function getBadges(catalogue: VehicleCatalogue, make: string, model: string): string[] {
  return catalogue[make]?.[model] ?? [];
}

/** True when the combination exists in the catalogue. Badges are unique per model only. */
export function isValidVehicle(catalogue: VehicleCatalogue, vehicle: Vehicle): boolean {
  return getBadges(catalogue, vehicle.make, vehicle.model).includes(vehicle.badge);
}

export function isSameVehicle(a: Vehicle, b: Vehicle): boolean {
  return a.make === b.make && a.model === b.model && a.badge === b.badge;
}
