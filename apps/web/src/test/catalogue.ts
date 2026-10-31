import type { VehicleCatalogue } from '@/features/vehicle-logbook/catalogue.ts';
import vehicles from '../../../api/src/data/vehicles.json';

/** The API's real catalogue, so tests exercise the data from the brief. */
export const catalogue: VehicleCatalogue = vehicles;
