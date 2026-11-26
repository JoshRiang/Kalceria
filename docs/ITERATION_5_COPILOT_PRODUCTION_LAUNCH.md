# ITERATION 5/5 — FOCUS MODE AI VOICE CO-PILOT INTEGRATION, AUDIO DUCKING & PRODUCTION LAUNCH

**Iteration:** `5 / 5 (FINAL PRODUCTION LAUNCH)`  
**Date:** 2026-11-27  
**Parent Plan:** [AI_VOICE_NAVIGATION_MASTER_PLAN.md](file:///d:/TheWeb/Kalceria/docs/AI_VOICE_NAVIGATION_MASTER_PLAN.md)  
**Previous Iterations:**
- [ITERATION_1_VOICE_NAV_CORPUS_AND_METHODOLOGY.md](file:///d:/TheWeb/Kalceria/docs/ITERATION_1_VOICE_NAV_CORPUS_AND_METHODOLOGY.md)
- [ITERATION_2_JAVA_ATTENTION_TRAINING.md](file:///d:/TheWeb/Kalceria/docs/ITERATION_2_JAVA_ATTENTION_TRAINING.md)
- [ITERATION_3_INFERENCE_AND_TRIGGERS.md](file:///d:/TheWeb/Kalceria/docs/ITERATION_3_INFERENCE_AND_TRIGGERS.md)
- [ITERATION_4_DOCKER_NEURAL_TTS.md](file:///d:/TheWeb/Kalceria/docs/ITERATION_4_DOCKER_NEURAL_TTS.md)

---

## 1. Tujuan Iterasi 5/5
Menyelesaikan integrasi **end-to-end AI Voice Navigation Co-Pilot** ke dalam **Focus Mode Group Location Blend** di frontend Kalceria dengan nol regresi (`0 Hook Delta` di Tier A `MapPageClient.jsx` & `usePersonalChatState.js`), audio ducking harmonis bersama `soundEngine.js`, UI panduan suara + live subtitle ticker elegan, serta deploy penuh ke production (`www.kalceria.id` & `api.kalceria.id`).

---

## 2. Arsitektur Frontend Modular (`frontend/components/map/blend/voiceNav/`)

| Modul | Path | Tanggung Jawab Tunggal (SRP) |
|---|---|---|
| **Client Vector-Attention Core** | [clientAttentionCore.js](file:///d:/TheWeb/Kalceria/frontend/components/map/blend/voiceNav/clientAttentionCore.js) | 100% murni & mandiri di dalam `frontend/` (0 React, 0 DOM, 0 `@/`, 0 `node:*`). Terbukti **100% byte-parity** dengan engine backend pada seluruh 66 frasa Google Maps Indonesia. |
| **Client Maneuver Trigger Machine** | [clientTriggerMachine.js](file:///d:/TheWeb/Kalceria/frontend/components/map/blend/voiceNav/clientTriggerMachine.js) | Mengevaluasi GPS terkurasi real-time terhadap `route.steps[]` langsung di browser (`< 0.1 ms` per tick) dengan cascade jarak adaptif kecepatan, anti-spam, urgent preemption, off-route debounce 2-tick, dan hazard perlintasan KA. |
| **Hardware Audio Player & Ducking** | [voiceAudioPlayer.js](file:///d:/TheWeb/Kalceria/frontend/components/map/blend/voiceNav/voiceAudioPlayer.js) | Pemutaran dual-engine: mencoba Neural Piper MIT WAV via `/api/map/voice-nav/speak` (dengan 48-entry client Blob LRU cache), dan bila belum terpasang otomatis beralih instan ke `window.speechSynthesis` suara Bahasa Indonesia terbaik (`Google Bahasa Indonesia` / `Gadis` / `Damayanti`, `id-ID`). Dilengkapi soft tactical pre-chime 65 ms pada manuver urgent & mobile Safari/Chrome autoplay unlock saat user menekan tombol `FOKUS`. |
| **Focus Mode Co-Pilot Hook** | [useBlendVoiceCoPilot.js](file:///d:/TheWeb/Kalceria/frontend/components/map/blend/voiceNav/useBlendVoiceCoPilot.js) | Memuat bundle 26 KB dari `/api/map/voice-nav/bundle` 1 kali, menyalakan subtitle & suara secara otomatis saat berada di Focus Mode, berhenti bersih saat keluar Focus Mode / unmount, dan menyediakan tombol manual `Ucapkan` serta `Mute/Unmute`. |
| **Sound Engine Audio Ducking** | [soundEngine.js](file:///d:/TheWeb/Kalceria/frontend/lib/soundEngine.js) | Menambahkan `getVoiceNavDuckingFactor()` (`0.28×` saat `window.__kalceriaVoiceNavSpeaking === true`) agar ping chat/collab otomatis mengecil sopan dan tidak menimpa panduan jalan AI. |
| **Focus HUD & Controller UI** | [BlendFocusHud.jsx](file:///d:/TheWeb/Kalceria/frontend/components/map/blend/BlendFocusHud.jsx) & [MapBlendController.jsx](file:///d:/TheWeb/Kalceria/frontend/components/map/blend/MapBlendController.jsx) | Menampilkan bar **AI Voice Co-Pilot** (ikon arah SVG tajam, live subtitle ticker Bahasa Indonesia, indikator gelombang animasi saat berbicara, badge `Neural ID` saat Docker Piper aktif, tombol `Ucapkan`, dan tombol Mute/Unmute). |
| **Client API Helpers** | [api.js](file:///d:/TheWeb/Kalceria/frontend/lib/api.js) | `fetchVoiceNavBundle()`, `fetchVoiceNavTtsHealth()`, dan `requestVoiceNavSpeak()` (mendukung binary `audio/wav` sekaligus JSON `browser_speech_fallback`). |

---

## 3. Rekap Pencapaian Lengkap Program 5/5 Iterasi

| Iterasi | Artefak & Pencapaian Kunci | Hasil Terukur |
|---|---|---|
| **1/5** | Audit lisensi HF (memilih `rhasspy/piper-voices` MIT, menolak Meta MMS CC-BY-NC), 66 frasa Google Maps Indonesia (`GOOGLE_MAPS_ID_CORPUS.json`), `javaTextNormalizer.js`, & Layer 1 `corpusRegistry.js` | **66 template, 0 kontradiksi arah** |
| **2/5** | Ekstraksi `steps[]` lintas OSRM (`&steps=true`), TomTom (`instructionsType=coded`), & Transitous; training Pure NumPy Multi-Head Vector-Attention (`H=4`, `d_k=8`, 30-dim, 1.990 parameter) pada 14.000 skenario Pulau Jawa | **`26,32 KB`, Test Acc `100,00%`, Dir Safety `100,00%`** |
| **3/5** | Runtime Pure JS/ESM Vector-Attention (`attentionCore.js` + `maneuverTriggerStateMachine.js`), Vercel Lambda asset bundling (`modelData/`), API `/bundle` & `/evaluate` | **Avg `0,0593 ms` (p99 `0,3998 ms`), 11-tick sim PASS** |
| **4/5** | Docker CPU Neural TTS MIT (`infra/voice-tts-id/`, 18 frasa pre-baked `< 2 ms`), unified `infra/docker-compose.java-nav.yml` (OSRM Jawa + Piper TTS), Backend `/speak` LRU proxy & zero-crash fallback | **100% Bebas Copyright (MIT), `0%` HTTP 500** |
| **5/5** | Integrasi penuh AI Voice Co-Pilot ke Focus Mode (`BlendFocusHud.jsx`, `MapBlendController.jsx`), audio ducking `soundEngine.js`, 66/66 FE↔BE parity test, Next.js build & live launch | **0 Hook Delta di Tier A, Live Production GREEN** |

---

## 4. Cara Mengaktifkan Suara Studio Neural Piper (Opsional Self-Host VPS)
Saat ini **AI Voice Co-Pilot sudah langsung bekerja 100% di production** menggunakan suara `id-ID` bawaan perangkat sebagai fallback zero-latency. Untuk meng-upgrade ke suara studio neural **Piper VITS ONNX (MIT License)** tanpa mengubah satu baris kode pun:
```bash
cd infra
docker compose -f docker-compose.java-nav.yml up -d --build
```
Lalu tambahkan variabel lingkungan berikut di Vercel Project `kalceria-backend`:
```env
VOICE_TTS_URL=https://tts-id.yourdomain.com
VOICE_TTS_API_SECRET=<opsional-token-rahasia>
```
Begitu `VOICE_TTS_URL` aktif, backend otomatis beralih mengirimkan binary `audio/wav` Neural Piper dan badge **`Neural ID`** muncul pada Focus Mode HUD!

