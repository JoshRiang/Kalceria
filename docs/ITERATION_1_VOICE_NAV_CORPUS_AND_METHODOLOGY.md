# ITERATION 1/5 — AI VOICE NAVIGATION: ARCHITECTURE, CORPUS DATABASE & PULAU JAWA TEXT NORMALIZER

**Iteration:** `1 / 5`  
**Date:** 2026-11-27  
**Parent Plan:** [AI_VOICE_NAVIGATION_MASTER_PLAN.md](file:///d:/TheWeb/Kalceria/docs/AI_VOICE_NAVIGATION_MASTER_PLAN.md)

---

## 1. Tujuan Iterasi 1/5
Membangun fondasi data, hukum keamanan arah (directional safety), riset model suara open-source bebas copyright, dan normalizer teks khusus Pulau Jawa sebelum masuk ke fase pelatihan Vector-Attention (Iterasi 2/5).

---

## 2. Hasil Audit Codebase & Riset Model Open-Source
1. **Audit Audio & Routing Existing**:
   - `frontend/lib/soundEngine.js`: Sudah menyediakan manajemen mute global (`kalceria_sound_muted`) dan Web Audio API aman untuk chime notifikasi; akan disinkronkan di Iterasi 5/5 untuk audio ducking saat AI Voice berbicara.
   - `backend/services/blendRoutingService.js` & `blendTransitService.js`: Saat ini mengembalikan geometri segmen, warna traffic TomTom, stasiun/halte, dan ETA; pada Iterasi 2/5 akan diperluas untuk mengekstrak array `steps[]` turn-by-turn penuh dari OSRM (`steps=true`), TomTom (`instructionsType=tagged`), dan Transitous.
   - `infra/osrm-java/`: Docker OSRM Pulau Jawa (`foot`, `motorcycle`, `car`) sudah tersedia dan siap didampingi container Docker TTS pada Iterasi 4/5.
2. **Keputusan Model Suara Hugging Face (Bebas Copyright & Aman Komersial)**:
   - **Terpilih**: `rhasspy/piper-voices` (`id/id_ID/news_tts/medium/id_ID-news_tts-medium.onnx`) & varian terkuantisasi `okasi/piper-indonesian-news-tts-onnx-q8` (~15,7 MB).
   - **Lisensi**: **MIT License** — aman komersial, bebas royalti, berjalan di CPU Docker (<120 ms).
   - **Ditolak**: `facebook/mms-tts-ind` karena berlisensi `CC-BY-NC-4.0` (non-komersial).

---

## 3. Artefak Produksi yang Dibangun pada Iterasi 1/5

### A. Database Kanonis Frasa Google Maps Bahasa Indonesia
- **File**: [GOOGLE_MAPS_ID_CORPUS.json](file:///d:/TheWeb/Kalceria/data/voice_nav_java/GOOGLE_MAPS_ID_CORPUS.json)
- **Cakupan**: **66 template navigasi kanonis terstruktur** mencakup seluruh situasi yang muncul di Google Maps Indonesia + kondisi khas Pulau Jawa:
  - **Keberangkatan (Depart)**: jalan kaki, motor (jalur non-tol), mobil, transit.
  - **Jalan Lurus & Perubahan Nama Jalan**: terus lurus, tetap di jalan arteri/protokol, tetap di jalan tol, perubahan nama jalan.
  - **Belokan Penuh × 4 Tier Jarak (`prepare_500m`, `approach_200m`, `imminent_80m`, `now_25m`)**:
    - Belok kiri, belok kanan, serong kiri (slight left), serong kanan (slight right), belok tajam kiri, belok tajam kanan, ujung jalan (T-junction) kiri & kanan.
  - **Putar Balik (U-Turn)**: persiapan putar balik, putar balik sekarang, putar balik aman khusus motor.
  - **Bundaran & Rotary Jawa**: pendekatan bundaran, masuk bundaran ambil keluar ke-1..6 (termasuk bundaran besar seperti Bundaran HI / Simpang Lima).
  - **Persimpangan Cabang (Fork), Merge, Ramp Tol, Flyover, Underpass & Gang**:
    - Tetap di kiri / tetap di kanan, masuk jalur/merge, masuk gerbang tol, keluar tol, naik flyover/jalan layang, masuk underpass/terowongan, masuk gang (khusus motor & jalan kaki).
  - **Instruksi Berangkai (`combineWithNext`)**: belok kiri lalu segera belok kanan, kanan lalu kiri, kiri lalu kiri, kanan lalu kanan, belok lalu tiba di tujuan.
  - **Peringatan Lalu Lintas Real-Time (TomTom) & Bahaya Pulau Jawa**:
    - Lalu lintas padat (`MODERATE`), perlambatan di depan (`SLOW`), kemacetan berat + estimasi keterlambatan menit (`JAM`), kemacetan mulai terurai, dan kehati-hatian **perlintasan sebidang kereta api**.
  - **Transportasi Umum (KRL/MRT/LRT/KAI & Bus/TransJakarta)**:
    - Jalan kaki menuju stasiun/halte, naik kereta/KRL, naik bus/TransJakarta, pengumuman sisa pemberhentian, persiapan turun stasiun/halte, transit pindah jalur, dan jalan kaki dari pemberhentian terakhir ke lokasi event.
  - **Off-Route, Reroute, Sinyal GPS & Kedatangan (Arrival)**:
    - Menghitung ulang rute, rute lebih cepat ditemukan, sinyal GPS lemah, tujuan di depan / sebelah kiri / sebelah kanan, serta pengumuman kedatangan konvoi Blend.

### B. Normalizer Teks & Pelafalan Pulau Jawa (`javaTextNormalizer.js`)
- **File**: [javaTextNormalizer.js](file:///d:/TheWeb/Kalceria/backend/services/voiceNav/javaTextNormalizer.js)
- **Fungsi**: Mengubah nama jalan & singkatan mentah OSM/TomTom menjadi teks Indonesia siap-lafal untuk Neural TTS:
  - Singkatan jalan & gelar khas Jawa/Indonesia: `Jl.` → `Jalan`, `Gg.` → `Gang`, `Jend.` → `Jenderal`, `Letjen.` → `Letnan Jenderal`, `Mayjen.` → `Mayor Jenderal`, `Ir.` → `Insinyur`, `Dr.` → `Dokter`, `Prof.` → `Profesor`, `KH.` → `Kiai Haji`, `H.` → `Haji`, `St.` → `Stasiun`, `Hlt.` → `Halte`, `Simp.` → `Simpang`, `Tol JORR` → `Tol Jor`, `HI` → `Ha I`, `TB` → `Te Be`, `MT` → `Em Te`.
  - Format jarak & ordinal natural: `250 m` → `"250 meter"`, `1.5 km` → `"1 koma 5 kilometer"`, `exit 2` → `"kedua"`.
  - Klasifikasi kelas jalan Pulau Jawa (`classifyJavaRoadContext`): mendeteksi otomatis `tol`, `flyover`, `underpass`, `bundaran`, `gang`, `stasiun`, `halte`, `arteri`, `lokal` dari nama/tag OSM.

### C. Registry & Penjaga Invarian Keamanan Arah (`corpusRegistry.js`)
- **File**: [corpusRegistry.js](file:///d:/TheWeb/Kalceria/backend/services/voiceNav/corpusRegistry.js)
- **Invarian Keamanan**:
  - `validateCorpusSafetyInvariants(corpus)`: Memverifikasi secara otomatis bahwa tidak ada template non-chained dengan `directionLock: "left"` yang mengandung kata `"kanan"` atau sebaliknya — mencegah kontradiksi arah di level database.
  - `filterSafeCandidates(context)`: Hard symbolic mask yang akan menjadi gerbang Layer 1 sebelum Layer 2 Vector-Attention di Iterasi 2/5 & 3/5.
  - `renderUtteranceTemplate(entry, slots)`: Mengisi placeholder (`{distance}`, `{road}`, `{exitOrdinal}`, `{delayMin}`, `{stopName}`, `{lineName}`, `{eventTitle}`) dengan normalisasi Pulau Jawa bersih tanpa placeholder bocor.

---

## 4. Kriteria Lulus Iterasi 1/5 (Checklist Verifikasi)
- [x] `GOOGLE_MAPS_ID_CORPUS.json` tervalidasi penuh (66 template, semua 5 moda, semua maneuver Google Maps, 0 kontradiksi arah).
- [x] `javaTextNormalizer.js` & `corpusRegistry.js` murni (0 dependensi DB/Redis/npm baru).
- [x] Unit test [voice_nav_iter1_corpus.test.mjs](file:///d:/TheWeb/Kalceria/backend/tests/voice_nav_iter1_corpus.test.mjs) 100% PASS.
- [x] Seluruh Gate 1–4 + 3b + 3c Kalceria tetap 100% HIJAU (0 Hook Delta di Tier A).

---

## 5. Handoff ke Iterasi 2/5
Setelah Iterasi 1/5 selesai, **Iterasi 2/5** akan langsung:
1. Menambahkan ekstraksi turn-by-turn `steps[]` real-time ke `blendRoutingService.js` & `blendTransitService.js`.
2. Membangun script Python `ml/voice_nav_java/train_java_attention.py` untuk meng-generate dataset skenario Pulau Jawa (12.000+ sampel) dan melatih bobot **Multi-Head Scaled Dot-Product Vector-Attention (`W_Q`, `W_K`, `E_corpus`)** ke file bobot kompak `data/voice_nav_java/JAVA_ATTENTION_WEIGHTS_V1.json` + laporan akurasi di `docs/ITERATION_2_JAVA_ATTENTION_TRAINING.md`.
