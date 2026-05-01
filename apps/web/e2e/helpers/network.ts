import type { Page, Response, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";

type ApiFailureAllowance = {
  method?: string;
  path: string | RegExp;
  status?: number;
};

type GuardState = {
  allowedFailures: ApiFailureAllowance[];
  allowedConsoleErrors: (string | RegExp)[];
  consoleErrors: string[];
  pageErrors: string[];
  failedResponses: string[];
};

const guardStates = new WeakMap<Page, GuardState>();

function isApiResponse(response: Response): boolean {
  const url = new URL(response.url());
  return url.pathname.startsWith("/api/");
}

function matchesPath(path: string, matcher: string | RegExp): boolean {
  return typeof matcher === "string" ? path === matcher : matcher.test(path);
}

function isAllowedFailure(response: Response, allowances: ApiFailureAllowance[]): boolean {
  const url = new URL(response.url());
  const method = response.request().method();
  return allowances.some((allowance) => {
    const methodMatches = !allowance.method || allowance.method.toUpperCase() === method;
    const pathMatches = matchesPath(url.pathname, allowance.path);
    const statusMatches = allowance.status === undefined || allowance.status === response.status();
    return methodMatches && pathMatches && statusMatches;
  });
}

export function installNetworkGuards(page: Page): GuardState {
  const state: GuardState = {
    allowedFailures: [],
    allowedConsoleErrors: [],
    consoleErrors: [],
    pageErrors: [],
    failedResponses: [],
  };
  guardStates.set(page, state);

  page.on("console", (message) => {
    if (message.type() === "error") {
      if (
        state.allowedConsoleErrors.some((allowed) =>
          typeof allowed === "string" ? message.text().includes(allowed) : allowed.test(message.text()),
        )
      ) {
        return;
      }
      state.consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    state.pageErrors.push(error.message);
  });

  page.on("response", (response) => {
    if (!isApiResponse(response) || response.request().method() === "OPTIONS" || response.status() < 400) {
      return;
    }
    if (isAllowedFailure(response, state.allowedFailures)) {
      return;
    }
    state.failedResponses.push(`${response.request().method()} ${response.url()} -> ${response.status()}`);
  });

  return state;
}

export function allowApiFailure(page: Page, allowance: ApiFailureAllowance): void {
  const state = guardStates.get(page);
  if (!state) {
    throw new Error("Network guards are not installed for this page.");
  }
  state.allowedFailures.push(allowance);
}

export function allowConsoleError(page: Page, message: string | RegExp): void {
  const state = guardStates.get(page);
  if (!state) {
    throw new Error("Network guards are not installed for this page.");
  }
  state.allowedConsoleErrors.push(message);
}

export async function assertNoBrowserFailures(page: Page, testInfo: TestInfo): Promise<void> {
  const state = guardStates.get(page);
  if (!state) return;
  await testInfo.attach("browser-network-guard", {
    body: JSON.stringify(
      {
        consoleErrors: state.consoleErrors,
        pageErrors: state.pageErrors,
        failedResponses: state.failedResponses,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect.soft(state.consoleErrors, "browser console errors").toEqual([]);
  expect.soft(state.pageErrors, "browser page errors").toEqual([]);
  expect.soft(state.failedResponses, "unexpected failed API responses").toEqual([]);
}

export async function waitForApiResponse(
  page: Page,
  method: string,
  path: string | RegExp,
  expectedStatus: number | number[] = 200,
): Promise<Response> {
  const statuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
  const response = await page.waitForResponse((candidate) => {
    if (!isApiResponse(candidate)) return false;
    const url = new URL(candidate.url());
    return candidate.request().method() === method.toUpperCase() && matchesPath(url.pathname, path);
  });
  expect(statuses, `${method.toUpperCase()} ${String(path)} status`).toContain(response.status());
  return response;
}

export async function expectApiJson<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers()["content-type"] ?? "";
  expect(contentType).toContain("application/json");
  return (await response.json()) as T;
}

export async function browserFetchJson<T = unknown>(
  page: Page,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: T; headers: Record<string, string> }> {
  const apiBaseUrl = process.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
  return page.evaluate(
    async ({ apiBaseUrl, apiPath, requestInit }) => {
      const response = await fetch(`${apiBaseUrl}${apiPath}`, {
        credentials: "include",
        ...requestInit,
        headers: {
          Accept: "application/json",
          ...(requestInit?.headers ?? {}),
        },
      });
      const headers = Object.fromEntries(response.headers.entries());
      return { status: response.status, body: await response.json(), headers };
    },
    { apiBaseUrl, apiPath: path, requestInit: init },
  ) as Promise<{ status: number; body: T; headers: Record<string, string> }>;
}
