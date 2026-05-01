import axios from "axios";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code = "api_error",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const message =
      typeof error.response?.data === "object" && error.response.data && "error" in error.response.data
        ? String((error.response.data as { error?: { message?: unknown } }).error?.message ?? error.message)
        : error.message;

    return new ApiError(message, error.response?.status);
  }

  if (error instanceof Error) return new ApiError(error.message);
  return new ApiError("An unknown API error occurred.");
}
