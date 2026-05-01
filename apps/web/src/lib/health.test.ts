import { describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { getHealthCheck, HEALTH_CHECK_PATH } from "@/lib/health";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("getHealthCheck", () => {
  it("reads the backend health endpoint through the shared API client", async () => {
    const payload = { status: "ok" as const, service: "canonos-api", version: "0.1.0" };
    vi.mocked(api.get).mockResolvedValueOnce({ data: payload });

    await expect(getHealthCheck()).resolves.toEqual(payload);
    expect(api.get).toHaveBeenCalledWith(HEALTH_CHECK_PATH);
  });
});
