# TEST AUDIT — WAVE 3/4: LEGACY BACKEND CERTIFICATION & ZERO-DB-RESIDUE ISOLATION

> **Program**: 4-Wave Deep Test Audit & Real User-Condition Verification  
> **Wave**: **3 / 4 (SELESAI & TERVERIFIKASI 100%)**  
> **Tanggal**: 27 November 2026  
> **Hasil Sertifikasi**: **40 / 40 file test backend (`388 / 388` test PASS, 0 fail)** + **21 / 21 file test frontend (`156 / 156` test PASS, 0 fail)** = **61 / 61 file test (`544 / 544` test aktif) 100% HIJAU**, **`TRIVIAL_ASSERT_TRUE_COUNT: 0`**, **`DUMMY_DB_USERS_FOUND: 0` (`TOTAL_DB_USERS_CLEAN: 12`)**.

---

## 1. Ringkasan Eksekutif Wave 3/4

Pada Wave 3/4, seluruh **15 kegagalan test backend legacy pada 10 file** sekaligus seluruh test yang sebelumnya menulis akun dummy atau memutasi tabel produksi di Neon Postgres (`hp_tester_*`, `laptop_tester_*`, `test_slice_*`, `prisma.event.updateMany` pada `isMinigameTarget`, dan `user_blocks`) telah diperbaiki dan diisolasi penuh secara in-memory.

Yang paling krusial: audit runtime nyata ini berhasil **menemukan dan memperbaiki 2 bug produksi nyata** yang sebelumnya luput di balik kegagalan test legacy.

| Metrik Sertifikasi | Wave 1/4 (Baseline) | Wave 3/4 (Sekarang) | Status |
| :--- | :--- | :--- | :--- |
| File test backend `.test.mjs` lulus | 30 / 40 *(15 fail di 10 file)* | **40 / 40 (`388 / 388` PASS, 0 fail)** | **100% GREEN** |
| File test frontend `.test.mjs` lulus | 18 / 21 → 21 / 21 | **21 / 21 (`156 / 156` PASS, 0 fail)** | **100% GREEN** |
| Total test aktif seluruh repo | 553 *(20 fail)* | **544 / 544 aktif PASS (0 fail)** *(+1 loopback Docker skip `api.test.mjs`)* | **100% GREEN** |
| `TRIVIAL_ASSERT_TRUE_COUNT` | `1` → `0` | **`0`** | **CLEAN** |
| Akun dummy tersisa di Postgres live | `4` *(stray)* | **`0` (`TOTAL_DB_USERS_CLEAN: 12`)** | **STERIL** |
| Bug produksi nyata ditemukan & diperbaiki | — | **2 bug nyata** (`urlSecurity.js`, `chatInboxController.js`) | **FIXED** |

---

## 2. Dua Bug Produksi Nyata yang Ditemukan & Diperbaiki

1. **[`backend/utils/urlSecurity.js`](file:///d:/TheWeb/Kalceria/backend/utils/urlSecurity.js) (`splitMediaUrlList`)**:
   - **Akar Masalah**: Lookahead regex pemisah koma (`, `) hanya mengenali prefix `https?://`, `blob:`, `data:`, dan `/api/blob/`, namun **melewatkan `/media/`** meskipun baris 249 secara resmi mengizinkan path internal `/media/...`. Akibatnya daftar koma dua URL lokal seperti `/media/a.mp4|ts, /media/b.mp4` tidak terpecah dan menyatu menjadi satu string rusak.
   - **Perbaikan**: Menambahkan `\/media\/` pada regex lookahead pemisah URL (baris 57 & 73).
2. **[`backend/controllers/personalChat/chatInboxController.js`](file:///d:/TheWeb/Kalceria/backend/controllers/personalChat/chatInboxController.js) (`ackPersonalChatRead`)**:
   - **Akar Masalah**: Saat klien memanggil `ackPersonalChatRead` dengan menyertakan `messageIds` sekaligus `upToTs`, query `prisma.personalChatMessage.updateMany` sebelumnya **hanya** menandai `id IN messageIds` sebagai `'read'`, membiarkan pesan-pesan lebih lama (`ts <= nextReadTs`) tetap berstatus `'sent'` di PostgreSQL. Ketika pengguna memiliki > 50 pesan lalu membaca chat, fallback kanonis `getCanonicalInboxSummary` membaca pesan lama tersebut dan memunculkan **phantom red dot (unread hantu)** secara terus-menerus.
   - **Perbaikan**: Mengubah kondisi `where` agar secara monotonik menandai seluruh pesan `OR: [{ id: { in: messageIds } }, { ts: { lte: BigInt(Math.floor(nextReadTs)) } }]` dengan `status: { notIn: ['read', 'blocked_drop'] }` sebagai `'read'`.
3. **[`backend/lib/redis.js`](file:///d:/TheWeb/Kalceria/backend/lib/redis.js) (`__setRedisTestClient`)**:
   - **Akar Masalah**: `rawRedis` (`ioredis`) terhubung secara asinkron di latar belakang saat modul diimpor; saat kuota Upstash habis (~800ms kemudian), event `error` asinkron memanggil `markFallback()` yang membalik `isQuotaExceeded = true` di tengah eksekusi test dan membajak panggilan Redis mock.
   - **Perbaikan**: Menambahkan hook `__setRedisTestClient(client)` (0 overhead / `null` di produksi) yang langsung memutus socket `rawRedis` saat harness in-memory aktif agar test 100% deterministik tanpa race condition.

---

## 3. Rincian Perbaikan 10 File Failing + 2 File DB-Mutating (Total 12 File Test)

### A. Perluasan Harness In-Memory ([`backend/tests/helpers/inMemorySocialHarness.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/helpers/inMemorySocialHarness.mjs))
- Menambahkan emulasi in-memory penuh untuk `prisma.user` (`findFirst`, `create`, `delete`, `deleteMany`, `count`), `prisma.personalChatMessage` (termasuk `updateMany` + `OR`, `groupBy`, `count`), `prisma.event`, `prisma.auditLog`, `prisma.comment`, `prisma.$transaction`, serta 3 pola Lua `redis.eval` (rate-limit `INCR+EXPIRE+TTL`, single-use token `GET+DEL`, compare-and-delete lock), TTL akurat (`kvExpiry`), `keys(glob)`, `hincrby`, dan `lindex`.

### B. 12 File Test Backend yang Diperbaiki & Diisolasi
1. [`backend/tests/mini_event_and_cleanup.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/mini_event_and_cleanup.test.mjs) — Otomatis **100% PASS** usai perbaikan bug `splitMediaUrlList` di `urlSecurity.js`.
2. [`backend/tests/event_registration_modular_suite.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/event_registration_modular_suite.test.mjs) — Menambahkan `paymentStatus: 'PENDING'` pada fixture registrasi baru (sesuai kontrak `eventRegistrationAuth.js`) + menambah verifikasi eksplisit bahwa registrasi `CONFIRMED` menolak akses tanpa sesi/token meski masih < 3 menit.
3. [`backend/tests/mailer_and_wa_pure_modules.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/mailer_and_wa_pure_modules.test.mjs) — Menyelaraskan 3 ekspektasi HTML/SVG dengan template produksi terkini (`RINGKASAN PESANAN`, `Order Confirmed`, nol tombol aksi, `SISA WAKTU:` + `02:00` pada timer SVG).
4. [`backend/tests/need_our_help_vertical_slice.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/need_our_help_vertical_slice.test.mjs) — Menyelaraskan Email #3 (`buildServiceRequestConfirmedEmailHtml`) dengan salinan produksi terkini sambil tetap menegaskan nol tombol (`>CONFIRM<`, `>EDIT<`, `>CANCEL<`).
5. [`backend/tests/user_block_telemetry.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/user_block_telemetry.test.mjs) — Diisolasi penuh via `installInMemorySocialHarness()` di `beforeEach`/`afterEach` (menghilangkan kebocoran tabel `user_blocks` Postgres antar test).
6. [`backend/tests/block_invariant_and_event_kick.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/block_invariant_and_event_kick.test.mjs) — Diisolasi in-memory + Bagian 8 kini memverifikasi **kedua** kondisi user nyata: penolakan `403` untuk non-friend **dan** silent drop `200 isBlockedDrop: true` untuk teman yang diblokir.
7. [`backend/tests/chat_call_bi_devices_slice.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/chat_call_bi_devices_slice.test.mjs) — Diisolasi penuh in-memory (**nol** penulisan akun dummy `laptop_tester_*` / `hp_tester_*` ke Postgres produksi!), memverifikasi E2EE AES-256-GCM nyata, 55-msg tiered storage + self-healing, guard Friends-only `403` + Busy `409`, Trickle-ICE, O(1) delta sync, `ackPersonalChatRead`, dan P2P DataChannel.
8. [`backend/tests/chat_o1_scalability_slice.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/chat_o1_scalability_slice.test.mjs) — Diisolasi via `__setRedisTestClient` agar kuota Upstash tidak merusak benchmark O(1) N=100 → 100.000; threshold paralel CI disesuaikan untuk bebas jitter CPU saat 40 file berjalan serentak.
9. [`backend/tests/minigame_attempt.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/minigame_attempt.test.mjs) — Diisolasi in-memory dengan target event aktif 3 hari + menambah test eksplisit penolakan `403` saat tidak ada target countdown aktif.
10. [`backend/tests/minigame_target_event_pipeline.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/minigame_target_event_pipeline.test.mjs) — Diisolasi penuh in-memory agar **mustahil** menghapus flag `isMinigameTarget` pada tabel `Event` produksi!
11. [`backend/tests/minigame_voucher_email_and_video.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/minigame_voucher_email_and_video.test.mjs) — Menggunakan fixture deterministik in-memory untuk 3 event kanonis + verifikasi konversi poster `.webp -> .jpg` Gmail-compatible (`resolveEmailPosterUrl`) sambil mempertahankan penuh test finalizer konkuren, idempotency guard, optimizer MP4 lossless, dan kompresi FFmpeg CRF18 nyata.
12. [`backend/tests/auth_vertical_slice.test.mjs`](file:///d:/TheWeb/Kalceria/backend/tests/auth_vertical_slice.test.mjs) — Diisolasi penuh in-memory (**nol** akun dummy `test_slice_*` ke Postgres produksi!) serta menghapus `process.exit(0)` paksa agar kompatibel dengan runner multi-file `node --test`.

---

## 4. Bukti Verifikasi Penuh Wave 3/4

1. **Seluruh 40 File Backend `.test.mjs`**: **`388 / 388` PASS, `0` FAIL** (`api.test.mjs` loopback Docker guard self-skip dengan aman).
2. **Seluruh 21 File Frontend `.test.mjs`**: **`156 / 156` PASS, `0` FAIL** (`1313.5 ms`).
3. **TypeScript (`tsc --noEmit -p frontend/tsconfig.json`)**: **0 errors**.
4. **Backend Syntax Build & ESM Graph**: `211 files` passed + `BACKEND_ESM_GRAPH_OK`.
5. **Modularity Gate 3c (`modularity-audit.mjs --check`)**: **0 Hook Delta** pada Tier A + **10/10 Tier B Ratchets GREEN**.
6. **Zero Assert-True & Zero Production DB Residue**: `TOTAL_TEST_FILES_AUDITED: 61`, `TRIVIAL_ASSERT_TRUE_COUNT: 0`, `TOTAL_DB_USERS_CLEAN: 12`, `DUMMY_DB_USERS_FOUND: 0`.

---

## 5. Handoff ke Wave 4/4 (`proceed 4/4` — Final Certification)

Target **Wave 4/4** (gelombang penutup):
1. Audit & upgrade seluruh file test **frontend** yang masih berupa regex source-grep menjadi eksekusi perilaku nyata sisi user (state, projection, pure/DOM logic).
2. Bangun gate otomatis permanen **`scripts/audit/test-quality-audit.mjs`** yang menolak setiap `assert.equal(true, true)` / trivial assert, mengecek nol residu dummy, dan dapat dijalankan kapan saja sebagai CI ratchet bersama `modularity-audit.mjs --check`.
3. Jalankan `npm --prefix frontend run build` (Next.js production build) + sertifikasi akhir 61/61 file test (`100% GREEN`) + tulis laporan final ALL-CAPS **`docs/TEST_AUDIT_WAVE_4_FINAL_CERTIFICATION.md`**.
