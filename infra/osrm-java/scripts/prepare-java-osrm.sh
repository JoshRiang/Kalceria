#!/usr/bin/env bash
set -euo pipefail

PROFILE="${OSRM_PROFILE:-foot}"
PORT="${OSRM_PORT:-5000}"
DATA_DIR="${OSRM_DATA_DIR:-/data}"
PBF_URL="${JAVA_PBF_URL:-https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf}"

mkdir -p "${DATA_DIR}/${PROFILE}"
PBF_FILE="${DATA_DIR}/java-latest.osm.pbf"
OSRM_BASE="${DATA_DIR}/${PROFILE}/java-${PROFILE}.osrm"

case "${PROFILE}" in
  foot)
    LUA_PROFILE="/opt/foot.lua"
    ;;
  car)
    LUA_PROFILE="/opt/car.lua"
    ;;
  motorcycle)
    LUA_PROFILE="/opt/osrm-java/profiles/motorcycle.lua"
    ;;
  *)
    echo "[OSRM-Java] Unsupported OSRM_PROFILE=${PROFILE}. Use foot, car, or motorcycle." >&2
    exit 1
    ;;
esac

if [ ! -f "${PBF_FILE}" ]; then
  echo "[OSRM-Java] Downloading Java-island OSM extract (Pulau Jawa only)..."
  curl -fSL "${PBF_URL}" -o "${PBF_FILE}.tmp"
  mv "${PBF_FILE}.tmp" "${PBF_FILE}"
fi

if [ ! -f "${OSRM_BASE}.mldgr" ]; then
  echo "[OSRM-Java] Building MLD routing graph for profile=${PROFILE}..."
  ln -sf "${PBF_FILE}" "${DATA_DIR}/${PROFILE}/java-${PROFILE}.osm.pbf"
  osrm-extract -p "${LUA_PROFILE}" "${DATA_DIR}/${PROFILE}/java-${PROFILE}.osm.pbf"
  osrm-partition "${OSRM_BASE}"
  osrm-customize "${OSRM_BASE}"
  echo "[OSRM-Java] Build complete for profile=${PROFILE}."
fi

echo "[OSRM-Java] Starting osrm-routed (profile=${PROFILE}, port=${PORT}, algorithm=mld)..."
exec osrm-routed --algorithm mld --port "${PORT}" --max-viaroute-size 25 --max-table-size 50 "${OSRM_BASE}"

