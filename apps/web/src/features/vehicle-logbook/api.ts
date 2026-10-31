import type { Logbook } from '@autograb/logbook';
import axios from 'axios';
import type { Vehicle, VehicleCatalogue } from './catalogue.ts';

/** Vehicle and logbook echoed back by the API after an upload. */
export interface LogbookSubmission extends Vehicle {
  logbook: Logbook;
}

/** What the form sends: the vehicle plus the chosen file. */
export interface LogbookRequest extends Vehicle {
  logbook: File;
}

/** Error body the API returns with a 4xx or 5xx response. */
interface ApiErrorBody {
  error?: { code?: string; message?: string; field?: string };
}

/** Shown for network and server errors, which have no user-facing message. */
const GENERIC_ERROR = 'Something went wrong, please try again';

/** Axios client for the API; Vite proxies `/api` in development. */
const http = axios.create({ baseURL: '/api' });

/**
 * Fetches the Make → Model → Badge catalogue.
 * @param signal - Cancels the request, e.g. when the page unmounts.
 * @returns The catalogue.
 */
export async function fetchCatalogue(signal?: AbortSignal): Promise<VehicleCatalogue> {
  const { data } = await http.get<VehicleCatalogue>('/vehicles', { signal });
  return data;
}

/**
 * Uploads the vehicle and logbook file as `multipart/form-data`.
 * @remarks Text fields go before the file so the API can validate them before the upload streams in.
 * @param request - The vehicle and the chosen file.
 * @returns The vehicle and logbook as the API received them.
 */
export async function submitLogbook({
  logbook,
  ...vehicle
}: LogbookRequest): Promise<LogbookSubmission> {
  const body = new FormData();
  body.append('make', vehicle.make);
  body.append('model', vehicle.model);
  body.append('badge', vehicle.badge);
  body.append('logbook', logbook);
  const { data } = await http.post<LogbookSubmission>('/logbooks', body);
  return data;
}

/**
 * The API's own message for a 4xx response; a generic message for anything else.
 * @param error - Anything thrown by an API call.
 * @returns A message to show the user.
 */
export function toErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return GENERIC_ERROR;
  const status = error.response?.status ?? 0;
  const message = error.response?.data?.error?.message;
  return status >= 400 && status < 500 && message ? message : GENERIC_ERROR;
}
