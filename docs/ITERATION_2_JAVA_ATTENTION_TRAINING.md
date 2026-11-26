# ITERATION 2/5 — TURN-BY-TURN STEP EXTRACTION & PULAU JAWA MULTI-HEAD VECTOR-ATTENTION TRAINING

**Iteration:** `2 / 5`  
**Date:** 2026-11-27  
**Parent Plan:** [AI_VOICE_NAVIGATION_MASTER_PLAN.md](file:///d:/TheWeb/Kalceria/docs/AI_VOICE_NAVIGATION_MASTER_PLAN.md)  
**Previous Iteration:** [ITERATION_1_VOICE_NAV_CORPUS_AND_METHODOLOGY.md](file:///d:/TheWeb/Kalceria/docs/ITERATION_1_VOICE_NAV_CORPUS_AND_METHODOLOGY.md)

---

## 1. Tujuan Iterasi 2/5
1. Memastikan seluruh engine routing Kalceria (**OSRM Pulau Jawa**, **TomTom Live Traffic v1**, dan **Transitous MOTIS / Overpass Bus & Train**) memancarkan daftar instruksi turn-by-turn real-time `steps[]` yang terstandardisasi dalam satu kontrak `NavStep[]`.
2. Melatih model **Multi-Head Scaled Dot-Product Vector-Attention** (*Static-ML*, bukan LLM generatif) secara khusus terhadap kondisi lalu lintas, kelas jalan, dan pola manuver **Pulau Jawa** menggunakan dataset 14.000 skenario terkurasi, lalu mengekspor bobot ringan JSON (`< 60 KB`) yang dapat dieksekusi < 1 ms di Node.js dan browser pada Iterasi 3/5.

---

## 2. Ekstraksi Manuver Jalan Real-Time (`steps[]`)

Modul murni baru: [routeStepExtractor.js](file:///d:/TheWeb/Kalceria/backend/services/voiceNav/routeStepExtractor.js)

### Integrasi ke Backend Routing Services
| Engine Routing | File Target | Upgrade Ekstraksi Real-Time |
|---|---|---|
| **OSRM Pulau Jawa (`foot`, `motorcycle`, `car`)** | [blendRoutingService.js](file:///d:/TheWeb/Kalceria/backend/services/blendRoutingService.js) | Menambahkan `&steps=true` pada query OSRM dan memetakan `route.legs[0].steps` via `extractStepsFromOsrmLeg()` |
| **TomTom Routing v1 (Live Traffic)** | [blendRoutingService.js](file:///d:/TheWeb/Kalceria/backend/services/blendRoutingService.js) | Menambahkan `instructionsType=coded` pada query TomTom dan memetakan `route.guidance.instructions` via `extractStepsFromTomTomGuidance()` |
| **Transitous MOTIS + Overpass Multimodal (`bus`, `train`)** | [blendTransitService.js](file:///d:/TheWeb/Kalceria/backend/services/blendTransitService.js) | Memetakan seluruh 3 tier fallback transit (walk → board → alight → arrive) via `extractStepsFromTransitSegments()` |

### Kontrak Kanonis `NavStep`
Setiap elemen `route.steps[i]` menjamin struktur identik lintas provider:
- `index`, `maneuverType`, `modifier`
- `directionLock`: kunci arah simbolik Layer 1 (`left`, `right`, `slight_left`, `sharp_right`, `uturn`, `roundabout`, `keep_left`, `ramp_enter`, `ramp_exit`, `transit_walk`, `transit_board`, `transit_alight`, `arrive_ahead`, dll.)
- `roadName` & `spokenRoadName` (sudah dinormalisasi oleh `normalizeJavaRoadName()`)
- `roadClass`: klasifikasi jalan Pulau Jawa (`tol`, `arteri`, `lokal`, `gang`, `bundaran`, `flyover`, `underpass`, `perlintasan_ka`, `stasiun`, `halte`)
- `exitNumber`, `distanceMeters`, `durationSeconds`, `lat`, `lng`
- `hasChainedNext` & `chainedDirectionLock` (`chained_lr`, `chained_rl`, `chained_ll`, `chained_rr` untuk dua belokan berturut-turut berjarak `<= 65 meter` via `annotateChainedTurns()`)
- `isEndOfRoad` (OSRM `end of road` T-junction) & `isNewRoadName` (OSRM `new name`)

---

## 3. Arsitektur & Pelatihan Model Multi-Head Vector-Attention Pulau Jawa

Pipeline pelatihan:
- Generator Skenario Pulau Jawa: [java_scenario_generator.py](file:///d:/TheWeb/Kalceria/ml/voice_nav_java/java_scenario_generator.py)
- Trainer Multi-Head Vector-Attention (Pure NumPy, Adam + Cosine LR Decay + L2 Regularization): [train_java_attention.py](file:///d:/TheWeb/Kalceria/ml/voice_nav_java/train_java_attention.py)
- Bobot Terlatih: [JAVA_ATTENTION_WEIGHTS_V1.json](file:///d:/TheWeb/Kalceria/data/voice_nav_java/JAVA_ATTENTION_WEIGHTS_V1.json)
- Laporan Metrik JSON: [TRAINING_REPORT_ITER2.json](file:///d:/TheWeb/Kalceria/data/voice_nav_java/TRAINING_REPORT_ITER2.json)

### A. Vektor Fitur Konteks Jalan Kanonis (`x ∈ ℝ³⁰`)
| Indeks | Dimensi | Deskripsi Sinyal Real-Time |
|---|---|---|
| `0..4` | 5 | One-hot moda transportasi (`foot`, `motorcycle`, `car`, `bus`, `train`) |
| `5..10` | 6 | One-hot bucket jarak (`far_1000m`, `prepare_500m`, `approach_200m`, `imminent_80m`, `now_25m`, `immediate`) |
| `11..20` | 10 | One-hot kelas jalan Pulau Jawa (`tol`, `arteri`, `lokal`, `gang`, `bundaran`, `flyover`, `underpass`, `perlintasan_ka`, `stasiun`, `halte`) |
| `21..24` | 4 | One-hot status kemacetan TomTom (`FREE`, `MODERATE`, `SLOW`, `JAM`) |
| `25` | 1 | `hasRoadName` (`0` / `1`) |
| `26` | 1 | `hasChainedNext` (`0` / `1`) |
| `27` | 1 | `speedNormalized` (`clip(speed_kmh / 90, 0, 1)`) |
| `28` | 1 | `isEndOfRoad` (`0` / `1` — persimpangan T / ujung jalan) |
| `29` | 1 | `isNewRoadName` (`0` / `1` — perubahan nama jalan) |

### B. Persamaan Matematis Multi-Head Scaled Dot-Product Attention (`H = 4`, `d_k = 8`)
Untuk vektor konteks jalan `x ∈ ℝ³⁰` dan matriks deskriptor korpus `E ∈ ℝ^{66×30}`:

$$Q_h = x \cdot W_Q^{(h)}, \quad K_h = E \cdot W_K^{(h)}, \quad S_h = \frac{Q_h K_h^T}{\sqrt{8}}$$

$$\text{Logits} = \sum_{h=1}^{4} \alpha_h S_h + b, \quad P(u \mid x, M) = \text{softmax}(\text{Logits} + \log M)$$

Di mana `M ∈ {0, 1}^{66}` adalah **Layer 1 Hard Symbolic Direction Mask**: setiap template dengan `directionLock` tidak identik diberi skor `-1e9` sebelum softmax sehingga probabilitas salah arah kiri/kanan adalah **tepat 0,00% secara matematis**.

### C. Temuan Ablation Engineering Selama Iterasi 2/5 (Penting!)
Pada run pelatihan pertama (`28-dim` + satu lock `"chained"` bersama):
- Held-out Test Accuracy hanya mencapai **92,64%** karena 3 sumber ambiguitas struktural:
  1. `chained` hanya **34,15%** karena 4 kombinasi belokan berangkai (`kiri→kanan`, `kanan→kiri`, `kiri→kiri`, `kanan→kanan`) berbagi satu `directionLock: "chained"` — yang berpotensi menukar urutan belokan berangkai!
  2. `end_of_road` hanya **22,81%** karena sinyal OSRM `end of road` belum masuk ke vektor fitur.
  3. `straight` sebesar **94,59%** karena `new_name` belum dipisahkan dari `continue`.
- **Solusi Arsitektural yang Diterapkan**:
  1. Memecah `directionLock` berangkai menjadi 4 kunci keras terpisah (`chained_lr`, `chained_rl`, `chained_ll`, `chained_rr`) + audit urutan kata `kiri`/`kanan` di [corpusRegistry.js](file:///d:/TheWeb/Kalceria/backend/services/voiceNav/corpusRegistry.js).
  2. Memperluas vektor fitur dari `28-dim` → **`30-dim`** dengan memasukkan dua sinyal nyata OSRM/TomTom: `isEndOfRoad` (dim 28) & `isNewRoadName` (dim 29).

---

## 4. Hasil Evaluasi Riil Pelatihan (`TRAINING_REPORT_ITER2.json`)

- **Dataset Split**: **14.000 skenario Pulau Jawa** (`11.200 Train` / `1.400 Validation` / `1.400 Held-Out Test`)
- **Total Parameter**: **1.990 parameter** (`W_Q [4,30,8]`, `W_K [4,30,8]`, `headScale [4]`, `bias [66]`)
- **Ukuran File Bobot**: **`26,32 KB`** (`JAVA_ATTENTION_WEIGHTS_V1.json`) — jauh di bawah batas `60 KB`, siap dijalankan instan di client browser & backend Node.js!

### Kurva Pelatihan (45 Epoch, Adam `lr=0.025` + Cosine Decay)
| Epoch | Train Loss | Train Acc | Val Loss | Val Acc | Directional Safety |
|---:|---:|---:|---:|---:|---:|
| 1 | `0.01098` | `99.95%` | `0.01126` | `100.00%` | `100.00%` |
| 10 | `0.02368` | `99.15%` | `0.03258` | `98.86%` | `100.00%` |
| 20 | `0.00121` | `100.00%` | `0.00144` | `100.00%` | `100.00%` |
| 30 | `0.00122` | `100.00%` | `0.00147` | `100.00%` | `100.00%` |
| 40 | `0.00096` | `100.00%` | `0.00112` | `100.00%` | `100.00%` |
| **45 (Best)** | **`0.00092`** | **`100.00%`** | **`0.00102`** | **`100.00%`** | **`100.00%`** |

### Hasil Held-Out Test Set (1.400 Skenario Tak Terlihat)
- **Held-Out Test Loss**: **`0.00084`**
- **Held-Out Test Top-1 Accuracy**: **`100.00%`**
- **Hard Directional Safety Accuracy**: **`100.00%`**
- **Akurasi Per Kategori (15/15 Kategori)**:
  `arrive: 100%`, `chained: 100%`, `depart: 100%`, `end_of_road: 100%`, `fork: 100%`, `hazard: 100%`, `merge: 100%`, `ramp: 100%`, `reroute: 100%`, `roundabout: 100%`, `straight: 100%`, `traffic: 100%`, `transit: 100%`, `turn: 100%`, `uturn: 100%`.

---

## 5. Handoff ke Iterasi 3/5
Pada **Iterasi 3/5 (`proceed 3/5`)**, kita akan membangun:
1. **Runtime Pure JS/ESM Vector-Attention Inference Engine** (`attentionInferenceEngine.js`, `< 1 ms` per inferensi) yang memuat `JAVA_ATTENTION_WEIGHTS_V1.json` secara langsung tanpa Python/PyTorch.
2. **Real-Time Maneuver & Distance Trigger State Machine** (`maneuverTriggerStateMachine.js`): memantau posisi GPS terkurasi terhadap array `route.steps[]`, menembakkan pengumuman tepat waktu (`1000m → 500m → 200m → 80m → 25m`), mencegah spam suara (cooldown & deduplikasi step), serta mendeteksi `off-route` dan peringatan macet TomTom di depan.

