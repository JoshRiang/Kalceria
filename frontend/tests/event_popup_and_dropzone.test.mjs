import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { calculateUptime, cleanDesc } from "../components/map/eventPopup/popupHelpers.js";
import { getTrashIconSvg } from "../components/map/eventPopup/popupFeedDeletePrompt.js";
import { stripDynamicUptime } from "../components/snapmap/snapMapHelpers.js";
import { stripEventTags } from "../components/map/mapPage/eventDescCodec.js";
import { validateMediaUploadFile } from "../lib/mediaUploadHelpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_ROOT = path.resolve(__dirname, "..");
const readFe = (rel) => fs.readFileSync(path.join(FE_ROOT, rel), "utf8");

test("Event Popup uptime formats as '24h 13m 06s' and stripDynamicUptime masks it cleanly", () => {
  const fixedCreatedAt = Date.now() - (24 * 3600 + 13 * 60 + 6) * 1000;
  const formatted = calculateUptime(fixedCreatedAt);
  assert.match(formatted, /^24h 13m 0[6-9]s$/);

  const sampleHtml = `<span id="event-uptime-ev1" data-event-uptime="12345">387h 21m 55s</span>`;
  const stripped = stripDynamicUptime(sampleHtml);
  assert.equal(stripped, `<span id="event-uptime-ev1" data-event-uptime="12345">0h 00m 00s</span>`);
});

test("CMETA tags are cleanly stripped across frontend event description parsers", () => {
  const raw = "[CMETA:eyJpIjoiY2xpcF8xIn0] [MEDIA:https://cdn.kalceria.id/a.webp] [LOC:Bintaro] [CAT:cafe] Nongki santai";
  assert.equal(cleanDesc(raw), "Nongki santai");
  assert.equal(stripEventTags(raw), "Nongki santai");
});

test("Event Popup trashcan SVG uses full solid fill (#000000 light, #ffffff dark)", () => {
  const lightSvg = getTrashIconSvg(false);
  const darkSvg = getTrashIconSvg(true);

  assert.ok(lightSvg.includes('fill="#000000"'), "Light trashcan must use solid #000000 fill");
  assert.ok(darkSvg.includes('fill="#ffffff"'), "Dark trashcan must use solid #ffffff fill");
  assert.ok(!lightSvg.includes('fill="none"'), "Trashcan must not be hollow outlined");
  assert.ok(!darkSvg.includes('fill="none"'), "Trashcan must not be hollow outlined");
});

test("Event Popup purges search icon, media view count, and clock icon; uses solid pin icon", () => {
  const popupSrc = readFe("components/map/EventPopup.jsx");
  const slidePosSrc = readFe("components/map/eventPopup/popupSlidePositioner.js");
  const controllerSrc = readFe("components/map/eventPopup/popupCarouselController.js");
  const callbacksSrc = readFe("components/snapmap/useSnapMapGlobalCallbacks.js");

  // Search icon & Event Media view counter completely purged
  assert.ok(!popupSrc.includes("data-media-view-count"), "EventPopup must not render media view counter");
  assert.ok(!popupSrc.includes("firstViewCount"), "EventPopup must not compute firstViewCount");
  assert.ok(!slidePosSrc.includes("data-media-view-count"), "popupSlidePositioner must not sync view count");
  assert.ok(!controllerSrc.includes("__kalceriaRecordMediaView"), "Event carousel must not call __kalceriaRecordMediaView");
  assert.ok(!callbacksSrc.includes("__kalceriaRecordMediaView"), "Global callbacks must not register __kalceriaRecordMediaView");

  // Broadcast Box view tracking must remain untouched (anti-regression)
  assert.ok(controllerSrc.includes("__kalceriaRecordBroadcastView"), "Broadcast view tracking must stay intact");
  assert.ok(callbacksSrc.includes("__kalceriaRecordBroadcastView"), "Broadcast view callback must stay intact");

  // Location pin icon replaces underlined blue link; clock icon removed
  assert.ok(popupSrc.includes("data-event-location-pin"), "EventPopup must render clickable Map Pin icon");
  assert.ok(popupSrc.includes('fill-rule="evenodd"'), "Map Pin SVG must use evenodd center hole");
  assert.ok(!popupSrc.includes("12 6 12 12 16 14"), "Clock SVG icon must be removed from EventPopup footer");
});

test("Event Popup geometry locks stably to first slide aspect ratio", () => {
  const slidePosSrc = readFe("components/map/eventPopup/popupSlidePositioner.js");
  const playbackSrc = readFe("components/map/eventPopup/popupClipPlayback.js");
  const controllerSrc = readFe("components/map/eventPopup/popupCarouselController.js");

  assert.ok(slidePosSrc.includes("state.lockedSourceDims"), "Event Popup geometry must lock to first slide dimensions");
  assert.ok(controllerSrc.includes("lockedSourceDims: null"), "Carousel state must initialize lockedSourceDims");
  assert.ok(controllerSrc.includes("{ forceResize: true }"), "Window resize must pass forceResize");
  assert.ok(
    playbackSrc.includes('idx === 0 || state.cardEl?.classList?.contains("broadcast-popup-box")'),
    "Only slide 0 or broadcast box should hydrate locked geometry"
  );
});

test("Live Media Feed & Comment Form replace text/button upload with shared dashed MediaDropzoneBox + 4.5MB validation", () => {
  const dropzoneSrc = readFe("components/ui/MediaDropzoneBox.jsx");
  const eventMediaSrc = readFe("components/map/modals/eventForm/EventMediaSection.jsx");
  const commentBodySrc = readFe("components/landing/modals/ideaComment/IdeaCommentFormBody.jsx");

  assert.ok(dropzoneSrc.includes("border-dashed"), "Dropzone must use dashed border");
  assert.ok(dropzoneSrc.includes("italic"), "Dropzone must use italic muted copy");
  assert.ok(dropzoneSrc.includes('role="alert"'), "Dropzone must surface upload errors inside the box");
  assert.ok(dropzoneSrc.includes("onDrop"), "Dropzone must support drag and drop");

  assert.ok(eventMediaSrc.includes("MediaDropzoneBox"), "EventMediaSection must render MediaDropzoneBox");
  assert.ok(!eventMediaSrc.includes("Upload media atau tempel link"), "Old text link box must be removed from EventMediaSection");

  assert.ok(commentBodySrc.includes("MediaDropzoneBox"), "IdeaCommentFormBody must render MediaDropzoneBox");
  assert.ok(!commentBodySrc.includes("Upload media atau tempel link"), "Old text link box must be removed from IdeaCommentFormBody");

  // 4.5 MB client validation security still enforced
  const oversized = validateMediaUploadFile({
    name: "huge.mp4",
    size: 5 * 1024 * 1024,
    type: "video/mp4",
  });
  assert.equal(oversized.valid, false);
  assert.match(oversized.error, /4\.5 MB/i);
});

