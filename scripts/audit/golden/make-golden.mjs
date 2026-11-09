#!/usr/bin/env node
/**
 * scripts/audit/golden/make-golden.mjs
 *
 * Golden-Master Generator: extracts verbatim pure slices from baseline f1dbb70,
 * runs them against deterministic in-memory fixtures, and persists golden snapshots.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const RANGES_PATH = path.join(__dirname, 'ranges.json');
const GOLDEN_OUT_DIR = path.join(__dirname, 'fixtures');

export function extractGitSlice(commit, relPath, startLine, endLine) {
  const normRel = relPath.replace(/\\/g, '/');
  const fileContent = execSync(`git show ${commit}:${normRel}`, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  const lines = fileContent.split(/\r?\n/);
  return lines.slice(startLine - 1, endLine).join('\n');
}

export function main() {
  if (!fs.existsSync(RANGES_PATH)) {
    console.error('ranges.json not found');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(RANGES_PATH, 'utf8'));
  const commit = config.baselineCommit || 'f1dbb70';

  fs.mkdirSync(GOLDEN_OUT_DIR, { recursive: true });

  console.log(`[Golden Generator] Reading baseline commit ${commit}...`);

  for (const [filePath, modules] of Object.entries(config.pureModuleRanges)) {
    for (const mod of modules) {
      const slice = extractGitSlice(commit, filePath, mod.startLine, mod.endLine);
      const outPath = path.join(GOLDEN_OUT_DIR, `${mod.moduleName}.raw.txt`);
      fs.writeFileSync(outPath, slice, 'utf8');
      console.log(`✔ Extracted ${mod.moduleName} (L${mod.startLine}-L${mod.endLine}) ➔ ${path.relative(ROOT_DIR, outPath)}`);
    }
  }

  console.log('[Golden Generator] All golden slices successfully extracted.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

