import { readFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { type LogbookProblemCode, MAX_LOGBOOK_BYTES, readLogbook } from '@autograb/logbook';
import { type RequestHandler, Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { findInvalidField, type Vehicle } from './catalogue.ts';
import { ApiError } from './errors.ts';

/** HTTP status for each reason a logbook is rejected. */
const PROBLEM_STATUS: Record<LogbookProblemCode, number> = {
  UNSUPPORTED_TYPE: 415,
  TOO_LARGE: 413,
  EMPTY: 400,
  NOT_UTF8: 400,
  INVALID_JSON: 400,
};

/** Form fields that make up a vehicle, in the order they are checked. */
const VEHICLE_FIELDS = ['make', 'model', 'badge'] as const;

/**
 * Reads the vehicle from the form fields and checks it against the catalogue.
 * @param body - The parsed form fields.
 * @returns The vehicle.
 * @throws {@link ApiError} 400 when a field is missing or the vehicle is not in the catalogue.
 */
function readVehicle(body: unknown): Vehicle {
  const fields = (body ?? {}) as Record<string, unknown>;
  for (const field of VEHICLE_FIELDS) {
    const value = fields[field];
    if (typeof value !== 'string' || value === '') {
      throw new ApiError(400, 'MISSING_FIELD', `Select a ${field}`, field);
    }
  }
  const vehicle = { make: fields.make, model: fields.model, badge: fields.badge } as Vehicle;
  const invalid = findInvalidField(vehicle);
  if (invalid) {
    throw new ApiError(400, 'INVALID_VEHICLE', `Unknown ${invalid} "${vehicle[invalid]}"`, invalid);
  }
  return vehicle;
}

/**
 * Builds the path of an upload inside `uploadDir`, never trusting a path from the upload itself.
 * @param uploadDir - Folder where uploads wait until they are read.
 * @param fileName - The name multer gave the upload.
 * @returns The absolute path inside `uploadDir`.
 * @throws {@link ApiError} 400 when the name would point outside `uploadDir`.
 */
export function uploadPath(uploadDir: string, fileName: string): string {
  const folder = resolve(uploadDir);
  const path = resolve(folder, fileName);
  if (!path.startsWith(folder + sep)) {
    throw new ApiError(400, 'INVALID_UPLOAD', 'Send one logbook file', 'logbook');
  }
  return path;
}

/**
 * Reads an uploaded file, then deletes it, so nothing is left on disk whatever happens next.
 * @param path - Checked path of the upload, from {@link uploadPath}.
 * @returns The file's bytes.
 */
async function readAndDelete(path: string): Promise<Buffer> {
  try {
    return await readFile(path);
  } finally {
    await rm(path, { force: true });
  }
}

/**
 * Answers 429 through the API error handler, so it has the usual JSON error shape.
 * @param _request - The request (unused).
 * @param _response - The response (unused).
 * @param next - Passes the error to the error handler.
 */
const rejectTooManyUploads: RequestHandler = (_request, _response, next) => {
  next(new ApiError(429, 'TOO_MANY_REQUESTS', 'Too many uploads; try again in a minute'));
};

/**
 * Router for `POST /logbooks`: checks the vehicle and logbook, then sends both back.
 * @param uploadDir - Folder where uploads wait until they are read.
 * @param uploadsPerMinute - Most uploads one IP address may send per minute.
 * @returns The router.
 */
export function logbooksRouter(uploadDir: string, uploadsPerMinute: number): Router {
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: uploadsPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rejectTooManyUploads,
  });
  const upload = multer({
    dest: uploadDir,
    limits: { fileSize: MAX_LOGBOOK_BYTES, files: 1, fields: VEHICLE_FIELDS.length },
  });
  const router = Router();

  router.post('/logbooks', limiter, upload.single('logbook'), async (request, response) => {
    const file = request.file;
    const bytes = file ? await readAndDelete(uploadPath(uploadDir, file.filename)) : null;

    const vehicle = readVehicle(request.body);
    if (!file || !bytes) throw new ApiError(400, 'MISSING_FILE', 'Attach a logbook', 'logbook');

    const result = readLogbook(
      { name: file.originalname, type: file.mimetype, size: file.size },
      bytes,
    );
    if (!result.ok) {
      const { code, message } = result.problem;
      throw new ApiError(PROBLEM_STATUS[code], code, message, 'logbook');
    }

    response.json({ ...vehicle, logbook: result.logbook });
  });

  return router;
}
