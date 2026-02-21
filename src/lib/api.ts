/**
 * API response helpers
 */

export type ApiSuccess<T> = { ok: true; data?: T };
export type ApiError = { ok: false; error: string; code?: string };

export function success<T>(data?: T): ApiSuccess<T> {
  return data !== undefined ? { ok: true, data } : { ok: true };
}

export function apiError(message: string, code?: string): ApiError {
  return { ok: false, error: message, code };
}
