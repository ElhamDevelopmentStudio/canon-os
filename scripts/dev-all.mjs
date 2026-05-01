#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pidFile = path.join(root, 'tmp', 'canonos-local-services.json');
const serviceDefinitions = [
  ['web', path.join(root, 'apps/web', 'package.json')],
  ['api', path.join(root, 'apps/api', 'manage.py')],
  ['worker', path.join(root, 'apps/api', 'manage.py')],
];

const availableServices = serviceDefinitions.filter(([, readinessFile]) => existsSync(readinessFile));

if (availableServices.length === 0) {
  console.error('[canonos] No local services are initialized yet. Complete the frontend/backend foundation tasks first.');
  process.exit(1);
}

mkdirSync(path.dirname(pidFile), { recursive: true });
const children = [];

function stopChildren() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
}

for (const [service] of availableServices) {
  const child = spawn('corepack', ['pnpm', `dev:${service}`], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  children.push(child);
}

writeFileSync(pidFile, JSON.stringify({ pids: children.map((child) => child.pid).filter(Boolean) }, null, 2));

process.on('SIGINT', () => {
  stopChildren();
  process.exit(130);
});
process.on('SIGTERM', () => {
  stopChildren();
  process.exit(143);
});

for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      stopChildren();
      process.exit(code);
    }
  });
}
