#!/usr/bin/env node
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const pidFile = path.join(process.cwd(), 'tmp', 'canonos-local-services.json');

if (!existsSync(pidFile)) {
  console.log('[canonos] No recorded local services to stop.');
  process.exit(0);
}

const { pids = [] } = JSON.parse(readFileSync(pidFile, 'utf8'));
for (const pid of pids) {
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`[canonos] Sent SIGTERM to process ${pid}.`);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
    console.log(`[canonos] Process ${pid} was already stopped.`);
  }
}

rmSync(pidFile, { force: true });
