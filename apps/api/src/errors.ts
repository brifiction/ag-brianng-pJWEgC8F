import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

/** An error reported to the client as `{ error: { code, message, field } }`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field: string | undefined;

  /**
   * Creates an error with everything the response needs.
   * @param status - HTTP status code.
   * @param code - Stable code the client can check, e.g. `INVALID_VEHICLE`.
   * @param message - Message to show the user.
   * @param field - The form field at fault, when there is one.
   */
  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

/**
 * Turns a multer upload error into an API error.
 * @param error - The error multer raised.
 * @returns 413 for a file over the size limit, otherwise 400.
 */
function fromUploadError(error: multer.MulterError): ApiError {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new ApiError(413, 'TOO_LARGE', 'Logbook must be 1 MB or smaller', 'logbook');
  }
  return new ApiError(
    400,
    'INVALID_UPLOAD',
    'Send make, model, badge and one logbook file',
    'logbook',
  );
}

/**
 * Decides how any error is reported. Unexpected errors are logged and hidden behind a generic 500.
 * @param error - Whatever was thrown or passed to `next`.
 * @returns The error to send to the client.
 */
function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof multer.MulterError) return fromUploadError(error);
  console.error(error);
  return new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong, please try again');
}

/**
 * Sends every error as `{ error: { code, message, field } }`.
 * @param error - Whatever was thrown or passed to `next`.
 * @param _request - The request (unused).
 * @param response - The response to send.
 * @param _next - Next handler (unused, but Express needs four parameters to spot an error handler).
 */
export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const { status, code, message, field } = toApiError(error);
  response.status(status).json({ error: { code, message, field } });
};
