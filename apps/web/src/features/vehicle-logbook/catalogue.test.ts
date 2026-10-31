import { describe, expect, it } from 'vitest';
import { catalogue } from '@/test/catalogue.ts';
import {
  getBadges,
  getMakes,
  getModels,
  isSameVehicle,
  isValidVehicle,
  makeLabel,
  QUICK_SELECTS,
  vehicleLabel,
} from './catalogue.ts';

describe('catalogue', () => {
  it('lists every make', () => {
    expect(getMakes(catalogue)).toEqual(['ford', 'bmw', 'tesla']);
  });

  it('lists only the models of the selected make', () => {
    expect(getModels(catalogue, 'ford')).toEqual(['Ranger', 'Falcon', 'Falcon Ute']);
    expect(getModels(catalogue, 'unknown')).toEqual([]);
  });

  it('lists only the badges of the selected model', () => {
    expect(getBadges(catalogue, 'ford', 'Ranger')).toEqual(['Raptor', 'Raptor X', 'Wildtrak']);
    expect(getBadges(catalogue, 'ford', 'Falcon Ute')).toEqual(['XR6', 'XR6 Turbo']);
    expect(getBadges(catalogue, 'ford', 'unknown')).toEqual([]);
  });

  it('treats badges as unique per model only', () => {
    expect(isValidVehicle(catalogue, { make: 'ford', model: 'Falcon', badge: 'XR8' })).toBe(true);
    expect(isValidVehicle(catalogue, { make: 'ford', model: 'Falcon Ute', badge: 'XR8' })).toBe(
      false,
    );
    expect(isValidVehicle(catalogue, { make: 'ford', model: 'Ranger', badge: 'XR8' })).toBe(false);
  });

  it('has at least two quick selects, all valid in the API catalogue', () => {
    expect(QUICK_SELECTS.length).toBeGreaterThanOrEqual(2);
    for (const vehicle of QUICK_SELECTS) {
      expect(isValidVehicle(catalogue, vehicle), vehicleLabel(vehicle)).toBe(true);
    }
  });

  it('labels makes for display', () => {
    expect(makeLabel('bmw')).toBe('BMW');
    expect(makeLabel('ford')).toBe('Ford');
    expect(makeLabel('holden')).toBe('Holden');
    expect(vehicleLabel({ make: 'tesla', model: 'Model 3', badge: 'Performance' })).toBe(
      'Tesla Model 3 Performance',
    );
  });

  it('compares vehicles by all three parts', () => {
    const ranger = { make: 'ford', model: 'Ranger', badge: 'Raptor' };
    expect(isSameVehicle(ranger, { ...ranger })).toBe(true);
    expect(isSameVehicle(ranger, { ...ranger, badge: 'Raptor X' })).toBe(false);
  });
});
