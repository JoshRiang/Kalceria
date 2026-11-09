"use client";

import {
  buildMessageCopyText,
  buildSelectedMessagesCopyText,
  copyTextToClipboard,
} from "./clipboardText";
import { buildReplyDraft } from "./replyPayload";
import { filterDeletedMessages } from "./messageStatusUpdaters";

/**
 * frontend/components/map/chat/hooks/personalChat/useChatSelectionActions.js
 *
 * Non-memo action handlers for message selection, bulk deletion, copy, and inline reply initiation.
 * Ledger: Non-memo action handlers (IL-6), zero hooks.
 *
 * Input: Selection state, setters, copy helpers, delete handlers.
 * Output: 5 non-memo handlers
 */
export function useChatSelectionActions({
  messages = [],
  selectedMsgIds = [],
  setSelectedMsgIds = () => {},
  setSelectMode = () => {},
  playingVoiceId = null,
  setPlayingVoiceId = () => {},
  setMessages = () => {},
  persistQuickLocal = () => {},
  persistEncryptedLocal = () => {},
  sendRealtimePacketRef = { current: null },
  deletePersonalChatMessages = async () => {},
  targetId = null,
  myId = null,
  activeChatUser = null,
  setReplyingTo = () => {},
  formatVoiceDuration = () => "",
  inferReplyMediaType = () => "text",
} = {}) {
  const handleToggleSelectMsg = (msgId) => {
    setSelectedMsgIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  const handleDeleteSelectedMessages = async (customIds = null) => {
    const ids = Array.isArray(customIds) ? customIds : selectedMsgIds;
    if (!ids.length) return;
    const idSet = new Set(ids);
    if (ids.some((id) => id === playingVoiceId)) {
      setPlayingVoiceId(null);
    }
    setMessages((prev) => {
      const { next } = filterDeletedMessages(prev, ids);
      persistQuickLocal(next);
      persistEncryptedLocal(next);
      return next;
    });
    sendRealtimePacketRef.current?.({ type: "delete_msgs", ids });
    deletePersonalChatMessages(targetId, { messageIds: ids }).catch(() => {});
    if (!customIds) {
      setSelectedMsgIds([]);
      setSelectMode(false);
    } else {
      setSelectedMsgIds((prev) => prev.filter((id) => !idSet.has(id)));
    }
  };

  const handleCopySingleMessage = (msg) => {
    if (!msg) return;
    const textToCopy = buildMessageCopyText(msg, formatVoiceDuration);
    copyTextToClipboard(textToCopy);
  };

  const handleStartReply = (msg) => {
    if (!msg) return;
    const draft = buildReplyDraft(msg, { myId, activeChatUser, inferReplyMediaType });
    setReplyingTo(draft);
  };

  const handleCopySelectedMessages = () => {
    const selectedTexts = buildSelectedMessagesCopyText(messages, selectedMsgIds, formatVoiceDuration);
    copyTextToClipboard(selectedTexts);
    setSelectedMsgIds([]);
    setSelectMode(false);
  };

  return {
    handleToggleSelectMsg,
    handleDeleteSelectedMessages,
    handleCopySingleMessage,
    handleStartReply,
    handleCopySelectedMessages,
  };
}

