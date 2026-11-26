import prisma from '../lib/prisma.js';

let clearCutoffsTableChecked = false;

export async function ensureChatClearTable() {
  if (clearCutoffsTableChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS personal_chat_clear_cutoffs (
        user_id VARCHAR(128) NOT NULL,
        conv_hash VARCHAR(128) NOT NULL,
        cleared_at_ms BIGINT NOT NULL,
        PRIMARY KEY (user_id, conv_hash)
      )
    `);
    clearCutoffsTableChecked = true;
  } catch (err) {
    console.warn('[ChatClearStore] ensureChatClearTable error:', err?.message);
  }
}

export async function setPersonalChatClearedForMe(userId, convHash, clearedAtMs = Date.now()) {
  if (!userId || !convHash) return 0;
  const ts = Math.max(1, Math.floor(Number(clearedAtMs) || Date.now()));
  await ensureChatClearTable();
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO personal_chat_clear_cutoffs (user_id, conv_hash, cleared_at_ms)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, conv_hash)
       DO UPDATE SET cleared_at_ms = GREATEST(personal_chat_clear_cutoffs.cleared_at_ms, EXCLUDED.cleared_at_ms)`,
      String(userId),
      String(convHash),
      ts
    );
  } catch (err) {
    console.warn('[ChatClearStore] setPersonalChatClearedForMe error:', err?.message);
  }
  return ts;
}

export async function getPersonalChatClearedAt(userId, convHash) {
  if (!userId || !convHash) return 0;
  await ensureChatClearTable();
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT cleared_at_ms FROM personal_chat_clear_cutoffs WHERE user_id = $1 AND conv_hash = $2 LIMIT 1`,
      String(userId),
      String(convHash)
    );
    if (Array.isArray(rows) && rows.length > 0) {
      return Number(rows[0].cleared_at_ms || 0);
    }
  } catch (err) {
    console.warn('[ChatClearStore] getPersonalChatClearedAt error:', err?.message);
  }
  return 0;
}

