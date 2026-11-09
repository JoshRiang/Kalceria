/**
 * frontend/components/map/chat/hooks/personalChat/clipboardText.js
 *
 * Pure helper for message text extraction and safe clipboard copy fallback.
 * Deduplicates the 4x repeated textarea fallback into a single clean utility.
 *
 * Source: usePersonalChatState.js (L1247-L1286, L1322-L1365)
 */

export function buildMessageCopyText(msg, formatVoiceDurationFn = (sec) => `${sec}s`) {
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  return (
    msg.text ||
    (msg.msgType === 'voice'
      ? `Voice message ${formatVoiceDurationFn(msg.voiceDuration || 7)}`
      : msg.msgType === 'call'
      ? msg.text || 'Call log'
      : msg.mediaUrl || '')
  );
}

export function buildSelectedMessagesCopyText(messages = [], selectedMsgIds = [], formatVoiceDurationFn) {
  const idSet = new Set(selectedMsgIds);
  return (messages || [])
    .filter((m) => idSet.has(m?.id))
    .map((m) => buildMessageCopyText(m, formatVoiceDurationFn))
    .filter(Boolean)
    .join('\n');
}

export function copyTextToClipboard(textToCopy, env = {}) {
  if (!textToCopy) return;
  const nav = env.navigator || (typeof navigator !== 'undefined' ? navigator : undefined);
  const doc = env.document || (typeof document !== 'undefined' ? document : undefined);

  if (nav && nav.clipboard?.writeText) {
    nav.clipboard.writeText(textToCopy).catch(() => {
      fallbackCopyText(textToCopy, doc);
    });
  } else if (doc) {
    fallbackCopyText(textToCopy, doc);
  }
}

function fallbackCopyText(textToCopy, doc) {
  if (!doc) return;
  try {
    const ta = doc.createElement('textarea');
    ta.value = textToCopy;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    doc.body.appendChild(ta);
    ta.select();
    doc.execCommand('copy');
    doc.body.removeChild(ta);
  } catch {}
}

