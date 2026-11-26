# TEST AUDIT WAVE 1/4 — FULL REPO CENSUS, DEFECT TRIAGE & IMMEDIATE FIXES

**Wave:** `1 / 4`  
**Date:** 2026-11-27  
**Scope:** Audit menyeluruh seluruh **62 file test** (`41` backend + `21` frontend = **553 test cases**) di repository Kalceria terhadap aturan mutlak:
1. **ZERO `assert.equal(true, true)` / `assert.ok(true)`** (nol assertion palsu/tautologis).
2. **ZERO test gagal / usang / salah kontrak**.
3. **Uji kondisi nyata sisi user** (eksekusi perilaku runtime, authorization boundary, edge case, & state transition — bukan sekadar `fs.readFileSync` grep teks kode sumber).
4. **ZERO polusi database produksi** (nol dummy user tertinggal di Postgres/Redis).

---

## 1. Hasil Sensus Empiris Awal (Sebelum Perbaikan Wave 1/4)

| Kategori Audit | Backend (`41` file) | Frontend (`21` file) | Total (`62` file) |
|---|---:|---:|---:|
| Total Test Cases Dieksekusi | `397` | `156` | **`553`** |
| Lulus (Baseline sebelum Wave 1) | `382` | `150` | `532` |
| **Gagal (Real Broken Tests)** | **`15`** *(di 10 file)* | **`5`** *(di 3 file)* | **`20`** |
| **FATAL: Trivial `assert.equal(true, true)`** | **`1`** (`event_media_clips.test.mjs:218`) | `0` | **`1`** |
| **Test Grep-Only (`readFileSync` dominan / tanpa eksekusi runtime)** | `5` file fitur baru | `6` file UI/wiring | **`11` file** |
| **Polusi DB Produksi oleh Test Legacy** | **4 stray users ditemukan & di-purge!** | `0` | **4 dibersihkan (`12` real users utuh)** |

---

## 2. Temuan Kritis yang Langsung Diselesaikan pada Wave 1/4

### A. Eliminasi `assert.equal(true, true)` (Defect Class 1 — SELESAI!)
- **Lokasi**: [backend/tests/event_media_clips.test.mjs:218](file:///d:/TheWeb/Kalceria/backend/tests/event_media_clips.test.mjs)
- **Masalah Lama**: Memanggil `writeEventClips()` lalu `removeEventClipIds()`, lalu mengakhiri test dengan `assert.equal(true, true)` tanpa pernah memverifikasi apakah data benar-benar tersimpan, terurut, atau terhapus!
- **Perbaikan Wave 1/4**: Diganti menjadi pengujian siklus hidup penuh: menulis 2 klip dari 2 user berbeda (creator + guest) dalam urutan timestamp terbalik → `readEventClips()` memverifikasi `initialized === true` & urutan kronologis `[clip1, clip2]` → hapus parsial `clip1` memverifikasi klip guest `clip2` tetap utuh → hapus `clip2` memverifikasi `clips.length === 0` → `finally { purgeAllEventClips() }`.

### B. Pembersihan Polusi DB Produksi dari Test Legacy (SELESAI!)
- Saat seluruh 41 file backend dijalankan, ditemukan 4 akun dummy (`hp_tester_1794225796969@kalceria.id`, `laptop_tester_1794225796968@kalceria.id`, `watest@kalceria.test`, `test_slice_1795723634003@kalceria.id`) yang tertinggal di Postgres karena test legacy terhubung langsung ke `DATABASE_URL` produksi tanpa isolasi.
- **Tindakan**: Ke-4 akun dummy langsung di-hard-purge (`TOTAL_DB_USERS_CLEAN: 12`), dan seluruh test legacy tersebut dijadwalkan untuk diisolasi penuh pada **Wave 3/4**.

### C. Perbaikan 5 Test Frontend yang Gagal (SELESAI — 156/156 Frontend PASS 100%!)
1. [frontend/tests/media_upload_and_popup_integrity.test.mjs](file:///d:/TheWeb/Kalceria/frontend/tests/media_upload_and_popup_integrity.test.mjs) (`3` gagal → `0` gagal):
   - Diperbarui dari kontrak lama `4.5 MB` ke batas upload terpadu saat ini **`10 MB`** (`MAX_MEDIA_UPLOAD_BYTES === 10 * 1024 * 1024`) & opacity HD EventPopup v62 (`0.92 : 0.95`).
2. [frontend/tests/popup_view_count_animation.test.mjs](file:///d:/TheWeb/Kalceria/frontend/tests/popup_view_count_animation.test.mjs) (`1` gagal → `0` gagal):
   - Disesuaikan dengan keputusan produk commit `bce3d77` (media view counter Event Popup sengaja dihapus, sementara Broadcast view counter `api.post('/broadcast/...')` tetap aktif dengan CSRF & animasi slide-down).
3. [frontend/tests/v53_carousel_and_r2_helpers.test.mjs](file:///d:/TheWeb/Kalceria/frontend/tests/v53_carousel_and_r2_helpers.test.mjs) (`1` gagal → `0` gagal):
   - Diperbarui dari `24` menjadi **`37`** aset HD background (`v62` + `v63` Reels/PostForm/ProfileCard/GroupProfile/ChatWithOthers/AssignMeeting), dengan verifikasi seluruh 37 URL CDN + keberadaan 37 file fallback lokal `.webp` di disk.

---

## 3. Peta Lengkap Triage untuk Wave 2/4, 3/4 & 4/4

### Target Wave 2/4 (`proceed 2/4`) — Upgrade 5 Test Fitur Baru Backend dari Grep-Only ke Real Runtime User Simulation (In-Memory, 0 DB Pollution!)
1. `backend/tests/friends_and_chat_delete.test.mjs` *(saat ini 3/4 regex grep)* → eksekusi nyata `callSignalController` (non-friend `403`, friend `200`), `kalceriansDirectoryController` (Global max 8 & `broadcast: null`), dan `friendsController` (TTL 24h & accept/reject flow).
2. `backend/tests/event_group_chat_and_roles.test.mjs` *(saat ini 3/3 regex grep!)* → eksekusi nyata `chatInboxController` + `chatMessageQuery` (*Delete Chat for Me* 1 sisi), `eventGroupController` (Maker 100% kebal kick/demote `403`, Collab promote Member, Envelope hanya tambah Member).
3. `backend/tests/reels_and_public_events.test.mjs` *(saat ini 2/3 regex grep)* → eksekusi nyata `getActiveMiniEvents` (public terlihat global, private terisolasi Friends) & `reelsPostController` (Global vs Friends feed + `canReply` friend-only).
4. `backend/tests/event_archives_and_privacy.test.mjs` → eksekusi nyata `eventArchiveController` (Owner vs Stranger, `isArchivePrivate`, Hide & Destructive Delete).
5. `backend/tests/group_location_blend.test.mjs` → eksekusi nyata `groupBlendController` (Outsider `403`, Non-joined Member `participants: []`, Joined Member mendapat rute + `steps[]` + arrived `< 20m`).

### Target Wave 3/4 (`proceed 3/4`) — Perbaikan Seluruh 15 Failure Backend Legacy & Isolasi Nol Polusi DB Produksi
| File Backend | Jumlah Gagal | Akar Masalah Teridentifikasi | Rencana Perbaikan Wave 3/4 |
|---|---:|---|---|
| `block_invariant_and_event_kick.test.mjs` | 1 | Memicu panggilan antar 2 user non-friend yang kini memang diblokir `403` oleh guard Friends-only (`352cd0b`) | Uji KEDUA kondisi nyata: non-friend call → `403`, dan **friend-yang-diblokir** call → `200 isBlockedDrop` tanpa terkirim! |
| `event_registration_modular_suite.test.mjs` | 1 | Perubahan aturan guest/session auth di `verifyEventRegistrationAuthorization` | Audit kode aktual & perbaiki skenario auth nyata |
| `mailer_and_wa_pure_modules.test.mjs` | 3 | Copy HTML email & SVG timer badge diperbarui pada commit sebelumnya | Audit template mailer riil & verifikasi seluruh elemen kritis email |
| `need_our_help_vertical_slice.test.mjs` | 1 | Ekspektasi regex `Terkonfirmasi &amp; Terkunci` pada Email #3 setelah copy dirapikan | Sinkronkan dengan teks konfirmasi riil & pastikan tetap **0 tombol** |
| `mini_event_and_cleanup.test.mjs` | 1 | Legacy media timestamp split pasca migrasi `[CMETA]` | Verifikasi perilaku parsing legacy + `[CMETA]` aktual |
| `minigame_attempt.test.mjs` | 2 | Ketergantungan state Redis/DB harian live | Isolasi in-memory mock Prisma/Redis agar deterministik & nol polusi |
| `minigame_voucher_email_and_video.test.mjs` | 2 | Query live DB produksi & state mock idempotency | Isolasi penuh + verifikasi kontrak voucher & finalizer riil |
| `user_block_telemetry.test.mjs` | 1 | Residu `usr_bob_67890` di store bersama antar subtest | Bersihkan fixture deterministik & isolasi in-memory |
| `chat_o1_scalability_slice.test.mjs` | 1 | Kegagalan kuota Upstash Redis (500k limit) saat stress-test | Isolasi Redis in-memory + verifikasi kompleksitas O(1) nyata |
| `chat_call_bi_devices_slice.test.mjs` | 1 | `Error: Connection is closed` akibat Upstash Redis limit & memodifikasi Postgres live | Tambah guard throwaway/in-memory agar 100% deterministik & nol dummy user di DB produksi |

### Target Wave 4/4 (`proceed 4/4`) — Upgrade Test Frontend Grep-Only + Permanent Zero-Assert-True Audit Gate (`62/62` File 100% HIJAU)
- Upgrade `event_archives_and_standalone_panels.test.mjs`, `call_unified_video_upgrade.test.mjs`, `service_request_integrity.test.mjs`, `location_polling_and_map_zoom.test.mjs`, `group_location_blend.test.mjs`, dan `temp_map_whitelist.test.mjs` agar menguji eksekusi perilaku nyata (bukan hanya grep sumber).
- Membangun gate otomatis permanen `scripts/audit/test-quality-audit.mjs` yang menolak setiap `assert.equal(true, true)` / `assert.ok(true)` / test gagal, lalu menjalankan verifikasi penuh seluruh 62 file test!
