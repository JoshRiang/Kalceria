"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { acquireMicrophoneStream, stopMediaStream } from "@/lib/mediaHardware";

export function useVoiceRecorder({ onPermissionNeeded } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState([]); // array of 0-100 normalized heights
  const [recorderError, setRecorderError] = useState(null);

  const streamRef = useRef(null);
  const analyserStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const waveformAccumulatorRef = useRef([]);
  const resolveStopRef = useRef(null);
  const startTimeRef = useRef(0);
  const durationRef = useRef(0);
  const onPermissionNeededRef = useRef(onPermissionNeeded);
  onPermissionNeededRef.current = onPermissionNeeded;

  const cleanupAudioPipeline = useCallback(() => {
    if (animFrameRef.current) {
      clearInterval(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (analyserStreamRef.current) {
      stopMediaStream(analyserStreamRef.current);
      analyserStreamRef.current = null;
    }
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        if (audioCtxRef.current.state !== "closed") {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch {}
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  // Ensure clean teardown on component unmount
  useEffect(() => {
    return () => {
      cleanupAudioPipeline();
    };
  }, [cleanupAudioPipeline]);

  const startRecording = useCallback(async () => {
    setRecorderError(null);
    recordedChunksRef.current = [];
    waveformAccumulatorRef.current = [];
    setLiveWaveform([]);
    startTimeRef.current = Date.now();
    durationRef.current = 0;
    setDuration(0);

    let stream;
    try {
      // Disable echoCancellation and autoGainControl for single-speaker voice notes so syllables are never clipped or gated
      stream = await acquireMicrophoneStream({
        sampleRate: 48000,
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: true,
        autoGainControl: false,
      });
      streamRef.current = stream;
    } catch (err) {
      if (err.code === "PERMISSION_DENIED" && onPermissionNeededRef.current) {
        onPermissionNeededRef.current("mic");
      }
      setRecorderError(err.message);
      return false;
    }

    try {
      // 1. Web Audio API Voice Analyzer Pipeline on an isolated cloned stream so AudioContext never contends with MediaRecorder
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        const clonedStream = typeof stream.clone === "function" ? stream.clone() : stream;
        if (clonedStream !== stream) {
          analyserStreamRef.current = clonedStream;
        }
        const audioCtx = new AudioCtxClass();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume().catch(() => {});
        }
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(clonedStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.25;
        source.connect(analyser);
        analyserRef.current = analyser;

        // 2. Real-time Vocal Energy Sampling Loop
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        animFrameRef.current = setInterval(() => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let peak = 0;
          for (let i = 1; i < dataArray.length; i++) {
            if (dataArray[i] > peak) peak = dataArray[i];
          }

          const normalized = Math.min(100, Math.max(6, Math.round((peak / 255) * 100)));

          waveformAccumulatorRef.current.push(normalized);
          setLiveWaveform((prev) => {
            const next = [...prev, normalized];
            return next.slice(-36);
          });
        }, 160);
      }

      // 3. MediaRecorder High-Fidelity Audio Encoding (128 kbps, continuous stream without 100ms chunk slicing)
      const preferredMimes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
      ];
      let selectedMime = "";
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported) {
        selectedMime = preferredMimes.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      }

      const recorderOptions = selectedMime
        ? { mimeType: selectedMime, audioBitsPerSecond: 128000 }
        : { audioBitsPerSecond: 128000 };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, recorderOptions);
      } catch {
        recorder = selectedMime ? new MediaRecorder(stream, { mimeType: selectedMime }) : new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || selectedMime || "audio/webm";
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        const recordedWaveform = [...waveformAccumulatorRef.current];

        const recordedDuration = startTimeRef.current
          ? Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
          : Math.max(1, durationRef.current);

        cleanupAudioPipeline();

        if (resolveStopRef.current) {
          resolveStopRef.current({
            blob,
            url,
            duration: recordedDuration,
            waveform: recordedWaveform,
          });
          resolveStopRef.current = null;
        }
      };

      // Continuous recording without 100ms cluster slicing prevents Opus frame boundary stuttering
      recorder.start();
      setIsRecording(true);

      // 4. Second Counter
      timerIntervalRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);

      return true;
    } catch (setupErr) {
      cleanupAudioPipeline();
      setRecorderError(setupErr?.message || "Gagal menginisialisasi rekaman suara.");
      return false;
    }
  }, [cleanupAudioPipeline]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        cleanupAudioPipeline();
        setIsRecording(false);
        resolve(null);
        return;
      }
      resolveStopRef.current = resolve;
      setIsRecording(false);
      try {
        mediaRecorderRef.current.stop();
      } catch {
        cleanupAudioPipeline();
        resolve(null);
      }
    });
  }, [cleanupAudioPipeline]);

  const cancelRecording = useCallback(() => {
    cleanupAudioPipeline();
    setIsRecording(false);
    setLiveWaveform([]);
    startTimeRef.current = Date.now();
    durationRef.current = 0;
    setDuration(0);
    recordedChunksRef.current = [];
    waveformAccumulatorRef.current = [];
  }, [cleanupAudioPipeline]);

  return {
    isRecording,
    duration,
    liveWaveform,
    recorderError,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

