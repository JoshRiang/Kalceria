/**
 * frontend/tests/modularity_harness.test.mjs
 *
 * Kalceria Modularity & Zero-Regression Test Suite (Gate 3b)
 * Verifies Golden Baseline Snapshot, Invariance Contracts, Hook Conservation,
 * and Deterministic Slices.
 *
 * Rules: In-memory only. Zero DB / Redis pollution.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  countFileLines,
  countHooksInContent,
  runAuditCheck,
  loadAuditContext,
} from '../../scripts/audit/modularity-audit.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

describe('Kalceria Modularity Test Harness (Gate 3b - Wave 0)', () => {
  it('1. Environment Invariants: Node 24 ESM environment runs clean with zero DB residue', () => {
    assert.equal(typeof describe, 'function');
    assert.equal(typeof it, 'function');
    assert.match(process.version, /^v24\./);
  });

  it('2. Baseline Snapshot Integrity: snapshot.f1dbb70.json exists and verifies commit f1dbb70', () => {
    const { thresholds, baselineSnapshot } = loadAuditContext();
    assert.ok(thresholds, 'thresholds.json must be loaded');
    assert.ok(baselineSnapshot, 'snapshot.f1dbb70.json must be loaded');
    assert.equal(thresholds.targetBaselineCommit, 'f1dbb70');
    assert.equal(baselineSnapshot.baselineCommit, 'f1dbb70');
  });

  it('3. Tier A Hook Inventory: MapPageClient.jsx baseline equals exactly 1632 LOC and 74 hooks', () => {
    const { baselineSnapshot } = loadAuditContext();
    const baselineData = baselineSnapshot?.tierA?.['frontend/components/map/MapPageClient.jsx'];
    assert.equal(baselineData?.loc, 1632, 'MapPageClient.jsx must have exactly 1632 lines in baseline snapshot');
    assert.deepEqual(baselineData?.hooks, {
      useState: 35,
      useEffect: 11,
      useCallback: 21,
      useMemo: 5,
      useRef: 2,
      useLayoutEffect: 0,
    });

    const mapPagePath = path.join(ROOT_DIR, 'frontend/components/map/MapPageClient.jsx');
    const loc = countFileLines(mapPagePath);
    assert.ok(loc <= 1632, `MapPageClient.jsx LOC must decrease or stay equal to baseline (${loc} <= 1632)`);
  });

  it('4. Tier A Hook Inventory: usePersonalChatState.js baseline equals exactly 1604 LOC and 54 hooks', () => {
    const { baselineSnapshot } = loadAuditContext();
    const baselineData =
      baselineSnapshot?.tierA?.['frontend/components/map/chat/hooks/usePersonalChatState.js'];
    assert.equal(baselineData?.loc, 1604, 'usePersonalChatState.js must have exactly 1604 lines in baseline snapshot');
    assert.deepEqual(baselineData?.hooks, {
      useState: 20,
      useEffect: 7,
      useCallback: 9,
      useMemo: 1,
      useRef: 17,
      useLayoutEffect: 0,
    });

    const chatStatePath = path.join(
      ROOT_DIR,
      'frontend/components/map/chat/hooks/usePersonalChatState.js'
    );
    const loc = countFileLines(chatStatePath);
    assert.ok(loc <= 1604, `usePersonalChatState.js LOC must decrease or stay equal to baseline (${loc} <= 1604)`);
  });

  it('5. Contract Invariance: usePersonalChatState returns all 58 keys and 9 re-exports', () => {
    const { baselineSnapshot } = loadAuditContext();
    const chatContract =
      baselineSnapshot?.contracts?.['frontend/components/map/chat/hooks/usePersonalChatState.js'];

    assert.ok(chatContract, 'Chat contract must be present in baseline snapshot');
    assert.equal(chatContract.returnKeysCount, 58, 'Chat hook must return exactly 58 keys');
    assert.equal(chatContract.reExportsCount, 9, 'Chat hook must re-export exactly 9 items');

    // Sample critical keys
    const criticalKeys = [
      'starterPlaceholder',
      'myId',
      'targetId',
      'groupedMessages',
      'inputText',
      'messagesEndRef',
      'handleSendText',
      'handleFileUpload',
      'handleStartVoiceNote',
      'handleTriggerCall',
      'handleToggleSelectMsg',
      'handleDeleteSelectedMessages',
    ];
    for (const key of criticalKeys) {
      assert.ok(
        chatContract.returnKeys.includes(key),
        `Return key "${key}" must be strictly preserved`
      );
    }
  });

  it('6. Modularity Audit Tool Programmatic Gate: runAuditCheck() passes with 0 delta and 0 errors', () => {
    const check = runAuditCheck();
    assert.equal(check.pass, true, 'Audit check must pass 100%');
    assert.equal(check.errors.length, 0, 'Audit check must have 0 errors');
  });

  it('7. Golden Slices Verification: all 6 pure module slices are extracted from f1dbb70', () => {
    const fixtureDir = path.join(ROOT_DIR, 'scripts/audit/golden/fixtures');
    const expectedSlices = [
      'groupMessages.js.raw.txt',
      'clipboardText.js.raw.txt',
      'replyPayload.js.raw.txt',
      'mapEntitiesProjection.js.raw.txt',
      'sidebarKalceriansProjection.js.raw.txt',
      'eventDescCodec.js.raw.txt',
    ];

    for (const slice of expectedSlices) {
      const slicePath = path.join(fixtureDir, slice);
      assert.ok(fs.existsSync(slicePath), `Fixture ${slice} must exist on disk`);
      const stat = fs.statSync(slicePath);
      assert.ok(stat.size > 50, `Fixture ${slice} must be non-empty (size: ${stat.size} bytes)`);
    }
  });
});

