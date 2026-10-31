import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { fetchCatalogue } from './api.ts';
import type { VehicleCatalogue } from './catalogue.ts';

/** Where the catalogue request is up to. */
type CatalogueState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; catalogue: VehicleCatalogue };

/**
 * Loads the vehicle catalogue once, with a `retry` for failed loads.
 * @returns The request state and a `retry` function.
 */
export function useCatalogue() {
  const [state, setState] = useState<CatalogueState>({ status: 'loading' });

  /** Requests the catalogue and tracks its state; ignores aborted requests. */
  const load = useCallback((signal?: AbortSignal) => {
    setState({ status: 'loading' });
    fetchCatalogue(signal).then(
      (catalogue) => setState({ status: 'ready', catalogue }),
      (error: unknown) => {
        if (!axios.isCancel(error)) setState({ status: 'error' });
      },
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /**
   * Requests the catalogue again, e.g. after a failed load.
   */
  const retry = () => {
    load();
  };

  return { state, retry };
}
