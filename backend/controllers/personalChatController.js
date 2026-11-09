/**
 * personalChatController (Barrel Re-Export)
 *
 * Re-exports chat query, sending, inbox summary, read acknowledgments,
 * RTC signaling, and call token handlers for backward compatibility.
 */
export {
  sendChatRtcSignal,
  getChatRtcSignals,
  sendCallSignal,
  getCallSignals,
  clearCallSignals,
  getLiveKitCallToken,
  generateLiveKitToken,
} from './personalChat/index.js';

export { getPersonalChatMessages } from './personalChat/chatMessageQuery.js';
export { sendPersonalChatMessage } from './personalChat/chatMessageSender.js';
export {
  ackPersonalChatRead,
  getPersonalChatInboxSummary,
  deletePersonalChatMessages,
} from './personalChat/chatInboxController.js';
