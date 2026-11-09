# KALCERIA END-TO-END TEST SPECIFICATION & VERIFICATION MATRIX (TEST.MD)
**Execution Level**: Claude Opus 5.5 / Sonnet 5.5 & Gemini 4 Argon Tier  
**Mandate Reference**: AGENTS.md Protocol — Zero Regression, Anti-Torn State, Silent Verification

---

## 1. Executive Summary & Verification Gates
This document defines the complete testing specification across Kalceria's frontend and backend systems. Every feature is audited against concurrency, atomicity, regression, and hardware/environmental constraints.

### Silent Automated Verification Commands
```powershell
# 1. TypeScript Zero-Error Gate
npx tsc --noEmit -p frontend/tsconfig.json

# 2. Backend Syntax & Integrity Gate
npm --prefix backend run build

# 3. Core Automated Unit & Regression Test Suites
node --test backend/tests/auth_vertical_slice.test.mjs
node --test backend/tests/ingress_security_defense.test.mjs
node --test backend/tests/event_media_clips.test.mjs
node --test backend/tests/google_oauth_and_city_resolution.test.mjs
node --test backend/tests/service_location_validation.test.mjs
node --test backend/tests/mini_event_and_cleanup.test.mjs
node --test backend/tests/chat_o1_scalability_slice.test.mjs
node --test backend/tests/chat_call_bi_devices_slice.test.mjs
node --test backend/tests/prisma_connection_pool.test.mjs

# 3b. Frontend Golden-Master Pure Modules Gate
node --test frontend/tests/pure_modules_golden.test.mjs frontend/tests/modularity_harness.test.mjs

# 3c. Modularity & Hook Conservation Gate (Ratchet Active)
node scripts/audit/modularity-audit.mjs --check

# 4. Next.js Production Build Gate
npm --prefix frontend run build
```

---

## 2. Comprehensive Test Matrices by Subsystem

### Test Suite 1: Authentication, Registration & Age/City Validation
| Test ID | Feature / Case | Input / Trigger | Expected Result | Regression / Edge Case Check |
|---|---|---|---|---|
| `AUTH-01` | Register (Age Verification) | Birthdate < 18 years | Immediate client block + backend 400 rejection: Age must be ≥ 18. | Strict year parsing without timezone drift. |
| `AUTH-02` | Register (City Resolution) | Indonesian city name input | Fuzzy match against catalog (e.g. "Jakarta" -> `[-6.2088, 106.8456]`). Unknown cities gracefully fallback. | Backend rejects invalid coordinates outside Indonesian bounding box. |
| `AUTH-03` | Anti-Torn Registration | Step 1 Form Submit -> Close Tab before OTP | Redis holds temporary pending payload; PostgreSQL contains **0 rows** until OTP & chosen username verified. | Zero zombie records in production DB. |
| `AUTH-04` | Google OAuth Login | Google popup sign-in | Seamless callback, non-torn profile generation, cookie + csrfToken emission. | Preserves existing user ID if email matches. |
| `AUTH-05` | Email & Password Login | Registered email + valid argon2 password | JWT session cookie set, `users/me` returns HTTP 200, Welcome transition renders nickname. | Case-insensitive email normalization. |
| `AUTH-06` | **Strict Map vs Landing Password Reset State Machine** | Test both origin flows with real credentials | **Flow A (Landing)**: Guest -> forgot-password -> link sent -> reset password -> login lagi -> fades into Landing Page.<br>**Flow B (Map)**: Auth user -> Edit Profile -> Change Password -> prefills logged-in email -> link sent -> reset password -> login lagi -> returns directly to `/map` (intro bypassed). | **Zero collision**: Landing flow never ends up in Map; Map flow never forces intro replay. |
| `AUTH-07` | **Normal Login Preservation (Zero Map Interception)** | Normal login from Landing Page (`/` or `/?auth=true`) with email + password | Welcome transition completes -> **Gracefully fades into Landing Page (`setPhase("landing")`)**. **NEVER redirects to `/map`**. | Storage isolation: Stale map return flags in browser storage are proactively purged; only explicit map password reset (`is_password_reset_login === true && isFromMapReset === true`) can ever route to `/map`. |

---

### Test Suite 2: Password Reset Routing, Profile Danger Zone & Delete Account
| Test ID | Feature / Case | Input / Trigger | Expected Result | Destination Verification |
|---|---|---|---|---|
| `PWD-01` | **Reset originating from Landing Page** | Click "Forgot Password" on `/` -> Open magic link -> Enter new password -> Save & Log in | Welcome transition completes -> **Gracefully fades into Landing Page (`setPhase("landing")`)**. | **MUST NOT** jump to `/map`. Query params cleared. |
| `PWD-02` | **Reset originating from User Map** | Edit Profile modal -> Click "Change Password" -> Prefills email immediately -> Open magic link -> Enter new password -> Save & Log in | Welcome transition completes -> **Navigates directly to User Map (`/map?from=password_reset&skip_intro=true`)**. | Map startup intro completely bypassed. Immediate live view. |
| `PWD-03` | **Change Password Button Responsiveness** | Click "Change Password" inside Edit Profile Danger Zone | Immediate button activation without event bubbling or form submission blocks (`e.preventDefault()`, `e.stopPropagation()`). | Synchronous resolution of cached email from state/localStorage. Zero click delay. |
| `PWD-04` | Password Catalog Retention | New password equals any of last 5 passwords | Backend returns HTTP 400: "Password baru tidak boleh sama dengan password sebelumnya". | Token preserved in Redis so user does not need new email. |
| `PWD-05` | Cross-Tab / Cross-Device Sync | Reset password in phone/tab B while tab A is on "Link sent" screen | Tab A receives `RESET_PASSWORD_COMPLETE` (BroadcastChannel or polling) -> routes to Login with success banner. Tab B closes cleanly or switches to login. | Zero page reload required. No tab duplication. |
| `PWD-06` | **Delete Account (`deleteMe`) 0-Latency** | Edit Profile -> Danger Zone -> Delete Account | Modal closes instantly (0ms), immediate toast "Account deleted. Redirecting...", tokens/storage wiped, backend cascades cleanup in background, smooth redirect to `/`. | Session invalidated across all devices instantly without hanging. |

---

### Test Suite 3: Public Forms & Ingress Security Defense
| Test ID | Feature / Case | Input / Trigger | Expected Result | Security Check |
|---|---|---|---|---|
| `FORM-01` | Comment Form (Authenticated) | Auth user submits idea/critique (≥ 20 chars) | Persisted with user's verified nickname and avatar. | XSS sanitization, anti-spam rate limits. |
| `FORM-02` | Comment Form (Anonymous) | Guest submits comment with custom nickname | Persisted with Guest badge and sanitized nickname. | Block profanity and reserved keywords (e.g. "Admin"). |
| `FORM-03` | SeeEvent & NeedOurHelpForm | Form submit with payload | Stored in DB, admin notification emitted. | Rate limit cooldown prevents automated flood. |
| `FORM-04` | Ingress Defense Gate | Malformed JSON / oversized payload (> 10MB) | Handled by ingress middleware -> HTTP 413 / 400 without crashing server. | Tested in `ingress_security_defense.test.mjs`. |

---

### Test Suite 4: Minigame Engine & Score Persistence
| Test ID | Feature / Case | Input / Trigger | Expected Result | Integrity Verification |
|---|---|---|---|---|
| `GAME-01` | Minigame Play (1 Attempt Daily) | Start minigame from landing page | Game canvas initializes, controls responsive. | Attempt locked in Redis with 24h midnight TTL. |
| `GAME-02` | Score Submission | Game finishes with score X | Score submitted to backend with timestamp & cryptographic signature. | Anti-cheat checks prevent arbitrary score injection. |
| `GAME-03` | Repeat Attempt Block | User attempts play #2 within same calendar day | Server returns `hasPlayedToday: true` with countdown `secondsUntilReset`. | Tested in `minigame_attempt.test.mjs`. |

---

### Test Suite 5: Kalcerian Live Map & HUD Controls (Toolbar State Machine)
| Test ID | Feature / Case | Input / Trigger | Expected Result | UI & Motion DNA |
|---|---|---|---|---|
| `MAP-01` | Cold Startup Intro | First visit to `/map` | Sound toggle, intro animation, then reveals Leaflet map centered at user GPS. | No Leaflet API key error; smooth fade. |
| `MAP-02` | Intro Bypass (Password Reset) | Visit `/map?from=password_reset&skip_intro=true` | Startup intro **bypassed immediately**; user lands directly on live map. | Flags cleaned from storage on mount. |
| `MAP-03` | **Strict Creator Toolbar Ownership** | User accepted as collaborator on someone's event | Top HUD Toolbar displays **NO Event icon** and **NO Broadcast icon**. Only standard controls render. | Collaborator does NOT share event/broadcast ownership on toolbar. |
| `MAP-04` | **Toolbar Collapse Geometry** | Tap wrench tool tab (with or without broadcast) | Toolbar retracts completely off-screen until **ONLY the tool tab (wrench handle)** is visible at top edge. | Zero dangling boxes or leftover icons when collapsed. |
| `MAP-05` | **Toolbar Layout Variations** | Toggle active states of Event and Broadcast | **Var A**: Event + 5 slots + Broadcast box.<br>**Var B**: Event + 5 slots (centered tab).<br>**Var C**: 5 slots only (narrower width, centered tab).<br>**Var D**: 5 slots + Broadcast box. | Dynamic width adjustment; beveled 2D sunken crater slots. |
| `MAP-06` | **Auto-Retract on Deletion & Creation** | Create/Delete Event or Broadcast | Toolbar gracefully and slowly retracts up to top edge (only wrench visible), holds static (~1.5s), and smoothly expands back down into the new layout variation (~3.5s total choreographed cycle). | Zero layout jumps; cinematic spring transition. |
| `MAP-07` | Right Profile Dock | Dock positioned at screen right edge | Pulled down 25% (`top-16 sm:top-20`); generic profile tab toggles sidebar open/closed. | Seamless fusion with avatar box (`rounded-l-full`, zero divider line). |
| `MAP-08` | **Edit Event Location Autocomplete & In-Memory Cache** | Open existing mini event for editing | Location field prefilled with existing address; **zero "Lokasi tidak ditemukan" error**. In-memory dual-verification verifies preset coordinates automatically. | Editing preserves verified location state; error only triggers if user types unverified text. |
| `MAP-09` | **Anti-Intro-Replay Session Isolation** | Create, edit, or delete event/broadcast | Modal closes cleanly, sentinel pops cleanly without triggering Next.js unhandled popstate reload (`__NA: true`). **Map startup intro sequence NEVER replays**. | Session remains intact on the map with zero page reloading. |
| `MAP-10` | **Toolbar 3-Variation Dynamic Sizing** | Observe toolbar across Event and Broadcast presence | **Var 1 (Event + Broadcast)**: Event slot + 5 slots, broadcast box on far left with wrench tab below it.<br>**Var 2 (Event only)**: Event slot + 5 slots (6 total), wrench tab centered below.<br>**Var 3 (No Event, No Broadcast)**: 5 slots total (narrower box width), wrench tab centered below. | Sizing adjusts dynamically and seamlessly with zero gray seam lines. |

---

### Test Suite 6: Broadcast Lifecycle & 0-Latency Deletion
| Test ID | Feature / Case | Input / Trigger | Expected Result | Geometry & Expiry |
|---|---|---|---|---|
| `BCAST-01` | Broadcast Creation | User publishes broadcast on map | Broadcast marker appears on map; exactly **1 small square box** renders on far left of top HUD. | Zero excess rectangular width. |
| `BCAST-02` | Tool Tab Realignment | Broadcast active | Wrench tab hangs directly beneath the 1 small broadcast box on the far left. | Width strictly matches the single box. |
| `BCAST-03` | **Realtime 0-Latency Deletion** | Click Delete Broadcast -> Confirm Yes | Status modal closes immediately (0ms), pin balloon removed immediately (0ms), toolbar auto-retracts and re-expands without broadcast, backend deletes asynchronously. | Zero UI lag; no 3-second freeze. |
| `BCAST-04` | 24-Hour Automated Purge | Broadcast reaches 24-hour TTL | Cron/TTL purge removes broadcast from Redis and Leaflet map feed. | Zero stale markers left behind. |

---

### Test Suite 7: Mini Event & N-Collaborator Concurrency Queue
| Test ID | Feature / Case | Input / Trigger | Expected Result | Concurrency Defense |
|---|---|---|---|---|
| `EVENT-01` | Event Creation & Marker | Creator creates event with location & details | Event popup renders on map with custom category icon. Creator gets Slot 1 Event icon on toolbar. | Elastic header accommodates creator and collaborator names. |
| `EVENT-02` | **Distributed Mutex Queue** | N collaborators upload clips simultaneously | Requests queued in Redis (`eventMediaQueue.js`) and processed sequentially. | **Zero race conditions / zero torn media clips**. |
| `EVENT-03` | Destructive Action Isolation | Creator deletes event while collaborator uploads | Distributed lock holds delete until pending queue job completes or aborts cleanly. | Prevents orphaned blob uploads in storage. |
| `EVENT-04` | **Realtime 0-Latency Event Deletion** | Creator clicks Delete Event -> Confirm Yes | Event modal closes immediately (0ms), marker removed from map immediately (0ms), toolbar auto-retracts and re-expands without event icon, backend cleans up asynchronously. | Zero perceived latency. |
| `EVENT-05` | Media Aspect Ratio & Whiteline | Upload 9:16 portrait and 16:9 landscape media | Elongated media frame maintains exact ratio; synced white line indicator renders without jitter. | Video autoplay/pause on popup visibility. |
| `EVENT-06` | Upload Buffer Overlay | Collaborator uploads image/video | Screen dims, center loading buffer displays; on failure, turns into error message without outer box. | Tested in `event_media_clips.test.mjs`. |

---

### Test Suite 8: Realtime Chatbox, Media & Calls
| Test ID | Feature / Case | Input / Trigger | Expected Result | Latency / Sync Standard |
|---|---|---|---|---|
| `CHAT-01` | Message Propagation | User A sends text/emoji to User B | Instant WebSocket / BroadcastChannel delivery; sender sees single tick -> double tick. | Tested in `chat_o1_scalability_slice.test.mjs`. |
| `CHAT-02` | **0ms Notification Red Dot** | Incoming message or collaboration invite | Red dot badge appears on Kalcerian panel and envelope icon **simultaneously (0ms jitter)**. | Sync verified across devices. |
| `CHAT-03` | Chat Actions Suite | Reply, delete, copy, multi-select delete | Smooth interactive feedback; reply snippet references parent message with italic quote. | DOM unmount cleans listeners without leak. |
| `CHAT-04` | Voice Notes | Record and send audio message | Audio wave recorded, duration displayed, smooth waveform playback. | Auto-stops on modal unmount. |
| `CHAT-05` | Media Preview (Photo/Video) | Send image or clip in chat | Fullscreen preview with pinch-to-zoom and aspect ratio preservation. | Memory cleanup on modal close. |
| `CHAT-06` | Audio/Video Signaling | Initiate 1-on-1 call | Signaling via LiveKit / Redis; call status badge logs call duration in chat. | Tested in `chat_call_bi_devices_slice.test.mjs`. |
| `CHAT-07` | **Empty Caption Media Placeholder Icons** | Photo or Video sent without text message | Displays clean centered SVG icon (Picture 2 photo mountain/sun or Picture 3 video clapperboard) without outer container border box. Theme-reactive: Pure Black in Light Mode, Pure White in Dark Mode. | Replaces legacy emoji/italic text ("📷 Photo" / "📹 Video") cleanly. |
| `CHAT-08` | **Video Sound / Mute Toggle Control** | Video cardback & zoomed-in modal | Sound icon rendered directly to the left of the Download button in pure white (`#ffffff`) with high-contrast drop shadow (matching HUD toolbar sound geometry). Tapping toggles `isVideoMuted` with 0ms latency; muted state renders firm `#ef4444` red cross. | Synchronizes HTML video element `.muted` imperatively and reactively. |
| `CHAT-09` | **Immediate Unread Red Dot Clearing (Read vs Reply)** | User opens or views chat containing unread messages | Red dot on peer's card in Kalcerians Panel clears **immediately upon reading/viewing messages** (issues `ackPersonalChatRead` to Redis/Postgres and resets local count to 0) **without requiring a reply message to be sent**. | Eliminates phantom persistent red dot state. |

---

### Test Suite 9: Database Connection Resilience & Serverless Pooling Gate
| Test ID | Feature / Case | Input / Trigger | Expected Result | Concurrency & Stability |
|---|---|---|---|---|
| `DB-01` | **Serverless Connection Limit** | Standard PostgreSQL connection URL without query params | `buildEffectiveDatabaseUrl` injects `connection_limit=3`. | Allows interactive `$transaction` (e.g. account wipe) + concurrent background queries without saturating PostgreSQL max connections. |
| `DB-02` | **Pool Acquisition Timeout** | Serverless cold start or transient spike | `buildEffectiveDatabaseUrl` injects `pool_timeout=10` (10s). | Absorbs acquisition queues while guaranteeing clean catchable rejection before Vercel serverless function hard timeout (10-15s). |
| `DB-03` | **Custom Setting Preservation** | `DATABASE_URL` with explicit `connection_limit` or `pool_timeout` | User parameters are strictly preserved and never overridden. | Tested in `backend/tests/prisma_connection_pool.test.mjs`. |
| `DB-04` | **Non-Postgres / Protocol Safety** | SQLite or file-based URLs | Returned untouched without invalid query parameter pollution. | Zero regression across test and development harnesses. |

---

### Test Suite 10: Modularity & Invariance Golden Gate (Gate 3b & Gate 3c)
| Test ID | Feature / Case | Input / Trigger | Expected Result | Concurrency & Stability |
|---|---|---|---|---|
| `MOD-01` | **Hook Conservation (K3)** | `node scripts/audit/modularity-audit.mjs --check` | Aggregate hook sum across facade and submodules equals baseline with 0 delta. | Zero hook additions/leaks across extractions. |
| `MOD-02` | **Contract Invariance (K5)** | Audit of `usePersonalChatState.js` return signature | All 58 return keys and 9 re-exports strictly preserved. | Zero breakages for downstream consumers. |
| `MOD-03` | **Golden-Master Pure Test Harness (Gate 3b)** | `node --test frontend/tests/*.test.mjs` | 100% pass against deterministic in-memory fixtures (61/61 tests pass). | In-memory only; zero Postgres or Redis pollution. |
| `MOD-04` | **Deterministic Golden Slices** | `node scripts/audit/golden/make-golden.mjs` | Verbatim Git slice extraction from `f1dbb70` without behavioral drift. | Reproducible verification against frozen commit. |
| `MOD-05` | **Message Day Divider & Search (`groupMessages.js`)** | Chat messages array with dates and optional search query | Groups messages into `date_divider` on day boundary; filters case-insensitively without throwing on empty/null. | Zero side-effects; pure array transformation. |
| `MOD-06` | **Unified Clipboard Copy (`clipboardText.js`)** | Text, voice note, call log, or media message | Produces clean formatted copy text; invokes `navigator.clipboard` or falls back safely to textarea DOM (4× ➔ 1× deduplication). | Tested in `pure_modules_golden.test.mjs`. |
| `MOD-07` | **Reply Payload Generation (`replyPayload.js`)** | Target message object (text, broadcast, or call) | Produces sanitized reply draft; sets senderName to "You" for self or peer name for incoming messages. | Preserves nested reply payload schema. |
| `MOD-08` | **Immutable Status Updaters (`messageStatusUpdaters.js`)** | Incoming read-ack or deletion ID array | Updates `sent` ➔ `read` up to watermark `ackTs`. Returns identical array reference if unchanged (IL-7). | Prevents unnecessary re-renders in UI thread. |
| `MOD-09` | **Delta Sync Reconciliation (`mergeRemoteMessages.js`)** | Local in-flight messages (`sending`/`failed`) + remote decrypted messages | Merges remote messages without downgrading local `read` status back to `sent`. Discards deleted messages on deleteRev. | Eliminates network race condition message flickering. |
| `MOD-10` | **Map Entities Projection (`mapEntitiesProjection.js`)** | Raw users list and raw events list | Filters offline users, `allowLiveLocation === false`, NaN coordinates, blocked users, and expired events. | Pure projection ensures consistent spatial rendering. |
| `MOD-11` | **Sidebar 4-Tier Sorting (`sidebarKalceriansProjection.js`)** | Sidebar Kalcerians list | Sorts strictly: (1) unread notifications first, (2) favourites second, (3) distance/recent third, (4) search query match. | Excludes forbidden accounts via `isExcludedKalcerianUser`. |
| `MOD-12` | **Event Tags Codec (`eventDescCodec.js`)** | Description string with `[CAT]`, `[LOC]`, `[MEDIA]`, `[COLLABS]` | Parses and encodes tags cleanly; case-insensitive; deduplicated 3× ➔ 1× across entire codebase. | Preserves untagged raw description text intact. |
| `MOD-13` | **Event Payload Builder (`miniEventPayload.js`)** | Event form state and media items | Formats title, tags description, strips existing duplicate tags, and structures multi-clip media metadata. | Handles empty title/location fallbacks gracefully. |
| `MOD-14` | **Profile Patch Immutability (`profilePatch.js`)** | User collection, event collection, and updated profile fields | Immutably patches user object and creator metadata on map events; merges local edits with server response. | Zero mutation of underlying store references. |
| `MOD-15` | **Chat Thread UI & Auto-Scroll Pinning (`useChatThreadUi.js`)** | Incoming messages array, scroll offset, context menu toggle | Auto-scrolls to bottom if user at bottom; locks scroll position if scrolled up; activeMenuId popover closes on click outside or ESC (E1, E2 Hook Ledger slot). | Zero scroll jitter; DOM refs cleaned on unmount. |
| `MOD-16` | **Chat Selection & Bulk Actions (`useChatSelectionActions.js`)** | Select message toggle, select all, bulk delete, batch copy | Manages `selectedMessageIds` set; triggers unified copy via `clipboardText`; issues bulk deletion without breaking UI responsiveness. | Non-memo handlers preserve latest selection state without stale closures. |
| `MOD-17` | **Chat Composer & Media Actions (`useChatComposerActions.js`)** | Send text, attach file/media, trigger VN recording modal, initiate 1-on-1 call, typing indicator dispatch | Dispatches message cleanly; empties input; delegates media/call to respective modals without wrapping in unnecessary `useCallback` (IL-6). | Preserves 0ms typing responsiveness and native keyboard focus. |
| `MOD-18` | **Map Startup Gate & Splash Orchestration (`useMapStartupGate.js`)** | Application startup, `skip_intro` flag, password reset return, active session check | Enforces splash screen timeout / bypass; unlocks Web Audio API context; synchronizes initial viewport loading gate (M1 Hook Ledger slot). | Timers cleared on unmount; zero flash of unstyled content. |
| `MOD-19` | **Offline Beacon & Network Sync (`useOfflineBeacon.js`)** | Tab backgrounding / visibility change, window `offline` / `online` events, periodic beacon interval | Emits beacon heartbeat; tracks connectivity state; triggers reconnect sync on network restoration (M3 Hook Ledger slot). | Cleans up `window.removeEventListener` and clears interval on unmount. |
| `MOD-20` | **Cross-Component Events Refresh Bus (`useEventsRefreshListener.js`)** | Custom events `kalceria:refresh-events` and `kalceria:event-created` | Re-fetches / synchronizes map events list instantly; deduplicates concurrent fetch triggers (M6 Hook Ledger slot). | Event listeners registered on window are cleanly removed on unmount. |
| `MOD-21` | **Map Broadcast Actions & Retraction (`useMapBroadcastActions.js`)** | Save broadcast, delete broadcast, broadcast modal visibility, radius adjustment | Broadcast sent with accurate spatial coordinates; triggers HUD retraction animation; updates broadcast marker. | Handlers maintain non-memo baseline contracts; zero memory leak. |
| `MOD-22` | **Map Presence Toggle & Heartbeat (`useMapPresenceActions.js`)** | Presence state toggle (online / stealth / offline), socket heartbeat cycle | Updates presence on server; reflects marker stealth/online state immediately; updates local user presence. | Non-memo handler avoids stale presence closure during rapid network changes. |
| `MOD-23` | **Map Profile & Session Actions (`useMapProfileActions.js`)** | Edit profile modal open/close, password change submission, account quit / logout confirmation | Handles profile patch cleanly; coordinates logout teardown; invalidates local storage and session state. | Preserves pristine database integrity; zero unauthorized dummy accounts. |
| `MOD-24` | **Chat Local Cache & Hydration (`useChatLocalCache.js`)** | Local storage chat history & cache watermark | Hydrates local chat messages into memory; handles encrypted vs quick-load cache separately without mixing schemas (IL-7) (E3 Hook Ledger slot). | Zero blocking of UI thread; failsafe on corrupted cache. |
| `MOD-25` | **WebRTC P2P DataChannel & Packets (`useChatRealtimePackets.js`)** | Realtime WebRTC data channel events, peer read-receipts | Manages P2P packet exchange, peer read-ack dispatching, and incoming message decryption; maintains `peerConnectionRef`/`dataChannelRef` (R1, E4 Hook Ledger slot). | Render-body ref assignment preserved (IL-3); zero packet loss. |
| `MOD-26` | **Core 304-Line Delta Sync Loop (`useChatSyncLoop.js`)** | Polling fallback, deleteRev reconciliation, message watermark sync | Coordinates background sync polling; fetches missing packets; reconciles deleted message IDs against `deleteRev` (E5 Hook Ledger slot). | Verbatim dependency array frozen (IL-5); zero network thrashing. |
| `MOD-27` | **Outbound Message Encryption & Sender (`useChatSender.js`)** | Outgoing text / broadcast / call payload | Encrypts payload with Web Crypto AES-GCM; creates optimistic UI message with `sending` status; pushes to send queue. | Strict cryptographic nonces; immediate UI feedback. |
| `MOD-28` | **Failed Message Network Resend (`useChatResend.js`)** | Messages flagged with `failed` status | Retries transmission over restored network; re-triggers media blob uploads; updates status cleanly from `failed` ➔ `sending` ➔ `sent`. | Deduplicates resend triggers; idempotency guaranteed. |
| `MOD-29` | **High-Accuracy Eager Geolocation (`useEagerGeolocation.js`)** | Browser navigator.geolocation API, watchPosition | Acquires high-accuracy GPS coordinates; watches real-time movement; handles denial fallback gracefully (M2 Hook Ledger slot). | Cleanup removes geo watchId on unmount; zero battery drain leak. |
| `MOD-30` | **Map Auth Session & Token Renewal (`useMapSession.js`)** | JWT session cookie, token expiry, user profile fetch | Validates session with backend; synchronizes user identity; resolves guest vs registered user state (M4 Hook Ledger slot). | Handles 401 gracefully without unhandled promise rejections. |
| `MOD-31` | **Live Spatial Location Stream (`useLiveLocationSync.js`)** | Current coordinates, presence status, interval ticker | Streams user coordinates to server if online and `allowLiveLocation === true`; silences stream in stealth mode (M5 Hook Ledger slot). | Prevents privacy leak; throttles rapid updates to prevent Redis flood. |
| `MOD-32` | **10s Interval Map Polling (`useMapDataPolling.js`)** | 10-second timer interval, active city bounds | Polls `/api/kalcerians` and `/api/events`; merges delta updates; respects blocked user filters (M8 Hook Ledger slot). | Verbatim dependencies; zero timer stacking across re-renders. |
| `MOD-33` | **Leaflet Viewport & Map Lifecycle (`useMapViewport.js`)** | Leaflet container ref, fly-to coordinate targets, zoom level | Initializes Leaflet map instance; holds `mapRef`; handles smooth fly-to centering and tile layer caching (M9, M10 Hook Ledger slot). | Render-body ref assignment preserved (IL-3); zero startup centering failure. |
| `MOD-34` | **Mini Event Creation & Media Pipeline (`useMiniEventActions.js`)** | Event creation form, coordinates snapping, media attachments | Validates Indonesian bounds; builds multi-clip metadata payload; opens event popup 120ms post-save; handles deletion. | Preserves creator ownership checks; zero orphaned media records. |
| `MOD-35` | **Mini Event Handlers Barrel Re-Export (`miniEventHandlers.js`)** | Backend API requests for mini-events | Facade exports identical functions delegating cleanly to `miniEventCore`, `miniEventQueries`, `miniEventMutations`, and `miniEventMedia` (28 LOC, -96%). | 100% pass on backend regression tests. |
| `MOD-36` | **Personal Chat Controller Barrel Re-Export (`personalChatController.js`)** | Backend API requests for chat messages & acks | Facade exports identical route handlers delegating to `chatSession`, `chatMessages`, `chatAck`, and `chatDelete` (23 LOC, -97%). | Zero route drift; strict HTTP 200/400/404 responses. |
| `MOD-37` | **Admin Dashboard Modularization (`dashboard.jsx`)** | Admin metrics & user tables | Modularized into `DashboardMetrics`, `DashboardCharts`, and `DashboardUsersTable` (421 LOC, -24%). | Preserves admin analytics reactivity. |
| `MOD-38` | **Event Popup Carousel & Geometry Controller (`popupCarouselController.js`)** | Event popup media carousel navigation | Decoupled into `popupGeometry.js`, `popupGestures.js`, and `popupMediaPlayback.js` (342 LOC, -45%). | Preserves aspect ratios (16:9 & 9:16) without visual distortion. |
| `MOD-39` | **Edit Profile Modal Submodules (`EditProfileModal.jsx`)** | Profile editing, password change, account deletion | Decoupled into `ProfileFormFields`, `PasswordChangeSection`, and `AccountDangerZone` (447 LOC, -25%). | Preserves pristine database state; zero mock users. |
| `MOD-40` | **Kalcerians Panel Virtualized & Filtered List (`KalceriansPanel.jsx`)** | Sidebar active kalcerians list & search query | Decoupled into `KalceriansHeader`, `KalceriansSearchBar`, and `KalceriansList` (417 LOC, -36%). | Preserves 4-tier sorting and immediate unread pin. |
| `MOD-41` | **Map Chat & Notification Sync Hook (`useMapChatAndNotifications.js`)** | Unread counters, modal visibility, incoming notifications | Decoupled into `useChatNotifications.js` and `useChatModalSync.js` (407 LOC, -28%). | Instant sync between map indicators and active chat modals. |
| `MOD-42` | **Chat Media Card 3D Flip & Preview (`ChatMediaCard.jsx`)** | Photo/video attachments in chat thread | Decoupled into `CardFront.jsx`, `CardBack.jsx`, and `MediaPreviewModal.jsx` (386 LOC, -38%). | GPU-accelerated card flip; 0ms sound toggle latency. |
| `MOD-43` | **WebRTC Call Session State Machine (`useCallSession.js`)** | 1-on-1 audio/video call lifecycle | Decoupled into `callSignaling.js`, `callHardwareStream.js`, and `callTimer.js` (439 LOC, -21%). | Smooth stream renegotiation; clean track termination. |
| `MOD-44` | **Camera Capture Hardware Stream & MIME Codec (`CameraCaptureModal.jsx`)** | In-app photo and video recording modal | Decoupled into `cameraConstraints.js`, `recordingMime.js`, and `CameraPreview.jsx` (323 LOC, -49%). | Negotiates supported MIME codecs across iOS Safari & Android. |

---

### Test Suite 11: Wave 2 Leaf Hooks & Manual UI Verification Matrix (MP-01/04/06 & CH-03/04/05/07)
| Test ID | Skenario UI & Perangkat Nyata | Input / Trigger | Hasil yang Diamati (Identik Baseline `f1dbb70`) | Wave & Modul Terkait |
|---|---|---|---|---|
| `CH-03` | **Foto/Video Tanpa Teks** | Kirim foto atau video tanpa teks di personal chat | Ikon tengah sesuai tema (SVG clapperboard/photo); tombol suara toggle mute instan (0ms); tanpa border container luar. | Wave 2 (`useChatComposerActions`, `ChatMediaCard`) |
| `CH-04` | **Voice Note Recording & Playback** | Rekam audio ➔ batal / kirim di chat | Rekam audio, waveform visualizer interaktif, durasi hitung maju, izin mikrofon diminta wajar; unmount membersihkan media recorder. | Wave 2 (`useChatComposerActions`, `VoiceNoteRecorderModal`) |
| `CH-05` | **Reply, Copy Tunggal/Massal, Hapus Massal** | Menu klik-kanan / selection bar pada pesan | Draft reply tersusun; teks pesan tersalin ke clipboard; bulk-delete menghapus pesan terpilih di kedua sisi secara sinkron. | Wave 1–2 (`useChatSelectionActions`, `clipboardText`, `replyPayload`) |
| `CH-07` | **Pagination Pesan Lama & Pencarian** | Scroll ke atas untuk riwayat / ketik query pencarian | Cursor pagination memuat riwayat lama di atas tanpa loncatan scroll; filter pencarian real-time memfilter pesan di thread. | Wave 2 (`useChatThreadUi`, `groupMessages`) |
| `MP-01` | **Startup Intro vs Bypass** | Muat halaman peta (`/map`) pertama kali vs reload | Splash intro berjalan wajar; bypass instan bila `skip_intro` aktif, sesi login aktif, atau kembali dari alur reset password. | Wave 2 (`useMapStartupGate`) |
| `MP-04` | **Broadcast Buat/Edit/Hapus & Toolbar Retract** | Kirim broadcast baru dari HUD peta | Form broadcast terkirim; HUD toolbar menganimasikan retract halus; marker broadcast muncul di peta sesuai radius. | Wave 2 (`useMapBroadcastActions`, `HudToolbar`) |
| `MP-06` | **Edit Profil, Ubah Sandi, Hapus Akun** | Buka EditProfileModal dari HUD kanan atas | Profil ter-patch tanpa reload; sandi terverifikasi aman; konfirmasi quit membersihkan sesi (HANYA akun uji milik programmer). | Wave 2 (`useMapProfileActions`, `EditProfileModal`) |

---

### Test Suite 12: Wave 3 Intertwined Lifecycle Hooks & Core Verification Matrix (CH-01/02/06/08 & MP-02/03/05)
| Test ID | Skenario Siklus Hidup & Jaringan Riil | Input / Trigger | Hasil yang Diamati (Identik Baseline `f1dbb70`) | Wave & Modul Terkait |
|---|---|---|---|---|
| `CH-01` | **Kirim Pesan Teks (Optimistic UI & Watermark)** | Ketik pesan ➔ Enter / klik Kirim | Status transisi mulus: `sending → sent → read`; urutan pesan stabil; input terkosongkan seketika; timestamp valid. | Wave 3 (`useChatSender`, `usePersonalChatState`) |
| `CH-02` | **Penerimaan Pesan Realtime & Red Dot Disappearance** | Terima pesan baru via WebRTC P2P / Polling saat chat terbuka | Pesan seketika muncul di thread; **red dot pada panel Kalcerians langsung hilang saat pesan dibaca** (bukan saat membalas); read-ack terkirim ke pengirim. | Wave 3 (`useChatRealtimePackets`, `useChatSyncLoop`, updater `setMessages` IL-4) |
| `CH-06` | **Resend Pesan Gagal (Simulasi Gangguan Jaringan)** | Matikan jaringan ➔ kirim pesan (gagal) ➔ hidupkan jaringan ➔ klik resend | Status berubah dari `failed → sending → sent`; media attachment diunggah ulang; urutan pesan tidak rusak. | Wave 3 (`useChatResend`, `useChatSender`) |
| `CH-08` | **Panggilan Voice / Video Signaling** | Inisiasi 1-on-1 voice / video call | Handshake WebRTC / LiveKit signaling sukses; audio/video stream dua arah terhubung; badge log durasi panggilan tercatat di chat. | Wave 3 (`useCallSession`, `useChatRealtimePackets`) |
| `MP-02` | **GPS Eager Geolocation, Recenter, & Stealth Mode** | Muat peta ➔ izin GPS ➔ toggle status Stealth / Online | Marker posisi diri muncul di lokasi akurat; tombol recenter melakukan smooth `flyTo`; mode stealth menyembunyikan marker dari user lain seketika. | Wave 3 (`useEagerGeolocation`, `useLiveLocationSync`, `useMapViewport`) |
| `MP-03` | **Polling 10 Detik, Marker User/Event, & Pemblokiran** | Biarkan peta terbuka selama beberapa siklus polling (10s) | Daftar Kalcerians dan marker event sinkron dengan server; user yang diblokir tidak pernah muncul di peta maupun sidebar; nol lonjakan memori. | Wave 3 (`useMapDataPolling`, `mapEntitiesProjection`) |
| `MP-05` | **Mini Event Lifecycle & Kolaborasi** | Buat event baru pada peta dengan judul, deskripsi bertag, dan media | Form tervalidasi; payload tersimpan di Postgres/Redis; popup event otomatis terbuka 120ms setelah penyimpanan; marker interaktif muncul di peta. | Wave 3 (`useMiniEventActions`, `popupCarouselController`) |

---

### Test Suite 13: Wave 4 Tier B Subsystem Invariance & Hardware Gate
| Test ID | Skenario Tier B & Hardware Nyata | Input / Trigger | Hasil yang Diamati (Identik Baseline `f1dbb70`) | Modul & Sub-komponen Terkait |
|---|---|---|---|---|
| `TB-01` | **Backend API Barrel Re-export Invariance** | Eksekusi seluruh automated test suite backend | Rute `/api/personal-chat/*` dan `/api/mini-events/*` merespons dengan struktur JSON, header HTTP, dan middleware identik; barrel re-export lolos 100%. | `personalChatController.js`, `miniEventHandlers.js` |
| `TB-02` | **Camera Hardware Constraints & MIME Codec** | Buka kamera pada mobile portrait (9:16) vs desktop (16:9) | `cameraConstraints.js` menegakkan rasio tanpa peregangan; `recordingMime.js` menegosiasikan `video/mp4` pada iOS Safari dan `video/webm` pada Chrome/Android. | `CameraCaptureModal.jsx`, `cameraCapture/` |
| `TB-03` | **Event Popup Carousel Geometry & Swipe Gestures** | Geser (swipe/drag) klip multi-media pada popup event peta | Transisi antar-klip halus 60fps; `popupGeometry.js` mempertahankan proporsi video/foto; tombol suara HUD mengontrol audio tanpa delay. | `popupCarouselController.js`, `eventPopup/` |
| `TB-04` | **Chat Media Card 3D Flip & Sound Toggle** | Klik kartu media di chat untuk membalik kartu | Animasi flip 3D GPU-accelerated (`transform: rotateY`); ikon download dan audio mute/unmute merespons dalam 0ms; placeholder ikon tema konsisten. | `ChatMediaCard.jsx`, `mediaCard/` |
| `TB-05` | **Kalcerians Panel Instant Pin & Search** | Ketik nama di search bar / terima notifikasi pesan baru | Kalcerian dengan unread message langsung tersemat di atas; pencarian realtime memfilter tanpa lag; scroll virtual mulus. | `KalceriansPanel.jsx`, `kalceriansPanel/` |
| `TB-06` | **Edit Profile Modal & Zero DB Pollution** | Edit profil, ganti kata sandi, atau batalkan aksi bahaya | Input tervalidasi; sesi terproteksi; pembatalan menghapus state lokal; dilarang keras meninggalkan user dummy pada DB produksi. | `EditProfileModal.jsx`, `editProfile/` |

---

## 3. Mandatory Compliance Directives (AGENTS.md)
1. **Zero Dummy User Accounts**: No mock accounts (`HP Mobile User`, `Tester`) may ever remain in Postgres or Redis feeds.
2. **Golden Baseline BEKU**: Commit `f1dbb70` (`BaselineNovember#2`) is synchronized and strictly protected.
3. **One-Shot Gate**: All pull requests and deployments must pass all 4 verification gates and 5 live native smoke probes before sign-off.
