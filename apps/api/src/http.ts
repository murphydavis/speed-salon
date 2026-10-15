import { ApiError } from "./errors.js";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

export function parsePage(raw: unknown): number {
  if (raw === undefined) return DEFAULT_PAGE;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new ApiError(400, "invalid_query", "page must be a positive integer");
  }
  return n;
}

export function parseLimit(raw: unknown): number {
  if (raw === undefined) return DEFAULT_LIMIT;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
    throw new ApiError(400, "invalid_query", `limit must be 1–${MAX_LIMIT}`);
  }
  return n;
}
