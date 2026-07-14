import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MdCloudUpload, 
  MdPlayArrow, 
  MdPause, 
  MdStop, 
  MdRotateLeft, 
  MdWarning,
  MdInfoOutline,
  MdSpeed
} from 'react-icons/md'

import { config } from '../config'

function UploadVideo({ startAlarm, stopAlarm, settings }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFilename, setUploadedFilename] = useState('');
  
  // Pipeline playback state
  const [pipelineState, setPipelineState] = useState('idle'); // idle, processing, paused, stopped, completed
  const [processedFrame, setProcessedFrame] = useState(null);
  const [progress, setProgress] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  
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
  
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    return () => {
      disconnectSocket();
      stopAlarm();
    };
  }, []);

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      resetPipeline();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        setUploadedFilename(response.data.filename);
        setPipelineState('uploaded');
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(error.response?.data?.detail || "Video upload failed. Check file format.");
    } finally {
      setIsUploading(false);
    }
  };

  const startPipeline = () => {
    if (!uploadedFilename) return;

    disconnectSocket();
    setPipelineState('processing');
    setAccidentDetected(false);
    stopAlarm();


    // Use centralized production WS URL (Vite build-time env)
    const wsBase = (config && config.backendWsUrl) ? config.backendWsUrl : 'ws://localhost:8000'
    const wsUrl = `${wsBase}/api/detection/video/${uploadedFilename}`;





    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket video pipeline connection established.");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        alert(data.error);
        setPipelineState('idle');
        return;
      }

      setProcessedFrame(data.frame);
      setProgress(data.progress);
      setFrameIndex(data.frame_index);
      setTotalFrames(data.total_frames);
      setStats(data.stats);

      if (data.stats.accident_detected) {
        setAccidentDetected(true);
        startAlarm();
        triggerDesktopNotification();
      }

      if (data.progress >= 100) {
        setPipelineState('completed');
        stopAlarm();
        disconnectSocket();
      }
    };

    ws.onclose = () => {
      console.log("WebSocket pipeline connection closed.");
    };
  };

  const triggerDesktopNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification("🚨 ACCIDENT COLLISION DETECTED!", {
        body: `An accident has been detected by the AI pipeline. Confidence: ${(stats.confidence * 100).toFixed(1)}%`,
        icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚨</text></svg>"
      });
    }
  };

  const pausePipeline = () => {
    if (socketRef.current && pipelineState === 'processing') {
      socketRef.current.send(JSON.stringify({ action: "pause" }));
      setPipelineState('paused');
    }
  };

  const resumePipeline = () => {
    if (socketRef.current && pipelineState === 'paused') {
      socketRef.current.send(JSON.stringify({ action: "resume" }));
      setPipelineState('processing');
    }
  };

  const stopPipeline = () => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ action: "stop" }));
      setPipelineState('stopped');
      stopAlarm();
      disconnectSocket();
    }
  };

  const resetPipeline = () => {
    stopPipeline();
    setProcessedFrame(null);
    setProgress(0);
    setFrameIndex(0);
    setTotalFrames(0);
    setAccidentDetected(false);
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
    setPipelineState(uploadedFilename ? 'uploaded' : 'idle');
    stopAlarm();
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      
      {/* Emergency Red Banner */}
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
                🚨 Collision Incident Flagged
              </h3>
              <p className="text-xs text-rose-300 font-semibold mt-1">
                An active vehicle collision was identified at frame {frameIndex}. Twilio SMS dispatched. Immediate security dispatch recommended.
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
        
        {/* Upload Container & Controllers */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-base text-white tracking-tight">Upload Video Feed</h4>
            <p className="text-xs text-slate-400 mt-0.5">Upload a raw MP4/AVI/MOV traffic video</p>

            {/* Drop Zone Box */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-2xl p-6 mt-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-black/10 hover:bg-black/20"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".mp4,.avi,.mov" 
                className="hidden" 
              />
              <MdCloudUpload className="text-indigo-400 mb-3" size={36} />
              <span className="text-xs font-bold text-white tracking-wide">
                {selectedFile ? selectedFile.name : "Select Video File"}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold mt-1">
                MP4, AVI, or MOV (max 100MB)
              </span>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Uploading file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {selectedFile && pipelineState === 'idle' && (
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs tracking-wide shadow-md hover:shadow-indigo-500/10 mt-4 transition-all duration-200"
              >
                {isUploading ? "Uploading..." : "Upload File"}
              </button>
            )}

            {/* Video Controllers Section */}
            {uploadedFilename && (
              <div className="mt-6 border-t border-white/5 pt-6 space-y-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pipeline Control Deck</div>
                
                <div className="grid grid-cols-2 gap-3">
                  {pipelineState === 'uploaded' || pipelineState === 'stopped' || pipelineState === 'completed' ? (
                    <button 
                      onClick={startPipeline}
                      className="flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all"
                    >
                      <MdPlayArrow size={18} /> Start Pipeline
                    </button>
                  ) : pipelineState === 'processing' ? (
                    <button 
                      onClick={pausePipeline}
                      className="flex items-center justify-center gap-1.5 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-amber-500/10 transition-all"
                    >
                      <MdPause size={18} /> Pause
                    </button>
                  ) : (
                    <button 
                      onClick={resumePipeline}
                      className="flex items-center justify-center gap-1.5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/10 transition-all"
                    >
                      <MdPlayArrow size={18} /> Resume
                    </button>
                  )}

                  <button 
                    onClick={stopPipeline}
                    disabled={pipelineState === 'idle' || pipelineState === 'uploaded'}
                    className="flex items-center justify-center gap-1.5 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <MdStop size={18} /> Stop
                  </button>
                </div>

                <button 
                  onClick={resetPipeline}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-bold rounded-xl text-xs tracking-wide flex items-center justify-center gap-1.5 transition-all"
                >
                  <MdRotateLeft size={18} /> Reset Feed
                </button>
              </div>
            )}
          </div>

          {/* Model Params card */}
          <div className="bg-black/20 p-4 border border-white/5 rounded-2xl text-xs space-y-2 mt-6">
            <div className="flex items-center gap-2 text-indigo-400 font-bold pb-2 border-b border-white/5">
              <MdInfoOutline size={16} /> Inference Config
            </div>
            <div className="flex justify-between font-semibold py-1">
              <span className="text-slate-400">Current Model</span>
              <span className="text-white uppercase">{settings.model_name}</span>
            </div>
            <div className="flex justify-between font-semibold py-1">
              <span className="text-slate-400">Confidence Threshold</span>
              <span className="text-white">{settings.confidence_threshold * 100}%</span>
            </div>
          </div>
        </div>

        {/* Video Player Display Screens */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 flex flex-col justify-between min-h-[420px]">
            <div>
              <h4 className="font-extrabold text-base text-white tracking-tight">AI Pipeline Feed</h4>
              <p className="text-xs text-slate-400 mt-0.5">Real-time object bounding boxes and accident indicators</p>
            </div>

            {/* Video Screens Wrapper */}
            <div className="flex-1 grid grid-cols-1 gap-4 mt-5 bg-slate-950/40 border border-white/5 rounded-2xl overflow-hidden min-h-[300px] relative">
              
              {processedFrame ? (
                <img 
                  src={processedFrame} 
                  alt="Processed stream feed" 
                  className="w-full h-full object-contain max-h-[450px]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-xl text-indigo-400 mb-3 animate-pulse">
                    🎥
                  </div>
                  <h5 className="text-xs font-bold text-white tracking-wide">Awaiting Signal</h5>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1 max-w-xs">
                    Upload a video file and initialize the play controls to initiate object detection.
                  </p>
                </div>
              )}

              {/* Stats overlay */}
              {pipelineState === 'processing' && (
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 border border-white/10 rounded-xl text-[10px] text-slate-300 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                  Processing {stats.fps > 0 ? `${stats.fps.toFixed(1)} FPS` : "Loading..."}
                </div>
              )}
            </div>

            {/* Progress indicator */}
            {totalFrames > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Frame index: {frameIndex} / {totalFrames}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 border border-white/5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Real-time Traffic Counters Row */}
      {processedFrame && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
          {[
            { label: "Vehicles Detected", val: stats.vehicle_count, border: "border-indigo-500/10" },
            { label: "Cars Identified", val: stats.car_count, border: "border-blue-500/10" },
            { label: "Buses Identified", val: stats.bus_count, border: "border-teal-500/10" },
            { label: "Trucks Identified", val: stats.truck_count, border: "border-amber-500/10" },
            { label: "Motorcycles Identified", val: stats.motorcycle_count, border: "border-purple-500/10" }
          ].map((c, idx) => (
            <div key={idx} className={`glass-card p-4 border ${c.border} flex flex-col justify-between`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</span>
              <span className="text-xl font-extrabold text-white mt-1.5">{c.val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UploadVideo
