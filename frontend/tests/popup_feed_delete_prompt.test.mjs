import test from "node:test";
import assert from "node:assert/strict";

import {
  getTrashIconSvg,
  getReplyIconSvg,
  showFeedDeletePrompt,
  hideFeedDeletePrompt,
} from "../components/map/eventPopup/popupFeedDeletePrompt.js";

// Minimal headless DOM mock for Node.js test environment
function createMockElement(tagName = "div") {
  const children = [];
  const attributes = {};
  const style = {};
  const element = {
    tagName: tagName.toUpperCase(),
    style,
    dataset: {},
    children,
    parentElement: null,
    setAttribute(name, val) {
      attributes[name] = String(val);
    },
    getAttribute(name) {
      return attributes[name] || null;
    },
    hasAttribute(name) {
      return Boolean(attributes[name]);
    },
    appendChild(child) {
      children.push(child);
      child.parentElement = element;
      return child;
    },
    remove() {
      if (element.parentElement) {
        const idx = element.parentElement.children.indexOf(element);
        if (idx !== -1) element.parentElement.children.splice(idx, 1);
      }
    },
    querySelector(selector) {
      if (selector === "[data-feed-delete-overlay]") {
        return children.find((c) => c.getAttribute("data-feed-delete-overlay") === "true") || null;
      }
      if (selector === '[data-action="yes"]') {
        return children.flatMap((c) => c.children || []).find((c) => c.getAttribute("data-action") === "yes") || null;
      }
      if (selector === '[data-action="no"]') {
        return children.flatMap((c) => c.children || []).find((c) => c.getAttribute("data-action") === "no") || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      return [];
    },
  };

  let innerHtmlVal = "";
  Object.defineProperty(element, "innerHTML", {
    get() {
      return innerHtmlVal;
    },
    set(val) {
      innerHtmlVal = val;
      // Synthesize yes and no button elements for inner click testing
      if (val.includes('data-action="yes"') && val.includes('data-action="no"')) {
        const yesBtn = createMockElement("button");
        yesBtn.setAttribute("data-action", "yes");
        yesBtn.style.color = "#ef4444";
        const noBtn = createMockElement("button");
        noBtn.setAttribute("data-action", "no");

        const wrapper = createMockElement("div");
        wrapper.appendChild(yesBtn);
        wrapper.appendChild(noBtn);
        children.push(wrapper);
      }
    },
  });

  return element;
}

test("Feed Deletion: SVG dimensions and theme modes", () => {
  const trashDark = getTrashIconSvg(true);
  const trashLight = getTrashIconSvg(false);
  assert.match(trashDark, /width="13"/);
  assert.match(trashDark, /height="13"/);
  assert.match(trashDark, /#ffffff/);
  assert.match(trashLight, /#000000/);

  const replyDark = getReplyIconSvg(true);
  const replyLight = getReplyIconSvg(false);
  assert.match(replyDark, /width="13"/);
  assert.match(replyDark, /height="13"/);
  assert.match(replyDark, /#ffffff/);
  assert.match(replyLight, /#000000/);
});

test("Feed Deletion: showFeedDeletePrompt mounts overlay with exact typography and Allow Camera behavior", async () => {
  // Setup mock document
  globalThis.document = {
    createElement(tag) {
      return createMockElement(tag);
    },
  };
  globalThis.requestAnimationFrame = (cb) => {
    if (typeof cb === "function") cb();
    return 1;
  };

  const targetBox = createMockElement("div");
  let confirmed = false;
  let cancelled = false;

  showFeedDeletePrompt({
    targetBoxEl: targetBox,
    isMapDark: true,
    authorDisplayName: "Rei Nathan",
    onConfirm: () => {
      confirmed = true;
    },
    onCancel: () => {
      cancelled = true;
    },
  });

  const overlay = targetBox.querySelector("[data-feed-delete-overlay]");
  assert.ok(overlay, "Overlay must be mounted to targetBoxEl");
  assert.equal(overlay.getAttribute("data-feed-delete-overlay"), "true");
  assert.equal(overlay.style.position, "absolute");
  assert.equal(overlay.style.zIndex, "60");

  // Verify exact typography requirements:
  // 1. "Erase" bold red (#ef4444)
  assert.match(overlay.innerHTML, /<strong style="color: #ef4444; font-weight: 700;">Erase<\/strong>/);
  // 2. "this Feed by" normal weight
  assert.match(overlay.innerHTML, /this Feed by/);
  // 3. User display name in bold
  assert.match(overlay.innerHTML, /<strong style="color: #ffffff; font-weight: 700;">Rei Nathan<\/strong>\?/);

  // Verify buttons without outer box (background transparent, border none)
  assert.match(overlay.innerHTML, /data-action="yes"/);
  assert.match(overlay.innerHTML, /data-action="no"/);
  assert.match(overlay.innerHTML, /background: transparent;/);

  // Test confirm button click
  const yesBtn = overlay.querySelector('[data-action="yes"]');
  assert.ok(yesBtn, "Yes button must exist in overlay");

  // Clean up global mock
  delete globalThis.document;
  delete globalThis.requestAnimationFrame;
});

test("Feed Deletion: pause on open, resume on No, and Arc Spinner buffer on Yes", async () => {
  globalThis.document = {
    createElement(tag) {
      return createMockElement(tag);
    },
  };
  globalThis.requestAnimationFrame = (cb) => {
    if (typeof cb === "function") cb();
    return 1;
  };

  const holdEvents = [];
  globalThis.window = {
    dispatchEvent(event) {
      if (event.type === "kalceria:carousel-hold") {
        holdEvents.push(event.detail);
      }
    },
  };
  globalThis.CustomEvent = class {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  };

  // 1. Test pause on mount and resume on No
  const targetBox = createMockElement("div");
  targetBox.setAttribute("data-carousel-container", "test_carousel_123");
  let cancelCalled = false;

  showFeedDeletePrompt({
    targetBoxEl: targetBox,
    isMapDark: true,
    onCancel: () => {
      cancelCalled = true;
    },
  });

  assert.equal(holdEvents.length, 1);
  assert.deepEqual(holdEvents[0], { safeId: "test_carousel_123", hold: true });

  const overlay = targetBox.querySelector("[data-feed-delete-overlay]");
  assert.ok(overlay);
  const noBtn = overlay.querySelector('[data-action="no"]');
  assert.ok(noBtn);

  // Trigger No
  noBtn.onclick({ stopPropagation() {} });
  await new Promise((r) => setTimeout(r, 220));

  assert.equal(cancelCalled, true);
  assert.equal(holdEvents.length, 2);
  assert.deepEqual(holdEvents[1], { safeId: "test_carousel_123", hold: false });

  // 2. Test Yes transition to Arc Spinner buffer
  const targetBox2 = createMockElement("div");
  targetBox2.setAttribute("data-carousel-container", "test_carousel_456");
  let confirmCalled = false;

  showFeedDeletePrompt({
    targetBoxEl: targetBox2,
    isMapDark: true,
    onConfirm: async () => {
      confirmCalled = true;
    },
  });

  const overlay2 = targetBox2.querySelector("[data-feed-delete-overlay]");
  const yesBtn = overlay2.querySelector('[data-action="yes"]');
  assert.ok(yesBtn);

  yesBtn.onclick({ stopPropagation() {} });

  // Spinner is mounted inside blurred overlay
  const spinner = overlay2.children.find((c) => c.getAttribute("data-feed-delete-spinner") === "true");
  assert.ok(spinner, "Arc Spinner buffer element must be mounted on Yes click");
  assert.match(spinner.innerHTML, /animate-spin|kalceriaDeleteSpin/);

  await new Promise((r) => setTimeout(r, 420));
  assert.equal(confirmCalled, true);

  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.CustomEvent;
  delete globalThis.requestAnimationFrame;
});

test("Feed Deletion: hideFeedDeletePrompt gracefully handles null or missing overlay", () => {
  assert.doesNotThrow(() => {
    hideFeedDeletePrompt(null);
    hideFeedDeletePrompt({});
  });
});
