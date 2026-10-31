import type { Logbook } from '@autograb/logbook';
import axios from 'axios';
import type { Vehicle, VehicleCatalogue } from './catalogue.ts';

/** Vehicle and logbook echoed back by the API after an upload. */
export interface LogbookSubmission extends Vehicle {
  logbook: Logbook;
}

export interface LogbookRequest extends Vehicle {
  logbook: File;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; field?: string };
}

const GENERIC_ERROR = 'Something went wrong, please try again';

const http = axios.create({ baseURL: '/api' });

export async function fetchCatalogue(signal?: AbortSignal): Promise<VehicleCatalogue> {
  const { data } = await http.get<VehicleCatalogue>('/vehicles', { signal });
  return data;
}

/** Text fields are appended before the file so the API can validate them before the upload streams in. */
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

/** The API's own message for a 4xx response; a generic message for anything else. */
export function toErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return GENERIC_ERROR;
  const status = error.response?.status ?? 0;
  const message = error.response?.data?.error?.message;
  return status >= 400 && status < 500 && message ? message : GENERIC_ERROR;
}
