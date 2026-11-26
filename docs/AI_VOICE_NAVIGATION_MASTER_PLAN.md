# KALCERIA AI VOICE NAVIGATION — MASTER PLAN (5 ITERATIONS / 5 WAVES)

**Status:** ALL 5/5 ITERATIONS COMPLETE — LIVE IN PRODUCTION (Pulau Jawa Hybrid Neuro-Symbolic Multi-Head Vector-Attention `0.0593 ms` + 100% Directional Safety + MIT Piper Docker TTS + Focus Mode AI Voice Co-Pilot)  
**Target Domain:** Pulau Jawa (`java-latest.osm.pbf`, Jabodetabek, Bandung, Semarang, Yogyakarta, Surabaya, Trans-Jawa, KRL/MRT/LRT/TransJakarta)  
**Core Doctrine:** Hybrid Neuro-Symbolic Vector-Attention (100% Directional Truth Safety + Dynamic Road-Ahead Context Attention + Copyright-Free Neural Indonesian Voice in Docker)

---

## 1. Mengapa Bukan 100% Generative ML / LLM? (Arsitektur Hybrid Neuro-Symbolic)

Untuk navigasi jalan real-time, menggunakan LLM generatif murni sangat berbahaya karena:
1. **Halusinasi Arah Fatal**: LLM probabilistik bisa mengucapkan *"Belok kiri"* saat geometri jalan sebenarnya belok kanan.
2. **Latensi Tinggi & Biaya API**: Generasi teks LLM butuh 800–2500 ms, terlalu lambat ketika kendaraan melaju 60 km/jam (16,7 meter per detik).

Oleh karena itu, **Kalceria Voice Nav Engine** menggunakan arsitektur **3-Lapisan Hybrid Neuro-Symbolic**:

```
[GPS Terkurasi + OSRM/TomTom/Transitous Steps + Live Traffic]
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: HARD SYMBOLIC SAFETY GUARDRAIL (0% Halusinasi Arah)    │
│ Mengunci directionLock (left/right/uturn/roundabout/arrival/    │
│ traffic/transit), moda transportasi, dan slot jarak/nama jalan. │
└────────────────────────┬────────────────────────────────────────┘
                         │ Hanya kandidat yang 100% valid secara arah
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: MULTI-HEAD VECTOR-ATTENTION ENGINE (Static-ML Jawa)    │
│ Menghitung skor perhatian dinamis konteks jalan (30-dimensi):   │
│   Attention(Q, K) = softmax( (x · W_Q)(E_corpus · W_K)^T / √dk )│
│ Memilih frasa Google-Maps-grade paling alami & prosodi urgensi  │
│ untuk kondisi Pulau Jawa (Tol, Arteri, Gang, Bundaran, Macet,   │
│ Perlintasan KA, Stasiun KRL, Halte TransJakarta).               │
└────────────────────────┬────────────────────────────────────────┘
                         │ Kalimat Indonesia natural + Java Normalizer
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: COPYRIGHT-FREE NEURAL VOICE TTS (Docker + Fallback)    │
│ Primary : Piper VITS ONNX `id_ID-news_tts-medium` (MIT License) │
│           (15.7 MB INT8 ONNX / 63 MB FP32, <120ms CPU, 22.05kHz)│
│ Cache   : Pre-baked audio frasa statis + LRU cache kalimat      │
│ Fallback: Browser Web Speech API (`id-ID`) + WebAudio cue       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Evaluasi Jalan Pintas Model Open-Source Hugging Face (Legal & Aman)

Hasil audit lisensi dan performa CPU Docker terhadap model TTS Bahasa Indonesia di Hugging Face:

| Model Hugging Face | Arsitektur | Lisensi | Aman Komersial / Bebas Copyright? | Ukuran & Kecepatan CPU | Keputusan |
|---|---|---|---|---|---|
| **`rhasspy/piper-voices` (`id/id_ID/news_tts/medium`)** & **`okasi/piper-indonesian-news-tts-onnx-q8`** | VITS ONNX (Piper) | **MIT License** | **YA (100% Aman, MIT)** | **~15,7 MB (INT8)** / ~63 MB (FP32), **< 120 ms di CPU**, 22.05 kHz | **DIPILIH (Primary Docker TTS)** |
| `anak10thn/pocket-tts-indonesian` | Distilled Transformer | CC-BY-4.0 | Perlu atribusi eksplisit | Sedang | Cadangan Opsional |
| `Ellbendls/csm-1b-indonesian-fine-tuned` | CSM-1B (PyTorch) | Apache 2.0 | Ya | >2 GB, butuh GPU | Terlalu berat untuk CPU VPS |
| Meta `facebook/mms-tts-ind` | VITS | **CC-BY-NC-4.0** | **TIDAK (Non-Commercial!)** | ~140 MB | **DITOLAK (Pelanggaran Komersial)** |

**Kesimpulan Jalan Pintas**: Kita tidak perlu melatih acoustic vocoder dari nol (yang butuh ribuan jam audio studio & GPU A100). Kita menggunakan **`id_ID-news_tts-medium` (MIT License, Piper ONNX)** di dalam Docker CPU pada Iterasi 4/5, dan memfokuskan seluruh pelatihan ML kita pada **Model Vector-Attention Konteks Jalan Pulau Jawa** (Iterasi 2/5 & 3/5) agar **APA yang diucapkan AI selalu 100% tepat, kontekstual, dan natural seperti Google Maps!**

---

## 3. Pembagian Pekerjaan 5 Iterasi (5 Waves — Setiap Iterasi Wajib & Terukur)

| Iterasi / Wave | Fokus Utama | Output Konkret & File Utama | Status |
|---|---|---|---|
| **Iterasi 1/5** | **Arsitektur, Audit Model HF, Database Frasa Google Maps Indonesia & Java Text Normalizer** | `docs/AI_VOICE_NAVIGATION_MASTER_PLAN.md`, `docs/ITERATION_1_VOICE_NAV_CORPUS_AND_METHODOLOGY.md`, `data/voice_nav_java/GOOGLE_MAPS_ID_CORPUS.json` (66 skenario lengkap), `backend/services/voiceNav/javaTextNormalizer.js`, `corpusRegistry.js`, unit test Gate 3a | **SELESAI** |
| **Iterasi 2/5** | **Ekstraksi Step Jalan Real-Time (`steps=true`) + Pipeline Training Vector-Attention Pulau Jawa** | `backend/services/voiceNav/routeStepExtractor.js` wired ke `blendRoutingService.js` (`steps=true`, `instructionsType=coded`) & `blendTransitService.js`; Python trainer `ml/voice_nav_java/train_java_attention.py` melatih Multi-Head Vector-Attention (`H=4`, `d_k=8`, 30-dim, 1.990 parameter) pada 14.000 skenario Pulau Jawa → `data/voice_nav_java/JAVA_ATTENTION_WEIGHTS_V1.json` (26,32 KB, Test Acc 100,0%, Dir Safety 100,0%) + `docs/ITERATION_2_JAVA_ATTENTION_TRAINING.md` | **SELESAI** |
| **Iterasi 3/5** | **Runtime Vector-Attention Inference Engine + Distance Trigger State Machine** | Pure isomorphic JS/ESM `attentionCore.js` + `attentionInferenceEngine.js` (terukur avg `0.0593 ms` / p99 `0.3998 ms` di V8) + `maneuverTriggerStateMachine.js` (threshold adaptif kecepatan `1000m → 500m → 200m → 80m → 25m`, anti-spam, urgent preemption, debounced off-route 2-tick, hazard perlintasan KA, TomTom traffic alert) + API `/api/map/voice-nav/bundle` & `/evaluate` + `docs/ITERATION_3_INFERENCE_AND_TRIGGERS.md` | **SELESAI** |
| **Iterasi 4/5** | **Docker Neural Voice TTS (`Piper ONNX MIT`) + Audio Pre-Baking & Backend `/api/map/voice-nav/speak`** | `infra/voice-tts-id/` (`Dockerfile`, `server.py`, `prebake_phrases.py`, `static_phrases_id.json`, `docker-compose.yml`), `infra/docker-compose.java-nav.yml` (OSRM Jawa + Piper MIT TTS), `backend/services/voiceNav/ttsSynthesisService.js` (LRU + RIFF validation + graceful fallback), `POST /api/map/voice-nav/speak` & `GET /api/map/voice-nav/tts-health` + `docs/ITERATION_4_DOCKER_NEURAL_TTS.md` | **SELESAI** |
| **Iterasi 5/5** | **Integrasi Penuh AI Voice Co-Pilot ke Focus Mode Map + Audio Ducking + Live Deploy** | `frontend/components/map/blend/voiceNav/` (`clientAttentionCore.js`, `clientTriggerMachine.js`, `voiceAudioPlayer.js`, `useBlendVoiceCoPilot.js`), Live Subtitle Ticker + tombol Mute/Ucapkan di `BlendFocusHud.jsx` & `MapBlendController.jsx`, audio ducking `soundEngine.js`, 66/66 FE↔BE parity test, Next.js production build & live deploy (0 Hook Delta di Tier A) + `docs/ITERATION_5_COPILOT_PRODUCTION_LAUNCH.md` | **SELESAI** |

---

## 4. Spesifikasi Matematis Vector-Attention Pulau Jawa (Ringkasan)

1. **Vektor Fitur Konteks Jalan (`x` ∈ ℝ³⁰)**:
   - Dim `0..4`: One-hot `transport_mode` (`foot`, `motorcycle`, `car`, `bus`, `train`)
   - Dim `5..10`: One-hot `distance_bucket` (`far_1000m`, `prepare_500m`, `approach_200m`, `imminent_80m`, `now_25m`, `immediate`)
   - Dim `11..20`: One-hot `road_class_java` (`tol`, `arteri`, `lokal`, `gang`, `bundaran`, `flyover`, `underpass`, `perlintasan_ka`, `stasiun`, `halte`)
   - Dim `21..24`: One-hot `traffic_state` (`FREE`, `MODERATE`, `SLOW`, `JAM`)
   - Dim `25`: `hasRoadName` (0/1)
   - Dim `26`: `hasChainedNext` (0/1)
   - Dim `27`: `speedNormalized` (`clip(speed_kmh / 90, 0, 1)`)
   - Dim `28`: `isEndOfRoad` (0/1 — sinyal T-junction OSRM `end of road`)
   - Dim `29`: `isNewRoadName` (0/1 — sinyal pergantian nama jalan OSRM `new name`)
2. **Multi-Head Scaled Dot-Product Attention (`H = 4 heads`, `d_k = 8`)**:
   - Head 1 (*Urgency & Distance Head*): Memilih keringkasan kalimat (`"Belok kiri sekarang"` vs `"Dalam 500 meter, bersiap belok kiri ke Jalan Sudirman"`).
   - Head 2 (*Java Road & Mode Context Head*): Membedakan konteks khusus Jawa (larangan tol untuk motor, jalur gang kecil, bundaran besar, flyover/underpass).
   - Head 3 (*Traffic & Hazard Head*): Memprioritaskan peringatan kemacetan TomTom, perlambatan, atau perlintasan rel kereta api.
   - Head 4 (*Multimodal Transit & Chaining Head*): Menangani instruksi berangkai (`combineWithNext`) dan transisi jalan kaki ↔ KRL/MRT/TransJakarta.
3. **Hard Symbolic Invariant (Tidak Bisa Dikalahkan Attention)**:
   - Sebelum `softmax`, seluruh template dengan `directionLock !== groundTruthDirection` diberi mask $-\infty$. Ini menjamin **akurasi arah 100,00% secara matematis**!

---

## 5. Kepatuhan Arsitektur Kalceria (`AGENTS.md`)
- **Tier A (`MapPageClient.jsx` & `usePersonalChatState.js`)**: Tetap **0 Hook Delta** di seluruh 5 iterasi (seluruh komponen Voice Nav dipasang di `frontend/components/map/blend/voiceNav/` & dipanggil lewat `MapBlendController.jsx` di `SnapMap.jsx`).
- **Tier B Ratchets**: Tidak ada file Tier B yang melebihi plafon LOC.
- **Zero Regression**: Semua 10+ suite backend & 92+ test frontend wajib 100% hijau pada setiap akhir iterasi.
