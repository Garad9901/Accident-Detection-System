import React, { useState, useEffect } from 'react'
import { config } from '../config'
import axios from 'axios'
import { motion } from 'framer-motion'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { 
  MdDirectionsCar, 
  MdReportProblem, 
  MdFactCheck, 
  MdRssFeed,
  MdNotifications,
  MdSettingsInputHdmi,
  MdSpeed,
  MdTrackChanges,
  MdDns,
  MdDeveloperBoard,
  MdAccessTime
} from 'react-icons/md'

function Dashboard({ setActivePage, settings }) {
  const [stats, setStats] = useState({
    total_vehicles: 0,
    total_accidents: 0,
    detection_accuracy: 85.0,
    today_alerts: 0,
    fps: 0.0,
    model_name: 'yolov4-tiny',
    confidence_threshold: 0.5,
    nms_threshold: 0.4
  });
  
  const [analytics, setAnalytics] = useState({
    daily_trends: [],
    vehicle_distribution: [],
    confidence_history: [],
    source_breakdown: []
  });

  const [health, setHealth] = useState({
    cpu_usage: 0.0,
    ram_usage: 0.0,
    latency_ms: 0.0,
    database_status: 'Healthy',
    gpu_available: false
  });

  const [recentDetections, setRecentDetections] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up polling intervals
    const interval = setInterval(() => {
      fetchHealthData();
      fetchDashboardStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const statsRes = await axios.get('/api/stats');
      setStats(statsRes.data);

      const analyticsRes = await axios.get('/api/analytics');
      setAnalytics(analyticsRes.data);

      const healthRes = await axios.get('/api/health');
      setHealth(healthRes.data);

      const historyRes = await axios.get('/api/history');
      setRecentDetections(historyRes.data.slice(0, 5));
    } catch (e) {
      console.error("Dashboard error loading data:", e);
    }
  };

  const fetchHealthData = async () => {
    try {
      const healthRes = await axios.get('/api/health');
      setHealth(healthRes.data);
    } catch (e) {}
  };

  const fetchDashboardStats = async () => {
    try {
      const statsRes = await axios.get('/api/stats');
      setStats(statsRes.data);
      
      const historyRes = await axios.get('/api/history');
      setRecentDetections(historyRes.data.slice(0, 5));
    } catch (e) {}
  };

  // Card items helper mapping
  const cards = [
    { title: "Total Vehicles Detected", value: stats.total_vehicles, icon: <MdDirectionsCar size={24} />, color: "from-blue-600 to-cyan-500" },
    { title: "Total Accidents Logged", value: stats.total_accidents, icon: <MdReportProblem size={24} />, color: "from-rose-600 to-orange-500", highlight: stats.total_accidents > 0 },
    { title: "Inference Accuracy", value: `${stats.detection_accuracy}%`, icon: <MdFactCheck size={24} />, color: "from-emerald-600 to-teal-500" },
    { title: "System Status", value: "Monitoring", subText: "Active Stream", icon: <MdRssFeed size={24} />, color: "from-indigo-600 to-purple-500", pulse: true },
    { title: "Today's Alerts", value: stats.today_alerts, icon: <MdNotifications size={24} />, color: "from-crimson-600 to-rose-500" },
    { title: "Model Pipeline", value: stats.model_name.toUpperCase(), icon: <MdSettingsInputHdmi size={24} />, color: "from-purple-600 to-pink-500" },
    { title: "Pipeline Latency / FPS", value: stats.fps > 0 ? `${stats.fps.toFixed(1)} FPS` : "Adaptive", subText: `${health.latency_ms}ms ping`, icon: <MdSpeed size={24} />, color: "from-amber-600 to-yellow-500" },
    { title: "Confidence Threshold", value: `${stats.confidence_threshold * 100}%`, subText: `NMS: ${stats.nms_threshold}`, icon: <MdTrackChanges size={24} />, color: "from-teal-600 to-cyan-500" }
  ];

  return (
    <div className="space-y-6 select-none pb-12">
      {/* 8 Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`glass-card p-5 relative overflow-hidden flex flex-col justify-between ${
              card.highlight ? 'neon-border-red border-red-500/30' : ''
            }`}
          >
            {/* Gradient Glow Overlay */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.color} opacity-[0.06] rounded-bl-full`}></div>
            
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{card.title}</p>
                <h3 className="text-2xl font-extrabold text-white mt-2 tracking-tight">{card.value}</h3>
              </div>
              <div className={`p-3 bg-gradient-to-tr ${card.color} text-white rounded-xl shadow-md`}>
                {card.icon}
              </div>
            </div>
            
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              {card.pulse && <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>}
              <span>{card.subText || "System Online"}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Sections: Large Feed View & Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Panel Display (Large Card) */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between min-h-[420px]">
          <div className="flex justify-between items-center pb-4 border-b border-white/5">
            <div>
              <h4 className="font-extrabold text-base text-white tracking-tight">Live Accident Detection Console</h4>
              <p className="text-xs text-slate-400 mt-0.5">Start a detection stream using a video file or live webcam feed</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setActivePage('upload')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md hover:shadow-indigo-500/20 transition-all duration-200"
              >
                Upload File
              </button>
              <button 
                onClick={() => setActivePage('webcam')}
                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-lg text-xs font-semibold shadow-md hover:shadow-indigo-500/20 transition-all duration-200"
              >
                Start Webcam
              </button>
            </div>
          </div>
          
          {/* Stream Display Frame Container */}
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/40 border border-white/5 rounded-xl mt-5 p-6 min-h-[280px]">
            <motion.div 
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="text-4xl text-indigo-400"
            >
              📡
            </motion.div>
            <h5 className="text-sm font-bold text-white mt-4 tracking-wide">Monitoring Feed Off-line</h5>
            <p className="text-xs text-slate-400 text-center mt-1.5 max-w-sm">
              Please initialize a stream to begin object identification and overlapping box collision checks.
            </p>
          </div>
        </div>

        {/* Short Term Trend Analytics (Area Chart) */}
        <div className="glass-card p-6 flex flex-col justify-between min-h-[420px]">
          <div>
            <h4 className="font-extrabold text-base text-white tracking-tight">Weekly Traffic Activity</h4>
            <p className="text-xs text-slate-400 mt-0.5">Accidents and total vehicle logs compiled by day</p>
          </div>

          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.daily_trends} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAccidents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f8fafc' }} />
                <Area type="monotone" dataKey="vehicles" name="Vehicles" stroke="#6366f1" fillOpacity={1} fill="url(#colorVehicles)" strokeWidth={2} />
                <Area type="monotone" dataKey="accidents" name="Accidents" stroke="#f43f5e" fillOpacity={1} fill="url(#colorAccidents)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex gap-4 items-center text-xs text-slate-400 mt-2 font-medium border-t border-white/5 pt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-500 block"></span>
              <span>Vehicles Detected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500 block"></span>
              <span>Accident Triggers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Recent Logs, Gallery, and System Health Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Alerts List Card */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <div>
                <h4 className="font-extrabold text-base text-white tracking-tight">Recent Security Incidents</h4>
                <p className="text-xs text-slate-400 mt-0.5">List of latest alerts saved by the AI pipeline</p>
              </div>
              <button 
                onClick={() => setActivePage('history')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View Full Logs
              </button>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-white/5 font-semibold text-xs uppercase">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Time</th>
                    <th className="py-2.5">Vehicles</th>
                    <th className="py-2.5">Avg Confidence</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {recentDetections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400 text-xs font-medium">
                        No recent accident triggers on record.
                      </td>
                    </tr>
                  ) : (
                    recentDetections.map((item) => (
                      <tr key={item.id} className="text-xs hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 text-slate-300">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-slate-300 flex items-center gap-1.5">
                          <MdAccessTime className="text-slate-500" />
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3 text-white">
                          {item.vehicle_count}
                        </td>
                        <td className="py-3 text-slate-300">
                          {(item.confidence * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 text-slate-400">
                          {item.source}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.accident_detected 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : 'bg-green-500/10 text-green-400 border border-green-500/20'
                          }`}>
                            {item.accident_detected ? "COLLISION ALERT" : "SAFE LOG"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* System Diagnostics & Model Information */}
        <div className="space-y-6 flex flex-col">
          {/* Health Metrics */}
          <div className="glass-card p-6 flex-1 flex flex-col justify-between">
            <div>
              <h4 className="font-extrabold text-base text-white tracking-tight">System Performance Logs</h4>
              <p className="text-xs text-slate-400 mt-0.5">Real-time local computer health diagnostics</p>
            </div>
            
            <div className="space-y-4 mt-6">
              {/* CPU Indicator */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>CPU Usage</span>
                  <span>{health.cpu_usage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-900 border border-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${health.cpu_usage}%` }}></div>
                </div>
              </div>

              {/* RAM Indicator */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>RAM Memory Allocation</span>
                  <span>{health.ram_usage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-900 border border-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${health.ram_usage}%` }}></div>
                </div>
              </div>

              {/* Ping Metrics */}
              <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-semibold">
                <div className="bg-black/20 p-3 border border-white/5 rounded-xl">
                  <div className="text-slate-400 flex items-center gap-1">
                    <MdDns /> DB Status
                  </div>
                  <div className="text-white mt-1 font-bold">{health.database_status}</div>
                </div>
                <div className="bg-black/20 p-3 border border-white/5 rounded-xl">
                  <div className="text-slate-400 flex items-center gap-1">
                    <MdDeveloperBoard /> GPU Status
                  </div>
                  <div className={`mt-1 font-bold ${health.gpu_available ? 'text-indigo-400' : 'text-slate-400'}`}>
                    {health.gpu_available ? "CUDA Loaded" : "CPU Headless"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Model Information Card */}
          <div className="glass-card p-6 flex flex-col justify-between">
            <div>
              <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wide mb-1">Active Architecture</h4>
              <h3 className="text-lg font-black text-white tracking-tight">
                {stats.model_name === 'yolov8' ? 'YOLOv8 PyTorch CNN' : 'YOLOv4-Tiny OpenCV DNN'}
              </h3>
            </div>
            
            <div className="text-xs text-slate-400 mt-3 font-semibold space-y-2">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Primary Target Classes</span>
                <span className="text-white">Car, Bus, Truck, Bike</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span>Accident Collision Mechanism</span>
                <span className="text-rose-400">Bounding Box Overlap</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>NMS Threshold</span>
                <span className="text-white">{stats.nms_threshold}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Accident Snapshots Row */}
      <div className="glass-card p-6">
        <h4 className="font-extrabold text-base text-white tracking-tight pb-3 border-b border-white/5">Recent Accident Captures</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
          {recentDetections.filter(d => d.image_path).slice(0, 5).length === 0 ? (
            <div className="col-span-full text-center py-6 text-slate-400 text-xs font-semibold">
              No snapshot frames available in database logs.
            </div>
          ) : (
            recentDetections.filter(d => d.image_path).slice(0, 5).map((log) => (
              <div 
                key={log.id} 
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 hover:border-indigo-500/50 shadow-md transition-all"
                onClick={() => setSelectedImage(`${config.backendHttpUrl}/api/uploads/${log.image_path}`)}
              >
                <img 
                  src={`${config.backendHttpUrl}/api/uploads/${log.image_path}`} 
                  alt="Accident Event" 
                  className="w-full h-24 object-cover group-hover:scale-105 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-2 opacity-90">
                  <div className="text-[10px] font-bold text-white">{new Date(log.timestamp).toLocaleDateString()}</div>
                  <div className="text-[9px] text-rose-400 font-black mt-0.5 uppercase tracking-wide">Accident Detected</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Frame Zoom Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <img src={selectedImage} alt="Accident Snapshot Zoom" className="w-full h-auto object-contain max-h-[80vh]" />
            <button className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white font-bold p-2.5 rounded-full text-xs">
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
