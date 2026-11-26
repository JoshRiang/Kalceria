# Kalceria OSRM Stack — Pulau Jawa Extract (Foot, Motorcycle, Car)

Lightweight Docker stack scoped strictly to **Pulau Jawa** (`java-latest.osm.pbf` from Geofabrik) using OSRM's Multi-Level Dijkstra (`mld`) pipeline so it stays compact and fast on modest VPS / container hosts.

## Included Profiles
1. `foot` (`:5001`) — Default pedestrian routing for Group Location Blend & transit walking transfers.
2. `motorcycle` (`:5002`) — Custom Indonesian `motorcycle.lua` (left-hand traffic, excludes toll roads `motorway` / `toll=yes`).
3. `car` (`:5003`) — Standard car routing.

## Quick Start
```bash
cd infra/osrm-java
docker compose up -d --build
```
The first startup downloads `java-latest.osm.pbf` once into the shared `java_osrm_data` volume and builds the MLD graphs automatically.

## Backend Environment Variables
Point Kalceria Backend to your running OSRM stack (optional — backend automatically combines TomTom Traffic Routing + public OSRM + free Transitous/Overpass transit fallbacks when self-hosted URLs are omitted):
```env
OSRM_FOOT_URL=https://osrm-foot.yourdomain.com
OSRM_MOTO_URL=https://osrm-moto.yourdomain.com
OSRM_CAR_URL=https://osrm-car.yourdomain.com
TOMTOM_API_KEY=<your-tomtom-key>
```

