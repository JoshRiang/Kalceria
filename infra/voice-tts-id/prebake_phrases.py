"""
Pre-bakes core zero-slot Indonesian navigation phrases into WAV files on disk
during Docker image build so urgent turn instructions ("Belok kiri sekarang.")
are served in < 2 ms without waiting for neural synthesis.
"""

import hashlib
import io
import json
import os
import wave
from pathlib import Path

MODEL_DIR = Path(os.environ.get("VOICE_MODEL_DIR", "/models"))
CACHE_DIR = Path(os.environ.get("VOICE_CACHE_DIR", "/cache")) / "prebaked"
MODEL_NAME = os.environ.get("VOICE_MODEL_NAME", "id_ID-news_tts-medium")
PHRASES_PATH = Path(__file__).resolve().parent / "static_phrases_id.json"


def make_phrase_cache_key(text: str, prosody_rate: float) -> str:
    norm = " ".join(str(text or "").strip().split())
    rate = f"{round(max(0.80, min(1.25, float(prosody_rate))), 2):.2f}"
    raw = f"{MODEL_NAME}|{rate}|{norm}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:24]


def synthesize_wav_bytes(voice, text: str, prosody_rate: float = 1.0) -> bytes:
    """Compatible with both piper-tts >= 1.3 (SynthesisConfig) and 1.2.x API."""
    length_scale = round(1.0 / max(0.80, min(1.25, float(prosody_rate))), 3)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_file:
        try:
            from piper import SynthesisConfig

            syn_cfg = SynthesisConfig(
                volume=1.0,
                length_scale=length_scale,
                noise_scale=0.667,
                noise_w_scale=0.8,
                normalize_audio=True,
            )
            voice.synthesize_wav(text, wav_file, syn_config=syn_cfg)
        except (ImportError, TypeError, AttributeError):
            voice.synthesize(text, wav_file, length_scale=length_scale)
    return buf.getvalue()


def prebake_all():
    from piper import PiperVoice

    model_path = MODEL_DIR / f"{MODEL_NAME}.onnx"
    config_path = MODEL_DIR / f"{MODEL_NAME}.onnx.json"
    if not model_path.exists():
        raise FileNotFoundError(f"Piper model missing at {model_path}")

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    voice = PiperVoice.load(str(model_path), config_path=str(config_path))
    phrases = json.loads(PHRASES_PATH.read_text(encoding="utf-8"))

    count = 0
    for item in phrases:
        text = str(item["text"]).strip()
        rate = float(item.get("prosodyRate", 1.0))
        key = make_phrase_cache_key(text, rate)
        out_path = CACHE_DIR / f"{key}.wav"
        wav_bytes = synthesize_wav_bytes(voice, text, prosody_rate=rate)
        out_path.write_bytes(wav_bytes)
        count += 1

    print(f"[VoiceTTS Prebake] Pre-baked {count} static Indonesian navigation WAVs into {CACHE_DIR}")


if __name__ == "__main__":
    prebake_all()

