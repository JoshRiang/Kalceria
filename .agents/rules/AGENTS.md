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
   - Commit `6926af648809dca0babfd9e2ea3f5c88c3825351` adalah Golden Baseline yang **BEKU** (Updated by Programmer).
   - DILARANG KERAS checkout, rebase, merge, atau push ke `BaselineNovember#2` tanpa perizinan eksplisit dari programmer.
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


---

## 6. Protokol Modularisasi (Berlaku untuk Tier A, Tier B, dan Setiap Ekstraksi Modul)
**Referensi wajib (baca UTUH sebelum menyentuh file Tier A/B):** `docs/KALCERIA_MODULARIZATION_STRATEGY.md`. Dokumen itu berisi inventaris atomik, Hook Ledger, kartu spesifikasi modul, KPI, dan matriks uji manual. Bagian ini hanya aturan mengikatnya.

**Cakupan:** Tier A = `frontend/components/map/MapPageClient.jsx`, `frontend/components/map/chat/hooks/usePersonalChatState.js`. Tier B = 10 file produksi 500–799 baris (daftar di dokumen strategi §9). **Tier C (300–499 baris) DILARANG diubah** dalam program ini. Test besar dibiarkan.

### 6.1 Baseline Referensi & Perlindungan `BaselineNovember#2`
1. Acuan perilaku = commit **`f1dbb70`** (kode identik dengan `6926af6`; beda hanya `AGENTS.md` dan `TEST.md`). Akses HANYA lewat hash: `git show f1dbb70:<path>`, `git archive f1dbb70`, `git diff f1dbb70`.
2. DILARANG TOTAL terhadap branch `BaselineNovember#2`: `checkout`, `switch`, `merge`, `rebase`, `reset`, `push`, `git branch -f`, membuat worktree dari branch itu. Branch itu hanya bergerak atas **perintah eksplisit programmer**.
3. Semua pekerjaan di `main`, di-push setiap commit yang lulus gate.

### 6.2 Sepuluh Hukum Besi (pelanggaran satu pun = `git revert` + kegagalan §5)
- **IL-1 Irisan Kontigu:** ekstrak hanya blok yang berurutan pada Hook Ledger; modul berisi efek menempati posisi ledger yang sama. Urutan efek (termasuk efek dalam hook eksternal) wajib identik dengan baseline.
- **IL-2 Registri Kepemilikan:** `useState`/`useRef` yang dipakai lintas blok dibuat di facade dan disuntik lewat satu parameter-object. Modul dilarang membuat ref/state bersama.
- **IL-3** Assignment `ref.current = …` di render-body DILARANG dipindah ke `useEffect` atau digeser posisi relatifnya.
- **IL-4** Updater `setMessages` yang tidak murni (persist, `ackPersonalChatRead`, `dispatchEvent('kalceria:personal-chat-read')`) dipindah **verbatim**; dilarang "dirapikan" ke efek. Itu jalur red dot.
- **IL-5** Dependency array disalin **verbatim**, termasuk yang dianggap "salah" oleh ESLint. Dilarang menambah/mengurangi dep.
- **IL-6** Handler non-memo (mis. `handleSendText`, `saveMiniEvent`, `deleteMiniEvent`, `saveBroadcast`, `handlePresenceChange`, `handleQuitConfirm`) tetap non-memo. Dilarang membungkus `useCallback`.
- **IL-7** Deduplikasi hanya untuk blok **byte-identik**. Blok yang mirip tapi berbeda (mis. persist Quick+Encrypted vs Encrypted saja) tetap terpisah.
- **IL-8** Konstanta literal (timer, batas, koordinat, nama event/storage) tidak diubah, tidak dijadikan config, tidak di-rename.
- **IL-9** Kontrak pemanggil/anak dibekukan: 58 key return `usePersonalChatState`, 9 re-export dari file hook (dipakai `ChatMessageBubble`, `ChatVoiceNoteBubble`), default export `MapPage`, seluruh nama dan nilai prop JSX ke anak, baris `dynamic(... ssr:false)` tetap di facade.
- **IL-10** Nol dependensi npm baru; nol perubahan UI/CSS/animasi; nol perbaikan lint atau dead-code dalam commit ekstraksi (dead-code hanya ditandai di dokumen strategi §14).

### 6.3 Prosedur Per-Ekstraksi (12 langkah, berurutan)
1. Baca utuh file sumber + semua konsumen (`git grep`) + helper terkait.
2. Tulis kartu spesifikasi modul dan buktikan irisan kontigu.
3. Rekam metrik baseline modul (LOC, jumlah hook, dep array).
4. Potong blok **verbatim** (termasuk komentar lama); hanya signature, parameter, `import/export` yang ditambah.
5. Ganti blok asli dengan satu panggilan modul pada posisi ledger yang sama.
6. Periksa IL-1…IL-10 satu per satu.
7. `git diff -M --color-moved=dimmed-zebra --color-moved-ws=allow-indentation-change f1dbb70 -- <paths>`: baris non-pindah hanya boleh berupa glue.
8. Jalankan seluruh gate §6.4.
9. Jalankan audit kontrak/ledger/konservasi hook; selisih harus **nol**.
10. Matriks uji manual wave terkait dijalankan programmer pada perangkat nyata.
11. Commit atomik: `refactor(<area>): extract <module> (zero-behavior-change)`, `git status` bersih.
12. Push `main`. Gagal **2 kali** pada ekstraksi yang sama → berhenti dan laporkan penyebab.

### 6.4 Gate Tambahan (melengkapi Tahap 4)
- **Gate 3b:** `node --test frontend/tests/*.test.mjs` ➔ WAJIB 100% (golden-master modul murni vs baseline `f1dbb70`).
- **Gate 3c:** `node scripts/audit/modularity-audit.mjs --check` ➔ WAJIB hijau: ukuran file/fungsi, konservasi hook (selisih 0), Hook Ledger identik, snapshot kontrak identik.
- **Status:** Gate 3b/3c **berlaku setelah Wave 0 selesai** (alatnya dibangun di Wave 0). Sebelum itu, Gate 1–4 + smoke probe tetap wajib seperti biasa.
- Lint BUKAN gate lulus/gagal (baseline sudah gagal); metriknya: temuan ESLint per file yang disentuh **tidak boleh naik**. Jalankan ESLint selalu dengan batas waktu eksplisit.
- Gate 1–4 dan 5 probe live tetap wajib di akhir tiap wave yang di-deploy. Deploy mengikuti Tahap 4.5 (dari root, JANGAN `cd backend`).

### 6.5 Aturan Modul
1. Lokasi: subfolder camelCase di sebelah file induk, mengikuti pola yang sudah ada (`mapPage/`, `personalChat/`, `mediaCard/`, `cameraCapture/`, `personalCall/`, `mapChat/`, `controllers/miniEvent/`). Jangan membuat folder paralel bila sudah ada.
2. Hook `useXxx.js`, satu hook utama per file, named export, satu parameter-object dengan nama field = nama variabel baseline.
3. Modul murni: tanpa React, **tanpa import `@/`** (helper beralias, `Date.now`, storage, `navigator`, `document` diinjeksi lewat parameter) agar dapat dites `node --test`.
4. Komentar/docstring lama yang melekat pada kode ikut dipindah. Kepala tiap modul memuat tujuan, posisi ledger, field input/output.
5. Backend (Tier B): file lama menjadi **barrel re-export** dengan nama ekspor identik; rute, middleware, dan respons tidak berubah.
6. Fixture test hanya in-memory (§1.6): dilarang membuat akun/data di Postgres/Redis.

### 6.6 Tambahan Failure Verdict ("OUT")
- Mengubah urutan efek, memindah assignment ref render-body ke efek, atau memecah efek yang memuat dua concern.
- Menambah `useCallback`/`useMemo` pada handler non-memo, atau mengubah dep array.
- Mengubah kontrak pemanggil/anak (key return, re-export, prop JSX) tanpa izin eksplisit.
- Menyentuh Tier C atau `BaselineNovember#2`.
- Melapor "sudah" sementara Gate 3b/3c (bila sudah aktif), moved-lines diff, atau matriks manual belum dijalankan.
- Menggabungkan beberapa ekstraksi dalam satu commit sehingga tidak dapat di-`git revert` secara bersih.
