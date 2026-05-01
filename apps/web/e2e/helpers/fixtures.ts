import { test as base } from "@playwright/test";

import { assertNoBrowserFailures, installNetworkGuards } from "./network";

export const test = base.extend({
  page: async ({ page }, run, testInfo) => {
    installNetworkGuards(page);
    await run(page);
    await assertNoBrowserFailures(page, testInfo);
  },
});

export { expect } from "@playwright/test";
