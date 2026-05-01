#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const service = process.argv[2];
const root = process.cwd();

const services = {
  web: {
    cwd: path.join(root, 'apps/web'),
    readinessFile: 'package.json',
    command: 'corepack',
    args: ['pnpm', 'dev'],
    setup: 'apps/web has not been initialized with a Vite package yet.',
  },
  api: {
    cwd: path.join(root, 'apps/api'),
    readinessFile: 'manage.py',
    command: 'python3',
    args: ['manage.py', 'runserver', '0.0.0.0:8000'],
    setup: 'apps/api has not been initialized with Django manage.py yet.',
  },
  worker: {
    cwd: path.join(root, 'apps/api'),
    readinessFile: 'manage.py',
    command: 'python3',
    args: ['-m', 'celery', '-A', 'config', 'worker', '--loglevel=info'],
    setup: 'apps/api has not been initialized with Django/Celery settings yet.',
  },
};

const config = services[service];
if (!config) {
  console.error(`Unknown service '${service ?? '(missing)'}'. Expected one of: ${Object.keys(services).join(', ')}`);
  process.exit(2);
}

if (!existsSync(path.join(config.cwd, config.readinessFile))) {
  console.error(`[canonos] ${config.setup}`);
  process.exit(1);
}

const child = spawn(config.command, config.args, {
  cwd: config.cwd,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
