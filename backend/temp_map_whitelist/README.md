# Temporary Map Email Whitelist Flag (Backend)

> **TEMPORARY MODULE — DELETE WHEN KALCERIANS MAP OPENS TO PUBLIC**

## Purpose
Temporarily restricts access to Kalcerians Map APIs (`/api/map/*`, `/api/mini-events/*`, `/api/broadcast*`, `/api/location/update`, `/api/location/visibility`, `/api/location/nearby`) to explicitly whitelisted preview emails:
- `reinathanezhekiel1@gmail.com`
- `varsikurniawan@gmail.com`

## Feature Flag Toggle
- Controlled by `TEMP_MAP_WHITELIST_ENABLED` in `config.js` (default: `true`).
- Can also be disabled without redeploying code changes by setting environment variable `TEMP_MAP_WHITELIST_ENABLED=false`.

## Complete Removal Checklist (When Map Launches Publicly)
1. Delete this entire folder: `backend/temp_map_whitelist/`
2. Remove the 2 temporary lines in `backend/routes/index.js`:
   - `import { tempMapWhitelistGuard } from "../temp_map_whitelist/requireMapWhitelist.js";`
   - `router.use([...], tempMapWhitelistGuard);`
3. Delete `backend/tests/temp_map_whitelist.test.mjs`
4. Also follow `frontend/temp_map_whitelist/README.md` to remove the frontend temporary folder.

