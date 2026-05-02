#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'README.md',
  '.editorconfig',
  '.env.example',
  'pnpm-workspace.yaml',
  'package.json',
  'docs/architecture.md',
  'docs/api.md',
  'docs/frontend.md',
  'docs/backend.md',
  'docs/testing.md',
  'docs/deployment.md',
  '.github/workflows/ci.yml',
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length > 0) {
  console.error(`[canonos] Missing foundation files: ${missingFiles.join(', ')}`);
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const requiredScripts = [
  'lint',
  'format',
  'format:check',
  'typecheck',
  'test',
  'build',
  'e2e',
  'db:migrations:check',
  'seed:demo',
  'dev:web',
  'dev:api',
  'dev:worker',
  'dev:all',
  'stop:all',
];
const missingScripts = requiredScripts.filter((scriptName) => !packageJson.scripts?.[scriptName]);
if (missingScripts.length > 0) {
  console.error(`[canonos] Missing package scripts: ${missingScripts.join(', ')}`);
  process.exit(1);
}

const envExample = readFileSync('.env.example', 'utf8');
const requiredEnvKeys = [
  'VITE_API_BASE_URL',
  'DJANGO_SECRET_KEY',
  'DATABASE_URL',
  'POSTGRES_HOST',
  'REDIS_URL',
  'CELERY_BROKER_URL',
  'CELERY_RESULT_BACKEND',
];
const missingEnvKeys = requiredEnvKeys.filter((key) => !envExample.includes(`${key}=`));
if (missingEnvKeys.length > 0) {
  console.error(`[canonos] Missing .env.example keys: ${missingEnvKeys.join(', ')}`);
  process.exit(1);
}

const checklist = readFileSync('docs/CHECKLIST.md', 'utf8');
const requiredCompleteTaskIds = ['MVP-M01-SH-011', 'MVP-M01-SH-028', 'MVP-M01-SH-040', 'MVP-M01-SH-047', 'MVP-M01-SH-048'];
const uncheckedTaskIds = requiredCompleteTaskIds.filter((taskId) => checklist.includes(`- [ ] ${taskId}`));
if (uncheckedTaskIds.length > 0) {
  console.error(`[canonos] Foundation tasks still unchecked: ${uncheckedTaskIds.join(', ')}`);
  process.exit(1);
}

console.log('[canonos] Root foundation files and checklist state are present.');
