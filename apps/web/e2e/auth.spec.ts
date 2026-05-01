import { test, expect } from "./helpers/fixtures";
import { loginViaUi, logoutViaUi, registerViaUi, expectCookie } from "./helpers/auth";
import { uniqueUser } from "./helpers/data";
import { browserFetchJson, expectApiJson, waitForApiResponse } from "./helpers/network";

test.describe("auth browser-to-backend flow", () => {
  test("bootstraps CSRF from the browser origin", async ({ page }) => {
    await page.goto("/login");

    const response = await browserFetchJson<{ csrfToken: string; authenticated: boolean }>(page, "/auth/csrf/");

    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(false);
    expect(response.body.csrfToken).toHaveLength(64);
    await expectCookie(page, "csrftoken");
  });

  test("registers, persists the session after refresh, logs out, and logs in again", async ({ page }) => {
    const user = uniqueUser("auth");

    await registerViaUi(page, user);
    await expect(page.getByRole("heading", { name: /private media command center/i })).toBeVisible();

    const meAfterRefresh = waitForApiResponse(page, "GET", "/api/auth/me/", 200);
    await page.reload();
    const sessionPayload = await expectApiJson<{ authenticated: boolean; user: { email: string } }>(await meAfterRefresh);
    expect(sessionPayload.authenticated).toBe(true);
    expect(sessionPayload.user.email).toBe(user.email);
    await expect(page.getByText(user.displayName)).toBeVisible();

    await logoutViaUi(page);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

    await loginViaUi(page, user);
    await expect(page.getByText(user.displayName)).toBeVisible();
  });

  test("redirects protected routes when logged out and public routes when authenticated", async ({ page }) => {
    const currentUserResponse = waitForApiResponse(page, "GET", "/api/auth/me/", 200);
    await page.goto("/library");
    await currentUserResponse;
    await expect(page).toHaveURL("/login");
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

    const user = await registerViaUi(page, uniqueUser("redirect"));
    await expect(page.getByText(user.displayName)).toBeVisible();

    const sessionResponse = waitForApiResponse(page, "GET", "/api/auth/me/", 200);
    await page.goto("/register");
    await sessionResponse;
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /private media command center/i })).toBeVisible();
  });
});
