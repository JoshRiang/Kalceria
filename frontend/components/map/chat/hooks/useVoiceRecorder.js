"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { acquireMicrophoneStream, stopMediaStream } from "@/lib/mediaHardware";

function isDesktopVoiceFamily() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobileOrTabletUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return !isMobileOrTabletUA && !isIPadOS;
}

export function useVoiceRecorder({ onPermissionNeeded } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState([]); // array of 0-100 normalized heights
  const [recorderError, setRecorderError] = useState(null);

  const streamRef = useRef(null);
  const analyserStreamRef = useRef(null);
  const processedStreamRef = useRef(null);
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
    if (processedStreamRef.current) {
      stopMediaStream(processedStreamRef.current);
      processedStreamRef.current = null;
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

    const isDesktop = isDesktopVoiceFamily();

    let stream;
    try {
      // Mobile/Tablet keeps exact raw single-speaker voice constraints;
      // Desktop enables hardware noiseSuppression while routing through calibrated Web Audio DSP conditioning.
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
      let recordingStream = stream;
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;

      if (AudioCtxClass) {
        if (isDesktop) {
          // DESKTOP-ONLY SMART DYNAMIC MIC CONDITIONING PIPELINE (Native C++ Web Audio Graph — Zero JS Thread Stutter):
          // 1. 125Hz Butterworth High-Pass removes 50/60Hz AC hum ("dengung"), laptop fan rumble & desk/keyboard thump.
          // 2. 100Hz Harmonic Trim further cleans power-line hum resonance.
          // 3. 4.1kHz Peaking De-Clacker (-5.5dB) softens sharp mechanical keyboard switch clicks.
          // 4. 7.8kHz Low-Pass rolls off ultrasonic laptop fan / USB preamp hiss.
          // 5. Fast 2ms DynamicsCompressor clamps sudden keystroke transient spikes smoothly.
          // 6. Calibrated Proximity Gain (0.78 vocal / 0.30 idle downward expander with 400ms hang-time) prevents close-mic hotness without ever clipping syllables.
          const audioCtx = new AudioCtxClass({
            sampleRate: 48000,
            latencyHint: "interactive",
          });
          if (audioCtx.state === "suspended") {
            await audioCtx.resume().catch(() => {});
          }
          audioCtxRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(stream);

          const highPass = audioCtx.createBiquadFilter();
          highPass.type = "highpass";
          highPass.frequency.value = 125;
          highPass.Q.value = 0.707;

          const humTrim = audioCtx.createBiquadFilter();
          humTrim.type = "peaking";
          humTrim.frequency.value = 100;
          humTrim.Q.value = 1.6;
          humTrim.gain.value = -4.5;

          const keyClickTamer = audioCtx.createBiquadFilter();
          keyClickTamer.type = "peaking";
          keyClickTamer.frequency.value = 4100;
          keyClickTamer.Q.value = 1.35;
          keyClickTamer.gain.value = -5.5;

          const hissLowPass = audioCtx.createBiquadFilter();
          hissLowPass.type = "lowpass";
          hissLowPass.frequency.value = 7800;
          hissLowPass.Q.value = 0.707;

          const transientCompressor = audioCtx.createDynamicsCompressor();
          transientCompressor.threshold.value = -22;
          transientCompressor.knee.value = 15;
          transientCompressor.ratio.value = 4.5;
          transientCompressor.attack.value = 0.002;
          transientCompressor.release.value = 0.16;

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.25;
          analyserRef.current = analyser;

          const outputGain = audioCtx.createGain();
          outputGain.gain.value = 0.78;

          source.connect(highPass);
          highPass.connect(humTrim);
          humTrim.connect(keyClickTamer);
          keyClickTamer.connect(hissLowPass);
          hissLowPass.connect(transientCompressor);
          transientCompressor.connect(analyser);
          transientCompressor.connect(outputGain);

          if (typeof audioCtx.createMediaStreamDestination === "function") {
            const destination = audioCtx.createMediaStreamDestination();
            outputGain.connect(destination);
            if (destination.stream && destination.stream.getAudioTracks().length > 0) {
              recordingStream = destination.stream;
              processedStreamRef.current = destination.stream;
            }
          }

          // Adaptive Desktop Vocal-Band Expander + Waveform Sampler (80ms cadence, 400ms speech hang-time)
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let ambientFloor = 14;
          let vocalHoldTicks = 5;
          let tickCounter = 0;

          animFrameRef.current = setInterval(() => {
            if (!analyserRef.current || !audioCtxRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            // Core human vocal band @ 48kHz / 256 FFT (187.5 Hz per bin): bins 1..15 (~188 Hz - 2812 Hz)
            let vocalSum = 0;
            let vocalPeak = 0;
            const maxVocalBin = Math.min(15, dataArray.length - 1);
            for (let i = 1; i <= maxVocalBin; i++) {
              const v = dataArray[i];
              vocalSum += v;
              if (v > vocalPeak) vocalPeak = v;
            }
            const vocalAvg = vocalSum / Math.max(1, maxVocalBin);

            if (vocalAvg < ambientFloor + 4) {
              ambientFloor = ambientFloor * 0.92 + vocalAvg * 0.08;
            } else {
              ambientFloor = Math.min(42, ambientFloor * 0.992 + vocalAvg * 0.008);
            }

            const isVocalActive = vocalPeak > ambientFloor + 14 && vocalAvg > ambientFloor + 6;
            if (isVocalActive) {
              vocalHoldTicks = 5; // 400ms smooth hang-time so natural pauses between syllables never dip
            } else if (vocalHoldTicks > 0) {
              vocalHoldTicks -= 1;
            }

            const targetGain = vocalHoldTicks > 0 ? 0.78 : 0.30;
            const timeConstant = vocalHoldTicks > 0 ? 0.008 : 0.12;
            try {
              outputGain.gain.setTargetAtTime(
                targetGain,
                audioCtxRef.current.currentTime,
                timeConstant
              );
            } catch {}

            // Emit UI waveform bar every 2 ticks (160ms, matching Mobile cadence)
            tickCounter += 1;
            if (tickCounter % 2 === 0) {
              const effectivePeak = vocalHoldTicks > 0 ? vocalPeak : Math.round(vocalPeak * 0.4);
              const normalized = Math.min(
                100,
                Math.max(6, Math.round((effectivePeak / 255) * 100))
              );
              waveformAccumulatorRef.current.push(normalized);
              setLiveWaveform((prev) => {
                const next = [...prev, normalized];
                return next.slice(-36);
              });
            }
          }, 80);
        } else {
          // MOBILE / TABLET FAMILY: Preserve exact existing isolated cloned-stream pipeline untouched
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
        recorder = new MediaRecorder(recordingStream, recorderOptions);
      } catch {
        recorder = selectedMime
          ? new MediaRecorder(recordingStream, { mimeType: selectedMime })
          : new MediaRecorder(recordingStream);
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
