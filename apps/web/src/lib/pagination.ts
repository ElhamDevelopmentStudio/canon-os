import type { PaginatedResponse, PaginationParams } from "@canonos/contracts";

export const DEFAULT_PAGE_SIZE = 25;

export function paginationParams(params: PaginationParams = {}) {
  const query = new URLSearchParams();
  if (params.page && params.page !== "1") query.set("page", params.page);
  if (params.pageSize && params.pageSize !== String(DEFAULT_PAGE_SIZE)) {
    query.set("pageSize", params.pageSize);
  }
  return query;
}

export function normalizePaginatedResponse<T>(response: PaginatedResponse<T> | T[]): PaginatedResponse<T> {
  if (Array.isArray(response)) {
    return { count: response.length, next: null, previous: null, results: response };
  }
  return response;
}

export function pageCount(count: number, pageSize = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

export function pageFromSearchParams(searchParams: URLSearchParams): string {
  const raw = searchParams.get("page");
  const parsed = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "1";
}
