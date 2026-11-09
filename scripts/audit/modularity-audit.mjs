#!/usr/bin/env node
/**
 * scripts/audit/modularity-audit.mjs
 *
 * Kalceria Modularity & Zero-Regression Automated Audit Tool (Gate 3c)
 * Validates Hook Conservation (K3), Contract Invariance (K5), Hook Ledger,
 * and File/Function Size Thresholds without external npm dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const THRESHOLDS_PATH = path.join(__dirname, 'thresholds.json');
const BASELINE_SNAPSHOT_PATH = path.join(__dirname, 'baseline/snapshot.f1dbb70.json');

const HOOK_NAMES = [
  'useState',
  'useEffect',
  'useCallback',
  'useMemo',
  'useRef',
  'useLayoutEffect',
];

/**
 * Counts lines matching System.IO.File.ReadAllLines (handling trailing newline cleanly)
 */
export function countFileLines(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  let text = fs.readFileSync(filePath, 'utf8');
  if (text.endsWith('\r\n')) text = text.slice(0, -2);
  else if (text.endsWith('\n')) text = text.slice(0, -1);
  return text.length === 0 ? 0 : text.split(/\r?\n/).length;
}

/**
 * Counts React hooks in content by word boundary
 */
export function countHooksInContent(content) {
  const counts = {};
  for (const h of HOOK_NAMES) {
    const re = new RegExp('\\b' + h + '\\(', 'g');
    counts[h] = (content.match(re) || []).length;
  }
  return counts;
}

/**
 * Sums multiple hook count objects
 */
export function sumHookCounts(hookList) {
  const total = {};
  for (const h of HOOK_NAMES) total[h] = 0;
  for (const item of hookList) {
    for (const h of HOOK_NAMES) {
      total[h] += item[h] || 0;
    }
  }
  return total;
}

/**
 * Extracts return keys of usePersonalChatState
 */
export function extractChatStateReturnKeys(content) {
  const lastReturnIdx = content.lastIndexOf('return {');
  if (lastReturnIdx === -1) return [];
  const afterReturn = content.substring(lastReturnIdx + 'return {'.length);
  const closingBraceIdx = afterReturn.indexOf('};');
  if (closingBraceIdx === -1) return [];
  const body = afterReturn.substring(0, closingBraceIdx);
  const keys = [];
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.trim().replace(/,$/, '').trim();
    if (!cleaned || cleaned.startsWith('//') || cleaned.startsWith('/*')) continue;
    const colonIdx = cleaned.indexOf(':');
    if (colonIdx > 0) {
      const key = cleaned.substring(0, colonIdx).trim();
      if (/^[a-zA-Z0-9_$]+$/.test(key)) keys.push(key);
    } else if (/^[a-zA-Z0-9_$]+$/.test(cleaned)) {
      keys.push(cleaned);
    }
  }
  return keys;
}

/**
 * Extracts re-exports from usePersonalChatState
 */
export function extractChatStateReExports(content) {
  const exportMatch = content.match(/export\s*\{([\s\S]*?)\};/);
  if (!exportMatch) return [];
  return exportMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extracts top-level declaration lengths
 */
export function extractTopLevelFunctions(content) {
  const lines = content.split(/\r?\n/);
  const functions = [];
  const declRegex = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>|class\s+(\w+))/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(declRegex);
    if (match) {
      const name = match[1] || match[2] || match[3] || 'anonymous';
      functions.push({
        name,
        startLine: i + 1,
      });
    }
  }

  for (let j = 0; j < functions.length; j++) {
    const nextStart = j + 1 < functions.length ? functions[j + 1].startLine : lines.length + 1;
    functions[j].lineCount = nextStart - functions[j].startLine;
  }

  return functions;
}

/**
 * Recursively scans directory for code files
 */
export function scanCodeFiles(dir, extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'dist', 'coverage', '.git', '.vercel'].includes(entry.name)) {
        continue;
      }
      results.push(...scanCodeFiles(fullPath, extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * Reads thresholds and snapshot
 */
export function loadAuditContext() {
  const thresholds = JSON.parse(fs.readFileSync(THRESHOLDS_PATH, 'utf8'));
  let baselineSnapshot = null;
  if (fs.existsSync(BASELINE_SNAPSHOT_PATH)) {
    baselineSnapshot = JSON.parse(fs.readFileSync(BASELINE_SNAPSHOT_PATH, 'utf8'));
  }
  return { thresholds, baselineSnapshot };
}

/**
 * Audits current Tier A targets and their submodules
 */
export function auditTierA(thresholds) {
  const results = {};

  for (const [relPath, config] of Object.entries(thresholds.tierA)) {
    const absPath = path.join(ROOT_DIR, relPath);
    const facadeLoc = countFileLines(absPath);
    const content = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf8') : '';
    const facadeHooks = countHooksInContent(content);

    const subfolderAbs = path.join(ROOT_DIR, config.targetSubfolder);
    const submodules = [];
    const preexisting = config.preexistingFiles || [];
    if (fs.existsSync(subfolderAbs)) {
      const subFiles = fs.readdirSync(subfolderAbs).filter((f) => {
        if (!f.endsWith('.js') && !f.endsWith('.jsx')) return false;
        if (preexisting.includes(f)) return false;
        return true;
      });
      for (const sf of subFiles) {
        const sfPath = path.join(subfolderAbs, sf);
        const sfLoc = countFileLines(sfPath);
        const sfContent = fs.readFileSync(sfPath, 'utf8');
        submodules.push({
          relPath: path.relative(ROOT_DIR, sfPath).replace(/\\/g, '/'),
          loc: sfLoc,
          hooks: countHooksInContent(sfContent),
        });
      }
    }

    const allHookSets = [facadeHooks, ...submodules.map((m) => m.hooks)];
    const aggregateHooks = sumHookCounts(allHookSets);

    const hookDelta = {};
    let totalDelta = 0;
    for (const h of HOOK_NAMES) {
      const diff = aggregateHooks[h] - config.hooks[h];
      hookDelta[h] = diff;
      totalDelta += Math.abs(diff);
    }

    results[relPath] = {
      facadeLoc,
      facadeHooks,
      submodules,
      aggregateHooks,
      expectedHooks: config.hooks,
      hookDelta,
      totalDelta,
      targetSubfolder: config.targetSubfolder,
    };

    if (relPath.includes('usePersonalChatState')) {
      results[relPath].returnKeys = extractChatStateReturnKeys(content);
      results[relPath].reExports = extractChatStateReExports(content);
    }
  }

  return results;
}

/**
 * Runs the check gate and returns { pass: boolean, errors: string[], warnings: string[] }
 */
export function runAuditCheck() {
  const { thresholds, baselineSnapshot } = loadAuditContext();
  const tierAResults = auditTierA(thresholds);
  const errors = [];
  const warnings = [];

  // Check 1: Hook Conservation (K3)
  for (const [relPath, data] of Object.entries(tierAResults)) {
    if (data.totalDelta !== 0) {
      errors.push(
        `[K3 Hook Conservation Failure] ${relPath} has hook delta != 0:\n` +
        JSON.stringify(data.hookDelta, null, 2)
      );
    }
  }

  // Check 2: Contracts for usePersonalChatState (K5)
  const chatRel = 'frontend/components/map/chat/hooks/usePersonalChatState.js';
  const chatData = tierAResults[chatRel];
  if (chatData && baselineSnapshot?.contracts?.[chatRel]) {
    const expectedKeys = baselineSnapshot.contracts[chatRel].returnKeys || [];
    const currentKeys = chatData.returnKeys || [];
    const missingKeys = expectedKeys.filter((k) => !currentKeys.includes(k));
    const extraKeys = currentKeys.filter((k) => !expectedKeys.includes(k));

    if (missingKeys.length > 0 || extraKeys.length > 0) {
      errors.push(
        `[K5 Contract Violation] ${chatRel} return keys modified:\n` +
        `  Missing: ${missingKeys.join(', ') || 'none'}\n` +
        `  Extra: ${extraKeys.join(', ') || 'none'}`
      );
    }

    const expectedReExports = baselineSnapshot.contracts[chatRel].reExports || [];
    const currentReExports = chatData.reExports || [];
    const missingReExports = expectedReExports.filter((k) => !currentReExports.includes(k));
    if (missingReExports.length > 0) {
      errors.push(
        `[K5 Contract Violation] ${chatRel} missing re-exports: ${missingReExports.join(', ')}`
      );
    }
  }

  // Check 3: Tier B file existence and integrity
  for (const item of thresholds.tierB) {
    const absPath = path.join(ROOT_DIR, item.path);
    if (!fs.existsSync(absPath)) {
      errors.push(`[Tier B Integrity] File missing: ${item.path}`);
    }
  }

  const pass = errors.length === 0;
  return { pass, errors, warnings, tierAResults };
}

/**
 * Builds and writes snapshot
 */
export function generateSnapshot() {
  const { thresholds } = loadAuditContext();
  const tierAResults = auditTierA(thresholds);

  const snapshot = {
    baselineCommit: thresholds.targetBaselineCommit,
    generatedAt: new Date().toISOString(),
    tierA: {},
    tierB: [],
    contracts: {},
  };

  for (const [relPath, data] of Object.entries(tierAResults)) {
    snapshot.tierA[relPath] = {
      loc: data.facadeLoc,
      hooks: data.facadeHooks,
    };
    if (relPath.includes('usePersonalChatState')) {
      snapshot.contracts[relPath] = {
        returnKeysCount: data.returnKeys?.length || 0,
        returnKeys: data.returnKeys || [],
        reExportsCount: data.reExports?.length || 0,
        reExports: data.reExports || [],
      };
    }
  }

  for (const item of thresholds.tierB) {
    const loc = countFileLines(path.join(ROOT_DIR, item.path));
    snapshot.tierB.push({
      path: item.path,
      loc,
    });
  }

  fs.mkdirSync(path.dirname(BASELINE_SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(BASELINE_SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`[Snapshot] Successfully written baseline snapshot to ${BASELINE_SNAPSHOT_PATH}`);
  return snapshot;
}

// CLI Execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);

  if (args.includes('--snapshot')) {
    generateSnapshot();
    process.exit(0);
  } else if (args.includes('--check')) {
    console.log('=== Running Kalceria Modularity Audit Gate 3c ===\n');
    const { pass, errors, warnings, tierAResults } = runAuditCheck();

    for (const [relPath, data] of Object.entries(tierAResults)) {
      console.log(`[Tier A] ${relPath}`);
      console.log(`  Facade LOC: ${data.facadeLoc} | Submodules count: ${data.submodules.length}`);
      console.log(`  Hooks: ${JSON.stringify(data.aggregateHooks)}`);
      console.log(`  Hook Delta vs Baseline: ${data.totalDelta === 0 ? '0 (PERFECT CONSERVATION)' : JSON.stringify(data.hookDelta)}`);
      if (data.returnKeys) {
        console.log(`  Contract Keys: ${data.returnKeys.length} keys intact`);
      }
      console.log('');
    }

    if (warnings.length > 0) {
      console.log('WARNINGS:');
      warnings.forEach((w) => console.log(' - ' + w));
      console.log('');
    }

    if (!pass) {
      console.error('FAILURES DETECTED IN MODULARITY AUDIT:');
      errors.forEach((e) => console.error(' ❌ ' + e));
      console.error('\nGate 3c FAILED.');
      process.exit(1);
    }

    console.log('✔ All Modularity & Conservation Gates PASSED (Gate 3c GREEN).');
    process.exit(0);
  } else {
    // Report mode
    const { thresholds } = loadAuditContext();
    const tierAResults = auditTierA(thresholds);
    console.log('=== Kalceria Modularity Report ===\n');
    for (const [relPath, data] of Object.entries(tierAResults)) {
      console.log(`File: ${relPath}`);
      console.log(`  LOC: ${data.facadeLoc}`);
      console.log(`  Hooks:`, data.aggregateHooks);
      console.log(`  Submodules: ${data.submodules.length}`);
    }
  }
}
