// Error taxonomy shared by the API edge and the Relate client.

export type ErrorCode =
  | "invalid_input"
  | "upstream_timeout"
  | "upstream_error"
  | "parse_failure"
  | "not_configured";

export type ApiError = { error: ErrorCode; hint: string };

const CODES: readonly ErrorCode[] = [
  "invalid_input",
  "upstream_timeout",
  "upstream_error",
  "parse_failure",
  "not_configured",
];

export function isErrorCode(x: unknown): x is ErrorCode {
  return typeof x === "string" && (CODES as readonly string[]).includes(x);
}

/** An Error that carries an ErrorCode, so callers can switch on it. */
export class CoreError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, hint: string) {
    super(hint);
    this.name = "CoreError";
    this.code = code;
  }
}

export function errorCodeOf(e: unknown): ErrorCode {
  if (e instanceof CoreError) return e.code;
  return "upstream_error";
}
