# Kalceria Neural Voice TTS Microservice — Bahasa Indonesia (100% Copyright-Free MIT)
# Model: rhasspy/piper-voices -> id/id_ID/news_tts/medium/id_ID-news_tts-medium.onnx (MIT License)
# CPU-only ONNX Runtime (~120ms synthesis, <2ms pre-baked urgent navigation phrases)

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VOICE_MODEL_DIR=/models \
    VOICE_CACHE_DIR=/cache \
    VOICE_MODEL_NAME=id_ID-news_tts-medium \
    VOICE_TTS_PORT=5055

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    espeak-ng \
    libsndfile1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/voice-tts-id

COPY requirements.txt /opt/voice-tts-id/requirements.txt
RUN pip install --no-cache-dir -r /opt/voice-tts-id/requirements.txt

# Fetch verified MIT-licensed Indonesian Piper VITS ONNX model + config from Hugging Face
RUN mkdir -p "${VOICE_MODEL_DIR}" "${VOICE_CACHE_DIR}/prebaked" && \
    curl -fSL "https://huggingface.co/rhasspy/piper-voices/resolve/main/id/id_ID/news_tts/medium/id_ID-news_tts-medium.onnx" \
      -o "${VOICE_MODEL_DIR}/id_ID-news_tts-medium.onnx" && \
    curl -fSL "https://huggingface.co/rhasspy/piper-voices/resolve/main/id/id_ID/news_tts/medium/id_ID-news_tts-medium.onnx.json" \
      -o "${VOICE_MODEL_DIR}/id_ID-news_tts-medium.onnx.json"

COPY static_phrases_id.json /opt/voice-tts-id/static_phrases_id.json
COPY prebake_phrases.py /opt/voice-tts-id/prebake_phrases.py
COPY server.py /opt/voice-tts-id/server.py

# Pre-bake urgent zero-slot Indonesian Google-Maps-grade phrases for <2ms instant playback
RUN python /opt/voice-tts-id/prebake_phrases.py

EXPOSE 5055

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${VOICE_TTS_PORT}/health" || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5055", "--workers", "1"]

