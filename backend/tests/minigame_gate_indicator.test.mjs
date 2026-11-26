import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SEVEN_DAYS_SECONDS,
  getMinigameTargetInfo,
} from '../controllers/minigame/minigameTargetService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BE_ROOT = path.resolve(__dirname, '..');

function makeMockPrisma(eventRecord) {
  return {
    event: {
      async findFirst() {
        return eventRecord;
      },
    },
  };
}

test('getMinigameTargetInfo reports isEventActive=false and NOT_STARTED when no target event exists', async () => {
  const info = await getMinigameTargetInfo(makeMockPrisma(null));
  assert.equal(info.hasTarget, false);
  assert.equal(info.isWithin7Days, false);
  assert.equal(info.isEventActive, false);
  assert.equal(info.dueStatus, 'NOT_STARTED');
});

test('getMinigameTargetInfo reports isEventActive=false and NOT_STARTED when target regEndTime is >7 days away', async () => {
  const farFuture = new Date(Date.now() + (SEVEN_DAYS_SECONDS + 3600) * 1000);
  const info = await getMinigameTargetInfo(
    makeMockPrisma({
      id: 'evt-far-1',
      title: 'Far Future Car Meet',
      isMinigameTarget: true,
      status: 'OPEN',
      regEndTime: farFuture,
    })
  );
  assert.equal(info.hasTarget, true);
  assert.equal(info.isWithin7Days, false);
  assert.equal(info.isEventActive, false);
  assert.equal(info.dueStatus, 'NOT_STARTED');
});

test('getMinigameTargetInfo reports isEventActive=true and COUNTDOWN when target regEndTime is within 7 days', async () => {
  const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const info = await getMinigameTargetInfo(
    makeMockPrisma({
      id: 'evt-active-1',
      title: 'Active Drift Night',
      isMinigameTarget: true,
      status: 'OPEN',
      regEndTime: inTwoDays,
    })
  );
  assert.equal(info.hasTarget, true);
  assert.equal(info.isWithin7Days, true);
  assert.equal(info.isEventActive, true);
  assert.equal(info.dueStatus, 'COUNTDOWN');
  assert.ok(info.secondsUntilDue > 0 && info.secondsUntilDue <= SEVEN_DAYS_SECONDS);
});

test('getMinigameTargetInfo reports isEventActive=false and NOT_STARTED when target regEndTime already expired', async () => {
  const past = new Date(Date.now() - 60 * 1000);
  const info = await getMinigameTargetInfo(
    makeMockPrisma({
      id: 'evt-expired-1',
      title: 'Expired Meet',
      isMinigameTarget: true,
      status: 'OPEN',
      regEndTime: past,
    })
  );
  assert.equal(info.hasTarget, false);
  assert.equal(info.isEventActive, false);
  assert.equal(info.dueStatus, 'NOT_STARTED');
});

test('minigameController exposes additive hasActiveEvent & gateIndicator strictly from activeTarget.isWithin7Days (independent of attempt)', () => {
  const ctrlSrc = fs.readFileSync(
    path.join(BE_ROOT, 'controllers/minigameController.js'),
    'utf8'
  );
  assert.equal(
    ctrlSrc.includes('const hasActiveEvent = Boolean(activeTarget?.isWithin7Days);'),
    true,
    'hasActiveEvent must be derived strictly from activeTarget.isWithin7Days'
  );
  assert.equal(
    ctrlSrc.includes("gateIndicator: hasActiveEvent ? 'green' : 'red'"),
    true,
    'gateIndicator must map hasActiveEvent -> green/red independent of user attempt'
  );
  assert.equal(
    ctrlSrc.includes('canPlay: remaining > 0 && hasActiveEvent'),
    true,
    'canPlay must keep existing attempt + active event gate intact'
  );
});
