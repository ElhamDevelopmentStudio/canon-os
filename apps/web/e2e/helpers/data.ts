export type TestUser = {
  email: string;
  password: string;
  displayName: string;
};

export function uniqueRunId(prefix = "e2e"): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}`;
}

export function uniqueUser(prefix = "e2e"): TestUser {
  const id = uniqueRunId(prefix);
  return {
    email: `${id}@example.com`,
    password: "E2eStrong123!!",
    displayName: `E2E ${id}`,
  };
}

export function uniqueTitle(prefix: string): string {
  return `${prefix} ${uniqueRunId("title")}`;
}
