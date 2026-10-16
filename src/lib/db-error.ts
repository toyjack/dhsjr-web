/**
 * A failed Supabase/PostgREST call. Keeps the PostgREST/Postgres error code and
 * HTTP status (0 when the request never reached the server) so callers can tell
 * a timeout or an outage from a bad query. The message is for server logs only.
 */
export class DbError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
    readonly status: number | undefined,
  ) {
    super(message);
    this.name = "DbError";
  }
}

/** Build a DbError from a supabase-js `{ error, status }` result. */
export function dbError(
  prefix: string,
  error: { message: string; code?: string },
  status?: number,
) {
  return new DbError(`${prefix}: ${error.message}`, error.code, status);
}
