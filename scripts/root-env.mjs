import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function parseRootEnv(contents) {
  const parsed = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (!key) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

export function loadRootEnv(root) {
  const envPath = path.join(root, '.env');
  return existsSync(envPath) ? parseRootEnv(readFileSync(envPath, 'utf8')) : {};
}

export function mergeRootEnv(root, env = process.env) {
  return { ...loadRootEnv(root), ...env };
}
