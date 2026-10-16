import { DbError } from "@/lib/db-error";
import { type ErrorCode, errorResult } from "./format";

type FailureCode = Extract<
  ErrorCode,
  "SEARCH_FAILED" | "DATABASE_UNAVAILABLE" | "TIMEOUT"
>;

const FAILURE_TEXT: Record<FailureCode, [message: string, hint: string]> = {
  SEARCH_FAILED: [
    "データの取得に失敗しました。",
    "条件を変えて再度お試しください。",
  ],
  DATABASE_UNAVAILABLE: [
    "データベースに接続できませんでした。",
    "しばらくしてから再度お試しください。",
  ],
  TIMEOUT: [
    "検索がタイムアウトしました。",
    "資料番号などの条件を加えるか、per_page を小さくしてください。",
  ],
};

/** Map a thrown error to a failure code: timeout and outage are retryable, the rest is not. */
export function classifyError(error: unknown): FailureCode {
  if (error instanceof DbError) {
    // Postgres query_canceled, raised by statement_timeout.
    if (error.code === "57014") return "TIMEOUT";
    // status 0: the request never reached PostgREST. PGRST000-PGRST003: PostgREST
    // could not reach Postgres. 5xx: the service is down or overloaded.
    if (
      error.status === 0 ||
      (error.status !== undefined && error.status >= 500) ||
      /^PGRST00\d$/.test(error.code ?? "")
    ) {
      return "DATABASE_UNAVAILABLE";
    }
  }
  return "SEARCH_FAILED";
}

/** Tool result for an unexpected failure. Database details go to the server log only (D14). */
export function failureResult(tool: string, error: unknown) {
  console.error(`[mcp] ${tool} failed:`, error);
  const code = classifyError(error);
  const [message, hint] = FAILURE_TEXT[code];
  return errorResult(code, message, hint);
}
