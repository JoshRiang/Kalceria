import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_ROOT = path.resolve(__dirname, "..");
const readFe = (rel) => fs.readFileSync(path.join(FE_ROOT, rel), "utf8");

test("Unified Voice->Video in-call upgrade keeps single RTCPeerConnection/callId without teardown or re-ringing on either peer", () => {
  const sessionSrc = readFe("components/map/chat/hooks/personalCall/useCallSession.js");
  const upgradeSrc = readFe("components/map/chat/hooks/personalCall/callVideoUpgrade.js");
  const pollerSrc = readFe("components/map/chat/hooks/personalCall/callSignalPoller.js");
  const viewSrc = readFe("components/map/chat/call/PersonalCallView.jsx");
  const incomingSrc = readFe("components/map/panel/useKalceriansIncomingCall.js");

  // 1. Main call lifecycle effect MUST NOT depend on `mode` (prevents teardown & re-ringing on Voice -> Video switch!)
  const depsMatch = sessionSrc.match(/teardownCall\(\);\s*\};\s*\},\s*\[([\s\S]*?)\]\);/);
  assert.ok(depsMatch, "Must locate main call lifecycle useEffect dependency array");
  const depTokens = depsMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  assert.equal(depTokens.includes("mode"), false, "Main call lifecycle effect must NEVER depend on mode");

  // 2. PersonalCallView must keep stable key so switching Voice -> Video transitions smoothly in-place
  assert.ok(viewSrc.includes('key="call-view-active"'), "PersonalCallView must use stable key across mode upgrades");
  assert.equal(viewSrc.includes("key={`call-view-${mode}`}"), false, "PersonalCallView must NOT remount on mode change");
  assert.ok(viewSrc.includes("handleUpgradeToVideo"), "PersonalCallView must invoke unified handleUpgradeToVideo");

  // 3. Dedicated upgrade module performs in-place SDP renegotiation without starting ringtone
  assert.ok(upgradeSrc.includes("export async function upgradeVoiceCallToVideo"), "Must export upgradeVoiceCallToVideo");
  assert.ok(upgradeSrc.includes("export async function handleIncomingRenegotiateOffer"), "Must export handleIncomingRenegotiateOffer");
  assert.ok(upgradeSrc.includes("export async function handleIncomingRenegotiateAnswer"), "Must export handleIncomingRenegotiateAnswer");
  assert.ok(upgradeSrc.includes("acquireCameraStream({ facingMode: \"user\" }, false)"), "Must acquire video-only track so active mic audio stays uninterrupted");
  assert.ok(upgradeSrc.includes('signalType: "renegotiate_offer"'), "Must send mid-call renegotiate_offer (not fresh call offer)");
  assert.ok(upgradeSrc.includes('signalType: "renegotiate_answer"'), "Must reply with mid-call renegotiate_answer");
  assert.equal(upgradeSrc.includes("startOutgoingRingtone"), false, "Upgrade must NEVER trigger outgoing ringtone");

  // 4. Both DataChannel (instant) and Signal Poller (durable) process mid-call renegotiation
  assert.ok(sessionSrc.includes("handleCallControlChannelMessage"), "DataChannel must dispatch via handleCallControlChannelMessage");
  assert.ok(upgradeSrc.includes('parsed?.type === "renegotiate_offer"'), "DataChannel handler must process instant renegotiate_offer");
  assert.ok(upgradeSrc.includes('parsed?.type === "renegotiate_answer"'), "DataChannel handler must process instant renegotiate_answer");
  assert.ok(pollerSrc.includes('sig.signalType === "renegotiate_offer"'), "Signal poller must handle renegotiate_offer");
  assert.ok(pollerSrc.includes('sig.signalType === "renegotiate_answer"'), "Signal poller must handle renegotiate_answer");

  // 5. Incoming call ringtone popup ONLY listens to fresh `offer`, never `renegotiate_offer`
  assert.ok(incomingSrc.includes('if (sig.signalType === "offer")'), "Incoming call modal must only pop up on fresh call offers");

  // 6. Strict Call Log Idempotency: 1 single log per callId reflecting final mode (no duplicate caller/callee/double-hangup entries)
  const resendSrc = readFe("components/map/chat/hooks/personalChat/useChatResend.js");
  const senderSrc = readFe("components/map/chat/hooks/personalChat/useChatSender.js");
  assert.ok(sessionSrc.includes("hasReportedEndRef"), "useCallSession must guard onEndCall with hasReportedEndRef");
  assert.ok(sessionSrc.includes("finishCallOnce"), "useCallSession must emit call summary at most once");
  assert.ok(resendSrc.includes("summary.isCaller !== false"), "Only caller emits the single canonical call log bubble");
  assert.ok(resendSrc.includes("calllog_${cleanCallId}"), "Call log must use deterministic idempotent calllog_<callId>");
  assert.ok(senderSrc.includes("const existsIdx = prev.findIndex((m) => m.id === msgId)"), "useChatSender must deduplicate messages by id");
});
