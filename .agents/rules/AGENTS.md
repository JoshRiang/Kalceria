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

### C. Direktori Referensi Wajib (Cross-Document Reading Mandate)
Setiap agen WAJIB membaca, memahami, dan mematuhi dokumen-dokumen referensi berikut sebelum merancang atau menyentuh kode apa pun:
1. **Aturan Uji & Matrix Verifikasi**: [`TEST.md`](file:///d:/TheWeb/Kalceria/TEST.md) (Verifikasi seluruh fitur, security gate, dan modularity test suites).
2. **Strategi Modularisasi & Hook Ledger**: [`docs/KALCERIA_MODULARIZATION_STRATEGY.md`](file:///d:/TheWeb/Kalceria/docs/KALCERIA_MODULARIZATION_STRATEGY.md) (Inventaris atomik, 10 Iron Laws, Hook Ledger, hook conservation registry, dan 11 KPI).
3. **Standar Desain & Frontend**: [`.agents/rules/frontend-guide.md`](file:///d:/TheWeb/Kalceria/.agents/rules/frontend-guide.md) dan [`.agents/rules/CODING_STYLE.md`](file:///d:/TheWeb/Kalceria/.agents/rules/CODING_STYLE.md) (Design DNA, color palette, visual styling, dan coding style).
4. **Spesifikasi Domain & Arsitektur Kalceria**: [`docs/00-OVERVIEW.md`](file:///d:/TheWeb/Kalceria/docs/00-OVERVIEW.md) s/d [`docs/09-IMPLEMENTATION-GUIDE.md`](file:///d:/TheWeb/Kalceria/docs/09-IMPLEMENTATION-GUIDE.md) (Spesifikasi domain fitur, arsitektur data, keamanan, dan rute API).

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
   - **Gate 3b (Frontend Golden-Master Gate)**:
     ```powershell
     node --test frontend/tests/pure_modules_golden.test.mjs frontend/tests/modularity_harness.test.mjs
     ```
   - **Gate 3c (Modularity & Conservation Ratchet Gate)**:
     ```powershell
     node scripts/audit/modularity-audit.mjs --check
     ```
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
3. **Doktrin Mutlak Modul Murni (Pure Modules — Pelajaran Wave 1)**:
   - Wajib 100% bebas dari React (`useState`, `useEffect`, hooks) dan bebas manipulasi DOM langsung.
   - **DILARANG TOTAL mengimpor alias `@/`**: Semua helper beralias, dependensi luar, `Date.now`, storage, `navigator`, dan `document` WAJIB diinjeksi lewat parameter fungsi. Hal ini mutlak agar modul murni dapat dieksekusi secara instan dan headless oleh runner native `node --test` (Gate 3b) tanpa transpilation layer bundler.
   - **Immutability & Reference Preservation (IL-7)**: Fungsi pengubah status (seperti `applyPeerReadReceipt`, `filterDeletedMessages`) wajib mengembalikan referensi array asli (*same reference*) jika tidak ada elemen yang berubah, guna mencegah re-render sia-sia pada komponen konsumen.
   - **Deduplikasi Logika Murni (K7)**: Logika format teks (seperti clipboard format teks/VN/call/media) dan parsing metadata regex (seperti tag `[CAT]`, `[LOC]`, `[MEDIA]`, `[COLLABS]`) wajib disatukan ke modul murni tunggal, mengeliminasi duplikasi kode hingga 1×.
   - **Cakupan Golden Test 100%**: Setiap modul murni wajib memiliki suite pengujian golden-master di `frontend/tests/pure_modules_golden.test.mjs` yang memverifikasi seluruh variasi input, boundary condition, nilai null/kosong, dan edge case.
4. Komentar/docstring lama yang melekat pada kode ikut dipindah. Kepala tiap modul memuat tujuan, posisi ledger, field input/output.
5. Backend (Tier B): file lama menjadi **barrel re-export** dengan nama ekspor identik; rute, middleware, dan respons tidak berubah.
6. Fixture test hanya in-memory (§1.6): dilarang membuat akun/data di Postgres/Redis.
7. **Doktrin Mutlak Hook Daun Mandiri (Leaf Hooks — Pelajaran Wave 2)**:
   - **Isolasi Logika UI/Action dari Jembatan P2P & Sync Terjalin**: Hook daun beroperasi di tepi arsitektur (UI thread, menu context, action handler, listener event). Hook daun DILARANG memegang atau memodifikasi ref jembatan P2P (`peerConnectionRef`, `dataChannelRef`) atau loop sync terjalin (`syncLoop`, `deleteRev`).
   - **Hukum Besi Larangan `useCallback` pada Action Handlers (IL-6)**: Handler seperti `handleSendText`, `handlePresenceChange`, `handleQuitConfirm`, `saveBroadcast` WAJIB tetap non-memo sesuai baseline `f1dbb70`. DILARANG membungkusnya dengan `useCallback` karena membungkus handler yang membaca state dinamis (`messages`, `inputText`, `currentLocation`) akan memicu jebakan stale-closure atau dependency bloat.
   - **Pola Injeksi Parameter Objek Tunggal (Single Parameter-Object Pattern — IL-2)**: State dan ref bersama (mis. `chatScrollRef`, `activeMenuId`, `selectedMessageIds`, `currentLocation`) tetap dipegang oleh facade (`usePersonalChatState` / `MapPageClient`) dan disuntikkan ke hook daun melalui satu objek parameter tunggal. Hook daun dilarang menginstansiasi duplicate state/ref bersama.
   - **Siklus Pembersihan Event Listener Window (Zero Zombie Listeners)**: Semua hook daun yang mendaftarkan event eksternal (`window.addEventListener('kalceria:refresh-events')`, `window.addEventListener('online')`, `window.addEventListener('offline')`, timer splash, interval beacon) WAJIB membersihkan listener pada unmount (`useEffect` return cleanup). Zombie listener adalah pelanggaran fatal.
   - **Preservasi Kontrak Facade Transparan (IL-9)**: Semua state dan handler dari hook daun wajib diekspor kembali oleh facade secara transparan tanpa mengubah nama key, tipe kembalian, atau memecah kontrak pemanggil (58 keys return `usePersonalChatState` & JSX props `MapPageClient`).
8. **Doktrin Mutlak Hook Terjalin & Hook Ledger (Core Lifecycle — Pelajaran Wave 3)**:
   - **Preservasi Hook Ledger Sakral (Urutan Eksekusi E1..E7 & M1..M10 — IL-1)**:
     - Urutan efek siklus hidup adalah sakral: E3 (hidrasi cache lokal) WAJIB mendahului E4 (jembatan paket realtime P2P), dan E4 WAJIB mendahului E5 (loop sinkronisasi 304 baris).
     - Pada Map: M1 (startup gate), M2 (eager GPS), M4 (sesi), M5 (live location), M6 (refresh listener), M8 (data polling), M9/M10 (viewport/Leaflet) WAJIB mempertahankan urutan ledger identik terhadap baseline `f1dbb70`.
     - Menukar urutan hook atau memecah efek terjalin memicu *race condition* inisialisasi state, desinkronisasi pesan, dan hilangnya pesan realtime pertama.
   - **Hukum Besi Render-Body Ref Assignment (IL-3 — Anti-1-Render Lag)**:
     - Penugasan ref imperatif (`peerConnectionRef.current = ...`, `dataChannelRef.current = ...`, `mapRef.current = ...`) di dalam render-body DILARANG KERAS dipindah ke `useEffect`!
     - Pemindahan ke efek menyebabkan ref bernilai `null` atau basi (*stale*) selama fase render awal, mengakibatkan paket WebRTC pertama hilang dan kegagalan `flyTo` peta Leaflet saat startup.
   - **Doktrin Red Dot & Non-Pure Updater Verbatim (IL-4 — CH-02 / CHAT-09)**:
     - Logika pembersihan red dot dan read-ack (`ackPersonalChatRead`, dispatch event `kalceria:personal-chat-read`) yang bersarang di dalam updater `setMessages` WAJIB disalin *verbatim*; DILARANG "dibersihkan" atau dipindah ke `useEffect`.
     - Jalur ini adalah jalur instan penghapusan red dot saat pesan dibaca tanpa menunggu user mengirim balasan (CHAT-09).
   - **Pembekuan Dependency Array Verbatim (IL-5 — Anti-Network Thrashing)**:
     - Dependency array pada efek siklus hidup kompleks (E5 sync loop, M8 data polling, M2 eager GPS) DILARANG diubah, ditambah, atau dikurangi, meskipun di-flag oleh linter. Mengubah dep array memicu infinite re-fetch loop atau keheningan polling.
   - **Invariansi Kontrak 58 Key Return & 9 Re-Export (IL-9)**:
     - Facade `usePersonalChatState.js` wajib mempertahankan tepat 58 return keys dan 9 re-export tanpa ada nama yang diganti atau dihapus. `MapPageClient.jsx` wajib mempertahankan seluruh prop JSX ke komponen anak.
9. **Doktrin Mutlak Modularisasi Tier B (File Menengah 500–799 Baris — Pelajaran Wave 4)**:
   - **Pola Barrel Re-Export Backend (Zero Route / Signature Drift — IL-9)**:
     - File controller backend lama (`miniEventHandlers.js`, `personalChatController.js`) WAJIB dipertahankan sebagai facade / barrel re-export dengan nama fungsi ekspor dan signature identik.
     - Rute Express, middleware injection (`req._payloadInspected`), dan format respons JSON (`{ success, data, error }`) DILARANG berubah 1 bit pun.
   - **Dekomposisi Frontend Berbasis Sub-Komponen Terfokus & Hardware Decoupling**:
     - Komponen UI monolitik dipotong menjadi sub-komponen terisolasi di subfolder camelCase (`mediaCard/`, `cameraCapture/`, `kalceriansPanel/`, `editProfile/`, `dashboard/`).
     - Logika hardware stream, MIME codec, dan constraints dipisahkan ke helper murni independen (`cameraConstraints.js`, `recordingMime.js`).
     - Logika gestur, geometri, dan rasio aspek dipisahkan ke helper modular (`popupGeometry.js`, `popupGestures.js`).
   - **Preservasi Props JSX & Event Callbacks**:
     - Seluruh nama prop JSX, state internal, dan handler interaktif komponen anak wajib identik dengan baseline `f1dbb70`.
   - **Penegakan Batas LOC Maksimum (< 450 Baris)**:
     - Seluruh 10 file Tier B yang telah di-refactor wajib tetap berada di bawah batas ratchet ceiling yang didefinisikan dalam `scripts/audit/thresholds.json`. Pembengkakan kembali di atas threshold memicu kegagalan Gate 3c.

### 6.6 Tambahan Failure Verdict ("OUT")
- Mengubah urutan efek, memindah assignment ref render-body ke efek, atau memecah efek yang memuat dua concern (pelanggaran IL-1 & IL-3).
- Memindahkan logic read-ack/red-dot dari updater `setMessages` ke dalam efek (pelanggaran IL-4).
- Menambah `useCallback`/`useMemo` pada handler non-memo, atau mengubah dep array (pelanggaran IL-5 & IL-6).
- Memecah atau menduplikasi kepemilikan state/ref bersama ke dalam hook daun alih-alih menginjeksinya lewat objek parameter tunggal dari facade (pelanggaran IL-2).
- Meninggalkan event listener window tanpa fungsi cleanup unmount (kebocoran zombie listener).
- Mengubah kontrak pemanggil/anak (58 key return `usePersonalChatState`, 9 re-export, prop JSX) tanpa izin eksplisit (pelanggaran IL-9).
- Merusak signature atau nama ekspor fungsi pada barrel re-export controller backend Tier B.
- Melanggar batas ratchet LOC Tier B pada `scripts/audit/modularity-audit.mjs` (Gate 3c).
- Menyentuh Tier C atau `BaselineNovember#2`.
- Melapor "sudah" sementara Gate 3b/3c (bila sudah aktif), moved-lines diff, atau matriks manual belum dijalankan.
- Menggabungkan beberapa ekstraksi dalam satu commit sehingga tidak dapat di-`git revert` secara bersih.
