/**
 * frontend/components/map/chat/hooks/personalChat/groupMessages.js
 *
 * Pure functional helper to group and paginate chat messages with date dividers.
 * Zero React dependencies, zero side-effects.
 *
 * Source: usePersonalChatState.js (L1367-L1386)
 */

export function groupMessages(messages = [], messageSearchQuery = '', getChatTimeLabelFn = () => '') {
  const q = String(messageSearchQuery || '').trim().toLowerCase();
  const filtered = q
    ? (messages || []).filter((m) => String(m?.text || '').toLowerCase().includes(q))
    : (messages || []);

  const items = [];
  let lastDayKey = null;

  filtered.forEach((m) => {
    const msgDate = new Date(Number(m?.ts) || Date.now());
    const dayKey = `${msgDate.getFullYear()}-${msgDate.getMonth()}-${msgDate.getDate()}`;
    if (dayKey !== lastDayKey) {
      const label = getChatTimeLabelFn(m?.ts);
      items.push({ type: 'date_divider', id: `date_${dayKey}_${m?.id}`, label });
      lastDayKey = dayKey;
    }
    items.push({ type: 'message', ...m });
  });

  return items;
}

