'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Monitor, Clock, ShieldAlert, CheckCircle, RefreshCw, Smartphone, Pause, Layers } from 'lucide-react';

export default function SessionTracker({ onSessionUpdate }) {
  const [session, setSession] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [lastCaptureTime, setLastCaptureTime] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);

  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const broadcastChannelRef = useRef(null);

  // 1. Multi-Tab Lock Detection via BroadcastChannel
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('raven_telemetry_tab_channel');
        broadcastChannelRef.current = channel;

        const tabId = Math.random().toString(36).substring(7);

        channel.onmessage = (event) => {
          if (event.data?.type === 'CLAIM_ACTIVE_TAB') {
            channel.postMessage({ type: 'TAB_ALREADY_ACTIVE', from: tabId });
          } else if (event.data?.type === 'TAB_ALREADY_ACTIVE') {
            setIsDuplicateTab(true);
          }
        };

        channel.postMessage({ type: 'CLAIM_ACTIVE_TAB', tabId });
      }
    } catch (e) {
      console.error('BroadcastChannel not supported', e);
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  // Mobile Device Guard Detection
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent || '';
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
      const hasTouchSpoof = navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);
      setIsMobile(mobileRegex.test(ua) || hasTouchSpoof);
    };
    checkMobile();
  }, []);

  // Check active session on mount
  useEffect(() => {
    checkActiveSession();
    return () => {
      stopAllIntervals();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const checkActiveSession = async () => {
    try {
      const res = await fetch('/api/session/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.today) {
          setSecondsElapsed(data.today.seconds || 0);
        }
        if (data.active_session) {
          setSession(data.active_session);
        }
      }
    } catch (e) {
      console.error('Error checking active session', e);
    }
  };

  const stopAllIntervals = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
  };

  const shiftStartTimeRef = useRef(null);
  const initialCumulativeRef = useRef(0);

  // Live seconds stopwatch with timestamp drift correction & background visibility sync
  useEffect(() => {
    if (isStreaming && session && !isPaused) {
      if (!shiftStartTimeRef.current) {
        shiftStartTimeRef.current = Date.now();
        initialCumulativeRef.current = secondsElapsed;
      }

      const updateExactTimer = () => {
        if (!shiftStartTimeRef.current) return;
        const elapsedSecs = Math.floor((Date.now() - shiftStartTimeRef.current) / 1000);
        setSecondsElapsed(initialCumulativeRef.current + elapsedSecs);
      };

      timerIntervalRef.current = setInterval(updateExactTimer, 1000);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          updateExactTimer();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      shiftStartTimeRef.current = null;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [isStreaming, session, isPaused]);

  // Setup periodic capture & heartbeat once streaming starts (paused when on break)
  useEffect(() => {
    if (isStreaming && session && !isPaused) {
      // 1. Heartbeat every 30 seconds
      heartbeatIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/session/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: session.id, increment_seconds: 30 }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.capture_interval_minutes && data.capture_interval_minutes !== intervalMinutes) {
              setIntervalMinutes(data.capture_interval_minutes);
            }
          }
        } catch (err) {
          console.error('Heartbeat failed', err);
        }
      }, 30000);

      // 2. Set screenshot timer based on intervalMinutes
      const ms = Math.max(1, intervalMinutes) * 60 * 1000;
      captureIntervalRef.current = setInterval(() => {
        captureAndUploadScreenshot();
      }, ms);

      // Trigger initial capture 5 seconds after starting work
      const initialCaptureTimer = setTimeout(() => {
        captureAndUploadScreenshot();
      }, 5000);

      return () => {
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
        clearTimeout(initialCaptureTimer);
      };
    }
  }, [isStreaming, session, isPaused, intervalMinutes]);

  // Send beacon to end session if user closes tab abruptly
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session && isStreaming) {
        navigator.sendBeacon('/api/session/end', JSON.stringify({ session_id: session.id }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session, isStreaming]);

  const togglePauseShift = async () => {
    if (!session) return;
    setLoading(true);
    const nextAction = isPaused ? 'resume' : 'pause';
    try {
      const res = await fetch('/api/session/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, action: nextAction }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsPaused(!isPaused);
        setSession(data.session);
        if (nextAction === 'pause') {
          stopAllIntervals();
          shiftStartTimeRef.current = null;
          setStatusMessage('Shift paused for break. Timer and telemetry monitoring paused.');
        } else {
          shiftStartTimeRef.current = Date.now();
          initialCumulativeRef.current = secondsElapsed;
          setStatusMessage('Shift resumed! Work telemetry active.');
        }
        if (onSessionUpdate) onSessionUpdate();
      }
    } catch (e) {
      console.error('Failed to toggle pause', e);
    } finally {
      setLoading(false);
    }
  };

  const startWorkShift = async () => {
    setLoading(true);
    setStatusMessage('');

    try {
      // Request browser screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          cursor: 'always',
        },
        audio: false,
      });

      streamRef.current = stream;

      // Handle user stopping stream from browser UI
      stream.getVideoTracks()[0].onended = () => {
        setIsStreaming(false);
        setStatusMessage('Screen sharing was paused or stopped by browser toolbar. Re-start shift to resume monitoring.');
      };

      // Connect to hidden video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize session on server
      const res = await fetch('/api/session/start', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start session on server');
      }

      setSession(data.session);
      setSecondsElapsed(data.today_cumulative_seconds ?? data.session.duration_seconds ?? 0);
      setIntervalMinutes(data.capture_interval_minutes || 30);
      setIsStreaming(true);
      setStatusMessage('Shift started! Screen is monitored in accordance with workspace policy.');

      if (onSessionUpdate) onSessionUpdate();

    } catch (err) {
      console.error('Screen capture error:', err);
      if (err.name === 'NotAllowedError') {
        setStatusMessage('Screen sharing permission was cancelled. Please allow screen sharing to start your work shift.');
      } else {
        setStatusMessage(err.message || 'Could not start screen monitoring.');
      }
    } finally {
      setLoading(false);
    }
  };

  const captureAndUploadScreenshot = async () => {
    if (!videoRef.current || !canvasRef.current || !session) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!video.videoWidth || !video.videoHeight) return;

      // Resize canvas to frame size (scaled to 1280x720 max to optimize storage)
      const scale = Math.min(1, 1280 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to compressed WebP data URL (70% quality, ~80-120KB)
      const dataUrl = canvas.toDataURL('image/webp', 0.7);

      const res = await fetch('/api/screenshots/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          image_data: dataUrl,
          width: canvas.width,
          height: canvas.height,
        }),
      });

      if (res.ok) {
        const timeNow = new Date().toLocaleTimeString();
        setLastCaptureTime(timeNow);
        if (onSessionUpdate) onSessionUpdate();
      }
    } catch (err) {
      console.error('Failed to capture frame', err);
    }
  };

  const endWorkShift = async () => {
    if (!confirm('Are you sure you want to clock out and end your work shift?')) {
      return;
    }

    setLoading(true);
    try {
      // Capture one final screenshot before ending
      await captureAndUploadScreenshot();

      // Stop media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsStreaming(false);

      if (session) {
        await fetch('/api/session/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: session.id }),
        });
      }

      setSession(null);
      stopAllIntervals();
      setStatusMessage('Shift successfully ended. Great work today!');
      if (onSessionUpdate) onSessionUpdate();

    } catch (err) {
      console.error('Failed to end shift', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm">
      
      {/* Hidden elements used for stream processing */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Duplicate Tab Lock Alert */}
      {isDuplicateTab && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 flex items-start gap-3 text-blue-800 dark:text-blue-300">
          <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">Active in Another Browser Tab</p>
            <p>
              Shift tracking is already active in another browser tab. Multi-tab lock prevents double-counting shift time across open tabs.
            </p>
          </div>
        </div>
      )}

      {/* Mobile Device Restriction Alert */}
      {isMobile && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 flex items-start gap-3 text-amber-800 dark:text-amber-300">
          <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">Desktop Browser Required</p>
            <p>
              Work shift clock-in and telemetry monitoring require a desktop browser (Windows, macOS, or Linux). Shift clock-in is restricted on mobile devices to ensure complete screen audit compliance.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left Status & Timer */}
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isStreaming 
              ? isPaused
                ? 'bg-amber-500/10 text-amber-500 ring-2 ring-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-500 ring-2 ring-emerald-500/20' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <Monitor className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                Work Shift Status:
              </h3>
              {isStreaming ? (
                isPaused ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Shift Paused (On Break)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Active &amp; Monitored
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Inactive (Clocked Out)
                </span>
              )}
            </div>

            {/* Timer Counter */}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-mono text-xl font-bold tracking-tight">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>{formatTimer(secondsElapsed)}</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Today Cumulative
              </span>
              <span className="text-xs text-slate-400">
                • Interval: <span className="font-medium text-slate-600 dark:text-slate-300">{intervalMinutes}m</span>
              </span>
              {lastCaptureTime && (
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • Last snapshot: <span className="text-blue-500 font-medium">{lastCaptureTime}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!isStreaming ? (
            <button
              onClick={startWorkShift}
              disabled={loading || isMobile || isDuplicateTab}
              title={isMobile ? "Shift clock-in requires a desktop browser" : "Start shift & share screen"}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isMobile ? "Desktop Required to Start" : isDuplicateTab ? "Active in Another Tab" : "Start Work & Share Screen"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={togglePauseShift}
                disabled={loading}
                title={isPaused ? "Resume shift monitoring" : "Pause shift for lunch or break"}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-xs shadow-sm transition-all cursor-pointer ${
                  isPaused
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200 border border-amber-200 dark:border-amber-800'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Resume Shift' : 'Take Break'}</span>
              </button>

              <button
                onClick={captureAndUploadScreenshot}
                title="Trigger immediate snapshot test"
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={endWorkShift}
                disabled={loading}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer disabled:opacity-60"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Clock Out</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {statusMessage && (
        <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

    </div>
  );
}
