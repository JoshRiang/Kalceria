# Temporary Map Email Whitelist Flag (Frontend)

> **TEMPORARY MODULE — DELETE WHEN KALCERIANS MAP OPENS TO PUBLIC**

## Purpose
Temporarily gates access to the Kalcerians Users Map (`/map`) behind an email whitelist feature flag:
- `reinathanezhekiel1@gmail.com`
- `varsikurniawan@gmail.com`

### Behavior While Active (`TEMP_MAP_WHITELIST_ENABLED = true`)
1. **Landing Page (`ClosingUsersMapSection.jsx`)**:
   - Logged-out visitors and logged-in non-whitelisted users see **`COMING SOON`** on the Users Map button (non-navigable).
   - Whitelisted users (`reinathanezhekiel1@gmail.com`, `varsikurniawan@gmail.com`) see the normal **`FIND THE OTHERS`** button and enter `/map` normally.
2. **Direct `/map` Route (`frontend/app/map/page.jsx`)**:
   - Wrapped by `TempMapAccessGate` (zero edits to Tier A `MapPageClient.jsx`).
   - Verifies `/api/users/me` before mounting `<MapPageClient />`; blocks non-whitelisted / logged-out direct URL access with a Kalceria-styled **Coming Soon** screen.

## Feature Flag Toggle
- Default: `true`.
- Can be disabled cleanly via `NEXT_PUBLIC_TEMP_MAP_WHITELIST_ENABLED=false`.

## Complete Removal Checklist (When Map Launches Publicly)
1. Delete this entire folder: `frontend/temp_map_whitelist/`
2. In `frontend/app/map/page.jsx`, remove `TempMapAccessGate` wrapper and render `<MapPageClient />` directly.
3. In `frontend/components/landing/closing/ClosingUsersMapSection.jsx`, remove `useMapWhitelistAccess` and restore the unconditional `FIND THE OTHERS` button.
4. Delete `frontend/tests/temp_map_whitelist.test.mjs`.
5. Also follow `backend/temp_map_whitelist/README.md` to remove the backend temporary folder.

