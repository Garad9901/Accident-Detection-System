import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MdDashboard, 
  MdVideoLibrary, 
  MdVideocam, 
  MdHistory, 
  MdAnalytics, 
  MdNotificationsActive, 
  MdSettings, 
  MdInfo,
  MdWbSunny,
  MdNightsStay
} from 'react-icons/md'

// Sub-components
import Dashboard from './components/Dashboard'
import UploadVideo from './components/UploadVideo'
import LiveWebcam from './components/LiveWebcam'
import History from './components/History'
import Analytics from './components/Analytics'
import SettingsPage from './components/Settings'
import About from './components/About'

import { config } from './config'

// Set Axios base URL (production uses Render backend)
axios.defaults.baseURL = config.backendHttpUrl || 'http://localhost:8000';


function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [settings, setSettings] = useState({
    confidence_threshold: 0.5,
    nms_threshold: 0.4,
    alert_sound: true,
    dark_mode: true,
    model_name: 'yolov4-tiny',
    twilio_enabled: false
  });
  
  const alarmIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // Load Settings and apply theme from server/local
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      setSettings(response.data);
      const activeTheme = response.data.dark_mode ? 'dark' : 'light';
      setTheme(activeTheme);
      applyTheme(activeTheme);
    } catch (error) {
      console.error("Error loading configurations:", error);
      applyTheme(theme);
    }
  };

  const applyTheme = (themeName) => {
    const root = window.document.documentElement;
    if (themeName === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyTheme(newTheme);
    
    // Save theme setting to database
    try {
      await axios.put('/api/settings', { dark_mode: newTheme === 'dark' });
      setSettings(prev => ({ ...prev, dark_mode: newTheme === 'dark' }));
    } catch (e) {
      console.error("Failed to save theme state:", e);
    }
  };

  // Alarm sound controller using Web Audio API
  const startAlarm = () => {
    if (!settings.alert_sound) return;
    if (alarmIntervalRef.current) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    
    alarmIntervalRef.current = setInterval(() => {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Siren effect: high-pitch warble
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }, 450);
  };

  const stopAlarm = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  // Ensure alarm is cleared on unmount
  useEffect(() => {
    return () => stopAlarm();
  }, []);

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} settings={settings} />;
      case 'upload':
        return <UploadVideo startAlarm={startAlarm} stopAlarm={stopAlarm} settings={settings} />;
      case 'webcam':
        return <LiveWebcam startAlarm={startAlarm} stopAlarm={stopAlarm} settings={settings} />;
      case 'history':
        return <History sourceFilter={null} />;
      case 'analytics':
        return <Analytics />;
      case 'alerts':
        return <History sourceFilter={null} accidentOnly={true} />;
      case 'settings':
        return <SettingsPage settings={settings} onSettingsSaved={fetchSettings} />;
      case 'about':
        return <About />;
      default:
        return <Dashboard setActivePage={setActivePage} settings={settings} />;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <MdDashboard size={20} /> },
    { id: 'upload', label: 'Upload Video', icon: <MdVideoLibrary size={20} /> },
    { id: 'webcam', label: 'Live Webcam', icon: <MdVideocam size={20} /> },
    { id: 'history', label: 'Detection History', icon: <MdHistory size={20} /> },
    { id: 'analytics', label: 'Analytics', icon: <MdAnalytics size={20} /> },
    { id: 'alerts', label: 'Alerts', icon: <MdNotificationsActive size={20} />, badge: true },
    { id: 'settings', label: 'Settings', icon: <MdSettings size={20} /> },
    { id: 'about', label: 'About', icon: <MdInfo size={20} /> }
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Layout */}
      <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col justify-between select-none z-10">
        <div>
          {/* Dashboard Header */}
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <span className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg text-white font-bold animate-glow-pulse">
              🚨
            </span>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide text-white uppercase bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-300">
                Accident AI
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider">
                MONITORING SYSTEM
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  stopAlarm(); // Stop alarms on navigation change
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activePage === item.id 
                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-indigo-300 border-l-4 border-indigo-500 shadow-glass-neon' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
                {item.badge && settings.twilio_enabled && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer info & Theme toggle */}
        <div className="p-4 border-t border-white/5 space-y-3">
          <div className="flex justify-between items-center bg-black/20 dark:bg-white/5 p-2 rounded-xl border border-white/5">
            <span className="text-xs text-slate-400 font-medium">Theme Mode</span>
            <button 
              onClick={handleThemeToggle}
              className="p-2 bg-indigo-600/20 text-indigo-300 rounded-lg hover:bg-indigo-600/30 hover:text-indigo-200 transition-colors"
            >
              {theme === 'dark' ? <MdWbSunny size={16} /> : <MdNightsStay size={16} />}
            </button>
          </div>
          
          <div className="text-[10px] text-slate-500 font-semibold text-center select-none">
            AI Engine v1.0.0 • Connected
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="p-6 flex justify-between items-center glass-panel border-b border-white/5 select-none bg-black/10 dark:bg-black/40">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-extrabold text-white capitalize bg-gradient-to-r from-indigo-200 to-slate-200 bg-clip-text text-transparent">
              {activePage.replace('-', ' ')} Overview
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-semibold animate-pulse-fast">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              Live Pipeline Active
            </div>
          </div>
          
          <div className="text-sm font-semibold text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </header>

        {/* Page Render Container with motion animation */}
        <div className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

export default App
