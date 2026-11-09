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

---

### Test Suite 2: Password Reset Routing & Danger Zone
| Test ID | Feature / Case | Input / Trigger | Expected Result | Destination Verification |
|---|---|---|---|---|
| `PWD-01` | **Reset originating from Landing Page** | Click "Forgot Password" on `/` -> Open magic link -> Enter new password -> Save & Log in | Welcome transition completes -> **Gracefully fades into Landing Page (`setPhase("landing")`)**. | **MUST NOT** jump to `/map`. Query params cleared. |
| `PWD-02` | **Reset originating from User Map** | Edit Profile modal -> Click "Change Password" -> Open magic link -> Enter new password -> Save & Log in | Welcome transition completes -> **Navigates directly to User Map (`/map?from=password_reset&skip_intro=true`)**. | Map startup intro completely bypassed. Immediate live view. |
| `PWD-03` | Password Catalog Retention | New password equals any of last 5 passwords | Backend returns HTTP 400: "Password baru tidak boleh sama dengan password sebelumnya". | Token preserved in Redis so user does not need new email. |
| `PWD-04` | Cross-Tab / Cross-Device Sync | Reset password in phone/tab B while tab A is on "Link sent" screen | Tab A receives `RESET_PASSWORD_COMPLETE` (BroadcastChannel or polling) -> routes to Login with success banner. | Zero page reload required. |
| `PWD-05` | **Delete Account (`deleteMe`)** | Edit Profile -> Danger Zone -> Delete Account | Backend cascades cleanup (comments, events, media, Redis sessions) -> Cookies cleared -> Redirect to `/`. | Session invalidated across all devices instantly. |

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

### Test Suite 5: Kalcerian Live Map & HUD Controls
| Test ID | Feature / Case | Input / Trigger | Expected Result | UI & Motion DNA |
|---|---|---|---|---|
| `MAP-01` | Cold Startup Intro | First visit to `/map` | Sound toggle, intro animation, then reveals Leaflet map centered at user GPS. | No Leaflet API key error; smooth fade. |
| `MAP-02` | Intro Bypass (Password Reset) | Visit `/map?from=password_reset&skip_intro=true` | Startup intro **bypassed immediately**; user lands directly on live map. | Flags cleaned from storage on mount. |
| `MAP-03` | Top Functional Outerbox | 6 Crater Slots (Event, Recenter, Eye, Plus, Theme, Sound) | Each icon sits in a 2D sunken crater (`bg-[#f1f3f5]` light / `bg-[#161926]` dark). | Responsive, GPU-accelerated spring motion. |
| `MAP-04` | Toolbar Collapse / Expand | Tap wrench tool tab | Outerbox smoothly translates up; tab stays upright with no rotation flip. | Tab seamlessly fused to outerbox bottom (`border-t-0`). |
| `MAP-05` | Right Profile Dock | Dock positioned at screen right edge | Pulled down 25% (`top-16 sm:top-20`); generic profile tab toggles sidebar open/closed. | Seamless fusion with avatar box (`border-r-0`). |

---

### Test Suite 6: Broadcast Lifecycle & Management
| Test ID | Feature / Case | Input / Trigger | Expected Result | Geometry & Expiry |
|---|---|---|---|---|
| `BCAST-01` | Broadcast Creation | User publishes broadcast on map | Broadcast marker appears on map; exactly **1 small square box** renders on far left of top HUD. | Zero excess rectangular width. |
| `BCAST-02` | Tool Tab Realignment | Broadcast active | Wrench tab hangs directly beneath the 1 small broadcast box on the far left. | Width strictly matches the single box. |
| `BCAST-03` | Edit & Trim | Creator edits message text | Inline edit form with trashcan delete button and trimmed update action. | Instant optimistic UI update on map. |
| `BCAST-04` | 24-Hour Automated Purge | Broadcast reaches 24-hour TTL | Cron/TTL purge removes broadcast from Redis and Leaflet map feed. | Zero stale markers left behind. |

---

### Test Suite 7: Mini Event & N-Collaborator Concurrency Queue
| Test ID | Feature / Case | Input / Trigger | Expected Result | Concurrency Defense |
|---|---|---|---|---|
| `EVENT-01` | Event Creation & Marker | Creator creates event with location & details | Event popup renders on map with custom category icon. | Elastic header accommodates creator and collaborator names. |
| `EVENT-02` | **Distributed Mutex Queue** | N collaborators upload clips simultaneously | Requests queued in Redis (`eventMediaQueue.js`) and processed sequentially. | **Zero race conditions / zero torn media clips**. |
| `EVENT-03` | Destructive Action Isolation | Creator deletes event while collaborator uploads | Distributed lock holds delete until pending queue job completes or aborts cleanly. | Prevents orphaned blob uploads in storage. |
| `EVENT-04` | Media Aspect Ratio & Whiteline | Upload 9:16 portrait and 16:9 landscape media | Elongated media frame maintains exact ratio; synced white line indicator renders without jitter. | Video autoplay/pause on popup visibility. |
| `EVENT-05` | Upload Buffer Overlay | Collaborator uploads image/video | Screen dims, center loading buffer displays; on failure, turns into error message without outer box. | Tested in `event_media_clips.test.mjs`. |

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

---

## 3. Mandatory Compliance Directives (AGENTS.md)
1. **Zero Dummy User Accounts**: No mock accounts (`HP Mobile User`, `Tester`) may ever remain in Postgres or Redis feeds.
2. **Golden Baseline BEKU**: Commit `6673153952b91b3053f5bead5863aad36fa9c80e` (`BaselineNovember#2`) is strictly protected.
3. **One-Shot Gate**: All pull requests and deployments must pass all 4 verification gates and 5 live native smoke probes before sign-off.

