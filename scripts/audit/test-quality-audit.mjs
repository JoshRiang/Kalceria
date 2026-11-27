#!/usr/bin/env node
/**
 * Kalceria Permanent Test Quality & Integrity Audit Gate (`scripts/audit/test-quality-audit.mjs`)
 *
 * Enforces non-negotiable test quality standards across ALL backend & frontend tests:
 *  1. ZERO trivial assertions (`assert.equal(true, true)`, `assert.ok(true)`, `expect(true).toBe(true)`)
 *  2. ZERO grep-only frontend test files (`imports === 0 && readFileSync > 0`)
 *  3. ZERO unguarded live-DB user/event mutations in backend tests (must use inMemorySocialHarness,
 *     explicit Prisma mocking, or loopback-only TEST_DATABASE_URL guard)
 *  4. ZERO failure-masking `process.exit(0)` inside `finally { ... }` blocks
 *
 * Usage:
 *   node scripts/audit/test-quality-audit.mjs --check
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const TRIVIAL_ASSERT_RE =
  /(?:assert\.(?:equal|strictEqual|deepEqual|deepStrictEqual)\s*\(\s*(?:true\s*,\s*true|false\s*,\s*false|1\s*,\s*1)\s*\)|assert\.ok\s*\(\s*true\s*(?:,[^)]*)?\)|expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\))/g;

const DB_MUTATION_RE =
  /\bprisma\.(?:user|event)\.(?:create|upsert|updateMany|delete|deleteMany)\s*\(/g;

function walkTestFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkTestFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.test.mjs')) {
      results.push(full);
    }
  }
  return results.sort();
}

function auditSuite() {
  const backendFiles = walkTestFiles(path.join(REPO_ROOT, 'backend', 'tests'));
  const frontendFiles = walkTestFiles(path.join(REPO_ROOT, 'frontend', 'tests'));
  const allFiles = [...backendFiles, ...frontendFiles];

  const violations = [];
  let totalTests = 0;
  let totalAsserts = 0;
  let feGrepOnly = 0;
  let beIsolatedCount = 0;

  for (const filePath of allFiles) {
    const rel = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    const src = fs.readFileSync(filePath, 'utf8');
    const isFrontend = rel.startsWith('frontend/');

    const testMatches = src.match(/\b(?:test|it)\s*\(/g) || [];
    const assertMatches = src.match(/\bassert\.\w+\s*\(/g) || [];
    totalTests += testMatches.length;
    totalAsserts += assertMatches.length;

    // Rule 1: Zero trivial assert(true, true) / assert.ok(true)
    const trivialHits = src.match(TRIVIAL_ASSERT_RE) || [];
    if (trivialHits.length > 0) {
      violations.push(`[TRIVIAL_ASSERT] ${rel}: found ${trivialHits.length} trivial assertion(s) (${trivialHits[0]})`);
    }

    // Rule 2: Zero failure-masking process.exit(0) in finally blocks
    if (/finally\s*\{[\s\S]{0,400}process\.exit\s*\(\s*0\s*\)/m.test(src)) {
      violations.push(`[MASKING_EXIT] ${rel}: process.exit(0) inside finally block can mask test failures`);
    }

    // Rule 3: Frontend tests must execute at least 1 real production module (no grep-only suites)
    if (isFrontend) {
      const readCount = (src.match(/readFileSync/g) || []).length;
      const prodImports = (src.match(/from\s+['"]\.\.\/(?!tests)[^'"]+['"]/g) || []).length;
      if (readCount > 0 && prodImports === 0) {
        feGrepOnly++;
        violations.push(`[GREP_ONLY_FE] ${rel}: ${readCount} readFileSync call(s) with 0 production module imports`);
      }
    }

    // Rule 4: Backend tests that call prisma.user/event mutations must be guarded/isolated
    if (!isFrontend) {
      const usesHarness = src.includes('installInMemorySocialHarness');
      if (usesHarness) beIsolatedCount++;
      const dbMutations = src.match(DB_MUTATION_RE) || [];
      if (dbMutations.length > 0) {
        const hasLoopbackGuard = /TEST_DATABASE_URL/.test(src) && /LOOPBACK/.test(src);
        const hasMockedPrisma = /prisma\.(?:user|event)\.(?:create|upsert|updateMany|delete|deleteMany)\s*=\s*async/.test(src);
        if (!usesHarness && !hasLoopbackGuard && !hasMockedPrisma) {
          violations.push(
            `[UNGUARDED_DB_MUTATION] ${rel}: calls ${dbMutations[0]} without inMemorySocialHarness, Prisma mock, or loopback guard`
          );
        }
      }
    }
  }

  console.log('=== Kalceria Test Quality & Integrity Audit Gate ===');
  console.log(`Backend test files  : ${backendFiles.length} (${beIsolatedCount} using inMemorySocialHarness)`);
  console.log(`Frontend test files : ${frontendFiles.length} (grep-only: ${feGrepOnly})`);
  console.log(`Total test files    : ${allFiles.length}`);
  console.log(`Total test blocks   : ${totalTests} | Total assertions: ${totalAsserts}`);
  console.log(`Violations found    : ${violations.length}`);

  if (violations.length > 0) {
    console.error('\nFAILED Test Quality Audit:');
    for (const v of violations) console.error('  ✗', v);
    process.exit(1);
  }

  console.log('\n✔ All Test Quality & Zero-Assert-True Gates PASSED (GREEN).');
}

auditSuite();

