import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { animateViewCountSlideDown } from "../components/map/eventPopup/popupCountAnimation.js";

// Mock minimal browser environment for testing DOM animation logic
function createMockSpan(initialText = "0") {
  const listeners = {};
  const children = [];
  return {
    textContent: initialText,
    innerHTML: initialText,
    style: {},
    children,
    appendChild(child) {
      children.push(child);
    },
    querySelector(selector) {
      if (children.length === 0) return null;
      if (selector === "span:last-child") return children[children.length - 1];
      return null;
    },
  };
}

test("Popup View Count Animation & Realtime Count Up Verification", async (t) => {
  await t.test("popupCountAnimation exports animateViewCountSlideDown function cleanly", () => {
    assert.equal(typeof animateViewCountSlideDown, "function");
  });

  await t.test("animateViewCountSlideDown builds outgoing and incoming sliding spans when target > current", () => {
    const origWindow = globalThis.window;
    const origDocument = globalThis.document;
    const origRAF = globalThis.requestAnimationFrame;

    globalThis.window = {};
    globalThis.document = {
      createElement(tag) {
        return {
          tagName: tag.toUpperCase(),
          textContent: "",
          style: {},
        };
      },
    };
    globalThis.requestAnimationFrame = (cb) => {
      // immediate mock
      cb();
      return 1;
    };

    try {
      const mockEl = createMockSpan("1");
      animateViewCountSlideDown(mockEl, 2);

      // Verify container styling was applied
      assert.equal(mockEl.style.overflow, "hidden");
      assert.equal(mockEl.style.position, "relative");
      assert.equal(mockEl.style.display, "inline-flex");
      assert.equal(mockEl.style.height, "14px");

      // Verify two spans were appended (outgoing and incoming)
      assert.equal(mockEl.children.length, 2);
      const outgoing = mockEl.children[0];
      const incoming = mockEl.children[1];

      assert.equal(outgoing.textContent, "1");
      assert.equal(incoming.textContent, "2");

      // Verify GPU-accelerated transition properties
      assert.ok(outgoing.style.transition.includes("transform"));
      assert.ok(incoming.style.transition.includes("transform"));
      assert.equal(outgoing.style.transform, "translateY(100%)");
      assert.equal(incoming.style.transform, "translateY(0%)");
      assert.equal(outgoing.style.opacity, "0");
      assert.equal(incoming.style.opacity, "1");
    } finally {
      globalThis.window = origWindow;
      globalThis.document = origDocument;
      globalThis.requestAnimationFrame = origRAF;
    }
  });

  await t.test("animateViewCountSlideDown updates text directly without animation when target <= current", () => {
    const origWindow = globalThis.window;
    const origDocument = globalThis.document;

    globalThis.window = {};
    globalThis.document = {};

    try {
      const mockEl = createMockSpan("5");
      animateViewCountSlideDown(mockEl, 5);
      assert.equal(mockEl.textContent, "5");
      assert.equal(mockEl.children.length, 0, "No child spans created when target equals current");

      animateViewCountSlideDown(mockEl, 3);
      assert.equal(mockEl.textContent, "3");
      assert.equal(mockEl.children.length, 0, "No child spans created when target is less than current");
    } finally {
      globalThis.window = origWindow;
      globalThis.document = origDocument;
    }
  });

  await t.test("useSnapMapGlobalCallbacks wires api.post with CSRF/auth for broadcast views while keeping purged event media views removed", () => {
    const filePath = path.resolve("frontend/components/snapmap/useSnapMapGlobalCallbacks.js");
    const content = fs.readFileSync(filePath, "utf8");

    // Must import api from "@/lib/api" and animateViewCountSlideDown
    assert.ok(content.includes('import api from "@/lib/api";'), "Must import api client");
    assert.ok(content.includes("animateViewCountSlideDown"), "Must import and use animateViewCountSlideDown");

    // Must use api.post for broadcast view with bcast_ normalization & cooldown (event media views purged in bce3d77)
    assert.ok(
      content.includes("api.post(`/broadcast/"),
      "Must use api.post with csrf/cookie auth for broadcast view"
    );
    assert.ok(
      content.includes('replace(/^bcast_/, "")'),
      "Must normalize bcast_ prefix before recording broadcast view"
    );
    assert.ok(
      !content.includes("api.post(`/mini-events/"),
      "Event Popup media views must stay purged per commit bce3d77"
    );

    // Must NOT contain permanent Set blocking repeated views
    assert.ok(
      !content.includes("const recordedMediaSession = new Set();"),
      "Must not permanently lock media views with recordedMediaSession Set"
    );
    assert.ok(
      !content.includes("const recordedBroadcastSession = new Set();"),
      "Must not permanently lock broadcast views with recordedBroadcastSession Set"
    );
  });
});
