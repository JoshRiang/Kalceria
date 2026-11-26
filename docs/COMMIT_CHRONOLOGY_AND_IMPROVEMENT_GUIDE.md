# COMMIT CHRONOLOGY & SUSTAINABLE IMPROVEMENT GUIDE (2026-11-26 04:00 WIB → 2026-11-27 03:02 WIB)

**Rentang Commit**: `05ea333` (2026-11-26 12:33 WIB — commit pertama setelah jam 04:00 pagi) sampai **`3cc4e5b`** (2026-11-27 03:02 WIB — 21 commit total).  
**Catatan Batas Jam 4**: Dokumen ini mencakup **seluruh 21 commit sejak 2026-11-26 04:00 WIB**, sekaligus menandai secara eksplisit batas **Jam 4 Sore (`~16:00 WIB`, mulai `48bf8c1` / `352cd0b`)** tempat gelombang fitur sosial, GroupChat, Reels, Archive, Location Blend, dan AI Voice Navigation dimulai.  
**Tujuan Dokumen**: Menjadi peta ingatan arsitektur bagi programmer untuk memahami **apa saja yang dibangun per babak**, **file mana yang menjadi Single Source of Truth (SSOT)**, dan **bagaimana memodifikasi atau meningkatkan tiap fitur di masa depan tanpa merusak kontrak lama**.

---

## PETA PEMBABAKAN (9 BABAK BESAR)

| Babak | Jam (WIB) | Commit Hash | Tema Utama |
|---|---|---|---|
| **Babak 0** *(Siang, sebelum jam 4 sore)* | `12:33 – 15:56` | `05ea333`, `4faf957`, `0d01881`, `6954fc1`, `8351fc6`, `48bf8c1` | Minigame V6.0 (Hermes Wires), Unified 10 MB Dropzone + R2 Chunking, Unified In-Call Voice→Video WebRTC Renegotiation, & Broadcast Edit Fix |
| **Babak 1** *(Mulai Jam 4+ Sore)* | `17:32` | `352cd0b` | **Social Architecture: Global vs Friends Segregation**, 24h Friend Requests, Non-Friend Guards & Delete Chat |
| **Babak 2** | `18:59` | `3b888e8` | **3-Icon HUD Switcher**, *Chat with Others*, *Assign a Meeting*, Relokasi Block ke Menu Titik Tiga & v61 HD Textures |
| **Babak 3** | `19:21` | `0892b5a` | **Event GroupChat**, Group Settings Slide, Pemisahan Role *Maker / Collaborator / Member*, Shared *In Another Call* Queue & *Delete Chat for Me* |
| **Babak 4** | `00:19` | `8fea32e` | **Map UI Polish**: Single-Layer Chat Close, Form Character Limit `0/X`, Zero-Compass v62 Textures, Golden-Blue 1-Element Profiles & Group Cover Video |
| **Babak 5** | `01:07` | `5b4241f` | **Public/Private Events (`default=private`)**, **Reels Discovery Grid** (5 Tab), Post Media Composer, Perceptual Lossless Compression (64 MB) & v63 Blue-Magenta Textures |
| **Babak 6** | `01:19` | `e6a88fa` | **Isolated Temporary Map Email Whitelist Flag** (`reinathanezhekiel1@gmail.com` & `varsikurniawan@gmail.com`) + Landing *COMING SOON* |
| **Babak 7** | `01:41` | `b93f834` | **Standalone Peer & Group Profile Panels**, Auto-Ingested **Event Archive Stacks**, Edit Kesan (280 char), Mini Discovery & Private Archive Toggle |
| **Babak 8** | `02:08 – 02:17` | `34735cb`, `c1a6e76` | **GroupChat Location Blend** (Opt-In POV Privacy), Pulau Jawa OSRM Docker Stack (`motorcycle.lua` no-toll), TomTom Traffic, Free Transitous/Overpass Bus & Train, Curated Kalman GPS & Focus Mode 2D |
| **Babak 9** | `02:26 – 03:02` | `a1ae026`, `451d3fc`, `e114499`, `b90e9bf`, `f5724a6`, `3cc4e5b` | **AI Voice Navigation Pulau Jawa (5/5 Iterasi)**: 66-Utterance Google Maps ID Corpus, 30-Dim Multi-Head Vector-Attention (`26,32 KB`, `0,0593 ms`, 100% Dir Safety), Docker Piper MIT TTS & Focus Mode Co-Pilot |

---

## RINCIAN PER BABAK & PANDUAN IMPROVEMENT MANDIRI

### BABAK 0 — MINIGAME V6.0, UNIFIED 10 MB UPLOAD & WEBRTC VOICE→VIDEO (`05ea333` → `48bf8c1`)
- **Perubahan Kunci**:
  - `05ea333` & `4faf957`: Minigame V6.0 dengan elemen uncropped `v60`, graf kabel *Hermes Wires* (`frontend/lib/minigameHermesWires.js`), micro-dot kontur, aturan biru-emas, video unik tanpa duplikat di Intro & About (`aboutVideoSelector.js`), serta titik indikator event aktif pada `DungeonGate.jsx`.
  - `0d01881` & `48bf8c1`: Unified `MediaDropzoneBox.jsx` (`Photo/Video Max 10 MB`, `n+1` tile `+`), chunked Cloudflare R2 upload di `frontend/app/api/blob/upload/route.ts` di bawah prefix ter-whitelist `event-clips/chunks/`, serta serverless realtime chat/call fallback (`backend/services/canonicalFallbackStore.js`).
  - `6954fc1` & `8351fc6`: Upgrade Voice Call → Video Call **in-place** pada 1 `RTCPeerConnection` & `callId` tanpa re-ringing (`frontend/components/map/chat/hooks/personalCall/callVideoUpgrade.js`), call log idempoten (1 log saja), format uptime `mo/d/h/m/s`, dan unified Broadcast dropzone + edit hydration.
- **Cara Improve Sendiri**:
  - Ubah batas upload global di `frontend/lib/mediaUploadHelpers.js` (`MAX_MEDIA_UPLOAD_BYTES`) dan `frontend/app/api/blob/upload/route.ts` secara serentak.
  - Untuk tuning WebRTC renegotiation, seluruh logika terisolasi di `callVideoUpgrade.js` & `callSignalPoller.js` (hindari mengedit `useCallSession.js` tanpa cek ratchet Tier B `<= 445 LOC`).

---

### BABAK 1 — SOCIAL SEGREGATION: GLOBAL VS FRIENDS (`352cd0b`, 17:32 WIB)
- **Perubahan Kunci**:
  - **Backend**: [friendsStore.js](file:///d:/TheWeb/Kalceria/backend/services/friendsStore.js) & [friendsController.js](file:///d:/TheWeb/Kalceria/backend/controllers/friendsController.js) — tabel relasi pertemanan & friend request otomatis kedaluwarsa **24 jam** (`FRIEND_REQUEST_TTL_MS`).
  - **Guard Privasi**: Non-friend diblokir HTTP `403` saat mencoba Voice/Video Call (`callSignalController.js`), tidak muncul di peta (`telemetryFeedController.js`), dan broadcast-nya diset `null` (`kalceriansDirectoryController.js`).
  - **Frontend**: Tab **Global** (cap maks 8 kartu non-friend, prioritas request masuk di atas) vs **Friends** dengan garis hitam bawah aktif (`KalceriansHeader.jsx`, `kalceriansFriendsPure.js`, `useKalceriansFriends.js`), serta overlay konfirmasi Delete Chat (`ChatDeleteConfirmOverlay.jsx`).
- **Cara Improve Sendiri**:
  - Untuk menambah kapasitas kartu Global atau pagination/rekomendasi kota, ubah fungsi murni di `frontend/components/map/panel/kalceriansFriendsPure.js` dan backend `scopeKalceriansForViewer()` di `kalceriansDirectoryController.js`.

---

### BABAK 2 — 3-ICON HUD SWITCHER & MENU BLOCK BARU (`3b888e8`, 18:59 WIB)
- **Perubahan Kunci**:
  - Grup box HUD baru di sebelah grup utama: [HudPanelSwitcherBox.jsx](file:///d:/TheWeb/Kalceria/frontend/components/map/headerHud/HudPanelSwitcherBox.jsx) berisi icon **Chat (`ChatWithOthersList.jsx`)**, **GroupChat (`AssignMeetingList.jsx`)**, dan **Search (`Find other Kalcerians`)** yang dikendalikan hook tunggal [useBottomPanelSwitcher.js](file:///d:/TheWeb/Kalceria/frontend/components/map/panel/useBottomPanelSwitcher.js).
  - Ikon chat & block dihapus dari line card *Find other Kalcerians*; opsi **Block** dipindah ke menu titik tiga di header chat (`ChatHeaderBar.jsx`) dengan animasi semi-blur identik Delete Chat (`BlockConfirmModal.jsx`).
  - Pembaruan HD background v61 (`mapBgCache.js`).
- **Cara Improve Sendiri**:
  - Menambah tab panel bawah baru cukup didaftarkan di `HudPanelSwitcherBox.jsx`, `useBottomPanelSwitcher.js`, dan `KalceriansPanelBody.jsx` (tetap **0 perubahan** di Tier A `MapPageClient.jsx`).

---

### BABAK 3 — EVENT GROUPCHAT, ROLE MAKER/COLLAB & DELETE FOR ME (`0892b5a`, 19:21 WIB)
- **Perubahan Kunci**:
  - **Backend**: [eventGroupStore.js](file:///d:/TheWeb/Kalceria/backend/services/eventGroupStore.js) & [eventGroupController.js](file:///d:/TheWeb/Kalceria/backend/controllers/eventGroupController.js) — grup chat realtime berbasis event dengan dukungan `n` anggota, group voice/video call (LiveKit/WebRTC), serta shared canonical call lock (*"In Another Call"*).
  - **Role Security**: Menerima Envelope Request hanya menambahkan user sebagai **Member** (`addGroupMemberOnly`); hanya **Maker** / **Collaborator** terpromosi yang bisa mengunggah media event atau mengeluarkan non-Maker; **Maker 100% kebal** dari kick/demote.
  - **Delete Chat for Me**: [chatClearStore.js](file:///d:/TheWeb/Kalceria/backend/services/chatClearStore.js) menyimpan cutoff timestamp per user (`setPersonalChatClearedForMe`) sehingga Clear Chat hanya menghapus sisi user tersebut (tidak mem-purge pesan milik lawan bicara).
  - **Frontend**: `EventGroupChatPanel.jsx`, `GroupSettingsSlideView.jsx`, `GroupCallView.jsx`, `groupChatHelpers.js`.
- **Cara Improve Sendiri**:
  - Untuk menambah izin role baru (misal *Moderator*), tambahkan di `eventGroupStore.js` dan fungsi murni `groupChatHelpers.js` secara sinkron.

---

### BABAK 4 — MAP POLISH, FORM LIMITS `0/X` & ZERO-COMPASS V62 (`8fea32e`, 00:19 WIB)
- **Perubahan Kunci**:
  - Single-layer panel close: mengetap icon Search / panel lain otomatis menutup chatbox terbuka (`useBottomPanelSwitcher.js`).
  - Validasi batas karakter `0/X` merata di semua form (`StatusModal.jsx`, `EditProfileModal.jsx`, `NeedUsForm.jsx`, `GroupSettingsSlideView.jsx`).
  - Regenerasi seluruh tekstur v62 bebas kompas dengan beragam artefak ilustrasi, latar profil Golden-Blue 1-elemen (`BG_ProfileCard`, `BG_GroupProfile`), serta default avatar grup (`DefaultGroupAvatar.webp`) & dukungan video cover grup.
- **Cara Improve Sendiri**:
  - Seluruh URL latar belakang terpusat di [mapBgCache.js](file:///d:/TheWeb/Kalceria/frontend/lib/mapBgCache.js). Setiap kali menambah aset CDN baru, taruh juga fallback lokalnya di `frontend/public/BG_IMPROVE_FOR_MAP/` lalu jalankan `v53_carousel_and_r2_helpers.test.mjs`.

---

### BABAK 5 — PUBLIC/PRIVATE EVENTS, REELS DISCOVERY & 64 MB COMPRESSION (`5b4241f`, 01:07 WIB)
- **Perubahan Kunci**:
  - **Public/Private Event Toggle**: Default event adalah **private** (hanya Friends); Maker dapat toggle ke **public** (`[VIS:public]` di `eventFormatting.js`) agar tampil secara Global.
  - **Reels Discovery Panel**: Icon Reels ditambahkan ke HUD group box 2 (`HudPanelSwitcherBox.jsx`). Menyediakan filter **Global / Friends** × **5 kategori** (4 tipe event + Broadcast), grid 3-kolom (`ReelsDiscoveryList.jsx`), detail viewer (`ReelsPostDetailModal.jsx`), dan composer standalone (`CreateMediaPostModal.jsx`). Reply dari Reels hanya aktif untuk Friends.
  - **Backend**: [reelsPostStore.js](file:///d:/TheWeb/Kalceria/backend/services/reelsPostStore.js) & [reelsPostController.js](file:///d:/TheWeb/Kalceria/backend/controllers/reelsPostController.js).
  - **Kompresi Perceptual Lossless**: [mediaCompressor.js](file:///d:/TheWeb/Kalceria/frontend/lib/mediaCompressor.js) + chunked upload hingga `64 MB` (`route.ts`) & tekstur v63 Blue-Magenta.
- **Cara Improve Sendiri**:
  - Untuk menambah algoritma ranking/scoring feed Reels (misal berbasis kedekatan GPS atau likes/jam), modifikasi query cursor di `reelsPostStore.js` tanpa mengubah bentuk respons `{ items, nextCursor }`.

---

### BABAK 6 — TEMPORARY MAP EMAIL WHITELIST FLAG (`e6a88fa`, 01:19 WIB)
- **Perubahan Kunci**:
  - Terisolasi penuh di **2 folder sementara** agar mudah dicabut 100% saat public launch:
    - Backend: `backend/temp_map_whitelist/` (`config.js`, `requireMapWhitelist.js`, `README.md`)
    - Frontend: `frontend/temp_map_whitelist/` (`mapWhitelistConfig.js`, `useMapWhitelistAccess.js`, `TempMapAccessGate.jsx`, `README.md`)
  - Hanya `reinathanezhekiel1@gmail.com` & `varsikurniawan@gmail.com` yang dapat membuka `/map`; pengguna lain & tamu melihat tombol **`COMING SOON`** pada `ClosingUsersMapSection.jsx`.
- **Cara Improve / Cabut Nanti**:
  - Ikuti checklist penghapusan 3 langkah di `backend/temp_map_whitelist/README.md` dan `frontend/temp_map_whitelist/README.md` (hapus kedua folder, lepas 2 baris import di `backend/routes/index.js`, `frontend/app/map/page.jsx`, dan `ClosingUsersMapSection.jsx`).

---

### BABAK 7 — STANDALONE PROFILES & EVENT ARCHIVE STACKS (`b93f834`, 01:41 WIB)
- **Perubahan Kunci**:
  - Profil orang lain (`PeerProfilePanel.jsx`) dan profil grup (`KalceriansOverlayPanels.jsx`) kini berdiri mandiri (tidak lagi menimpa/overlap panel di bawahnya).
  - **Event Archive Permanen**: Media yang diposting di event/Reels otomatis masuk ke arsip user (`eventArchiveStore.js`, `eventArchiveHelpers.js`, `eventArchiveController.js`).
  - **Kontrol Pemilik**: Tumpukan kartu arsip (`EventArchiveStackCard.jsx`) + edit **kesan event** (maks 280 karakter, terpisah dari caption media) + Mini Discovery (`"{DisplayName} pada Event \"...\""` di `EventArchiveMiniDiscovery.jsx`) + kontrol **Hide / Delete permanen** + toggle **Private Event Archive** tingkat akun di `EditProfileModal.jsx`.
- **Cara Improve Sendiri**:
  - Semua logika visibilitas arsip dipusatkan di fungsi murni `filterVisibleArchivesForViewer()` (`backend/services/eventArchiveHelpers.js`).

---

### BABAK 8 — GROUPCHAT LOCATION BLEND, OSRM JAWA & FOCUS MODE 2D (`34735cb`, `c1a6e76`, 02:08–02:17 WIB)
- **Perubahan Kunci**:
  - **Strict Opt-In POV Privacy**: [groupBlendStore.js](file:///d:/TheWeb/Kalceria/backend/services/groupBlendStore.js) & [groupBlendController.js](file:///d:/TheWeb/Kalceria/backend/controllers/groupBlendController.js) — hanya anggota GroupChat yang mengklik *Join Blend* yang melihat rute & koordinat konvoi; non-joined hanya melihat banner undangan (`GroupBlendBanner.jsx`).
  - **Multi-Engine Routing Pulau Jawa**:
    - [blendRoutingService.js](file:///d:/TheWeb/Kalceria/backend/services/blendRoutingService.js): OSRM Pulau Jawa (`foot`, `motorcycle` no-toll, `car`) + TomTom Routing v1 live traffic (`FREE`/`MODERATE`/`SLOW`/`JAM` berwarna) + ETA format `jam & menit`.
    - [blendTransitService.js](file:///d:/TheWeb/Kalceria/backend/services/blendTransitService.js): Bus & Train multimodal gratis 3-tier (Transitous MOTIS → OSM Overpass stasiun/halte + OSRM dotted walk → corridor fallback).
    - **Docker Pulau Jawa**: `infra/osrm-java/` (`Dockerfile`, `docker-compose.yml`, `profiles/motorcycle.lua` yang memblokir jalan tol/motorway & `left_hand_driving = true`).
  - **High-Precision Curated GPS**: Menghapus pembulatan grid `1,33 km` (`DISTRICT_OFFSET`) di `telemetryFeedController.js` + menambahkan filter 4-tahap (Outlier Reject → Stationary Deadband Lock → 2D Kalman Filter → Circular Bearing Smoothing) di [gpsCurator.js](file:///d:/TheWeb/Kalceria/frontend/components/map/blend/gpsCurator.js).
  - **Focus Mode Google-Maps Style**: `MapBlendController.jsx`, `BlendFocusHud.jsx`, `blendLeafletRenderer.js` — segitiga heading 2D dinamis + tombol panah kiri/kanan untuk memutar kamera antar kawan konvoi.
- **Cara Improve Sendiri**:
  - Deploy `infra/osrm-java` di VPS dan set `OSRM_FOOT_URL`, `OSRM_MOTO_URL`, `OSRM_CAR_URL` di Vercel Backend agar routing tidak bergantung server OSRM publik.

---

### BABAK 9 — AI VOICE NAVIGATION PULAU JAWA 5/5 ITERASI (`a1ae026` → `3cc4e5b`, 02:26–03:02 WIB)
- **Perubahan Kunci**:
  - **Iterasi 1 (`a1ae026`)**: Audit lisensi Hugging Face (memilih `rhasspy/piper-voices` `id_ID-news_tts-medium` MIT License, menolak Meta MMS CC-BY-NC), korpus 66 skenario Google Maps ID (`GOOGLE_MAPS_ID_CORPUS.json`), `javaTextNormalizer.js`, & Layer 1 `corpusRegistry.js`.
  - **Iterasi 2 (`451d3fc`, `e114499`)**: Ekstraksi `steps[]` real-time (`routeStepExtractor.js`) dari OSRM (`&steps=true`), TomTom (`instructionsType=coded`), & Transitous; training Python Pure NumPy Multi-Head Vector-Attention (`H=4, d_k=8`, 30-dim, 1.990 parameter) pada 14.000 skenario Pulau Jawa → `JAVA_ATTENTION_WEIGHTS_V1.json` (**26,32 KB**, Test Acc **100%**, Directional Safety **100%**).
  - **Iterasi 3 (`b90e9bf`)**: Runtime Pure JS/ESM `attentionCore.js` (terukur avg **`0,0593 ms`**) + `maneuverTriggerStateMachine.js` (`1000m → 500m → 200m → 80m → 25m`, anti-spam, urgent preemption, off-route 2-tick debounce) + Vercel Serverless bundling (`backend/services/voiceNav/modelData/` + `backend/vercel.json`) + API `/bundle` & `/evaluate`.
  - **Iterasi 4 (`f5724a6`)**: Docker CPU Neural TTS MIT (`infra/voice-tts-id/`, 18 frasa pre-baked `< 2 ms`), unified `infra/docker-compose.java-nav.yml`, & backend proxy `POST /api/map/voice-nav/speak` dengan Convoy LRU cache + zero-crash fallback.
  - **Iterasi 5 (`3cc4e5b`)**: Integrasi penuh ke Focus Mode (`frontend/components/map/blend/voiceNav/`), Live Subtitle Ticker + tombol Mute/Ucapkan di `BlendFocusHud.jsx`, serta audio ducking `0.28×` di `soundEngine.js`.
- **Cara Improve Sendiri**:
  - Ingin menambah kosakata/skenario baru (misal untuk Bali/Sumatera atau ganjil-genap Jakarta)? Cukup tambahkan entri di `data/voice_nav_java/GOOGLE_MAPS_ID_CORPUS.json`, salin ke `backend/services/voiceNav/modelData/`, lalu jalankan ulang `python ml/voice_nav_java/train_java_attention.py` (~9 detik di CPU!).

---

## DAFTAR HOTSPOT & CHECKLIST KEAMANAN PERUBAHAN MASA DEPAN
1. **Jangan Pernah Sentuh `BaselineNovember#2`** dan jaga **0 Hook Delta** pada Tier A (`MapPageClient.jsx`, `usePersonalChatState.js`) — selalu cek dengan `node scripts/audit/modularity-audit.mjs --check`.
2. **Jangan Pernah Jalankan `cd backend; npx vercel`** — selalu deploy backend dari root repo menggunakan `backend/.vercel/project.json`.
3. **Wajib Jalankan `git add -f` untuk file baru di `tests/` atau `*.py`** karena `.gitignore` mengabaikan pola tersebut.
4. **Wajib Jalankan Cek ESM Graph** sebelum deploy backend: `node -e "import('./backend/routes/index.js').then(() => process.exit(0))"`.
