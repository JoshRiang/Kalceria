import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { calculateUptime, cleanDesc, formatElapsedUptime } from "../components/map/eventPopup/popupHelpers.js";
import { getTrashIconSvg } from "../components/map/eventPopup/popupFeedDeletePrompt.js";
import { stripDynamicUptime } from "../components/snapmap/snapMapHelpers.js";
import { stripEventTags } from "../components/map/mapPage/eventDescCodec.js";
import { validateMediaUploadFile } from "../lib/mediaUploadHelpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_ROOT = path.resolve(__dirname, "..");
const readFe = (rel) => fs.readFileSync(path.join(FE_ROOT, rel), "utf8");

test("Event Popup uptime breaks down cleanly into months, days, hours, minutes, seconds and stripDynamicUptime masks it", () => {
  assert.equal(formatElapsedUptime(5 * 3600 + 13 * 60 + 6), "5h 13m 06s");
  assert.equal(formatElapsedUptime(24 * 3600 + 13 * 60 + 6), "1d 0h 13m 06s");
  assert.equal(formatElapsedUptime(400 * 3600 + 54 * 60 + 13), "16d 16h 54m 13s");
  assert.equal(formatElapsedUptime(35 * 86400 + 4 * 3600 + 12 * 60 + 5), "1mo 5d 4h 12m 05s");

  const fixedCreatedAt = Date.now() - (24 * 3600 + 13 * 60 + 6) * 1000;
  assert.match(calculateUptime(fixedCreatedAt), /^1d 0h 13m 0[6-9]s$/);

  const sampleDayHtml = `<span id="event-uptime-ev1" data-event-uptime="12345">16d 16h 54m 13s</span>`;
  assert.equal(stripDynamicUptime(sampleDayHtml), `<span id="event-uptime-ev1" data-event-uptime="12345">0h 00m 00s</span>`);

  const sampleMoHtml = `<span id="event-uptime-ev2" data-event-uptime="12345">1mo 5d 4h 12m 05s</span>`;
  assert.equal(stripDynamicUptime(sampleMoHtml), `<span id="event-uptime-ev2" data-event-uptime="12345">0h 00m 00s</span>`);
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

  // Location pin icon replaces underlined blue link; clock icon removed; mini-media action icon sits inside a circle
  assert.ok(popupSrc.includes("data-event-location-pin"), "EventPopup must render clickable Map Pin icon");
  assert.ok(popupSrc.includes('fill-rule="evenodd"'), "Map Pin SVG must use evenodd center hole");
  assert.ok(!popupSrc.includes("12 6 12 12 16 14"), "Clock SVG icon must be removed from EventPopup footer");
  assert.ok(popupSrc.includes('data-media-action-circle="true"'), "Mini-media trash/reply icon must be wrapped in a circle");
  assert.ok(popupSrc.includes("border-radius: 9999px;"), "Mini-media action circle must use full circular radius");
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

test("Live Media Feed & Comment Form use ONE unified dashed MediaDropzoneBox with n+1 '+' tile, compact 'Photo/Video Max 10 MB' label, and 10MB validation", () => {
  const dropzoneSrc = readFe("components/ui/MediaDropzoneBox.jsx");
  const eventMediaSrc = readFe("components/map/modals/eventForm/EventMediaSection.jsx");
  const broadcastMediaSrc = readFe("components/map/modals/statusModal/BroadcastMediaSection.jsx");
  const commentBodySrc = readFe("components/landing/modals/ideaComment/IdeaCommentFormBody.jsx");
  const uploadRouteSrc = readFe("app/api/blob/upload/route.ts");
  const editProfileSrc = readFe("components/map/EditProfileModal.jsx");

  assert.ok(dropzoneSrc.includes("border-dashed"), "Dropzone must use dashed border");
  assert.ok(dropzoneSrc.includes('data-media-add-slot="true"'), "Dropzone must always render n+1 inner dashed '+' tile");
  assert.ok(dropzoneSrc.includes("flex-wrap"), "Dropzone must flexibly wrap n+1 tile to next row when filled");
  assert.ok(dropzoneSrc.includes('mediaTypeLabel = "Photo/Video"'), "Dropzone must use compact Photo/Video label");
  assert.ok(dropzoneSrc.includes('maxSizeLabel = "Max 10 MB"'), "Dropzone must show Max 10 MB beside n+1 tile");
  assert.ok(dropzoneSrc.includes('role="alert"'), "Dropzone must surface upload errors inside the box");
  assert.ok(dropzoneSrc.includes("onDrop"), "Dropzone must support drag and drop");

  // Zero double outer dashed boxes on EventMediaSection, BroadcastMediaSection & IdeaCommentFormBody
  assert.ok(eventMediaSrc.includes("MediaDropzoneBox"), "EventMediaSection must render MediaDropzoneBox");
  assert.ok(!eventMediaSrc.includes("border-2 border-dashed"), "EventMediaSection must NOT render a second outer dashed preview box");
  assert.ok(!eventMediaSrc.includes("Upload media atau tempel link"), "Old text link box must be removed from EventMediaSection");

  assert.ok(broadcastMediaSrc.includes("MediaDropzoneBox"), "BroadcastMediaSection must render shared MediaDropzoneBox");
  assert.ok(!broadcastMediaSrc.includes("Upload media atau tempel link"), "Old text link box must be removed from BroadcastMediaSection");

  assert.ok(commentBodySrc.includes("MediaDropzoneBox"), "IdeaCommentFormBody must render MediaDropzoneBox");
  assert.ok(!commentBodySrc.includes("Upload media atau tempel link"), "Old text link box must be removed from IdeaCommentFormBody");

  // 10 MB direct & chunked R2 support across upload route, EditProfile, and client validator
  assert.ok(uploadRouteSrc.includes("chunkAction"), "Upload route must support stateless chunked R2 upload up to 10 MB");
  assert.ok(editProfileSrc.includes("10 * 1024 * 1024"), "EditProfileModal cover & avatar must allow up to 10 MB");

  const valid8Mb = validateMediaUploadFile({
    name: "clip.mp4",
    size: 8 * 1024 * 1024,
    type: "video/mp4",
  });
  assert.equal(valid8Mb.valid, true, "8 MB video must be accepted under new 10 MB limit");

  const oversized = validateMediaUploadFile({
    name: "huge.mp4",
    size: 11 * 1024 * 1024,
    type: "video/mp4",
  });
  assert.equal(oversized.valid, false);
  assert.match(oversized.error, /10 MB/i);
});

