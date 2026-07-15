/**
 * Typed domain errors + `Result` type for the server-side domain layer.
 *
 * design.md → "Components and Interfaces" defines the common contract shared by
 * every domain transaction function:
 *
 *   - `DomainError` — the closed union of error CODES the domain can produce.
 *   - `DomainErr`   — the thrown `Error` subclass carrying one of those codes.
 *   - `Result<T>`   — the value/​error envelope that Server Actions / Route
 *                     Handlers (web spec) return to clients.
 *
 * Enforcement pattern (design.md → "Error Handling", "오류 전파 원칙"):
 * inner domain functions `throw new DomainErr(code)`; Drizzle's
 * `db.transaction()` catches the throw and ROLLS BACK the whole transaction
 * (all-or-nothing — Requirement 14.3). The outer Server Action / Route Handler
 * converts the throw into a `Result<T>` via {@link toResult}.
 *
 * Requirements traceability: 5.2, 12.2, 14.1, 14.2, 14.3 (and the full error
 * table in design.md → "Error Handling").
 */

/**
 * Closed union of domain error codes. Mirrors design.md → "Components and
 * Interfaces" `DomainError`. Each code maps to a row in the design's Error
 * Handling table.
 */
export type DomainError =
  | 'UNAUTHENTICATED' // Req 1.5
  | 'DUPLICATE_EMAIL' // Req 1.2
  | 'INSUFFICIENT_POINTS' // Req 5.2, 12.2
  | 'PAYMENT_DECLINED' // Req 3.2
  | 'DUPLICATE_PARTICIPATION' // Req 3.3, 5.4
  | 'CAPACITY_FULL' // Req 3.4, 5.3
  | 'STUDY_TIME_NOT_MET' // Req 7.2
  | 'DEADLINE_EXCEEDED' // Req 7.3
  | 'NOT_ALIVE' // Req 8.3
  | 'NOT_ELIMINATED' // Req 12.4 (revival: only an eliminated participant can revive)
  | 'CONSERVATION_VIOLATED' // Req 14.1
  | 'INVALID_CONFIG' // Req 4.2, 4.3
  | 'ALREADY_SETTLED'
  | 'FORBIDDEN'; // Req 13.3 (authenticated caller lacks the required role, e.g. Operator)

/**
 * Error thrown by domain transaction functions. Carries a machine-readable
 * {@link DomainError} `code` so the transaction boundary can roll back and the
 * outer handler can map it to a `Result`.
 */
export class DomainErr extends Error {
  readonly code: DomainError;

  constructor(code: DomainError, message?: string) {
    super(message ?? code);
    this.name = 'DomainErr';
    this.code = code;
    // Preserve the prototype chain when targeting ES5-ish runtimes / when the
    // class is extended, so `instanceof DomainErr` stays reliable.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Value/​error envelope returned to callers. design.md → `Result<T>`. */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: DomainError };

/** Build a success result. */
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

/** Build a failure result from a domain error code. */
export const err = (error: DomainError): Result<never> => ({
  ok: false,
  error,
});

/** Narrowing guard for {@link DomainErr}. */
export function isDomainErr(error: unknown): error is DomainErr {
  return error instanceof DomainErr;
}
