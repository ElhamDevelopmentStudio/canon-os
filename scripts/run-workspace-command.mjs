#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const command = process.argv[2];
const allowed = new Set(['lint', 'typecheck', 'test', 'build', 'e2e']);

if (!allowed.has(command)) {
  console.error(`Unsupported workspace command: ${command ?? '(missing)'}`);
  process.exit(2);
}

const root = process.cwd();
const workspaceRoots = ['apps', 'packages'];
const packageDirs = [];

for (const workspaceRoot of workspaceRoots) {
  const absoluteWorkspaceRoot = path.join(root, workspaceRoot);
  if (!existsSync(absoluteWorkspaceRoot)) continue;

  for (const entry of readdirSync(absoluteWorkspaceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packageDir = path.join(absoluteWorkspaceRoot, entry.name);
    const packageFile = path.join(packageDir, 'package.json');
    if (existsSync(packageFile)) packageDirs.push(packageDir);
  }
}

const runnablePackages = [];
for (const packageDir of packageDirs) {
  const packageJson = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  if (packageJson.scripts?.[command]) {
    runnablePackages.push({ dir: packageDir, name: packageJson.name ?? path.relative(root, packageDir) });
  }
}

if (runnablePackages.length === 0) {
  console.log(`[canonos] No workspace packages expose a '${command}' script yet. Nothing to run.`);
  process.exit(0);
}

for (const workspacePackage of runnablePackages) {
  console.log(`[canonos] Running '${command}' in ${workspacePackage.name}`);
  const result = spawnSync('corepack', ['pnpm', '--dir', workspacePackage.dir, 'run', command], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
