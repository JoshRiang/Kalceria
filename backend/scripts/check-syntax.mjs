import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative } from 'node:path';

const sourceExtensions = new Set(['.js', '.cjs', '.mjs']);
const ignoredDirectories = new Set(['node_modules', '.git', 'coverage', 'dist']);
const sourceFiles = [];

function collectSourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) collectSourceFiles(path);
      continue;
    }
    if (sourceExtensions.has(path.slice(path.lastIndexOf('.')))) sourceFiles.push(path);
  }
}

collectSourceFiles(process.cwd());

let failed = false;
for (const file of sourceFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed = true;
    console.error(`Syntax check failed: ${relative(process.cwd(), file)}`);
  }
}

if (failed) process.exit(1);
console.log(`Backend syntax check passed (${sourceFiles.length} files).`);
