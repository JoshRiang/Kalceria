# ITERATION 3/5 — RUNTIME VECTOR-ATTENTION INFERENCE ENGINE (< 1 MS) & REAL-TIME MANEUVER TRIGGER STATE MACHINE

**Iteration:** `3 / 5`  
**Date:** 2026-11-27  
**Parent Plan:** [AI_VOICE_NAVIGATION_MASTER_PLAN.md](file:///d:/TheWeb/Kalceria/docs/AI_VOICE_NAVIGATION_MASTER_PLAN.md)  
**Previous Iteration:** [ITERATION_2_JAVA_ATTENTION_TRAINING.md](file:///d:/TheWeb/Kalceria/docs/ITERATION_2_JAVA_ATTENTION_TRAINING.md)

---

## 1. Tujuan Iterasi 3/5
1. Membangun **Runtime Pure JS/ESM Vector-Attention Inference Engine** (tanpa Python/PyTorch, 0 dependensi npm baru, 100% isomorfik untuk Node.js Backend & Browser Focus Mode) yang mengeksekusi bobot `JAVA_ATTENTION_WEIGHTS_V1.json` dalam waktu `< 1 ms` per inferensi dengan jaminan keamanan arah Layer 1 sebesar **100,00%**.
2. Membangun **Real-Time Road-Ahead Maneuver & Distance Trigger State Machine** untuk mengolah stream GPS terkurasi terhadap array `route.steps[]` — lengkap dengan threshold adaptif kecepatan, anti-spam cooldown & urgent preemption, promosi belokan berangkai (`<= 65 m`), deteksi `off-route` dengan debounce 2-tick, peringatan perlintasan KA, dan peringatan kemacetan TomTom.
3. Menyediakan endpoint runtime terautentikasi + bundling model aman untuk Vercel Serverless (`Root Directory: backend`).

---

## 2. Arsitektur Modul Produksi Iterasi 3/5

| Modul | Path | Tanggung Jawab Tunggal (SRP) |
|---|---|---|
| **Pure Attention Core** | [attentionCore.js](file:///d:/TheWeb/Kalceria/backend/services/voiceNav/attentionCore.js) | 100% murni (0 `node:*`, 0 React, 0 DOM). Pre-projeksi matriks kunci `K_h = E_corpus · W_K[h]`, bucket jarak adaptif kecepatan Pulau Jawa, Layer 1 Hard Symbolic Direction Mask, 4-head scaled dot-product attention, dan renderer teks Indonesia natural. |
| **Node Runtime Loader** | [attentionInferenceEngine.js](file:///d:/TheWeb/Kalceria/backend/services/voiceNav/attentionInferenceEngine.js) | Memuat singleton engine & runtime bundle dari `backend/services/voiceNav/modelData/` (dengan fallback ke `data/voice_nav_java/`). |
| **Maneuver Trigger State Machine** | [maneuverTriggerStateMachine.js](file:///d:/TheWeb/Kalceria/backend/services/voiceNav/maneuverTriggerStateMachine.js) | 100% murni & isomorfik. Proyeksi jarak tegak lurus ke segmen polyline, progresi kursor step monotonik (`minStepDistanceMeters`), cascade `1000m → 500m → 200m → 80m → 25m`, anti-spam, urgent preemption, off-route debounce, hazard rel KA, dan TomTom traffic alert. |
| **Runtime Controller & Routes** | [voiceNavController.js](file:///d:/TheWeb/Kalceria/backend/controllers/voiceNavController.js) & [index.js](file:///d:/TheWeb/Kalceria/backend/routes/index.js) | `GET /api/map/voice-nav/bundle` (mengirimkan bobot 26,32 KB + korpus 66 frasa untuk klien Focus Mode) dan `POST /api/map/voice-nav/evaluate` (evaluasi real-time GPS tick / inferensi langsung). |
| **Vercel Serverless Model Packaging** | [vercel.json](file:///d:/TheWeb/Kalceria/backend/vercel.json) & `backend/services/voiceNav/modelData/` | Menyertakan `services/voiceNav/modelData/**` pada `includeFiles` agar Lambda Vercel tidak pernah gagal `ENOENT` saat membaca bobot terlatih (disinkronkan otomatis oleh `train_java_attention.py` & diverifikasi byte-identik oleh unit test). |

---

## 3. Optimasi & Benchmark Latensi Riil (V8 Node.js)

### Optimasi Pre-Proyeksi Matriks Kunci (`K_h`)
Karena `E_corpus ∈ ℝ^{66×30}` dan `W_K ∈ ℝ^{4×30×8}` bersifat statis pasca-training, `createJavaAttentionEngine()` menghitung `K_h = E_corpus · W_K[h]` (`Float64Array` flat) **hanya 1 kali** saat inisialisasi. Pada setiap tick GPS real-time, mesin hanya menghitung:
1. Sparse projection `Q_h = x · W_Q[h]` (`30 × 8`, melewati elemen `x[f] === 0`)
2. Dot-product terbatas hanya pada kandidat yang lolos **Layer 1 Hard Symbolic Direction Mask** (`|safeCandidates| <= 6` per lock!)

### Hasil Benchmark Riil (2.000 Inferensi Berturut-Turut di V8)
| Metrik Latensi | Nilai Terukur | Target Master Plan | Status |
|---|---:|---:|---|
| **Rata-rata (`avgMs`)** | **`0.0593 ms`** | `< 1.0000 ms` | **16,8× lebih cepat dari target** |
| **Median (`p50Ms`)** | **`0.0382 ms`** | `< 1.0000 ms` | **26,1× lebih cepat dari target** |
| **Persentil 95 (`p95Ms`)** | **`0.1194 ms`** | `< 1.0000 ms` | **PASS** |
| **Persentil 99 (`p99Ms`)** | **`0.3998 ms`** | `< 1.0000 ms` | **PASS** |
| **Hard Directional Safety** | **`100.00%`** | `100.00%` | **PASS (semua 30 lock × 5 moda)** |

---

## 4. Alur Prioritas State Machine Real-Time (`evaluateNavigationTick`)

```mermaid
flowchart TD
    A["Curated GPS Tick (lat, lng, speed, isStationary) + route.steps[]"] --> B{"Jarak ke tujuan <= 28m?"}
    B -- Ya --> C["URGENT: Arrival Trigger (arrive_ahead / arrive_left / arrive_right)"]
    B -- Tidak --> D{"First tick rute baru?"}
    D -- Ya --> E["NORMAL: Depart Greeting (foot / motor non-tol / car / transit)"]
    D -- Tidak --> F{"Jarak tegak lurus ke polyline > toleransi moda?"}
    F -- "Ya (>=2 tick berturut / >2.2x)" --> G["URGENT: Off-Route Reroute Alert (cooldown 15s)"]
    F -- "Tidak / 1 tick glitch" --> H["Reset off-route counter & Progresi Kursor Step Monotonik"]
    H --> I{"Perlintasan KA <= 200m?"}
    I -- Ya --> J["URGENT: Hazard Perlintasan Sebidang KA"]
    I -- Tidak --> K["Adaptive Speed Distance Bucket (1000m -> 500m -> 200m -> 80m -> 25m)"]
    K --> L{"Belum diucapkan & lolos cooldown / urgent preemption?"}
    L -- Ya --> M["Layer 1 Lock (+ Chained <=65m Promotion) -> Layer 2 Vector-Attention"]
    L -- Tidak --> N{"TomTom JAM/SLOW >= 2 mnt & cooldown 90s?"}
    N -- Ya --> O["ADVISORY: Peringatan Kemacetan di Depan"]
    N -- Tidak --> P["Silent Tick (Zero Spam)"]
```

### Aturan Anti-Spam, Preemption & Adaptasi Pulau Jawa
- **Adaptasi Kecepatan Tol Trans-Jawa vs Jalan Kaki**: Pada kecepatan `85 km/jam` di jalan tol, `50 m` hanya tersisa `2,1 detik` sehingga bucket `now_25m` secara otomatis memicu lebih awal (`<= 62 m`), sedangkan saat jalan kaki (`5 km/jam`) `50 m` tetap di bucket `imminent_80m`.
- **Anti-Spam Deduplikasi**: `spokenStepStages[stepIndex][bucket]` mencegah pengumuman yang sama diulang pada tick berikutnya.
- **Urgent Preemption**: Pengumuman kritis (`now_25m`, `immediate`, `imminent_80m`, `arrival`, `hazard`) boleh mendahului cooldown normal `3,5 detik` dengan floor aman `1,2 detik` agar instruksi *"Belok kiri sekarang."* tidak pernah tertunda oleh info lalu lintas tenang.
- **Debounce Off-Route (2-Tick)**: Satu kali lonjakan GPS (`1 tick`) diabaikan; pengumuman *"Anda keluar jalur. Menghitung ulang rute..."* hanya muncul setelah 2 tick berturut-turut keluar koridor (atau deviasi ekstrem `> 2,2×` toleransi).

---

## 5. Verifikasi & Handoff ke Iterasi 4/5
- **Unit Test Iterasi 3/5**: [voice_nav_iter3_runtime_engine.test.mjs](file:///d:/TheWeb/Kalceria/backend/tests/voice_nav_iter3_runtime_engine.test.mjs) — mencakup uji byte-parity `modelData/`, benchmark 1.000 inferensi `< 1 ms`, audit keamanan arah semua `directionLock × 5 moda`, serta simulasi perjalanan motor Jakarta 11-tick end-to-end (`depart → prepare_500m → anti-spam → TomTom JAM → chained_lr → urgent now_25m → Bundaran HI exit 2 → 1-tick glitch debounce → 2-tick off-route → arrive_left → silent`).
- **Handoff ke Iterasi 4/5 (`proceed 4/5`)**: Membangun microservice **Docker Neural TTS Bahasa Indonesia** (`infra/voice-tts-id/` berbasis **Piper VITS ONNX `id_ID-news_tts-medium` MIT License — 100% bebas copyright**), pre-baking cache audio frasa statis, dan endpoint backend `/api/map/voice-nav/speak` dengan fallback aman ke Web Speech API browser.

