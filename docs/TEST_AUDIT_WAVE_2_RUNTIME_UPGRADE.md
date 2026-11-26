# TEST AUDIT — WAVE 2/4: RUNTIME BEHAVIORAL UPGRADE (ZERO-GREP BACKEND SUITES)

> **Program**: 4-Wave Deep Test Audit & Real User-Condition Verification  
> **Wave**: **2 / 4 (SELESAI & TERVERIFIKASI 100%)**  
> **Tanggal**: 27 November 2026  
> **Baseline & Integritas**: Nol `assert.equal(true, true)` (`TRIVIAL_ASSERT_TRUE_COUNT: 0`), Nol penulisan ke Postgres produksi (`TOTAL_DB_USERS_CLEAN: 12`), Nol koneksi TCP Upstash Redis pada ke-5 suite Wave 2/4.

---

## 1. Tujuan & Hasil Utama Wave 2/4

Pada Wave 1/4 (`docs/TEST_AUDIT_WAVE_1_CENSUS_AND_TRIAGE.md`), audit menemukan bahwa 5 file test backend untuk fitur-fitur terbaru masih banyak mengandalkan pembacaan source code via `fs.readFileSync` + regex (`assert.match(src, ...)`), yang hanya membuktikan *keberadaan teks* di kode — **bukan** perilaku runtime nyata yang dialami pengguna saat memanggil Express controller & store.

Pada **Wave 2/4**, seluruh 5 suite backend tersebut di-upgrade ke **real runtime behavioral execution** menggunakan harness in-memory terisolasi (`backend/tests/helpers/inMemorySocialHarness.mjs`):

| Metrik Audit Wave 2/4 | Sebelum Wave 2 | Sesudah Wave 2 | Status |
| :--- | :--- | :--- | :--- |
| `fs.readFileSync` pada logika runtime (5 suite) | **23 pemanggilan grep source** | **0** *(hanya 3 baca file non-JS: `Dockerfile`, `prepare-java-osrm.sh`, `motorcycle.lua`)* | **100% TERELIMINASI** |
| Eksekusi controller & store nyata | Sebagian pure-helper + grep | **14 / 14 test nyata** memanggil handler Express & SQL state machine | **100% PASS** |
| Total durasi 5 suite Wave 2/4 | ~5.960 ms *(kena TCP Neon & Upstash)* | **622.5 ms** *(100% in-memory offline)* | **9.5× LEBIH CEPAT** |
| `TRIVIAL_ASSERT_TRUE_COUNT` (62 file test) | `0` | **`0`** | **CLEAN** |
| Residu akun dummy Postgres (`TOTAL_DB_USERS_CLEAN`) | `12` | **`12`** *(0 write ke DB produksi)* | **STERIL** |
| Modularity Gate 3c (`MapPageClient` & `usePersonalChatState`) | 0 Hook Delta | **0 Hook Delta & 10/10 Tier B Ratchets GREEN** | **GREEN** |

---

## 2. Arsitektur Harness In-Memory (`inMemorySocialHarness.mjs`)

File baru: [`backend/tests/helpers/inMemorySocialHarness.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/helpers/inMemorySocialHarness.mjs)

Harness ini mencegat lapisan persistensi tepat di batas Prisma & Redis tanpa mengubah 1 baris pun kode produksi:
1. **Prisma Delegates**: `prisma.user`, `prisma.miniEvent`, `prisma.callLock`, `prisma.callSignal`, `prisma.userPresence`, `prisma.eventNotification`.
2. **Prisma Raw SQL Emulator (`$executeRawUnsafe` & `$queryRawUnsafe`)**: Mengemulasikan state transaksional penuh untuk tabel:
   - `user_blocks`, `user_friends`, `friend_requests`
   - `personal_chat_clear_cutoffs`
   - `event_group_members`, `event_group_meta`, `event_group_messages`, `event_group_reads`, `event_group_calls`
   - `reels_media_posts`, `reels_post_likes`, `reels_post_comments`
   - `user_event_archives`, `user_event_archive_media`, `user_archive_settings`, `user_event_archive_deleted`
   - `event_group_blends`, `event_group_blend_members`
3. **Redis Full In-Memory Proxy + L1 Cache Flush**: Menggantikan seluruh perintah Redis (`get`, `set`, `setex`, `del`, `mget`, `sadd`, `srem`, `smembers`, `sismember`, `zadd`, `zrange`, `zrem`, `lpush`, `rpush`, `lrange`, `ltrim`, `hset`, `hget`, `hgetall`, `eval`, `pipeline()`, `multi()`) serta membilas L1 hot cache (`cache:all_kalcerians`, `cache:map_users_enriched`, `cache:mini_events:active_list:v1`) agar tidak ada kebocoran state antar test.
4. **Express `invokeController(handler, req)`**: Menjalankan controller Express asli dengan `req.user`, `req.params`, `req.query`, `req.body`, dan menangkap `statusCode`, `body`, serta `headers` secara presisi.
5. **Teardown Deterministik (`harness.restore()`)**: Mengembalikan seluruh method asli Prisma & Redis di blok `finally` pada setiap test.

---

## 3. Rincian 5 Suite Backend yang Di-Upgrade (Real User Conditions)

### 3.1 [`backend/tests/friends_and_chat_delete.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/friends_and_chat_delete.test.mjs) — `0 readFileSync`, 3/3 PASS (`45.7 ms`)
- **Friends Lifecycle (`friendsController.js` + `friendsStore.js`)**:
  - Self-request ditolak `HTTP 400`; target unverified ditolak `HTTP 404`; user yang memblokir/diblokir ditolak `HTTP 403`.
  - TTL 24 jam diverifikasi; request kadaluarsa (`expires_at < now`) saat di-accept mengembalikan `HTTP 410` + `code: 'FRIEND_REQUEST_EXPIRED'`.
  - Siklus lengkap: `send -> cancel -> re-send -> reject -> re-send -> accept` menghasilkan pertemanan timbal balik.
  - Reciprocal simultaneous request (`Carol -> Dave` lalu `Dave -> Carol`) otomatis berubah menjadi `status: 'accepted'`.
- **Friends-Only Voice/Video Call (`callSignalController.js`)**:
  - Non-friend mencoba kirim WebRTC `offer` → **wajib `HTTP 403`** (`/friends only/i`).
  - Setelah berteman → `HTTP 200`, paket `video` tersimpan dan diterima penerima lewat `getCallSignals`.
- **Map & Directory Privacy (`kalceriansDirectoryController.js`)**:
  - Non-friend mendapat `friendshipStatus: 'none'`, `isOnline: false`, `lat: null`, `lng: null`, `broadcast: null`.
  - Friend mendapat `friendshipStatus: 'friend'`, `isOnline: true`, koordinat finite, dan `broadcast.message` utuh.

### 3.2 [`backend/tests/event_group_chat_and_roles.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/event_group_chat_and_roles.test.mjs) — `0 readFileSync`, 3/3 PASS (`55.5 ms`)
- **1-Sided "Delete Chat for Me" (`personalChatClearStore.js` & `eventGroupController.js`)**:
  - User A menghapus riwayat chat pribadi & GroupChat (`clearAll: true`) → cutoff tersimpan per-user; User A hanya melihat pesan setelah cutoff, sementara User B tetap melihat **seluruh** pesan tanpa kehilangan satu pun.
- **Role Hierarchy & Maker Immunity (`eventGroupController.js`)**:
  - Join event via `addGroupMemberOnly` menempatkan user sebagai `MEMBER` (bukan Collaborator).
  - `MEMBER` dilarang ubah pengaturan grup (`HTTP 403`).
  - `MAKER` 100% kebal terhadap `kick` maupun `demote` oleh Collaborator (`HTTP 403`).
  - `COLLABORATOR` tidak bisa menurunkan sesama `COLLABORATOR` (`HTTP 403`), namun dapat mengeluarkan `MEMBER` biasa → setelah dikeluarkan, `MEMBER` langsung ditolak `HTTP 403` saat membaca pesan grup.
- **Shared "In Another Call" Lock (`eventGroupController.js` + `canonicalFallbackStore.js`)**:
  - User yang sedang aktif di panggilan Event Group 1 ditolak `HTTP 409` saat memulai panggilan di Event Group 2; setelah keluar dari panggilan pertama (`leaveEventGroupCallHandler`), panggilan di Event Group 2 sukses `HTTP 200`.

### 3.3 [`backend/tests/reels_and_public_events.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/reels_and_public_events.test.mjs) — `0 readFileSync`, 2/2 PASS (`49.9 ms`)
- **Mini Event Visibility Isolation (`eventCrudHandlers.js` + `eventFormatting.js`)**:
  - Event default tidak menyertakan `[VIS:...]` dan terurai sebagai `private`.
  - Stranger memanggil `getActiveMiniEvents` → **hanya** menerima event `public` (`ev_pub`), nol kebocoran event `private`.
  - Friend memanggil `getActiveMiniEvents` → menerima baik event `private` teman (`ev_priv`) maupun event `public` (`ev_pub`).
- **Reels Discovery End-to-End (`reelsPostController.js` + `reelsPostStore.js`)**:
  - Validasi ketat: tanpa `mediaUrl` → `HTTP 400`, caption > 240 char → `HTTP 400`, komentar > 200 char → `HTTP 400`.
  - Scoping Global vs Friends: Stranger di `scope=global` hanya melihat post `public` dengan `isFriendWithAuthor: false`; Friend di `scope=friends` melihat post `private` & `public` dengan `isFriendWithAuthor: true`.
  - Like toggle (`liked: true -> false`, `likeCount: 1 -> 0`), tambah komentar (`HTTP 201`), hapus oleh non-author (`HTTP 403`) vs hapus oleh author (`HTTP 200`).

### 3.4 [`backend/tests/event_archives_and_privacy.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/event_archives_and_privacy.test.mjs) — `0 readFileSync`, 3/3 PASS (`47.0 ms`)
- **Auto-Ingestion & Impression Clamping (`eventArchiveController.js` + `eventArchiveStore.js`)**:
  - Auto-ingest klip ke 2 event berbeda; kesan (`impression`) dipotong bersih hingga 280 karakter dan terpisah dari caption media.
- **Ownership & Visibility Matrix**:
  - Non-owner mencoba edit atau delete arsip → **wajib `HTTP 403`**.
  - Per-event Hide menyembunyikan arsip dari Stranger sementara Owner tetap melihat semua stack.
  - Blocked viewer menerima `isArchivePrivate: true` dan `archives: []` meski arsip bersifat publik.
  - Toggle **Account Private Archive** (`setUserArchivePrivacy(owner, true)`) menyembunyikan seluruh arsip dari viewer luar sementara Owner tetap memiliki akses penuh.
- **Destructive Delete & Anti-Resurrection Tombstone**:
  - `deleteUserEventArchiveHandler` menghapus arsip secara permanen dan menulis tombstone ke `user_event_archive_deleted` agar backfill otomatis tidak pernah membangkitkan arsip yang sudah dihapus pengguna.

### 3.5 [`backend/tests/group_location_blend.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/group_location_blend.test.mjs) — `0 runtime grep` (3 baca config infra), 3/3 PASS (`48.3 ms`)
- **Infra Pulau Jawa OSRM & Routing Math**: Tetap memvalidasi `infra/osrm-java/Dockerfile`, `prepare-java-osrm.sh`, `motorcycle.lua` (Java extract + tol excluded), 5 mode (`foot`, `motorcycle`, `car`, `bus`, `train`), format ETA jam/menit, segmentasi macet TomTom, dan polyline decoder.
- **Real Runtime Group Location Blend (`groupBlendController.js` + `groupBlendStore.js`)**:
  - Outsider (bukan anggota GroupChat) ditolak `HTTP 403` pada `GET` maupun `POST /join`.
  - Maker memulai Blend → otomatis join dengan mode default `'foot'`, menghasilkan `route.steps[]`, dan menyiarkan pesan `blend_invite` di GroupChat.
  - **Strict Opt-In POV Privacy**: Anggota GroupChat yang **belum** join menerima `hasActiveBlend: true`, `isJoined: false`, `participants: []`, `destination: null`, dan ditolak `HTTP 403` bila mengirim update posisi sebelum join.
  - Setelah join → konvoi berisi kedua peserta; ganti mode ke `'train'` & cek `getMyActiveBlendsHandler` sukses; saat semua peserta keluar (`leaveGroupBlendHandler`), Blend otomatis nonaktif (`is_active: false`).

---

## 4. Hasil Pipeline Verifikasi Penuh Wave 2/4

Seluruh gate dieksekusi setelah edit terakhir dan **100% HIJAU**:
1. **Wave 2/4 5 Runtime Suites**: `14 / 14 PASS` (`622.5 ms`, 0 koneksi eksternal)
2. **Core + Voice Nav + Whitelist Backend Suites** (9 file: `ingress_security_defense`, `event_media_clips`, `google_oauth_and_city_resolution`, `service_location_validation`, `temp_map_whitelist`, `voice_nav` Iter 1–4): **100% PASS**
3. **Seluruh 21 Frontend Suites**: `156 / 156 PASS` (`1358.5 ms`)
4. **TypeScript (`tsc --noEmit -p frontend/tsconfig.json`)**: **0 errors**
5. **Backend Build & ESM Graph**: `211 files` passed + `BACKEND_ESM_GRAPH_OK`
6. **Modularity Ratchet (`node scripts/audit/modularity-audit.mjs --check`)**: **0 Hook Delta** pada Tier A + **10/10 Tier B Ratchets GREEN**
7. **Zero Assert-True & Zero DB Residue**: `TRIVIAL_ASSERT_TRUE_COUNT: 0`, `TOTAL_DB_USERS_CLEAN: 12`

---

## 5. Handoff ke Wave 3/4 (`proceed 3/4`)

Target **Wave 3/4** berikutnya:
1. Perbaiki seluruh **15 kegagalan test backend legacy** pada 10 file (`block_invariant_and_event_kick`, `chat_call_bi_devices_slice`, `chat_o1_scalability_slice`, `event_registration_modular_suite`, `mailer_and_wa_pure_modules`, `mini_event_and_cleanup`, `minigame_attempt`, `minigame_voucher_email_and_video`, `need_our_help_vertical_slice`, `user_block_telemetry`).
2. Isolasi total setiap test legacy yang sebelumnya menyentuh Postgres/Redis live agar **mustahil** menulis user dummy (`hp_tester_*`, `laptop_tester_*`, `watest@kalceria.test`, `test_slice_*`) ke database produksi.
3. Jadikan **seluruh 41 / 41 file test backend PASS 100%** dengan nol residu database.
