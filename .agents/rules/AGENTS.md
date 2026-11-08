# AGENTS.MD — THE ONE-SHOT FRONTIER PROTOCOL (KALCERIA CORE)
**Target Execution Level**: Claude Opus 5.5 / Sonnet 5.5 & Gemini 4 Argon Tier  
**Fundamental Doctrine**: ONE-SHOT COMPLETION. Eksekusi liar, terburu-buru, reaktif, dan pola trial-and-error adalah PELANGGARAN FATAL ("OUT").

---

## 1. Patologi yang Dilarang Keras (The "Rushed & Reckless" Anti-Patterns)
Setiap agen yang terburu-buru akan langsung dieliminasi jika melakukan:
1. **Incremental Patching (Nambal Sulam)**:
   - Mengedit 1 file, melihat error, mengedit file ke-2, melihat error lagi, dst.
   - *Standar One-Shot*: Pahami seluruh graf ketergantungan (dependency graph) terlebih dahulu, petakan semua file yang terdampak, lalu ubah secara sinkron dan utuh dalam satu putaran.
2. **Guess & Check / Hallucinated Signatures**:
   - Menebak nama prop, signature controller, atau skema return tanpa membaca file aslinya terlebih dahulu.
   - Wajib membaca kode target dan semua pemanggilnya (consumers) sebelum menulis implementasi.
3. **Premature Hand-Off / Laporan Palsu**:
   - Memberi tahu pengguna "sedang berjalan", "sudah selesai", atau "hampir siap" padahal build/test belum terbukti 100% lulus secara diam-diam (silent verification).
   - Jangan pernah menggantung perintah di latar belakang tanpa timeout terukur.
4. **Symptomatic Band-Aids**:
   - Menggunakan `setTimeout(..., 500)`, `!important` berantai, `try-catch` kosong, atau mock palsu untuk menyembunyikan kegagalan logika fundamental.

---

## 2. Siklus Eksekusi One-Shot (Wajib Dilalui Setiap Tugas)

### Tahap 0: Deep Architectural Pause & Full Dependency Trace
Sebelum memanggil alat edit/write apa pun:
1. **Trace the End-to-End Chain**:
   - Telusuri alur data lengkap: `Hardware API / DOM Event` ➔ `React State / Custom Hook` ➔ `Client API Layer` ➔ `Express Route & Ingress Validator` ➔ `Service / Controller` ➔ `Redis / DB Storage` ➔ `WebSocket / Polling Broadcast` ➔ `Leaflet DOM / UI Reconciliation`.
2. **Inventory All Affected Artifacts**:
   - Daftarkan secara eksplisit file mana saja yang menjadi produsen (*producer*) dan konsumen (*consumer*).
   - Pastikan perubahan tipe/kontrak data di backend tidak merusak parsing di frontend, dan sebaliknya.

### Tahap 1: Zero-Assumption Contract Verification
1. Baca file target secara utuh bersama file imports dan types pendukungnya.
2. Identifikasi potensi **Race Condition**:
   - Sinkronisasi manipulasi imperatif DOM (Leaflet popups, canvas 60fps) dengan siklus hidup deklaratif React.
   - Penumpukan history browser (`popstate` / `history.back()`) pada modal bertingkat.
   - Tabrakan penulisan konkuren (concurrent writes) pada Redis atau Vercel Blob.

### Tahap 2: Mental Dry-Run (Simulasi Multi-Environment)
Uji rancangan kode di kepala terhadap 4 skenario kritis:
1. **Mobile Sensor Native (Portrait 9:16 vs Landscape 16:9)**:
   - Jangan pernah memotong layar ponsel atau memaksakan orientasi yang salah.
2. **Network Lag & Payload Concurrency**:
   - Bagaimana jika user A dan user B mengunggah klip secara bersamaan? Apakah ada data yang tertimpa?
3. **Component Unmount / Rapid Taps**:
   - Jika pengguna menutup modal atau berpindah klip dengan cepat, apakah animation frame, timer, dan audio context dibersihkan tanpa memory leak?
4. **CSS & Aspect Ratio Geometry**:
   - Pastikan elongasi dinamis mempertahankan proporsi elemen interior tanpa distorsi visual.

### Tahap 3: Unified, Decisive Implementation
1. Tulis kode dengan struktur bersih, modular, dan terisolasi.
2. Pisahkan logika kompleks ke helper modular (misal: `popupGeometry.js`, `popupGestures.js`, `cameraConstraints.js`, `recordingMime.js`, `eventMediaPersistence.js`).
3. Pertahankan Kalceria Design DNA:
   - Obsidian Black (`#0a0e27`), Deep Black (`#000000`), Neon Magenta (`#ff006e`), Golden Yellow (`#ffd60a`), Dark Gray (`#2a2d42`).
   - Sudut sharp-cut tajam, cyber grid motif, glassmorphism halus, dan GPU-accelerated motion (hanya `transform` & `opacity`).

### Tahap 4: Silent Exhaustive Verification (Tanpa Mengganggu User)
Sebelum mengeluarkan kata "sudah" atau melapor ke user, jalankan pipeline validasi otomatis secara mandiri:
1. **TypeScript Zero-Error Gate**:
   ```powershell
   npx tsc --noEmit -p frontend/tsconfig.json
   ```
2. **Backend Syntax & Integrity Gate**:
   ```powershell
   npm --prefix backend run build
   ```
3. **Automated Unit & Regression Suites**:
   ```powershell
   npm --prefix backend test
   ```
   *(Wajib 100% pass: ingress defense, spatial validation, media clips, oauth, event store).*
4. **Next.js Production Build Gate**:
   ```powershell
   npm --prefix frontend run build
   ```
5. **Deployment & Live Smoke Probe (Jika Deploying)**:
   - Deploy backend HANYA dari root dengan credentials dari `backend/.vercel/project.json`.
   - Probe endpoint `/api/health` sebelum mempromosikan build ke production.
   - Verifikasi status HTTP 200 OK via native `curl.exe` (bukan PowerShell web-request yang rentan hang).

---

## 3. Disiplin Keamanan & Git (Non-Negotiable)
1. **BaselineNovember#2 Adalah Sakral**:
   - Commit `6673153952b91b3053f5bead5863aad36fa9c80e` adalah Golden Baseline yang **BEKU**.
   - DILARANG KERAS checkout, rebase, merge, atau push ke `BaselineNovember#2`.
2. **Clean Branching**:
   - Semua pekerjaan berada di `main` dan didorong ke `origin main`.
   - Hapus semua file log dan scratch sebelum pekerjaan dinyatakan selesai. `git status` wajib *clean*.
3. **Perlindungan Secrets**:
   - Jangan pernah membaca, menampilkan, atau membocorkan isi file `.env` atau token privat ke dalam chat/log.

---

## 4. Failure Verdict ("OUT" Trigger)
Pelanggaran berikut menandakan kegagalan total kualitas eksekusi dan agen dinyatakan "OUT":
- Mengeluarkan sintaks error atau import patah yang tidak terdeteksi sebelum melapor.
- Menerapkan mock dangkal alih-alih hardware/storage pipeline riil.
- Butuh perulangan lebih dari 2 kali untuk memperbaiki bug yang sama karena kegagalan analisis di awal.
- Merusak orientasi layar HP atau memicu regresi pada fitur yang sebelumnya stabil.
- Melanggar proteksi `BaselineNovember#2`.
