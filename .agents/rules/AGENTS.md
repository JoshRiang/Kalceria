# AGENTS.MD — KALCERIA FRONTIER EXECUTION & RELIABILITY STANDARD
**Target Quality Level**: Claude Opus 5.5 / Sonnet 5.5 & Gemini 4 Argon Tier  
**Mandate**: ZERO TOLERANCE for implementation defects, shallow assumptions, mock shortcuts, regressions, or unverified claims.

---

## 1. Core Operating Philosophy
1. **Zero Shortcuts, Real Solutions Only**:
   - Never implement shallow mocks, synthetic stubs, or simulated behavior when production logic is required.
   - If audio/video capture is requested, implement actual MediaStream hardware constraints with noise suppression, echo cancellation, and real MIME negotiation.
   - If dynamic aspect ratio / card elongation is requested, probe actual video dimensions and drive smooth transitions using `requestAnimationFrame` + CSS variables.
   - If storage durability is required, use atomic Redis sorted sets, unique clip identifiers, and real blob storage with expiration sweeps.

2. **Root Cause Analysis (RCA) First**:
   - Never bandage symptoms (e.g. adding random `setTimeout(..., 500)`, arbitrary CSS `!important`, or silencing errors).
   - Investigate the full execution chain: Browser API -> React State -> Hook Lifecycle -> DOM / Leaflet Mutation -> Network Request -> Express Controller -> Redis / Prisma DB -> Response Reconciliation.
   - Address the root cause at the architectural level.

3. **Context & Code Reading Before Any Modification**:
   - Read the target file and its surrounding imports, consumers, and type definitions before making any change.
   - Do not hallucinate function signatures or component props.
   - Respect existing architectural patterns in the codebase.

---

## 2. Architecture & Code Quality Standards
1. **Modularity & Single Responsibility**:
   - Extract heavy or complex logic into dedicated helper modules (e.g., `popupGeometry.js`, `popupGestures.js`, `cameraConstraints.js`, `recordingMime.js`, `eventMediaPersistence.js`).
   - Keep UI components focused on presentation and user interaction.
2. **State & Concurrency Control**:
   - Avoid race conditions in browser history (`popstate`), modal open/close lifecycles, and rapid UI actions. Use centralized modal stacks with debounced history sentinels.
   - Synchronize imperatively manipulated DOM (such as Leaflet popups and canvas visualizers) with React lifecycle cleanly. Clean up animation frames, event listeners, and timers on unmount.
3. **Design DNA Compliance (Kalceria Aesthetic)**:
   - **Theme**: ROG Aggressiveness + Forza Horizon + Hack The Box (HTB).
   - **Colors**: Obsidian Black (`#0a0e27`), Deep Black (`#000000`), Neon Magenta (`#ff006e`), Golden Yellow (`#ffd60a`), Gold (`#ffc300`), Dark Gray (`#2a2d42`).
   - **Visuals**: Sharp-cut corners, motherboard/cyber grid motifs, subtle neon glows, clean glassmorphism (`backdrop-filter: blur(...)`).
   - **Motion**: 60fps GPU-accelerated transforms (`transform` & `opacity`), smooth sub-pixel rendering.

---

## 3. Strict Verification & Proof-of-Work Protocol (MANDATORY)
Before any task can be marked complete or declared finished, the agent MUST run and verify the following pipeline:

1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit -p frontend/tsconfig.json
   ```
   *Must exit with 0 errors.*

2. **Backend Syntax & Integrity Validation**:
   ```powershell
   npm --prefix backend run build
   ```
   *All backend files must pass syntax parsing without failure.*

3. **Backend Unit & Integration Test Suites**:
   ```powershell
   npm --prefix backend test
   ```
   *All test suites must pass 100% (e.g., ingress_security_defense, service_location_validation, google_oauth_and_city_resolution, event_media_clips, mini_event_and_cleanup).*

4. **Production Build Validation**:
   ```powershell
   npm --prefix frontend run build
   ```
   *Next.js production build must compile and optimize routes cleanly.*

5. **Deployment & Live Smoke Verification (When Deploying)**:
   - Backend MUST be deployed from repo root (`d:\TheWeb\Kalceria`) with credentials loaded from `backend/.vercel/project.json`.
   - Staged deployments must be probed via `/api/health` before promotion.
   - Live endpoints (`https://api.kalceria.id/api/health`, `https://www.kalceria.id/api/health`, `/`, `/map`) must respond with HTTP `200 OK`.

---

## 4. Protected Branches & Git Discipline
1. **GOLDEN BASELINE PROTECTION**:
   - `BaselineNovember#2` is a FROZEN protected branch (commit `6673153952b91b3053f5bead5863aad36fa9c80e`).
   - **NEVER** switch to, checkout, rebase, merge into, or push to `BaselineNovember#2`.
2. **Branch Execution**:
   - Only work on and push to `origin main`.
3. **Workspace Hygiene**:
   - Remove all temporary scratch files (`scratch/*.log`, debug scripts) before reporting completion.
   - Keep working directory clean (`git status --short` must be clean).
4. **Security & Secrets**:
   - NEVER read, output, or echo secret tokens, private keys, or `.env` values into logs, chat, or artifacts.

---

## 5. Failure Protocol ("OUT" Policy)
Any breach of the following constitutes an immediate failure:
- Introducing an unverified syntax error, broken import, or type regression.
- Committing shallow mocks instead of requested real implementations.
- Breaking responsive layout (e.g., forcing landscape on mobile portrait sensors).
- Causing race conditions or data loss in concurrent media/chat pipelines.
- Claiming a task is complete without running the verification test suite.
