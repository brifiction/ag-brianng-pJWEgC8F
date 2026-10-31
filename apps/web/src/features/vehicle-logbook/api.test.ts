import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { toErrorMessage } from './api.ts';

const GENERIC = 'Something went wrong, please try again';

const responseError = (status: number, data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

describe('toErrorMessage', () => {
  it("shows the API's message for a 4xx response", () => {
    const error = responseError(400, {
      error: { code: 'INVALID_BADGE', message: 'Unknown badge' },
    });
    expect(toErrorMessage(error)).toBe('Unknown badge');
  });

  it('falls back to the generic message for a 4xx response without a message', () => {
    expect(toErrorMessage(responseError(404, '<html>Not found</html>'))).toBe(GENERIC);
  });

  it('hides server error details behind the generic message', () => {
    const error = responseError(500, { error: { message: 'Stack trace…' } });
    expect(toErrorMessage(error)).toBe(GENERIC);
  });

  it('uses the generic message for network and unknown errors', () => {
    expect(toErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toBe(GENERIC);
    expect(toErrorMessage(new Error('boom'))).toBe(GENERIC);
  });
});
