import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MdPlayArrow, 
  MdStop, 
  MdCameraAlt, 
  MdWarning,
  MdSettingsInputHdmi,
  MdSwitchCamera,
  MdInfoOutline
} from 'react-icons/md'

import { config } from '../config'


function LiveWebcam({ startAlarm, stopAlarm, settings }) {
  const [streamMode, setStreamMode] = useState('browser'); // 'browser' or 'local' (backend camera 0)
  const [isRunning, setIsRunning] = useState(false);
  const [processedFrame, setProcessedFrame] = useState(null);
  
  // Real-time statistics
  const [stats, setStats] = useState({
    vehicle_count: 0,
    car_count: 0,
    bus_count: 0,
    truck_count: 0,
    motorcycle_count: 0,
    accident_detected: false,
    confidence: 0.0,
    latency_ms: 0.0,
    fps: 0.0
  });

  const [accidentDetected, setAccidentDetected] = useState(false);
  const [screenshotList, setScreenshotList] = useState([]);
  
  const socketRef = useRef(null);
  const videoRef = useRef(null); // Client browser video stream reference
  const canvasRef = useRef(null); // Canvas for downsampling/grabbing base64 frames
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      stopWebcam();
      stopAlarm();
    };
  }, []);

  const connectSocket = () => {
    return new Promise((resolve, reject) => {
      if (socketRef.current) {
        resolve(socketRef.current);
        return;
      }
      
      const wsBase = (config && config.backendWsUrl) ? config.backendWsUrl : 'ws://localhost:8000'
      const wsUrl = `${wsBase}/api/detection/webcam`;



      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("Webcam WebSocket pipeline connected.");
        resolve(ws);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setProcessedFrame(data.frame);
        setStats(data.stats);

        if (data.stats.accident_detected) {
          setAccidentDetected(true);
          startAlarm();
          triggerDesktopNotification(data.stats.confidence);
        }
      };

      ws.onerror = (err) => {
        console.error("Webcam WebSocket error:", err);
        reject(err);
      };

      ws.onclose = () => {
        console.log("Webcam WebSocket disconnected.");
        socketRef.current = null;
      };
    });
  };

  const triggerDesktopNotification = (conf) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification("🚨 WEBCAM ACCIDENT DETECTED!", {
        body: `A collision was identified on the webcam feed. Confidence: ${(conf * 100).toFixed(1)}%`,
        icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚨</text></svg>"
      });
    }
  };

  const startWebcam = async () => {
    setIsRunning(true);
    setAccidentDetected(false);
    stopAlarm();

    try {
      const ws = await connectSocket();

      if (streamMode === 'local') {
        // Mode 1: Tell backend to open camera (index 0) directly
        ws.send(JSON.stringify({ action: "start_local" }));
      } else {
        // Mode 2: Client browser webcam capture
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: { ideal: 15, max: 20 } },
          audio: false
        });
        
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Loop to capture canvas frames and send to backend
        intervalRef.current = setInterval(() => {
          if (videoRef.current && canvasRef.current && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            // Draw video frame to hidden canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Grab base64 image chunk
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // compression quality 0.7
            
            socketRef.current.send(JSON.stringify({ image: dataUrl }));
          }
        }, 80); // ~12 FPS sending rate (optimal for server overhead)
      }
    } catch (e) {
      console.error("Failed to initialize webcam capture:", e);
      alert("Webcam connection failed. Check camera access permissions.");
      stopWebcam();
    }
  };

  const stopWebcam = () => {
    setIsRunning(false);
    stopAlarm();
    setAccidentDetected(false);
    
    // Clear browser interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop browser webcam track
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Tell backend to release camera
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      if (streamMode === 'local') {
        socketRef.current.send(JSON.stringify({ action: "stop_local" }));
      }
    }

    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setProcessedFrame(null);
    setStats({
      vehicle_count: 0,
      car_count: 0,
      bus_count: 0,
      truck_count: 0,
      motorcycle_count: 0,
      accident_detected: false,
      confidence: 0.0,
      latency_ms: 0.0,
      fps: 0.0
    });
  };

  const captureScreenshot = () => {
    if (!processedFrame) return;
    
    // Save image to screenshot checklist
    const newScreenshot = {
      id: Date.now(),
      src: processedFrame,
      timestamp: new Date().toLocaleTimeString(),
      stats: { ...stats }
    };
    
    setScreenshotList(prev => [newScreenshot, ...prev]);
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      
      {/* Emergency red banner */}
      <AnimatePresence>
        {accidentDetected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="neon-border-red bg-rose-950/80 backdrop-blur-md rounded-2xl p-5 flex items-center gap-4 text-rose-200 border-2"
          >
            <div className="p-3 bg-rose-500 text-white rounded-xl animate-pulse-fast">
              <MdWarning size={28} />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-base tracking-wide text-white uppercase neon-text-red">
                🚨 ACCIDENT DETECTED!
              </h3>
              <p className="text-xs text-rose-300 font-semibold mt-1">
                Active road collision has been logged on live camera feed. SMS dispatched. Audio warning sequence active.
              </p>
            </div>
            <button 
              onClick={() => {
                setAccidentDetected(false);
                stopAlarm();
              }}
              className="px-4 py-2 bg-rose-800/40 hover:bg-rose-800/60 border border-rose-500/20 text-xs font-bold rounded-lg transition-colors"
            >
              Mute Siren
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Controls and stream switch */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <h4 className="font-extrabold text-base text-white tracking-tight">Camera Control Deck</h4>
              <p className="text-xs text-slate-400 mt-0.5">Stream webcam stream directly to model</p>
            </div>

            {/* Input Selection Mode */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Select Camera Source</span>
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-black/20 rounded-xl border border-white/5">
                <button 
                  onClick={() => {
                    if (isRunning) stopWebcam();
                    setStreamMode('browser');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    streamMode === 'browser' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Browser Cam
                </button>
                <button 
                  onClick={() => {
                    if (isRunning) stopWebcam();
                    setStreamMode('local');
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    streamMode === 'local' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Local Cam (USB)
                </button>
              </div>
            </div>

            {/* Hidden client hardware stream elements */}
            {streamMode === 'browser' && (
              <div className="hidden">
                <video ref={videoRef} autoPlay playsInline width="640" height="480"></video>
                <canvas ref={canvasRef} width="640" height="480"></canvas>
              </div>
            )}

            {/* Trigger Button deck */}
            <div className="space-y-3 pt-2">
              {!isRunning ? (
                <button 
                  onClick={startWebcam}
                  className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all duration-200"
                >
                  <MdPlayArrow size={18} /> Start Webcam
                </button>
              ) : (
                <button 
                  onClick={stopWebcam}
                  className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-rose-500/20 transition-all duration-200"
                >
                  <MdStop size={18} /> Stop Stream
                </button>
              )}

              <button 
                onClick={captureScreenshot}
                disabled={!processedFrame}
                className="w-full py-3.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 border border-white/5 text-slate-300 font-bold rounded-xl text-xs tracking-wide flex items-center justify-center gap-1.5 transition-all duration-200"
              >
                <MdCameraAlt size={18} /> Capture Screenshot
              </button>
            </div>
          </div>

          <div className="bg-black/20 p-4 border border-white/5 rounded-2xl text-xs space-y-2 mt-6">
            <div className="flex items-center gap-2 text-indigo-400 font-bold pb-2 border-b border-white/5">
              <MdInfoOutline size={16} /> Device Information
            </div>
            <div className="flex justify-between font-semibold py-1">
              <span className="text-slate-400">Stream Connection</span>
              <span className={isRunning ? "text-green-400" : "text-slate-400"}>
                {isRunning ? "Connected" : "Offline"}
              </span>
            </div>
            <div className="flex justify-between font-semibold py-1">
              <span className="text-slate-400">Active Model</span>
              <span className="text-white uppercase">{settings.model_name}</span>
            </div>
          </div>
        </div>

        {/* Live Screen view */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 flex flex-col justify-between min-h-[420px]">
            <div>
              <h4 className="font-extrabold text-base text-white tracking-tight">Annotated Camera stream</h4>
              <p className="text-xs text-slate-400 mt-0.5">Real-time object bounding boxes and accident indicators</p>
            </div>

            <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden mt-5 min-h-[300px] flex items-center justify-center relative">
              {processedFrame ? (
                <img 
                  src={processedFrame} 
                  alt="Live processed webcam stream" 
                  className="w-full h-full object-contain max-h-[450px]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-xl text-indigo-400 mb-3 animate-pulse">
                    📡
                  </div>
                  <h5 className="text-xs font-bold text-white tracking-wide">Webcam Stream Inactive</h5>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1 max-w-xs">
                    Choose your camera type and click "Start Webcam" to launch live frame monitoring.
                  </p>
                </div>
              )}

              {/* Status overlay */}
              {isRunning && (
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 border border-white/10 rounded-xl text-[10px] text-slate-300 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                  LIVE {stats.fps > 0 ? `${stats.fps.toFixed(0)} FPS` : ""}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Traffic counters */}
      {processedFrame && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
          {[
            { label: "Vehicles Count", val: stats.vehicle_count, border: "border-indigo-500/10" },
            { label: "Cars Count", val: stats.car_count, border: "border-blue-500/10" },
            { label: "Buses Count", val: stats.bus_count, border: "border-teal-500/10" },
            { label: "Trucks Count", val: stats.truck_count, border: "border-amber-500/10" },
            { label: "Motorcycles Count", val: stats.motorcycle_count, border: "border-purple-500/10" }
          ].map((c, idx) => (
            <div key={idx} className={`glass-card p-4 border ${c.border} flex flex-col justify-between`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</span>
              <span className="text-xl font-extrabold text-white mt-1.5">{c.val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Captured screenshots deck */}
      {screenshotList.length > 0 && (
        <div className="glass-card p-6">
          <h4 className="font-extrabold text-base text-white tracking-tight pb-3 border-b border-white/5">Session screenshots</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
            {screenshotList.map((shot) => (
              <div key={shot.id} className="group relative overflow-hidden rounded-xl border border-white/10 shadow-md">
                <img src={shot.src} alt="Snapshot" className="w-full h-20 object-cover" />
                <div className="absolute inset-0 bg-black/60 flex flex-col justify-end p-2 opacity-90">
                  <div className="text-[9px] font-bold text-white">Time: {shot.timestamp}</div>
                  <div className="text-[8px] text-indigo-300 font-bold mt-0.5 uppercase">
                    Vehicles: {shot.stats.vehicle_count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveWebcam
