import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROUP_ROLE_MAKER,
  GROUP_ROLE_COLLABORATOR,
  GROUP_ROLE_MEMBER,
  addGroupMemberOnly,
  getMemberRoleInEvent,
} from '../services/eventGroupStore.js';
import {
  setPersonalChatClearedForMe,
  getPersonalChatClearedAt,
} from '../services/chatClearStore.js';
import {
  getEventGroupMessages,
  sendEventGroupMessage,
  deleteEventGroupMessages,
  updateEventGroupSettings,
  promoteEventGroupMember,
  kickEventGroupMember,
  startEventGroupCall,
  leaveEventGroupCallHandler,
} from '../controllers/eventGroupController.js';
import {
  installInMemorySocialHarness,
  invokeController,
} from './helpers/inMemorySocialHarness.mjs';

test('Delete Chat for Me isolates cutoff strictly per user (both Personal & GroupChat) without purging peer messages', async () => {
  const harness = installInMemorySocialHarness({
    users: [
      { id: 'u_alice', name: 'Alice', nickname: 'alice', profilePicture: 'https://cdn.kalceria.id/a.webp' },
      { id: 'u_bob', name: 'Bob', nickname: 'bob', profilePicture: 'https://cdn.kalceria.id/b.webp' },
    ],
    miniEvents: [
      { id: 'ev_1', title: 'Ngopi Sore', creatorId: 'u_alice', isActive: true, expiresAt: new Date(Date.now() + 3600_000) },
    ],
  });

  try {
    // 1. Personal chat clear cutoff is strictly one-sided (Alice's cutoff does not affect Bob)
    const cutoffTs = await setPersonalChatClearedForMe('u_alice', 'conv_ab', 5000);
    assert.equal(cutoffTs, 5000);
    assert.equal(await getPersonalChatClearedAt('u_alice', 'conv_ab'), 5000);
    assert.equal(await getPersonalChatClearedAt('u_bob', 'conv_ab'), 0);

    // 2. GroupChat Delete Chat for Me: Bob joins as Member, both send messages
    await addGroupMemberOnly('ev_1', 'u_bob');
    const t0 = Date.now() - 5000;
    await invokeController(sendEventGroupMessage, {
      user: { userId: 'u_alice', name: 'Alice' },
      params: { eventId: 'ev_1' },
      body: { id: 'm1', text: 'Halo grup!', ts: t0 },
    });
    await invokeController(sendEventGroupMessage, {
      user: { userId: 'u_bob', name: 'Bob' },
      params: { eventId: 'ev_1' },
      body: { id: 'm2', text: 'OTW nih!', ts: t0 + 1000 },
    });

    // Alice clears chat for herself
    const clearRes = await invokeController(deleteEventGroupMessages, {
      user: { userId: 'u_alice' },
      params: { eventId: 'ev_1' },
      body: { clearAll: true },
    });
    assert.equal(clearRes.statusCode, 200);
    assert.equal(clearRes.body.clearedForMe, true);

    // Alice sees 0 old messages; Bob STILL sees BOTH historical messages!
    const aliceView = await invokeController(getEventGroupMessages, {
      user: { userId: 'u_alice' },
      params: { eventId: 'ev_1' },
      query: {},
    });
    const bobView = await invokeController(getEventGroupMessages, {
      user: { userId: 'u_bob' },
      params: { eventId: 'ev_1' },
      query: {},
    });
    assert.equal(aliceView.body.messages.length, 0);
    assert.equal(bobView.body.messages.length, 2);

    // Subsequent message after Alice's cutoff appears for Alice too
    await invokeController(sendEventGroupMessage, {
      user: { userId: 'u_bob', name: 'Bob' },
      params: { eventId: 'ev_1' },
      body: { id: 'm3', text: 'Sudah sampai!', ts: clearRes.body.clearedAtMs + 500 },
    });
    const aliceAfterNew = await invokeController(getEventGroupMessages, {
      user: { userId: 'u_alice' },
      params: { eventId: 'ev_1' },
      query: {},
    });
    assert.deepEqual(
      aliceAfterNew.body.messages.map((m) => m.id),
      ['m3']
    );
  } finally {
    harness.restore();
  }
});

test('Event GroupChat enforces Maker immunity, Collaborator promotion, Member restrictions & kick eviction', async () => {
  const harness = installInMemorySocialHarness({
    users: [
      { id: 'u_maker', name: 'Maker Alice', nickname: 'alice', profilePicture: 'https://cdn.kalceria.id/a.webp' },
      { id: 'u_bob', name: 'Bob', nickname: 'bob', profilePicture: 'https://cdn.kalceria.id/b.webp' },
      { id: 'u_carol', name: 'Carol', nickname: 'carol', profilePicture: 'https://cdn.kalceria.id/c.webp' },
      { id: 'u_dave', name: 'Dave', nickname: 'dave', profilePicture: 'https://cdn.kalceria.id/d.webp' },
    ],
    miniEvents: [
      { id: 'ev_roles', title: 'Kopdar Senopati', creatorId: 'u_maker', isActive: true, expiresAt: new Date(Date.now() + 3600_000) },
    ],
  });

  try {
    // Envelope acceptance ONLY adds regular MEMBER (never auto-Collaborator)
    await addGroupMemberOnly('ev_roles', 'u_bob');
    await addGroupMemberOnly('ev_roles', 'u_carol');
    await addGroupMemberOnly('ev_roles', 'u_dave');
    assert.equal(await getMemberRoleInEvent('ev_roles', 'u_bob', 'u_maker'), GROUP_ROLE_MEMBER);
    assert.equal(await getMemberRoleInEvent('ev_roles', 'u_maker', 'u_maker'), GROUP_ROLE_MAKER);

    // Regular Member CANNOT edit group settings (403) or promote/kick (403)
    const memberEditRes = await invokeController(updateEventGroupSettings, {
      user: { userId: 'u_bob' },
      params: { eventId: 'ev_roles' },
      body: { description: 'Hacked desc' },
    });
    assert.equal(memberEditRes.statusCode, 403);

    const memberKickRes = await invokeController(kickEventGroupMember, {
      user: { userId: 'u_bob' },
      params: { eventId: 'ev_roles', targetId: 'u_dave' },
    });
    assert.equal(memberKickRes.statusCode, 403);

    // Maker promotes Bob & Carol to COLLABORATOR
    const promoBob = await invokeController(promoteEventGroupMember, {
      user: { userId: 'u_maker' },
      params: { eventId: 'ev_roles', targetId: 'u_bob' },
      body: { role: GROUP_ROLE_COLLABORATOR },
    });
    assert.equal(promoBob.statusCode, 200);
    assert.equal(promoBob.body.role, GROUP_ROLE_COLLABORATOR);
    assert.equal(harness.sets.get('mini_event:collab:accepted:ev_roles')?.has('u_bob'), true);

    await invokeController(promoteEventGroupMember, {
      user: { userId: 'u_maker' },
      params: { eventId: 'ev_roles', targetId: 'u_carol' },
      body: { role: GROUP_ROLE_COLLABORATOR },
    });

    // STRICT LAW: Collaborator Bob CANNOT kick Maker (403) or demote Maker (403)
    const kickMakerRes = await invokeController(kickEventGroupMember, {
      user: { userId: 'u_bob' },
      params: { eventId: 'ev_roles', targetId: 'u_maker' },
    });
    assert.equal(kickMakerRes.statusCode, 403);
    assert.match(kickMakerRes.body.error, /maker cannot be removed/i);

    const demoteMakerRes = await invokeController(promoteEventGroupMember, {
      user: { userId: 'u_bob' },
      params: { eventId: 'ev_roles', targetId: 'u_maker' },
      body: { role: GROUP_ROLE_MEMBER },
    });
    assert.equal(demoteMakerRes.statusCode, 403);
    assert.match(demoteMakerRes.body.error, /maker role cannot be modified/i);

    // Collaborator Bob CANNOT demote fellow Collaborator Carol (only Maker can!)
    const demotePeerCollab = await invokeController(promoteEventGroupMember, {
      user: { userId: 'u_bob' },
      params: { eventId: 'ev_roles', targetId: 'u_carol' },
      body: { role: GROUP_ROLE_MEMBER },
    });
    assert.equal(demotePeerCollab.statusCode, 403);

    // Collaborator Bob CAN kick regular Member Dave -> Dave immediately blocked from group messages (403)
    const kickDave = await invokeController(kickEventGroupMember, {
      user: { userId: 'u_bob' },
      params: { eventId: 'ev_roles', targetId: 'u_dave' },
    });
    assert.equal(kickDave.statusCode, 200);
    assert.equal(kickDave.body.kickedUserId, 'u_dave');

    const daveReadAfterKick = await invokeController(getEventGroupMessages, {
      user: { userId: 'u_dave' },
      params: { eventId: 'ev_roles' },
      query: {},
    });
    assert.equal(daveReadAfterKick.statusCode, 403);
  } finally {
    harness.restore();
  }
});

test('Shared In Another Call lock rejects starting a second group call (409) until user leaves the first call', async () => {
  const harness = installInMemorySocialHarness({
    users: [{ id: 'u_alice', name: 'Alice', nickname: 'alice' }],
    miniEvents: [
      { id: 'ev_a', title: 'Event A', creatorId: 'u_alice', isActive: true, expiresAt: new Date(Date.now() + 3600_000) },
      { id: 'ev_b', title: 'Event B', creatorId: 'u_alice', isActive: true, expiresAt: new Date(Date.now() + 3600_000) },
    ],
  });

  try {
    const startA = await invokeController(startEventGroupCall, {
      user: { userId: 'u_alice', name: 'Alice' },
      params: { eventId: 'ev_a' },
      body: { mode: 'voice' },
    });
    assert.equal(startA.statusCode, 200);
    assert.equal(startA.body.ok, true);

    // Attempting to start another group call while already in Event A call -> HTTP 409 busy!
    const startB = await invokeController(startEventGroupCall, {
      user: { userId: 'u_alice', name: 'Alice' },
      params: { eventId: 'ev_b' },
      body: { mode: 'video' },
    });
    assert.equal(startB.statusCode, 409);
    assert.equal(startB.body.busy, true);

    // Leave Event A call -> lock freed -> Event B call now succeeds!
    await invokeController(leaveEventGroupCallHandler, {
      user: { userId: 'u_alice' },
      params: { eventId: 'ev_a' },
    });
    const startBAfterLeave = await invokeController(startEventGroupCall, {
      user: { userId: 'u_alice', name: 'Alice' },
      params: { eventId: 'ev_b' },
      body: { mode: 'video' },
    });
    assert.equal(startBAfterLeave.statusCode, 200);
    assert.equal(startBAfterLeave.body.ok, true);
  } finally {
    harness.restore();
  }
});
