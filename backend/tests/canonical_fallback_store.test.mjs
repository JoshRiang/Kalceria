import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  storeCanonicalCallSignal,
  fetchCanonicalCallSignals,
  acquireCanonicalCallLock,
  releaseCanonicalCallLock,
  storeCanonicalEventNotification,
  fetchCanonicalEventNotifications,
  getCanonicalInboxSummary,
  recordCanonicalLivePresence,
  getActiveCanonicalPresences,
  removeCanonicalLivePresence,
  purgeCanonicalUserRecords,
} from '../services/canonicalFallbackStore.js';

describe('Canonical Fallback Store - Modularity & Behavior Tests', () => {
  it('1. Gracefully handles null, undefined, or empty parameters across all canonical helpers', async () => {
    await assert.doesNotReject(async () => {
      await storeCanonicalCallSignal(null);
      await fetchCanonicalCallSignals(null);
      await acquireCanonicalCallLock({ userId: null, targetId: null });
      await releaseCanonicalCallLock(null);
      await storeCanonicalEventNotification(null, null);
      await fetchCanonicalEventNotifications(null);
      await getCanonicalInboxSummary(null);
      await recordCanonicalLivePresence(null, null, null);
      await getActiveCanonicalPresences(null);
      await removeCanonicalLivePresence(null);
      await purgeCanonicalUserRecords(null);
    });
  });

  it('2. Fetching empty call signals or event notifications returns empty arrays cleanly', async () => {
    const nonExistentUserId = `test_non_existent_${Date.now()}`;
    const signals = await fetchCanonicalCallSignals(nonExistentUserId);
    assert.deepEqual(signals, []);

    const notifs = await fetchCanonicalEventNotifications(nonExistentUserId);
    assert.deepEqual(notifs, []);
  });

  it('3. getCanonicalInboxSummary returns standard response shape with zero errors', async () => {
    const testUserId = `test_summary_${Date.now()}`;
    const summary = await getCanonicalInboxSummary(testUserId);
    assert.equal(typeof summary, 'object');
    assert.equal(typeof summary.peers, 'object');
    assert.ok(Array.isArray(summary.rawEventNotifs));
    assert.equal(typeof summary.ver, 'string');
  });

  it('4. getActiveCanonicalPresences returns a valid Map', async () => {
    const presences = await getActiveCanonicalPresences(['non-existent-user']);
    assert.ok(presences instanceof Map);
  });
});
