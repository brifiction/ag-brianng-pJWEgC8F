import { Button } from '@/components/ui/button';
import {
  isSameVehicle,
  isValidVehicle,
  QUICK_SELECTS,
  type Vehicle,
  type VehicleCatalogue,
  vehicleLabel,
} from './catalogue.ts';

interface QuickSelectProps {
  catalogue: VehicleCatalogue;
  current: Vehicle;
  onSelect: (vehicle: Vehicle) => void;
}

/** Preset buttons; presets missing from the catalogue are hidden. */
export function QuickSelect({ catalogue, current, onSelect }: Readonly<QuickSelectProps>) {
  const presets = QUICK_SELECTS.filter((vehicle) => isValidVehicle(catalogue, vehicle));
  if (presets.length === 0) return null;

  return (
    <section aria-labelledby="quick-select-heading" className="flex flex-col gap-2">
      <h2 id="quick-select-heading" className="text-sm font-medium">
        Quick select
      </h2>
      <div className="flex flex-wrap gap-2">
        {presets.map((vehicle) => (
          <Button
            key={vehicleLabel(vehicle)}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={isSameVehicle(vehicle, current)}
            onClick={() => onSelect(vehicle)}
          >
            {vehicleLabel(vehicle)}
          </Button>
        ))}
      </div>
    </section>
  );
}
