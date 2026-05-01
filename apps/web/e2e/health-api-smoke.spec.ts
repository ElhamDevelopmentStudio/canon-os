import { test, expect } from "./helpers/fixtures";
import { browserFetchJson } from "./helpers/network";

test.describe("health and API documentation smoke", () => {
  test("calls backend health from the browser origin", async ({ page }) => {
    await page.goto("/login");

    const response = await browserFetchJson<{ status: string; service: string }>(page, "/health/");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("canonos-api");
  });

  test("serves API schema and docs endpoints", async ({ request }) => {
    const schemaResponse = await request.get("http://localhost:8000/api/schema/");
    expect(schemaResponse.status()).toBe(200);
    const schema = await schemaResponse.text();
    expect(schema).toContain("/api/auth/register/");
    expect(schema).toContain("/api/queue-items/");

    const docsResponse = await request.get("http://localhost:8000/api/docs/scalar/");
    expect(docsResponse.status()).toBe(200);
    expect(await docsResponse.text()).toContain("CanonOS API Docs");
  });
});
