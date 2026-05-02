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

function firstMessage(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }
  if (typeof value === "object" && value) {
    if ("error" in value) {
      const message = firstMessage((value as { error?: unknown }).error);
      if (message) return message;
    }
    if ("message" in value) {
      const message = firstMessage((value as { message?: unknown }).message);
      if (message) return message;
    }
    if ("detail" in value) {
      const message = firstMessage((value as { detail?: unknown }).detail);
      if (message) return message;
    }
    if ("non_field_errors" in value) {
      const message = firstMessage((value as { non_field_errors?: unknown }).non_field_errors);
      if (message) return message;
    }
    for (const nested of Object.values(value)) {
      const message = firstMessage(nested);
      if (message) return message;
    }
  }
  return null;
}

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const message = firstMessage(error.response?.data) ?? error.message;
    const responseData = error.response?.data;
    const code =
      typeof responseData === "object" &&
      responseData &&
      "error" in responseData &&
      typeof responseData.error === "object" &&
      responseData.error &&
      "code" in responseData.error &&
      typeof responseData.error.code === "string"
        ? responseData.error.code
        : "api_error";
    return new ApiError(message, error.response?.status, code);
  }

  if (error instanceof Error) return new ApiError(error.message);
  return new ApiError("An unknown API error occurred.");
}
