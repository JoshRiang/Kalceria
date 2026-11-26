/**
 * Pure High-Precision GPS Curation Engine (Kalman Filter + Stationary Lock + Bearing Smoothing)
 * & Group Location Blend Helpers.
 *
 * Zero React or `@/` imports so Gate 3b (`node --test`) verifies directly.
 */

export const BLEND_TRANSPORT_MODES = Object.freeze([
  { id: "foot", label: "Foot", short: "Jalan" },
  { id: "motorcycle", label: "Motor", short: "Motor" },
  { id: "car", label: "Car", short: "Mobil" },
  { id: "bus", label: "Bus", short: "Bus" },
  { id: "train", label: "Train", short: "Kereta" },
]);

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeBearingDegrees(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lng2 - lng1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const deg = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Number.isFinite(deg) ? Number(deg.toFixed(1)) : 0;
}

export function smoothAngleDegrees(prevDeg, nextDeg, alpha = 0.35) {
  if (!Number.isFinite(prevDeg)) return ((Number(nextDeg) || 0) + 360) % 360;
  if (!Number.isFinite(nextDeg)) return ((Number(prevDeg) || 0) + 360) % 360;
  const diff = ((((nextDeg - prevDeg) % 360) + 540) % 360) - 180;
  return Number((((prevDeg + diff * alpha) % 360) + 360) % 360);
}

export function createGpsCuratorState() {
  return {
    initialized: false,
    lat: null,
    lng: null,
    variance: 400, // meters^2
    heading: 0,
    speed: 0,
    accuracy: 50,
    isStationary: true,
    timestamp: 0,
  };
}

/**
 * Curates a raw browser Geolocation fix using a 4-stage Zenly/Google-Maps-style pipeline:
 * 1. Accuracy & teleport outlier rejection
 * 2. Stationary deadband lock (zero jitter when standing still)
 * 3. 2D accuracy-weighted Kalman smoothing
 * 4. Circular bearing / heading low-pass filtering
 */
export function curateGpsFix(state, rawFix) {
  const lat = Number(rawFix?.lat);
  const lng = Number(rawFix?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return state;
  }

  const now = Number(rawFix?.timestamp) || Date.now();
  const rawAcc = Number(rawFix?.accuracy);
  const accuracy = Number.isFinite(rawAcc) && rawAcc > 0 ? Math.min(2500, Math.max(3, rawAcc)) : 25;
  const rawSpeed = Number(rawFix?.speed);
  const rawHeading = Number(rawFix?.heading);

  if (!state?.initialized) {
    return {
      initialized: true,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      variance: accuracy * accuracy,
      heading: Number.isFinite(rawHeading) && rawHeading >= 0 ? Number((rawHeading % 360).toFixed(1)) : 0,
      speed: Number.isFinite(rawSpeed) && rawSpeed >= 0 ? Number(rawSpeed.toFixed(2)) : 0,
      accuracy: Math.round(accuracy),
      isStationary: !(Number.isFinite(rawSpeed) && rawSpeed >= 0.8),
      timestamp: now,
    };
  }

  const dtSec = Math.max(0.25, (now - (state.timestamp || now)) / 1000);
  const distMeters = haversineMeters(state.lat, state.lng, lat, lng);
  const derivedSpeed = distMeters / dtSec;
  const effectiveSpeed =
    Number.isFinite(rawSpeed) && rawSpeed >= 0 ? rawSpeed : derivedSpeed;

  // Stage 1: Reject coarse IP/cell-tower outlier spikes once a decent GNSS fix is locked
  const hasGoodLock = state.variance <= 1600; // <= 40m std dev
  if (hasGoodLock && accuracy > 180 && distMeters > 120) {
    return { ...state, timestamp: now };
  }
  if (hasGoodLock && distMeters > 300 && derivedSpeed > 65 && accuracy > 60) {
    return { ...state, timestamp: now };
  }

  // Stage 2: Stationary Deadband Lock — if user is standing still, lock coordinates strictly!
  const deadbandMeters = Math.max(7, Math.min(22, accuracy * 0.45));
  if (effectiveSpeed < 0.65 && distMeters < deadbandMeters) {
    // Allow accuracy variance refinement only when new reading is significantly sharper
    const improvedVariance =
      accuracy * accuracy < state.variance ? Math.max(accuracy * accuracy, state.variance * 0.85) : state.variance;
    return {
      ...state,
      variance: improvedVariance,
      accuracy: Math.round(Math.min(state.accuracy, accuracy)),
      speed: 0,
      isStationary: true,
      timestamp: now,
    };
  }

  // Stage 3: 2D Accuracy-Weighted Kalman Filter Update
  const processQ = dtSec * 9.0; // (3 m/s)^2 dynamic process noise
  const predictedVariance = state.variance + processQ;
  const clampedAcc = Math.max(4, Math.min(120, accuracy));
  const measVariance = clampedAcc * clampedAcc;
  const kGain = predictedVariance / (predictedVariance + measVariance);

  const nextLat = Number((state.lat + kGain * (lat - state.lat)).toFixed(6));
  const nextLng = Number((state.lng + kGain * (lng - state.lng)).toFixed(6));
  const nextVariance = Math.max(9, (1 - kGain) * predictedVariance);

  // Stage 4: Circular Heading Low-Pass Smoothing
  let nextHeading = state.heading || 0;
  if (Number.isFinite(rawHeading) && rawHeading >= 0 && effectiveSpeed >= 0.8) {
    nextHeading = smoothAngleDegrees(state.heading, rawHeading, 0.45);
  } else if (distMeters >= 6) {
    const moveBearing = computeBearingDegrees(state.lat, state.lng, nextLat, nextLng);
    nextHeading = smoothAngleDegrees(state.heading, moveBearing, 0.4);
  }

  return {
    initialized: true,
    lat: nextLat,
    lng: nextLng,
    variance: nextVariance,
    heading: Number(nextHeading.toFixed(1)),
    speed: Number(Math.max(0, effectiveSpeed).toFixed(2)),
    accuracy: Math.round(accuracy),
    isStationary: false,
    timestamp: now,
  };
}

export function formatBlendEta(durationSeconds) {
  const sec = Math.max(0, Math.round(Number(durationSeconds) || 0));
  if (sec < 45) return "Tiba";
  const totalMin = Math.max(1, Math.round(sec / 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h} jam ${m} mnt`;
  if (h > 0) return `${h} jam`;
  return `${m} mnt`;
}

export function formatBlendDistance(meters) {
  const m = Math.max(0, Math.round(Number(meters) || 0));
  if (m >= 1000) return `${(Math.round(m / 100) / 10).toFixed(1)} km`;
  return `${m} m`;
}

export function cycleFocusIndex(total, currentIndex, delta) {
  if (!total || total <= 0) return 0;
  return (((currentIndex + delta) % total) + total) % total;
}

