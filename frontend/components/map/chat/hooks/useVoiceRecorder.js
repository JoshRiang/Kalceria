"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { acquireMicrophoneStream, stopMediaStream } from "@/lib/mediaHardware";

export function useVoiceRecorder({ onPermissionNeeded } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState([]); // array of 0-100 normalized heights
  const [recorderError, setRecorderError] = useState(null);

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const waveformAccumulatorRef = useRef([]);
  const resolveStopRef = useRef(null);

  const cleanupAudioPipeline = useCallback(() => {
    if (animFrameRef.current) {
      clearInterval(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
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
    setDuration(0);

    let stream;
    try {
      stream = await acquireMicrophoneStream();
      streamRef.current = stream;
    } catch (err) {
      if (err.code === "PERMISSION_DENIED" && onPermissionNeeded) {
        onPermissionNeeded("mic");
      }
      setRecorderError(err.message);
      return false;
    }

    try {
      // 1. Web Audio API Voice Analyzer Pipeline
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume().catch(() => {});
      }
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.1;
      source.connect(analyser);
      analyserRef.current = analyser;

      // 2. Real-time Vocal Energy Sampling Loop (ultra-low latency & minimal processing)
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      animFrameRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Instantaneous peak energy across active speech frequencies
        let peak = 0;
        for (let i = 1; i < dataArray.length; i++) {
          if (dataArray[i] > peak) peak = dataArray[i];
        }

        // Direct proportional mapping with minimal processing:
        // Baseline 6% on quiet, raising instantly to 100% when voice detected
        const normalized = Math.min(100, Math.max(6, Math.round((peak / 255) * 100)));

        waveformAccumulatorRef.current.push(normalized);
        setLiveWaveform((prev) => {
          const next = [...prev, normalized];
          return next.slice(-32); // keep latest 32 bars visible in UI
        });
      }, 40);

      // 3. MediaRecorder Audio Compression
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

      const recorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
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

        cleanupAudioPipeline();

        if (resolveStopRef.current) {
          resolveStopRef.current({
            blob,
            url,
            duration: Math.max(1, duration),
            waveform: recordedWaveform,
          });
          resolveStopRef.current = null;
        }
      };

      recorder.start(100); // 100ms slice chunks
      setIsRecording(true);

      // 4. Second Counter
      timerIntervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      return true;
    } catch (setupErr) {
      cleanupAudioPipeline();
      setRecorderError(setupErr?.message || "Gagal menginisialisasi rekaman suara.");
      return false;
    }
  }, [cleanupAudioPipeline, duration, onPermissionNeeded]);

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

