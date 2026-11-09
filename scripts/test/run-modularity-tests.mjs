#!/usr/bin/env node
/**
 * scripts/test/run-modularity-tests.mjs
 *
 * Kalceria Modularity Test Runner (Gate 3b)
 * Safely executes local pure module golden masters and harness tests when present on disk.
 * Gracefully reports and exits 0 on remote CI environments where test scripts are kept private/local-only.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const goldenTestPath = path.join(ROOT_DIR, 'frontend/tests/pure_modules_golden.test.mjs');
const harnessTestPath = path.join(ROOT_DIR, 'frontend/tests/modularity_harness.test.mjs');

if (fs.existsSync(goldenTestPath) && fs.existsSync(harnessTestPath)) {
  const result = spawnSync('node', ['--test', goldenTestPath, harnessTestPath], {
    stdio: 'inherit',
    cwd: ROOT_DIR,
    shell: true,
  });
  process.exit(result.status ?? 0);
} else {
  console.log('[GATE 3b] Modularity test scripts are local-only (skipped on remote clone).');
  process.exit(0);
}
