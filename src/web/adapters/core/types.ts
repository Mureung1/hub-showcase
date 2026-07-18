import type { DomainError } from '../../../domain/errors';
export type AdapterOnlyErrorCode = 'NOT_IMPLEMENTED' | 'VALIDATION_ERROR' | 'CONFIGURATION_ERROR' | 'TRANSIENT_ERROR' | 'UNKNOWN';
export interface AdapterError { readonly source: 'core' | 'adapter'; readonly code: DomainError | AdapterOnlyErrorCode; readonly fieldErrors?: Readonly<Record<string, readonly string[]>>; readonly meta?: Readonly<Record<string, string | number | boolean>>; readonly traceId: string; readonly retryable: boolean }
export type AdapterResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: AdapterError };
export interface AdapterContext { readonly sessionUserId: string; readonly requestId: string; readonly now: Date }
export const adapterOk = <T>(value: T): AdapterResult<T> => ({ ok: true, value });
export const adapterError = (code: AdapterOnlyErrorCode, retryable = false): AdapterResult<never> => ({ ok: false, error: { source: 'adapter', code, retryable, traceId: crypto.randomUUID() } });
