#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { mergeRootEnv } from './root-env.mjs';

const root = path.resolve(import.meta.dirname, '..');
const [, , command, ...args] = process.argv;

if (!command) {
  console.error('Usage: node scripts/run-with-root-env.mjs <command> [...args]');
  process.exit(2);
}

const child = spawn(command, args, {
  cwd: root,
  stdio: 'inherit',
  env: mergeRootEnv(root),
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
