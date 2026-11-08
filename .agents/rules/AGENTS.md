# AGENTS.MD — THE ONE-SHOT FRONTIER PROTOCOL (KALCERIA CORE)
**Target Execution Level**: Claude Opus 5.5 / Sonnet 5.5 & Gemini 4 Argon Tier  
**Fundamental Doctrine**: ONE-SHOT COMPLETION. Eksekusi liar, terburu-buru, reaktif, dan pola trial-and-error adalah PELANGGARAN FATAL ("OUT"). Dilarang goblok, dilarang ceroboh, dilarang nambal sulam!

---

## 1. Patologi yang Dilarang Keras (The "Rushed & Reckless" Anti-Patterns)
Setiap agen yang terburu-buru akan langsung dieliminasi ("OUT") tanpa kompromi jika melakukan:
1. **Incremental Patching (Nambal Sulam Tolol)**:
   - Mengedit 1 file, melihat error, mengedit file ke-2, melihat error lagi, dst.
   - *Standar One-Shot*: Pahami seluruh graf ketergantungan (dependency graph) terlebih dahulu, petakan semua file yang terdampak, lalu ubah secara sinkron dan utuh dalam satu putaran bersih.
2. **Guess & Check / Hallucinated Signatures (Asal Tebak / Halusinasi)**:
   - Memanggil fungsi atau prop tanpa import yang nyata (e.g. memanggil `inferIsVideoMediaUrl` tanpa import hingga bikin Error Boundary meledak).
   - Wajib membaca kode target dan semua pemanggilnya (*consumers*) sebelum menulis implementasi.
3. **Premature Hand-Off / Laporan Palsu**:
   - Memberi tahu pengguna "sedang berjalan", "sudah selesai", atau "hampir siap" padahal build/test belum terbukti 100% lulus secara diam-diam (*silent verification*).
   - Jangan pernah menggantung perintah di latar belakang tanpa timeout terukur.
4. **Symptomatic Band-Aids**:
   - Menggunakan `setTimeout(..., 500)`, `!important` berantai, `try-catch` kosong, atau mock palsu untuk menyembunyikan kegagalan logika fundamental.
5. **Deployment Buta (Blind Deployment Disaster)**:
   - DILARANG KERAS menjalankan `cd backend; npx vercel`! Vercel backend project sudah memiliki setting `Root Directory: backend`. Masuk ke folder `backend/` lalu deploy akan mengunggah folder kosong `backend/backend` yang menghancurkan seluruh routing API ke status 404!
6. **Pembuatan User Dummy / Mock Tanpa Izin (Unauthorized Mock Users)**:
   - DILARANG KERAS membuat, men-seed, menginjeksi, atau meninggalkan akun user dummy / mock di database (Postgres/Redis) maupun UI publik (e.g. akun "HP Mobile User", "Tester", dsb), KECUALI dengan perizinan eksplisit dan tertulis dari programmer.
   - Setiap automated test dilarang keras mengotori database produksi. Jika pengujian membutuhkan entitas, gunakan mock in-memory, transaction rollback, atau wajib teardown & hard purge instan hingga 100% bersih tanpa residu.

---

## 2. Hukum Anti-Regresi & Standar Best Practices (Core Mandates)

### A. Zero Regression on Older Commits (Analisis Adalah Titik Berat)
1. **Analisis Komparatif Sebelum Menyentuh Kode**:
   - Jangan pernah mengubah logika yang sudah bekerja di commit sebelumnya (khususnya `BaselineNovember#2` dan commit-commit historis stabil).
   - Analisis mendalam adalah titik berat: Teliti *mengapa* kode lama bekerja, apa asumsi dasarnya, parameter apa yang dipakai, dan pastikan fitur baru tidak merusak atau mengurangi kapabilitas yang sudah ada.
2. **Preservasi Kontrak & Side-Effect Safety**:
   - Jika melakukan refactoring, pastikan semua pemanggil lama (*callers*) tetap menerima signature dan perilaku yang identik tanpa degradasi UX.

### B. Arsitektur Wajib Modular (Untuk Semua Kode Saat Ini & Masa Depan)
1. **Single Responsibility Principle (SRP)**:
   - Dilarang keras membuat komponen monolitik atau fungsi raksasa ("god objects").
   - Kode baru dan masa depan WAJIB dipecah ke modul-modul independen dan terisolasi:
     - Geometri, kalkulasi rasio, dan transformasi ➔ Helper modular (e.g. `popupGeometry.js`).
     - Gesture, swipe, hold-to-pause, drag ➔ Helper interaksi modular (e.g. `popupGestures.js`).
     - Hardware stream, constraints, MIME codec ➔ Modul hardware terpisah (e.g. `cameraConstraints.js`, `recordingMime.js`).
     - Storage, persistence, Redis multi-clip ➔ Modul domain store (e.g. `eventMediaPersistence.js`).
2. **Kerapian & Kepatuhan Standar Proyek (Clean Code)**:
   - Ikuti konvensi penamaan, struktur direktori, dan pola arsitektur yang sudah ada di Kalceria.
   - Bersihkan dead code, jangan tinggalkan comment hacking atau kode usang.
   - Penanganan error harus eksplisit dan memberikan feedback terukur, bukan silent failure.

---

## 3. Siklus Eksekusi One-Shot (Wajib Dilalui Setiap Tugas)

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
   - Tabrakan penulisan konkuren (*concurrent writes*) pada Redis atau Vercel Blob.

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
1. Tulis kode dengan struktur bersih, modular, dan terisolasi sesuai standar Kalceria.
2. Pertahankan Kalceria Design DNA:
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
   node --test backend/tests/ingress_security_defense.test.mjs backend/tests/event_media_clips.test.mjs backend/tests/google_oauth_and_city_resolution.test.mjs backend/tests/service_location_validation.test.mjs
   ```
   *(Wajib 100% pass: ingress defense, spatial validation, media clips, oauth, event store).*
4. **Next.js Production Build Gate**:
   ```powershell
   npm --prefix frontend run build
   ```
5. **Deployment & Live Smoke Probe (Jika Deploying)**:
   - Deploy backend HANYA dari root dengan credentials dari `backend/.vercel/project.json` (JANGAN PERNAH `cd backend`!):
     ```powershell
     $beProj = Get-Content backend\.vercel\project.json | ConvertFrom-Json
     $env:VERCEL_ORG_ID = $beProj.orgId
     $env:VERCEL_PROJECT_ID = $beProj.projectId
     npx vercel --prod --yes
     ```
   - Deploy frontend dari root:
     ```powershell
     $feProj = Get-Content .vercel\project.json | ConvertFrom-Json
     $env:VERCEL_ORG_ID = $feProj.orgId
     $env:VERCEL_PROJECT_ID = $feProj.projectId
     npx vercel --prod --yes
     ```
   - Verifikasi status live via native `curl.exe` (Wajib lulus ketiganya):
     1. `curl.exe -i -s https://api.kalceria.id/api/health` ➔ WAJIB HTTP 200 OK + `db:connected, redis:PONG`.
     2. `curl.exe -i -s https://www.kalceria.id/api/auth/csrf` ➔ WAJIB HTTP 200 OK + valid csrfToken.
     3. `curl.exe -i -s https://www.kalceria.id/api/users/me` ➔ WAJIB HTTP 401 Unauthorized (bukan 404!).
     4. `curl.exe -I -s https://www.kalceria.id/` ➔ WAJIB HTTP 200 OK.
     5. `curl.exe -I -s https://www.kalceria.id/map` ➔ WAJIB HTTP 200 OK.

---

## 4. Disiplin Keamanan & Git (Non-Negotiable)
1. **BaselineNovember#2 Adalah Sakral**:
   - Commit `6673153952b91b3053f5bead5863aad36fa9c80e` adalah Golden Baseline yang **BEKU**.
   - DILARANG KERAS checkout, rebase, merge, atau push ke `BaselineNovember#2`.
2. **Clean Branching**:
   - Semua pekerjaan berada di `main` dan didorong ke `origin main`.
   - Hapus semua file log dan scratch sebelum pekerjaan dinyatakan selesai. `git status` wajib *clean*.
3. **Perlindungan Secrets**:
   - Jangan pernah membaca, menampilkan, atau membocorkan isi file `.env` atau token privat ke dalam chat/log.
4. **Proteksi Integritas Data Publik (Zero Dummy Accounts)**:
   - Database publik, cache Kalcerians (`cache:all_kalcerians`), dan map feed WAJIB steril dari akun buatan/dummy.
   - Pembuatan akun uji coba di database produksi tanpa izin eksplisit programmer adalah pelanggaran fatal integritas data.

---

## 5. Failure Verdict ("OUT" Trigger)
Pelanggaran berikut menandakan kegagalan total kualitas eksekusi dan agen dinyatakan "OUT":
- Mengeluarkan sintaks error atau import patah yang tidak terdeteksi sebelum melapor.
- Menerapkan mock dangkal alih-alih hardware/storage pipeline riil.
- Menjalankan `cd backend; npx vercel` yang membunuh API production.
- Membuat atau meninggalkan user dummy/mock di database atau UI publik tanpa izin programmer.
- Butuh perulangan lebih dari 2 kali untuk memperbaiki bug yang sama karena kegagalan analisis di awal.
- Merusak orientasi layar HP atau memicu regresi pada fitur yang sebelumnya stabil di older commits.
- Menulis kode monolitik yang melanggar prinsip modularitas.
- Melanggar proteksi `BaselineNovember#2`.
