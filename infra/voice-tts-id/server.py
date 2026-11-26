"""
Kalceria Copyright-Free Indonesian Neural TTS HTTP Microservice (FastAPI + Piper VITS ONNX MIT).

Features:
- 100% Copyright-Free MIT Voice: `rhasspy/piper-voices` `id_ID-news_tts-medium`
- Tier 1 Cache: Pre-baked static urgent phrases on disk (< 2 ms)
- Tier 2 Cache: Bounded In-Memory LRU WAV cache (256 entries)
- Tier 3 Live Synthesis: CPU ONNX Runtime (< 120 ms for typical Pulau Jawa turn sentence)
"""

from collections import OrderedDict
import os
from pathlib import Path
import time
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel, Field

from prebake_phrases import (
    CACHE_DIR,
    MODEL_DIR,
    MODEL_NAME,
    make_phrase_cache_key,
    synthesize_wav_bytes,
)

API_SECRET = os.environ.get("VOICE_TTS_API_SECRET", "").strip()
LRU_MAX_ENTRIES = int(os.environ.get("VOICE_TTS_LRU_MAX", "256"))

app = FastAPI(title="Kalceria Indonesian Neural TTS (Piper MIT)", version="1.0.0")

_voice = None
_lru_cache: OrderedDict[str, bytes] = OrderedDict()


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=320)
    prosodyRate: float = Field(default=1.0, ge=0.80, le=1.25)
    urgency: str = Field(default="advisory")


def _get_voice():
    global _voice
    if _voice is None:
        from piper import PiperVoice

        model_path = MODEL_DIR / f"{MODEL_NAME}.onnx"
        config_path = MODEL_DIR / f"{MODEL_NAME}.onnx.json"
        if not model_path.exists():
            raise RuntimeError(f"Piper ONNX model not found at {model_path}")
        _voice = PiperVoice.load(str(model_path), config_path=str(config_path))
    return _voice


@app.on_event("startup")
def _warm_model():
    _get_voice()


@app.get("/health")
def health():
    prebaked_count = len(list(CACHE_DIR.glob("*.wav"))) if CACHE_DIR.exists() else 0
    return {
        "status": "ok",
        "engine": "piper-vits-onnx",
        "model": MODEL_NAME,
        "license": "MIT",
        "locale": "id-ID",
        "sampleRate": 22050,
        "prebakedCount": prebaked_count,
        "lruCacheSize": len(_lru_cache),
    }


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest, x_tts_token: Optional[str] = Header(default=None)):
    if API_SECRET and x_tts_token != API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid TTS token.")

    clean_text = " ".join(req.text.strip().split())
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text must not be empty.")

    t0 = time.perf_counter()
    cache_key = make_phrase_cache_key(clean_text, req.prosodyRate)

    # Tier 1: Pre-baked urgent phrases on disk
    prebaked_file = CACHE_DIR / f"{cache_key}.wav"
    if prebaked_file.exists():
        wav_bytes = prebaked_file.read_bytes()
        cache_state = "prebaked"
    # Tier 2: Bounded In-Memory LRU cache
    elif cache_key in _lru_cache:
        _lru_cache.move_to_end(cache_key)
        wav_bytes = _lru_cache[cache_key]
        cache_state = "lru"
    # Tier 3: Live CPU ONNX Neural Synthesis
    else:
        voice = _get_voice()
        wav_bytes = synthesize_wav_bytes(voice, clean_text, prosody_rate=req.prosodyRate)
        _lru_cache[cache_key] = wav_bytes
        if len(_lru_cache) > LRU_MAX_ENTRIES:
            _lru_cache.popitem(last=False)
        cache_state = "synthesized"

    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={
            "Cache-Control": "public, max-age=86400",
            "X-TTS-Engine": "piper-id-mit",
            "X-TTS-Model": MODEL_NAME,
            "X-TTS-Cache": cache_state,
            "X-TTS-Latency-Ms": str(elapsed_ms),
        },
    )

