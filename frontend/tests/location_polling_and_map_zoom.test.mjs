import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  OSM_SUBDOMAINS,
  hasValidCoordinates,
  latLngToTileXY,
} from "../lib/osmTilePrewarmer.js";
import {
  DEFAULT_CENTER,
  getInstantInitialCenter,
  stripDynamicUptime,
  tickAllEventUptimeElements,
} from "../components/snapmap/snapMapHelpers.js";

test("Map Coordinates, Mercator Tile Math, Initial Center Priority & 24h Broadcast Auto-Purge (Real Runtime)", async (t) => {
  await t.test("hasValidCoordinates accepts real Indonesian coords and rejects null-island/NaN/out-of-bounds", () => {
    assert.equal(hasValidCoordinates(-6.2088, 106.8456), true);
    assert.equal(hasValidCoordinates("-7.7956", "110.3695"), true);
    assert.equal(hasValidCoordinates(0, 0), false, "Null-island (0,0) must be rejected");
    assert.equal(hasValidCoordinates(null, 106.8), false);
    assert.equal(hasValidCoordinates("", 106.8), false);
    assert.equal(hasValidCoordinates(true, 106.8), false);
    assert.equal(hasValidCoordinates(95, 106.8), false);
    assert.equal(hasValidCoordinates(-6.2, 185), false);
  });

  await t.test("latLngToTileXY computes bounded Mercator tiles & deterministic OSM shard distribution", () => {
    assert.deepEqual(OSM_SUBDOMAINS, ["a", "b", "c"]);
    const jkt = latLngToTileXY(-6.2088, 106.8456, 15);
    assert.ok(jkt.x >= 26000 && jkt.x <= 26200, `Unexpected Jakarta x tile: ${jkt.x}`);
    assert.ok(jkt.y >= 16900 && jkt.y <= 17050, `Unexpected Jakarta y tile: ${jkt.y}`);

    // Extreme poles must clamp cleanly without NaN or overflow
    const pole = latLngToTileXY(89.9, 179.9, 10);
    assert.ok(Number.isInteger(pole.x) && pole.x >= 0 && pole.x < 1024);
    assert.ok(Number.isInteger(pole.y) && pole.y >= 0 && pole.y < 1024);
  });

  await t.test("getInstantInitialCenter prioritizes per-user cached GPS -> domicile -> DEFAULT_CENTER and ignores corrupt storage", () => {
    const origWindow = globalThis.window;
    const origStorage = globalThis.localStorage;
    const store = new Map();
    globalThis.window = {};
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    };

    try {
      // 1. Fallback to DEFAULT_CENTER when user has no coords
      assert.deepEqual(getInstantInitialCenter(null), DEFAULT_CENTER);

      // 2. Domicile coordinates used when no cached GPS exists
      assert.deepEqual(
        getInstantInitialCenter({ id: "u1", domicileLat: -6.9175, domicileLng: 107.6191 }),
        [-6.9175, 107.6191]
      );

      // 3. Per-user cached GPS overrides domicile
      store.set("kalceria_last_known_coords_u1", JSON.stringify({ lat: -7.2575, lng: 112.7521 }));
      assert.deepEqual(
        getInstantInitialCenter({ id: "u1", domicileLat: -6.9175, domicileLng: 107.6191 }),
        [-7.2575, 112.7521]
      );

      // 4. Corrupt or out-of-range cached GPS safely falls back to domicile
      store.set("kalceria_last_known_coords_u1", JSON.stringify({ lat: 999, lng: 106.8 }));
      assert.deepEqual(
        getInstantInitialCenter({ id: "u1", domicileLat: -6.9175, domicileLng: 107.6191 }),
        [-6.9175, 107.6191]
      );
    } finally {
      globalThis.window = origWindow;
      globalThis.localStorage = origStorage;
    }
  });

  await t.test("stripDynamicUptime normalizes DOM snapshots & tickAllEventUptimeElements auto-purges expired 24h broadcasts", () => {
    const normalized = stripDynamicUptime(
      '<span data-event-uptime="1700000000000">2h 14m 09s</span><span data-broadcast-uptime="1700000000000">45m</span>'
    );
    assert.ok(normalized.includes(">0h 00m 00s</span>"));
    assert.ok(normalized.includes(">0m</span>"));

    const origDocument = globalThis.document;
    const origWindow = globalThis.window;
    const origCustomEvent = globalThis.CustomEvent;
    const dispatched = [];
    const activeBroadcastBox = { parentElement: {}, style: { display: "block" } };
    const expiredBroadcastBox = { parentElement: {}, style: { display: "block" } };

    const activeNode = {
      textContent: "",
      getAttribute: (name) => (name === "data-broadcast-uptime" ? String(Date.now() - 90 * 60 * 1000) : "u_active"),
      closest: () => activeBroadcastBox,
    };
    const expiredNode = {
      textContent: "",
      getAttribute: (name) => (name === "data-broadcast-uptime" ? String(Date.now() - 25 * 60 * 60 * 1000) : "u_expired"),
      closest: () => expiredBroadcastBox,
    };

    globalThis.CustomEvent = class MockCustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    };
    globalThis.window = {
      dispatchEvent: (ev) => dispatched.push(ev),
    };
    globalThis.document = {
      querySelectorAll: (sel) => (sel === "[data-broadcast-uptime]" ? [activeNode, expiredNode] : []),
    };

    try {
      tickAllEventUptimeElements();
      assert.equal(activeNode.textContent, "1h 30m");
      assert.equal(activeBroadcastBox.style.display, "block");
      assert.equal(expiredBroadcastBox.style.display, "none", "Broadcast older than 24h must auto-hide");
      assert.equal(dispatched.length, 1);
      assert.equal(dispatched[0].type, "kalceria:purge-expired-broadcast");
      assert.equal(dispatched[0].detail.userId, "u_expired");
    } finally {
      globalThis.document = origDocument;
      globalThis.window = origWindow;
      globalThis.CustomEvent = origCustomEvent;
    }
  });
});

test("Location Polling & Mobile Overlay Protection (Hook Wiring Invariants)", async (t) => {
  await t.test("useEagerGeolocation guards against camera redirect when popup is open or startup finished", () => {
    const content = fs.readFileSync(path.resolve("frontend/components/map/mapPage/useEagerGeolocation.js"), "utf8");
    assert.ok(content.includes("!hasInitialCenteredRef?.current"));
    assert.ok(content.includes("showStartup"));
    assert.ok(content.includes(".event-tactical-popup") && content.includes(".broadcast-popup-box"));
  });

  await t.test("useLiveLocationSync protects camera viewport and active popups during periodic keepalive", () => {
    const content = fs.readFileSync(path.resolve("frontend/components/map/mapPage/useLiveLocationSync.js"), "utf8");
    assert.ok(content.includes(".event-tactical-popup") && content.includes(".broadcast-popup-box"));
    assert.ok(content.includes("!hasInitialCenteredRef?.current"));
    assert.ok(content.includes("showStartup]"));
  });

  await t.test("useMapViewport guards handleMapReady and recenter with hasInitialCenteredRef", () => {
    const content = fs.readFileSync(path.resolve("frontend/components/map/mapPage/useMapViewport.js"), "utf8");
    assert.ok(content.includes("dragstart") && content.includes("zoomstart"));
    assert.ok(content.includes("!hasInitialCenteredRef?.current"));
  });

  await t.test("useSnapMapInit enforces O(1) bounded tile rendering and rate-limit defense", () => {
    const content = fs.readFileSync(path.resolve("frontend/components/snapmap/useSnapMapInit.js"), "utf8");
    assert.ok(content.includes("minZoom:") && content.includes("keepBuffer:"));
    assert.ok(content.includes("basemaps.cartocdn.com") || content.includes("_hasFallenBackCdn"));
    assert.ok(content.includes("ResizeObserver"));
  });

  await t.test("useSnapMapIdleTimer protects delete prompt overlay from idle collapse", () => {
    const content = fs.readFileSync(path.resolve("frontend/components/snapmap/useSnapMapIdleTimer.js"), "utf8");
    assert.ok(content.includes("data-feed-delete-overlay"));
  });
});
