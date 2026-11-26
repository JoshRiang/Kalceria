# Kalceria Indonesian Neural Voice TTS (Docker CPU — 100% Copyright-Free MIT)

Lightweight CPU-only Neural TTS microservice powering Kalceria AI Voice Navigation on Pulau Jawa.

## Model & License Audit
- **Model**: `rhasspy/piper-voices` — `id/id_ID/news_tts/medium/id_ID-news_tts-medium.onnx`
- **License**: **MIT License** (100% copyright-free, commercial-safe, zero royalties)
- **Performance**: `< 2 ms` for 18 pre-baked urgent navigation phrases; `~80–120 ms` CPU ONNX synthesis for dynamic street names; `<= 512 MB` RAM.

## Quick Start (Standalone)
```bash
cd infra/voice-tts-id
docker compose up -d --build
curl http://127.0.0.1:5055/health
```

## Quick Start (Unified Pulau Jawa Navigation Stack: OSRM + Neural TTS)
```bash
cd infra
docker compose -f docker-compose.java-nav.yml up -d --build
```

## Backend Environment Variables
Set on Kalceria Backend (Vercel / VPS):
```env
VOICE_TTS_URL=https://tts-id.yourdomain.com
VOICE_TTS_API_SECRET=<optional-shared-secret>
```
When `VOICE_TTS_URL` is omitted or unreachable, Kalceria Backend automatically returns a clean `browser_speech_fallback` descriptor (`id-ID`) with zero errors.

