# ⚡ KALCERIA CLI PLATFORM: PURE HEADLESS BACKEND SPECIFICATION
**Codename:** `klcr-engine` / `kalceria-cli`  
**Target File:** `PLANCLI.md`  
**Revision:** 1.0.0 (Industrial Grade)  
**Status:** Approved for Implementation  

---

## 1. Executive Summary & Paradigm Shift

### 1.1 The Problem with Web Admin Dashboards
The existing `/admin/dashboard` interface—while functional—suffers from standard web administration pitfalls:
1. **Attack Surface:** Exposing administrative CRUD interfaces, modals, and authorization tokens to a public browser environment creates unnecessary vectors for DOM injection, XSS token harvesting, and CSRF attempts.
2. **Generic UX Bloat:** Standard web dashboards with cards, tables, and target bars dilute the underground, raw automotive identity of Kalceria. Kalceria is high-fidelity automotive culture: engine telemetry, ECU tuning maps, and instantaneous response.
3. **Operational Drag:** Managing event drops, merch drops, manual sales records, and media uploads through web forms is slow, click-heavy, and fragile when processing heavy 4K media and bulk records.
4. **Bundle & Hosting Cost:** Bundling complex admin React components, charting libraries, Framer Motion animations, and data tables adds unnecessary weight to the Next.js bundle and serverless edge functions.

### 1.2 The Pure CLI Paradigm
We are completely **sunsetting and removing `/admin/dashboard`** from the web frontend. All administrative operations, data workflows, event orchestrations, and financial tracking are migrating to a dedicated, high-velocity terminal CLI tool:
- **Global Binary Commands:** `kalceria` and alias `klcr`
- **Architecture:** Node.js ESM executable packaged with `@clack/prompts`, `commander`, `chalk`, `cli-table3`, and direct bridges to both the backend REST API and the PostgreSQL / Prisma database layer.
- **Dual Operating Modes:**
  1. **Interactive TUI Cockpit:** Guided prompts, fuzzy finders, ASCII art, and live telemetry for everyday operations.
  2. **Headless Pipeline Mode:** Fast UNIX-style flags (`--json`, `--csv`, `--quiet`, `--force`), allowing script automation, cron jobs, and pipe chaining (`kalceria regs list --status PENDING --json | jq '.[].id'`).

---

## 2. Global Architecture & Authentication Flow

```
                      ┌──────────────────────────────────────────┐
                      │          ADMIN TERMINAL (CLI)            │
                      │         `kalceria` / `klcr`              │
                      └────────────────────┬─────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
      [1. AUTH PKCE LOOPBACK]                         [2. DUAL EXECUTION ENGINE]
                    │                                             │
      ┌─────────────▼─────────────┐                 ┌─────────────┴─────────────┐
      │ Ephemeral HTTP Server     │                 │                           │
      │ http://127.0.0.1:<PORT>   │                 ▼                           ▼
      └─────────────┬─────────────┘         ┌───────────────┐           ┌───────────────┐
                    │                       │  Remote API   │           │ Direct Prisma │
                    ▼                       │  (HTTPS/REST) │           │  (Local/VPC)  │
      ┌───────────────────────────┐         └───────┬───────┘           └───────┬───────┘
      │ Browser: /admin/login     │                 │                           │
      │ - Verify Admin Creds      │                 ▼                           ▼
      │ - Transmit JIT Session    │         ┌───────────────────────────────────────────┐
      │ - Auto-Close Window       │         │       PostgreSQL Database / Vercel        │
      └───────────────────────────┘         └───────────────────────────────────────────┘
```

### 2.1 The Browser-Gated PKCE Loopback Handshake
The browser is retained **only** as an OAuth/JIT authorization gateway. It renders zero administrative controls.
1. Admin enters `kalceria auth login` in their terminal.
2. The CLI starts an ephemeral loopback HTTP server on an available port (`127.0.0.1:49152..65535`) and generates a cryptographically random challenge state.
3. The CLI opens Google Chrome / default browser to:
   `https://kalceria.web.id/admin/login?cli_port=<PORT>&state=<CHALLENGE>`
4. Admin enters their master email, Argon2 password, and optional JIT key.
5. The login frontend verifies the credentials against `/api/auth/login`, then immediately triggers a loopback redirect to:
   `http://127.0.0.1:<PORT>/callback?token=<JWT>&jit=<JIT_TOKEN>&admin=<EMAIL>`
6. The browser displays a minimal 1-second success pill: `"CLI Authenticated. You can close this window."` and executes `window.close()`.
7. The CLI stores the session in an encrypted, permission-guarded file (`~/.kalceria/session.json`, mode `0600`).
8. Terminal output prints:
   ```text
   [KALCERIA ENGINE] Authentication successful.
   Logged in as : otni@kalceria.com (Role: ADMIN)
   WIB Timestamp: 2026-11-01 00:30:15 WIB
   JIT Privileges: ACTIVE (15m remaining)
   ```

### 2.2 CLI Authentication Commands
- `kalceria auth login`: Initiates browser handshake and provisions encrypted local token.
- `kalceria auth status`: Checks active session, JWT expiration, server reachability, and JIT status.
- `kalceria auth jit <password>`: Unlocks elevated 15-minute JIT session directly in terminal for destructive commands (purging users, resetting database, deleting events).
- `kalceria auth logout`: Invalidates remote tokens via API and purges local keychain.

---

## 3. Comprehensive Dashboard-to-CLI Feature Mapping

Every single feature, modal, button, and data point currently existing across `frontend/components/admin/dashboard/` is mapped below point-by-point to its exact CLI implementation.

---

### Menu 1: Events Management (`events.jsx`)
*Replaces ForzaCard visual showcase, live search, status tags (OPEN, CLOSED, DRAFT, CANCELLED), Add Event Modal, Edit Event Modal, Delete Event Modal (JIT required), and Instant Drop Event.*

#### CLI Commands & Capabilities
1. **`kalceria events list`**
   - **Flags:** `--status <OPEN|CLOSED|DRAFT|CANCELLED>`, `--search <query>`, `--json`, `--page <n>`, `--limit <n>`
   - **Terminal Output:** Formatted ASCII table:
     ```text
     ┌──────────┬─────────────────────────────┬────────┬───────┬─────────────┬──────────────┬──────────┐
     │ ID       │ Title                       │ Status │ Quota │ Price (IDR) │ Reg Dates    │ Sessions │
     ├──────────┼─────────────────────────────┼────────┼───────┼─────────────┼──────────────┼──────────┤
     │ ev-run01 │ Midnight Sun Meet & Run     │ OPEN   │ 78/100│ Rp 150.000  │ Nov 05-12    │ 3 slots  │
     │ ev-drf02 │ Sentul Touge Battle         │ DRAFT  │ 0/50  │ Rp 350.000  │ Nov 20-25    │ 1 slot   │
     └──────────┴─────────────────────────────┴────────┴───────┴─────────────┴──────────────┴──────────┘
     ```
2. **`kalceria events inspect <eventId>`**
   - Renders a terminal cockpit card showing full description, registration fill rate, quota bar, pricing breakdown, session JSON schedule, and display photo URL.
3. **`kalceria events create`**
   - **Interactive Mode:** Step-by-step `@clack/prompts` wizard:
     - Event ID (slug)
     - Title & Description
     - Display Photo URL (or automatic upload via `--upload-banner <file.jpg>`)
     - Location & City
     - Registration Start / End dates (validated with `date-fns`)
     - Quota (integer)
     - Price in IDR
     - Dynamic Sessions builder (add multiple dates, start times, end times, slot caps)
   - **Flags Mode:** `kalceria events create --id "ev-drift-01" --title "Midnight Meet" --price 150000 --quota 100 ...`
4. **`kalceria events update <eventId>`**
   - Select fields to patch interactively or pass flags: `--title`, `--quota`, `--price`, `--status <DRAFT|OPEN|CLOSED|CANCELLED>`.
5. **`kalceria events drop <eventId>`**
   - **Instant Action:** Switches event status to `OPEN`, sets registration live, generates push notification to mobile telemetry subscribers, and prints confirmation.
6. **`kalceria events delete <eventId> [--jit <token>]`**
   - Destructive action. Prompts for master JIT verification if not currently in an active JIT session. Emits audit log entry.

---

### Menu 2: Event Registrations (`registrations.jsx`)
*Replaces participant table, search filters, payment verification buttons, PDF receipt exports, and participant removals.*

#### CLI Commands & Capabilities
1. **`kalceria regs list`**
   - **Flags:** `--event <eventId>`, `--status <PENDING|CONFIRMED|REJECTED>`, `--search <name/phone/email>`, `--pdf <true|false>`, `--json`
   - **Terminal Output:**
     ```text
     ┌──────────┬──────────────────────┬────────────────┬──────────────────────────┬───────────┬─────────────┬─────────┐
     │ Reg ID   │ Participant Name     │ Contact (WA)   │ Event                    │ Session   │ Payment     │ PDF     │
     ├──────────┼──────────────────────┼────────────────┼──────────────────────────┼───────────┼─────────────┼─────────┤
     │ rg-98a2  │ Otniel R.            │ +6281299990000 │ Midnight Sun Meet & Run  │ 22:00 WIB │ CONFIRMED   │ [YES]   │
     │ rg-11b3  │ Jonathan S.          │ +6285711223344 │ Midnight Sun Meet & Run  │ 23:30 WIB │ PENDING     │ [NO]    │
     └──────────┴──────────────────────┴────────────────┴──────────────────────────┴───────────┴─────────────┴─────────┘
     ```
2. **`kalceria regs verify <regId> [--notify]`**
   - Executes `PATCH /admin/registrations/:id/payment` -> sets status to `CONFIRMED`.
   - Optional `--notify`: Dispatches automated WhatsApp/Email confirmation receipt with unique QR registration token.
3. **`kalceria regs reject <regId> --reason <text>`**
   - Sets payment status to `REJECTED`, releases quota slot back to the event, logs reason in audit log.
4. **`kalceria regs receipt <regId> [--out <path.pdf>] [--open]`**
   - Calls `PATCH /admin/registrations/:id/pdf`.
   - Generates and downloads the official Kalceria Event Entry PDF ticket to the local filesystem.
   - If `--open` is passed, opens the generated PDF in the system's default PDF viewer.
5. **`kalceria regs delete <regId> [--jit <token>]`**
   - Deletes participant registration, reverses quota decrement, prompts for JIT password.

---

### Menu 3: Merch & Inventory (`products.jsx`)
*Replaces product cards, stock status toggles, Add/Edit modals, and the Record Merch Sale transaction recorder.*

#### CLI Commands & Capabilities
1. **`kalceria merch list`**
   - **Flags:** `--available`, `--sold-out`, `--json`
   - Displays real-time inventory table:
     ```text
     ┌──────────┬─────────────────────────────┬─────────────┬────────────┬──────────────┬──────────┐
     │ ID       │ Product Name                │ Price (IDR) │ Sold Count │ Total Rev.   │ Status   │
     ├──────────┼─────────────────────────────┼─────────────┼────────────┼──────────────┼──────────┤
     │ mc-01    │ Kalceria Raw Monogram Tee   │ Rp 249.000  │ 42 units   │ Rp 10.458.000│ IN STOCK │
     │ mc-02    │ Kalceria Pit Crew Hoodie    │ Rp 480.000  │ 60 units   │ Rp 28.800.000│ SOLD OUT │
     └──────────┴─────────────────────────────┴─────────────┴────────────┴──────────────┴──────────┘
     ```
2. **`kalceria merch add`**
   - Interactive prompt or flags:
     `kalceria merch add --name "Kalceria Drift Cap" --price 185000 --photo <url_or_file> --link "https://tokopedia..."`
   - Automatically supports uploading local product images to Vercel Blob directly from CLI.
3. **`kalceria merch edit <merchId>`**
   - Updates name, price, external purchasing link, or image URL.
4. **`kalceria merch toggle-stock <merchId>`**
   - Instantly toggles `isSoldOut` between `true` and `false`. Reflects immediately on public landing page.
5. **`kalceria merch sale <merchId> --qty <count> [--price <custom_price>]`**
   - **Direct Sale Recorder:** Replaces `RecordSaleModal`.
   - Records an offline/onsite meet sale into the `MerchSale` table with admin audit attribution.
   - Automatically updates `merch.soldCount` and `merch.totalRevenue`.
6. **`kalceria merch delete <merchId> [--jit <token>]`**
   - Purges item and associated sales logs (JIT required).

---

### Menu 4: Service Bookings & Car Shoot Timekeeper (`bookings.jsx`)
*Replaces unified booking tabs, service review modals, deployment area assignment, price calculator, and contract approvals.*

#### CLI Commands & Capabilities
1. **`kalceria bookings list`**
   - **Flags:** `--type <SHOOTING|HOST_EVENT|EO>`, `--status <PENDING|PROCESSED|CANCELLED>`, `--payment <PENDING|CONFIRMED>`
   - Displays incoming commercial inquiries and photoshoot timekeeper bookings:
     ```text
     ┌──────────┬───────────────────┬──────────────┬────────────┬─────────────┬──────────────┬───────────┐
     │ ID       │ Requestor         │ WhatsApp     │ Service    │ Date / Time │ Price (IDR)  │ Status    │
     ├──────────┼───────────────────┼──────────────┼────────────┼─────────────┼──────────────┼───────────┤
     │ sb-04    │ Garasi Jakarta    │ +62811223344 │ SHOOTING   │ 12 Nov, 16h │ Rp  4.500.000│ PENDING   │
     │ sb-09    │ Speedstar EO      │ +62818990011 │ EO         │ 28 Nov, Full│ Rp 18.000.000│ PROCESSED │
     └──────────┴───────────────────┴──────────────┴────────────┴─────────────┴──────────────┴───────────┘
     ```
2. **`kalceria bookings inspect <bookingId>`**
   - Shows complete client brief: Location, vehicle specs, requested camera setup, slot duration, notes.
3. **`kalceria bookings accept <bookingId>`**
   - **Flags:** `--area <deployment_location>`, `--brief <technical_notes>`, `--rate <price_per_hour>`, `--price <total_idr>`
   - Sets `ServiceBookingStatus` to `PROCESSED`.
   - Calculates duration, total cost, records deployment area, and issues acceptance notification.
4. **`kalceria bookings confirm-payment <bookingId>`**
   - Updates `paymentStatus` to `CONFIRMED`.
5. **`kalceria bookings cancel <bookingId> --reason <text>`**
   - Cancels booking, frees crew slot, logs cancellation reason.
6. **`kalceria bookings invoice <bookingId> [--out <file.pdf>] [--open]`**
   - Generates official Kalceria Service Agreement & Invoice PDF, flags `pdfExported: true`.
7. **`kalceria bookings delete <bookingId> [--jit <token>]`**
   - Deletes booking record (JIT protected).

---

### Menu 5: Earnings & Financial Telemetry (`earnings.jsx`)
*Replaces financial KPI overview and transaction breakdown.*  
> [!IMPORTANT]
> **STRICT CONSTRAINT:** Per explicit mandate, **all target graphic configurations, profit target sliders, and intelligence projection bars are permanently omitted**. Realized revenue and honest financial accounting only.

#### CLI Commands & Capabilities
1. **`kalceria earnings summary`**
   - **Flags:** `--start <YYYY-MM-DD>`, `--end <YYYY-MM-DD>`, `--json`
   - **Terminal Output (ASCII Financial Cockpit):**
     ```text
     ╔══════════════════════════════════════════════════════════════════════════╗
     ║                     KALCERIA FINANCIAL TELEMETRY                         ║
     ╠══════════════════════════════════════════════════════════════════════════╣
     ║ Period: 2026-01-01 to 2026-11-01 (Current Fiscal Year)                   ║
     ╠══════════════════════════════════════╦═══════════════════════╦═══════════╣
     ║ Revenue Stream                       ║ Amount (IDR)          ║ Share (%) ║
     ╠══════════════════════════════════════╬═══════════════════════╬═══════════╣
     ║ Commercial Services (Shoots & EO)    ║ Rp  65.500.000        ║ 46.0 %    ║
     ║ Event Registrations                  ║ Rp  48.000.000        ║ 33.7 %    ║
     ║ Merch & Retail Sales                 ║ Rp  29.000.000        ║ 20.3 %    ║
     ╠══════════════════════════════════════╬═══════════════════════╬═══════════╣
     ║ TOTAL NET REALIZED REVENUE           ║ Rp 142.500.000        ║ 100.0 %   ║
     ║ Total Processed Transactions         ║ 342 settled transactions          ║
     ╚══════════════════════════════════════╩═══════════════════════╩═══════════╝
     ```
2. **`kalceria earnings ledger`**
   - **Flags:** `--limit <n>`, `--category <services|events|merch>`, `--csv`, `--json`
   - Streams every transaction line-by-line:
     ```text
     2026-10-31 22:15 WIB | +Rp   150.000 | EVENT  | Midnight Sun Meet (rg-98a2) | user_910
     2026-10-31 18:40 WIB | +Rp   480.000 | MERCH  | Pit Crew Hoodie (mc-02 x1)  | Direct Sale
     2026-10-30 14:10 WIB | +Rp 4.500.000 | SERVICE| Garasi Car Shoot (sb-04)    | client_42
     ```
3. **`kalceria earnings export --out revenue_report.csv`**
   - Exports the entire ledger directly to CSV for spreadsheet analysis or accounting tax records.

---

### Menu 6: User Management (`users.jsx`)
*Replaces user directory, role manager (USER <-> ADMIN), telemetry inspection, and account deletions.*

#### CLI Commands & Capabilities
1. **`kalceria users list`**
   - **Flags:** `--role <USER|ADMIN>`, `--verified <true|false>`, `--search <name|email|phone>`, `--limit <n>`, `--json`
   - Formatted roster with email verification flags and live location permissions:
     ```text
     ┌──────────┬──────────────────────┬────────────────────────┬────────┬──────────┬──────────┬─────────────┐
     │ User ID  │ Name                 │ Email                  │ Role   │ Phone    │ Verified │ Live Map    │
     ├──────────┼──────────────────────┼────────────────────────┼────────┼──────────┼──────────┼─────────────┤
     │ usr-01   │ Reinathan O.         │ admin1@gmail.com       │ ADMIN  │ 0812...  │ [VERIF]  │ [ENABLED]   │
     │ usr-44   │ Kenji Sato           │ kenji@touge.id         │ USER   │ 0857...  │ [VERIF]  │ [MUTED]     │
     └──────────┴──────────────────────┴────────────────────────┴────────┴──────────┴──────────┴─────────────┘
     ```
2. **`kalceria users inspect <userId_or_email>`**
   - Terminal profile dossier:
     - Domicile Lat/Lng and city
     - Registered events count and history
     - Service bookings requested
     - Comments and landing ideas submitted
     - Mini-events created on spatial map
3. **`kalceria users set-role <userId> <USER|ADMIN> [--jit <token>]`**
   - Elevates or demotes user privileges. JIT password required. Emits security audit alert.
4. **`kalceria users delete <userId> [--jit <token>]`**
   - Hard deletes user record and cascades related bookings and registrations.

---

### Menu 7: Comments, Ideas & Community Moderation (`comments.jsx`)
*Replaces landing page feedback moderator, pinned toggles, and advice/idea category filters.*

#### CLI Commands & Capabilities
1. **`kalceria comments list`**
   - **Flags:** `--type <ADVICE|IDEA>`, `--pinned <true|false>`, `--category <cat>`, `--json`
   - Renders feedback feed:
     ```text
     ┌──────────┬────────────┬──────────┬─────────┬────────────────────────────────────────────────────────┐
     │ ID       │ Author     │ Type     │ Pinned  │ Content Preview                                        │
     ├──────────┼────────────┼──────────┼─────────┼────────────────────────────────────────────────────────┤
     │ cm-12    │ Budi Drift │ IDEA     │ [PIN]   │ Add a night run route through BSD tollway corridor!    │
     │ cm-19    │ Silvia S15 │ ADVICE   │ [   ]   │ Payment QRIS expires too fast on mobile connection.    │
     └──────────┴────────────┴──────────┴─────────┴────────────────────────────────────────────────────────┘
     ```
2. **`kalceria comments pin <commentId>` / `kalceria comments unpin <commentId>`**
   - Toggles featured pin status on the public landing page.
3. **`kalceria comments delete <commentId> [--jit <token>]`**
   - Moderates and removes inappropriate comments.
4. **`kalceria comments stream [--follow]`**
   - Live streaming terminal log of incoming user feedback in real time.

---

### Menu 8: System Health, Live Audit & Reset (`system.jsx` & Side Drawer)
*Replaces system telemetry panel, live audit feed drawer, CSV log exporter, and emergency system reset modal.*

#### CLI Commands & Capabilities
1. **`kalceria system health`**
   - Live diagnostics probing:
     - PostgreSQL database connection latency (`ms`)
     - Redis cache connection
     - Server CPU & Memory usage
     - Vercel Blob storage usage
     - Active session count
2. **`kalceria system logs`**
   - **Flags:** `--tail`, `--limit <n>`, `--admin <email>`, `--json`
   - Outputs color-coded live audit log stream:
     ```text
     [2026-11-01 00:25:12 WIB] [ADMIN: otni@kalceria.com] [EVENT_UPDATE] Modified quota on ev-run01 (100 -> 120)
     [2026-11-01 00:27:44 WIB] [ADMIN: otni@kalceria.com] [MERCH_SALE] Recorded sale mc-02 (qty: 2, total: Rp 960.000)
     [2026-11-01 00:29:05 WIB] [ADMIN: otni@kalceria.com] [JIT_VERIFY] JIT session granted (IP: 182.253.xx.xx)
     ```
3. **`kalceria system logs export [--out audit.csv]`**
   - Auto-paginates cursor `/admin/system/logs` and streams the full historical audit log directly to a local CSV file.
4. **`kalceria system reset [--jit <token>]`**
   - Emergency system reset. Requires double confirmation and active JIT token. Executes `/admin/system/reset`.

---

## 4. High-Performance SQL Views & Database Automations

To eliminate runtime join overhead and provide instant CLI query speeds, the CLI wraps pre-compiled PostgreSQL Views and automated Prisma pipelines.

### 4.1 Engineered PostgreSQL SQL Views

```sql
-- 1. vw_earnings_ledger: Pre-aggregated real-time earnings ledger
CREATE OR REPLACE VIEW vw_earnings_ledger AS
SELECT 
  'SERVICE' AS source_type,
  sb.id AS reference_id,
  u.name AS payer_name,
  sb.total_price AS amount,
  sb.created_at AS trans_date,
  sb.payment_status AS status
FROM service_bookings sb
JOIN users u ON sb.requestor_id = u.id
WHERE sb.payment_status = 'CONFIRMED'

UNION ALL

SELECT 
  'EVENT' AS source_type,
  er.id AS reference_id,
  u.name AS payer_name,
  e.price AS amount,
  er.created_at AS trans_date,
  er.payment_status AS status
FROM event_registrations er
JOIN users u ON er.user_id = u.id
JOIN events e ON er.event_id = e.id
WHERE er.payment_status = 'CONFIRMED'

UNION ALL

SELECT 
  'MERCH' AS source_type,
  ms.id AS reference_id,
  m.name AS payer_name,
  ms.total_amount AS amount,
  ms.created_at AS trans_date,
  'CONFIRMED' AS status
FROM merch_sales ms
JOIN merch m ON ms.merch_id = m.id;
```

```sql
-- 2. vw_event_capacity_realtime: Instant capacity and fill metrics
CREATE OR REPLACE VIEW vw_event_capacity_realtime AS
SELECT 
  e.id,
  e.title,
  e.status,
  e.quota,
  COUNT(er.id) FILTER (WHERE er.payment_status = 'CONFIRMED') AS confirmed_count,
  COUNT(er.id) FILTER (WHERE er.payment_status = 'PENDING') AS pending_count,
  ROUND((COUNT(er.id) FILTER (WHERE er.payment_status = 'CONFIRMED')::NUMERIC / NULLIF(e.quota, 0)) * 100, 1) AS fill_percentage,
  (e.quota - COUNT(er.id) FILTER (WHERE er.payment_status = 'CONFIRMED')) AS slots_remaining
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.title, e.status, e.quota;
```

### 4.2 Direct CLI SQL Command Runner
- `kalceria sql "SELECT * FROM vw_earnings_ledger WHERE amount > 1000000"`: Executes read-only queries with tabular formatting.
- `kalceria sql run vw_event_capacity_realtime`: Instant view rendering without browser or API server overhead.

---

## 5. Direct-to-Blob Media Pipeline & Local Pre-Processing

The CLI replaces cumbersome web-based file upload forms with a high-performance streaming pipeline:

### 5.1 The Media Command
```bash
kalceria media upload ./assets/video_minievent.mp4 --target mini-event --tag "drift-meet"
```

### 5.2 Processing Pipeline
1. **Local Media Inspection:** Detects resolution, codec, duration, and bitrate using `ffmpeg` / `sharp`.
2. **Automated LQIP Generation:** Creates low-quality image placeholder (Base64 data URL) for instant zero-layout-shift blur-up on the frontend.
3. **Web-Optimization:**
   - **Video:** Encodes to MP4 H.264 + AAC with `+faststart` flag (optimizes streaming start time on mobile).
   - **Photo:** Converts high-res PNG/JPG to WebP/AVIF at 85% quality with responsive widths.
4. **Chunked Direct-to-Blob Streaming:** Streams the binary directly to Vercel Blob storage with a live terminal progress bar:
   ```text
   [UPLOAD] video_minievent.mp4 (48.2 MB)
   [██████████████████████████████░░░░░░░░] 78% | 14.2 MB/s | ETA: 1.2s
   ✓ Upload complete: https://blob.vercel-storage.com/kalceria/video_minievent-x8a9f.mp4
   ✓ Blur-Up Data URL generated and copied to clipboard.
   ```

---

## 6. Ansible-Style Backend Playbooks & Automation Recipes

To support reproducible operations (such as recurring event launches, batch sales reconciliation, and staging environment setups), the CLI features a declarative playbook runner:

### 6.1 Playbook Command
```bash
kalceria run ./playbooks/event-launch.yml --env prod
```

### 6.2 Example Playbook: `event-launch.yml`
```yaml
name: "Midnight Touge Series 2026 Drop"
version: "1.0"
target: "production"

tasks:
  - name: "Upload Event Hero Banner"
    action: "media.upload"
    args:
      file: "./assets/posters/touge_hero.jpg"
      register_as: "BANNER_URL"

  - name: "Create Event Master Record"
    action: "events.create"
    args:
      id: "ev-touge-2026"
      title: "Kalceria Midnight Touge 2026"
      price: 250000
      quota: 120
      displayPhotoUrl: "{{ BANNER_URL }}"
      location: "Sentul Highland Circuit, Bogor"
      regStartTime: "2026-11-05T00:00:00Z"
      regEndTime: "2026-11-12T23:59:59Z"
      sessionOptions:
        - session: "Group A (Pro Drift)"
          time: "21:00 - 23:00 WIB"
        - session: "Group B (Street Enthusiast)"
          time: "23:30 - 02:00 WIB"

  - name: "Publish Broadcast Announcement"
    action: "broadcast.send"
    args:
      message: "🚨 Kalceria Midnight Touge 2026 is LIVE! Register your spot before quota fills."
      durationHours: 48
```

---

## 7. Migration Roadmap & Sunset Schedule

| Phase | Milestone | Deliverables | Status |
|---|---|---|---|
| **Phase 1** | **CLI Core Architecture** | Create `cli/` workspace with Commander, Clack prompts, API client, PKCE loopback server, and session encryption. | **READY TO BUILD** |
| **Phase 2** | **Full Command Suite** | Implement 8 command modules (`auth`, `events`, `regs`, `merch`, `bookings`, `earnings`, `users`, `comments`, `system`). | **READY TO BUILD** |
| **Phase 3** | **Blob & SQL Pipelines** | Implement media upload optimization pipeline and Prisma SQL view wrappers. | **READY TO BUILD** |
| **Phase 4** | **Ansible Playbook Engine** | Add YAML playbook parser and automated task runner. | **READY TO BUILD** |
| **Phase 5** | **Frontend Sunset & Cleanup** | Delete `frontend/app/admin/dashboard` & `frontend/components/admin/dashboard/`. Update `frontend/app/admin/login` to act solely as PKCE loopback bridge. Verify bundle savings. | **READY TO BUILD** |

---

## 8. Summary of Guarantees
1. **Zero UI Regressions on Landing Page:** The landing page, spatial map, sound design, event drops, and minigames remain 100% intact.
2. **No Target Graphic in Earnings:** The earnings module strictly calculates and outputs true revenue, breakdown streams, and transaction logs.
3. **No Attack Surface:** Administrative functions cannot be accessed via a web browser; only authenticated CLI terminal sessions hold execution authority.
4. **Instant Speed:** Real-time terminal output, stdout JSON piping, and sub-100ms API responses.

