/**
 * Imperative Leaflet renderer for Group Location Blend:
 * - Multi-participant converging routes with Traffic Congestion coloring (Focus Mode)
 * - Dotted walking transfer legs + solid transit legs + station/halte pins (Train & Bus)
 * - Smooth GPU RAF avatar movement ONLY when moving (100% locked when stationary)
 * - Google Maps-style 2D Dynamic Directional Triangle / Heading Cone
 */

import { formatBlendEta, haversineMeters } from "./gpsCurator";

function escapeHtml(raw) {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildBlendParticipantIconHtml(participant, { isFocused, isFocusMode, isMapDark }) {
  const color = participant.color || "#ff006e";
  const heading = Number.isFinite(Number(participant.heading)) ? Number(participant.heading) : 0;
  const avatar = participant.profilePicture
    ? escapeHtml(participant.profilePicture)
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(participant.displayName || "k")}`;
  const etaLabel = escapeHtml(
    participant.route?.eta?.label || formatBlendEta(participant.route?.durationSeconds)
  );
  const nameShort = escapeHtml(
    participant.isSelf ? "You" : String(participant.displayName || "Kawan").split(" ")[0].slice(0, 11)
  );
  const isMoving = !participant.isStationary;
  const showBigCone = isFocusMode && isFocused;
  const coneSize = showBigCone ? 104 : 74;
  const coneColor = isFocusMode && isFocused ? "#2563eb" : color;

  return `
    <div style="position:relative;width:${coneSize}px;height:${coneSize}px;display:flex;align-items:center;justify-content:center;pointer-events:auto;">
      <!-- 2D Dynamic Directional Heading Cone & Sharp Triangle (rotates smoothly with bearing/compass) -->
      <div class="blend-heading-cone" style="position:absolute;inset:0;transform:rotate(${heading}deg);transition:transform 0.35s linear;pointer-events:none;display:flex;align-items:flex-start;justify-content:center;">
        <svg viewBox="0 0 100 100" width="${coneSize}" height="${coneSize}" style="overflow:visible;">
          <defs>
            <linearGradient id="coneGrad_${escapeHtml(participant.userId)}" x1="50%" y1="50%" x2="50%" y2="0%">
              <stop offset="0%" stop-color="${coneColor}" stop-opacity="${showBigCone ? "0.55" : "0.35"}" />
              <stop offset="100%" stop-color="${coneColor}" stop-opacity="0" />
            </linearGradient>
          </defs>
          <!-- Soft 2D FOV Beam -->
          <path d="M50 50 L24 ${showBigCone ? 4 : 16} A46 46 0 0 1 76 ${showBigCone ? 4 : 16} Z" fill="url(#coneGrad_${escapeHtml(participant.userId)})" />
          <!-- Crisp 2D Navigation Arrow Triangle Tip -->
          <polygon points="50,${showBigCone ? 8 : 16} 41,${showBigCone ? 24 : 29} 59,${showBigCone ? 24 : 29}" fill="${coneColor}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" />
        </svg>
      </div>

      <!-- Moving Pulse Halo (ONLY animates when actively moving; completely still when stationary!) -->
      ${
        isMoving
          ? `<span style="position:absolute;width:${showBigCone ? 48 : 38}px;height:${showBigCone ? 48 : 38}px;border-radius:9999px;border:2.5px solid ${color};opacity:0.55;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;pointer-events:none;"></span>`
          : ""
      }

      <!-- Live Avatar Medallion -->
      <div style="position:relative;z-index:2;width:${showBigCone ? 40 : 34}px;height:${showBigCone ? 40 : 34}px;border-radius:9999px;overflow:hidden;border:3px solid ${showBigCone ? "#2563eb" : color};background:#0a0e27;box-shadow:0 4px 14px rgba(0,0,0,0.45);">
        <img src="${avatar}" alt="${nameShort}" style="width:100%;height:100%;object-fit:cover;display:block;" />
      </div>

      <!-- Compact Live Name + ETA Pill -->
      <div style="position:absolute;z-index:3;bottom:${showBigCone ? -10 : -8}px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:2px 7px;border-radius:9999px;font-family:system-ui,-apple-system,sans-serif;font-size:10px;font-weight:800;letter-spacing:-0.01em;background:${isMapDark ? "rgba(10,14,39,0.92)" : "rgba(255,255,255,0.95)"};color:${isMapDark ? "#ffffff" : "#0f172a"};border:1.5px solid ${showBigCone ? "#2563eb" : color};box-shadow:0 3px 10px rgba(0,0,0,0.28);">
        ${nameShort} · ${etaLabel}
      </div>
    </div>
  `;
}

export function createBlendMapRenderer() {
  let routesLayer = null;
  let stopsLayer = null;
  let avatarsLayer = null;
  const markerMap = new Map(); // userId -> { marker, animFrame, lastHtml, lat, lng }

  function ensureLayers(map, L) {
    if (!routesLayer) routesLayer = L.layerGroup().addTo(map);
    if (!stopsLayer) stopsLayer = L.layerGroup().addTo(map);
    if (!avatarsLayer) avatarsLayer = L.layerGroup().addTo(map);
  }

  function animateMarkerSmooth(entry, targetLat, targetLng, isStationary) {
    if (entry.animFrame) {
      cancelAnimationFrame(entry.animFrame);
      entry.animFrame = null;
    }
    const cur = entry.marker.getLatLng();
    const dist = haversineMeters(cur.lat, cur.lng, targetLat, targetLng);

    // Strictly stationary or tiny jitter -> NEVER glide/wobble!
    if (isStationary || dist < 3 || dist > 8000) {
      if (dist >= 3) {
        entry.marker.setLatLng([targetLat, targetLng]);
        entry.lat = targetLat;
        entry.lng = targetLng;
      }
      return;
    }

    const startLat = cur.lat;
    const startLng = cur.lng;
    const startTime = performance.now();
    const durationMs = 850;

    const step = (now) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const ease = 1 - Math.pow(1 - t, 3);
      const lat = startLat + (targetLat - startLat) * ease;
      const lng = startLng + (targetLng - startLng) * ease;
      entry.marker.setLatLng([lat, lng]);
      if (t < 1) {
        entry.animFrame = requestAnimationFrame(step);
      } else {
        entry.animFrame = null;
        entry.lat = targetLat;
        entry.lng = targetLng;
      }
    };
    entry.animFrame = requestAnimationFrame(step);
  }

  function render({ map, L, blend, isFocusMode, focusedUserId, isMapDark, onSelectParticipant }) {
    if (!map || !L) return;
    if (!blend?.isJoined || !Array.isArray(blend.participants) || blend.participants.length === 0) {
      clear(map);
      return;
    }

    ensureLayers(map, L);
    routesLayer.clearLayers();
    stopsLayer.clearLayers();

    const activeUserIds = new Set();

    // 1. Draw Routes + Traffic Congestion + Dotted Transit Transfers & Stop Pins
    for (const p of blend.participants) {
      const uid = String(p.userId);
      const isFocused = String(focusedUserId) === uid;
      const route = p.route;

      if (route && Array.isArray(route.segments)) {
        for (const seg of route.segments) {
          if (!Array.isArray(seg.points) || seg.points.length < 2) continue;
          const isWalk = Boolean(seg.dashed || seg.kind === "walk");
          const useTrafficColor = isFocusMode && isFocused;
          const strokeColor = useTrafficColor
            ? seg.color || p.color
            : seg.kind === "train" || seg.kind === "bus"
            ? seg.color
            : isWalk && (p.transportMode === "train" || p.transportMode === "bus")
            ? "#64748b"
            : p.color;
          const weight = isFocusMode ? (isFocused ? 6 : 3.5) : 4.5;
          const opacity = isFocusMode ? (isFocused ? 0.96 : 0.42) : 0.85;

          // Subtle contrast casing beneath solid lines in Focus Mode
          if (useTrafficColor && !isWalk) {
            L.polyline(seg.points, {
              color: isMapDark ? "#050a14" : "#ffffff",
              weight: weight + 3.5,
              opacity: 0.78,
              lineCap: "round",
              lineJoin: "round",
              interactive: false,
            }).addTo(routesLayer);
          }

          L.polyline(seg.points, {
            color: strokeColor,
            weight,
            opacity,
            dashArray: isWalk ? "6, 9" : undefined,
            lineCap: "round",
            lineJoin: "round",
            interactive: false,
          }).addTo(routesLayer);
        }
      }

      // Transit Station / Bus Halte Nodes (Train & Bus)
      if (route && Array.isArray(route.stops) && route.stops.length > 0 && (!isFocusMode || isFocused)) {
        for (const st of route.stops) {
          if (!Number.isFinite(st.lat) || !Number.isFinite(st.lng)) continue;
          const isRail = st.kind === "train";
          const marker = L.circleMarker([st.lat, st.lng], {
            radius: st.role === "intermediate" ? 4.5 : 6.5,
            color: "#ffffff",
            weight: 2,
            fillColor: isRail ? "#8b5cf6" : "#0ea5e9",
            fillOpacity: 1,
          }).addTo(stopsLayer);
          marker.bindTooltip(`${isRail ? "🚆" : "🚌"} ${st.name}`, {
            direction: "top",
            offset: [0, -6],
          });
        }
      }

      // 2. Reconcile Dynamic Moving Blend Avatars + 2D Directional Cone
      if (Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))) {
        activeUserIds.add(uid);
        const coneSize = isFocusMode && isFocused ? 104 : 74;
        const html = buildBlendParticipantIconHtml(p, { isFocused, isFocusMode, isMapDark });
        const icon = L.divIcon({
          className: "kalceria-blend-avatar-icon",
          html,
          iconSize: [coneSize, coneSize],
          iconAnchor: [coneSize / 2, coneSize / 2],
        });

        const existing = markerMap.get(uid);
        if (existing) {
          animateMarkerSmooth(existing, Number(p.lat), Number(p.lng), Boolean(p.isStationary));
          if (existing.lastHtml !== html) {
            existing.marker.setIcon(icon);
            existing.lastHtml = html;
          }
          existing.marker.setZIndexOffset(isFocused ? 1600 : 1200);
        } else {
          const marker = L.marker([Number(p.lat), Number(p.lng)], {
            icon,
            zIndexOffset: isFocused ? 1600 : 1200,
          }).addTo(avatarsLayer);
          marker.on("click", () => onSelectParticipant?.(uid));
          markerMap.set(uid, {
            marker,
            animFrame: null,
            lastHtml: html,
            lat: Number(p.lat),
            lng: Number(p.lng),
          });
        }
      }
    }

    // Prune participants who left the Blend
    for (const [uid, entry] of markerMap.entries()) {
      if (!activeUserIds.has(uid)) {
        if (entry.animFrame) cancelAnimationFrame(entry.animFrame);
        try {
          avatarsLayer?.removeLayer(entry.marker);
        } catch {}
        markerMap.delete(uid);
      }
    }
  }

  function clear(map) {
    for (const entry of markerMap.values()) {
      if (entry.animFrame) cancelAnimationFrame(entry.animFrame);
    }
    markerMap.clear();
    if (routesLayer) {
      routesLayer.clearLayers();
      if (map) try { map.removeLayer(routesLayer); } catch {}
      routesLayer = null;
    }
    if (stopsLayer) {
      stopsLayer.clearLayers();
      if (map) try { map.removeLayer(stopsLayer); } catch {}
      stopsLayer = null;
    }
    if (avatarsLayer) {
      avatarsLayer.clearLayers();
      if (map) try { map.removeLayer(avatarsLayer); } catch {}
      avatarsLayer = null;
    }
  }

  return { render, clear };
}

