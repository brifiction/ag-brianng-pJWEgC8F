import cors from 'cors';
import type { RequestHandler } from 'express';
import helmet from 'helmet';
import { ApiError } from './errors.ts';

/**
 * Stops browsers and proxies from storing API responses, which can hold logbook data.
 * @param _request - The request (unused).
 * @param response - The response to mark.
 * @param next - Continues to the route.
 */
const noStore: RequestHandler = (_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
};

/**
 * Builds a middleware that answers 403 when a browser request comes from a site not on the allowlist.
 * @remarks Browsers always send `Origin` on cross-site requests and pages cannot change it, so this
 * stops other websites from using the API through a visitor's browser. Requests without `Origin`
 * (curl, server-to-server) are not browsers and pass; origin checks are not authentication.
 * @param allowedOrigins - Origins of the web app, e.g. `http://localhost:5173`.
 * @returns The middleware.
 */
function rejectUnknownOrigins(allowedOrigins: readonly string[]): RequestHandler {
  return (request, _response, next) => {
    const origin = request.get('Origin');
    if (origin === undefined || allowedOrigins.includes(origin)) {
      next();
      return;
    }
    next(new ApiError(403, 'FORBIDDEN_ORIGIN', 'Requests from this site are not allowed'));
  };
}

/**
 * Security middleware for every API route, in order: security headers, no caching,
 * CORS for the web app's origins only, and a 403 for any other browser origin.
 * @param allowedOrigins - Origins of the web app, e.g. `http://localhost:5173`.
 * @returns The middleware, in the order to apply them.
 */
export function securityMiddleware(allowedOrigins: readonly string[]): RequestHandler[] {
  return [
    helmet(),
    noStore,
    cors({ origin: [...allowedOrigins] }),
    rejectUnknownOrigins(allowedOrigins),
  ];
}
