# Production Multi-Profile OSRM Backend — Pulau Jawa Extract ONLY
# Supports: foot (default), car, and custom Java motorcycle (no-toll) profile
# Uses MLD (Multi-Level Dijkstra) for low RAM footprint & fast Java-island routing.

FROM ghcr.io/project-osrm/osrm-backend:v5.27.1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/osrm-java

COPY profiles/motorcycle.lua /opt/osrm-java/profiles/motorcycle.lua
COPY scripts/prepare-java-osrm.sh /opt/osrm-java/scripts/prepare-java-osrm.sh
RUN chmod +x /opt/osrm-java/scripts/prepare-java-osrm.sh

ENV OSRM_PROFILE=foot
ENV OSRM_PORT=5000
ENV OSRM_DATA_DIR=/data
ENV JAVA_PBF_URL=https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf

VOLUME ["/data"]
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${OSRM_PORT}/route/v1/driving/106.8271,-6.1754;106.8456,-6.2088?overview=false" || exit 1

ENTRYPOINT ["/opt/osrm-java/scripts/prepare-java-osrm.sh"]

