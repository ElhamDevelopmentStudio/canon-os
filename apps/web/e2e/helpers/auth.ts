import type { Page } from "@playwright/test";

import { expect } from "./fixtures";
import { expectApiJson, waitForApiResponse } from "./network";
import { type TestUser, uniqueUser } from "./data";

export async function expectCookie(page: Page, cookieName: string): Promise<void> {
  const cookies = await page.context().cookies("http://localhost:8000");
  expect(cookies.some((cookie) => cookie.name === cookieName), `${cookieName} cookie`).toBe(true);
}

export async function registerViaUi(page: Page, user: TestUser = uniqueUser()): Promise<TestUser> {
  await page.goto("/register");
  await page.getByLabel("Display name").fill(user.displayName);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);

  const registerResponse = waitForApiResponse(page, "POST", "/api/auth/register/", 201);
  await page.getByRole("button", { name: "Create account" }).click();
  const response = await registerResponse;
  const payload = await expectApiJson<{ authenticated: boolean; user: { email: string } }>(response);
  expect(payload.authenticated).toBe(true);
  expect(payload.user.email).toBe(user.email);
  await expect(page).toHaveURL("/");
  await expectCookie(page, "csrftoken");
  await expectCookie(page, "sessionid");
  return user;
}

export async function loginViaUi(page: Page, user: TestUser): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);

  const loginResponse = waitForApiResponse(page, "POST", "/api/auth/login/", 200);
  await page.getByRole("button", { name: "Log in" }).click();
  const response = await loginResponse;
  const payload = await expectApiJson<{ authenticated: boolean; user: { email: string } }>(response);
  expect(payload.authenticated).toBe(true);
  expect(payload.user.email).toBe(user.email);
  await expect(page).toHaveURL("/");
  await expectCookie(page, "sessionid");
}

export async function logoutViaUi(page: Page): Promise<void> {
  const logoutResponse = waitForApiResponse(page, "POST", "/api/auth/logout/", 200);
  await page.getByRole("button", { name: "Log out" }).click();
  const response = await logoutResponse;
  const payload = await expectApiJson<{ authenticated: boolean }>(response);
  expect(payload.authenticated).toBe(false);
  await expect(page).toHaveURL("/login");
}
