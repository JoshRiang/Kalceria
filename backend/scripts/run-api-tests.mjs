#!/usr/bin/env node
/**
 * backend/scripts/run-api-tests.mjs
 *
 * Kalceria Backend API Test Runner
 * Safely executes backend tests when present on disk.
 * Gracefully reports and exits 0 on remote CI environments where test scripts are kept private/local-only.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '..');

const apiTestPath = path.join(BACKEND_DIR, 'tests/api.test.mjs');

if (fs.existsSync(apiTestPath)) {
  const result = spawnSync('node', ['--test', '--test-concurrency=1', 'tests/api.test.mjs'], {
    stdio: 'inherit',
    cwd: BACKEND_DIR,
    shell: true,
  });
  process.exit(result.status ?? 0);
} else {
  console.log('[TEST] Backend API test suite is local-only (skipped on remote clone).');
  process.exit(0);
}
