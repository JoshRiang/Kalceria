/**
 * frontend/components/map/chat/hooks/personalChat/messageStatusUpdaters.js
 *
 * Pure functional state transitions for message lists.
 * Preserves reference identity when unchanged (IL-7).
 *
 * Source: usePersonalChatState.js (L318-L337, L357-L365, L478-L497, L501-L506, L1231-L1236)
 */

export function applyPeerReadReceipt(prevMessages = [], myId = '', ackTs = 0) {
  let changed = false;
  const next = prevMessages.map((m) => {
    if (
      String(m?.senderId) === String(myId) &&
      m?.status === 'sent' &&
      Number(m?.ts || 0) <= ackTs
    ) {
      changed = true;
      return { ...m, status: 'read' };
    }
    return m;
  });
  return { next: changed ? next : prevMessages, changed };
}

export function filterDeletedMessages(prevMessages = [], deletedIds = []) {
  const delSet = new Set((deletedIds || []).map(String));
  if (delSet.size === 0) return { next: prevMessages, changed: false };
  const next = prevMessages.filter((m) => !delSet.has(String(m?.id)));
  return { next: next.length !== prevMessages.length ? next : prevMessages, changed: next.length !== prevMessages.length };
}

export function filterInFlightOrFailed(prevMessages = []) {
  return prevMessages.filter((m) => m?.status === 'sending' || m?.status === 'failed');
}

export function updateMessageStatusById(prevMessages = [], msgId, newStatus, extraProps = {}) {
  let changed = false;
  const next = prevMessages.map((m) => {
    if (m?.id === msgId) {
      changed = true;
      return { ...m, ...extraProps, status: newStatus };
    }
    return m;
  });
  return { next: changed ? next : prevMessages, changed };
}

