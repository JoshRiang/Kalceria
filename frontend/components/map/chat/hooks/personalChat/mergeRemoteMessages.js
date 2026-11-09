/**
 * frontend/components/map/chat/hooks/personalChat/mergeRemoteMessages.js
 *
 * Pure remote envelope merge & sort logic.
 * Note: Network ACKs & window dispatchEvents remain verbatim inside hook updater callbacks (IL-4).
 *
 * Source: usePersonalChatState.js (L518-L560)
 */

export function buildMergedRemoteMessages({
  prev = [],
  decryptedRemote = [],
  wasInitialized = false,
  serverDelRev = 0,
  prevDelRev = 0,
  isDelta = false,
  serverPeerReadTs = 0,
  myId = '',
  isAhmad = false,
}) {
  const isFullReconcile = wasInitialized && serverDelRev !== prevDelRev && !isDelta;
  const mergedMap = new Map();

  if (!isFullReconcile) {
    (prev || []).forEach((m) => {
      if (!isAhmad && String(m?.id || '').startsWith('seed_')) return;
      if (
        (isAhmad && String(m?.id || '').startsWith('seed_')) ||
        m?.status === 'sending' ||
        m?.status === 'failed'
      ) {
        mergedMap.set(m.id, m);
      } else if (!String(m?.mediaUrl || '').startsWith('blob:')) {
        const updatedStatus =
          String(m?.senderId) === String(myId) &&
          m?.status === 'sent' &&
          serverPeerReadTs > 0 &&
          Number(m?.ts || 0) <= serverPeerReadTs
            ? 'read'
            : m?.status;
        mergedMap.set(m.id, updatedStatus !== m?.status ? { ...m, status: updatedStatus } : m);
      }
    });
  } else {
    // Full reconcile after remote message deletion: keep only local in-flight/failed messages + server truth
    (prev || []).forEach((m) => {
      if (m?.status === 'sending' || m?.status === 'failed') {
        mergedMap.set(m.id, m);
      }
    });
  }

  (decryptedRemote || []).forEach((m) => {
    if (!m || !m.id) return;
    const existing = mergedMap.get(m.id);
    // Never downgrade a locally confirmed 'read' receipt back to 'sent'
    const bestStatus = existing?.status === 'read' ? 'read' : m.status;
    mergedMap.set(m.id, bestStatus !== m.status ? { ...m, status: bestStatus } : m);
  });

  return Array.from(mergedMap.values()).sort((a, b) => (Number(a?.ts) || 0) - (Number(b?.ts) || 0));
}

