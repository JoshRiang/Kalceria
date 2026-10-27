"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

export function RealTimeGraph({ active }) {
  const [points, setPoints] = useState(Array.from({ length: 12 }, () => 20 + Math.random() * 40));

  useEffect(() => {
    const t = setInterval(() => {
      setPoints(p => {
        const next = [...p.slice(1), 20 + Math.random() * (active ? 60 : 20)];
        return next;
      });
    }, 2000);
    return () => clearInterval(t);
  }, [active]);

  return (
    <div className="h-14 w-28 relative border border-white/5 bg-white/[0.02] rounded overflow-hidden shadow-inner flex-shrink-0">
      {/* Grid Lines */}
      <div className="absolute inset-0 flex flex-col justify-between p-1 opacity-20">
        {[1, 2, 3].map(i => <div key={i} className="w-full h-[0.5px] bg-white/40" />)}
      </div>
      <div className="absolute inset-0 flex justify-between p-1 opacity-20">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-full w-[0.5px] bg-white/40" />)}
      </div>

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={`M ${points.map((p, i) => `${i * 11},${100 - p}`).join(" L ")}`}
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          animate={{ d: `M ${points.map((p, i) => `${i * 11},${100 - p}`).join(" L ")}` }}
          transition={{ duration: 2, ease: "linear" }}
        />
        <motion.path
          d={`M ${points.map((p, i) => `${i * 11},${100 - p}`).join(" L ")} L 120,100 L 0,100 Z`}
          fill="url(#lineGrad)"
          animate={{ d: `M ${points.map((p, i) => `${i * 11},${100 - p}`).join(" L ")} L 120,100 L 0,100 Z` }}
          transition={{ duration: 2, ease: "linear" }}
        />
      </svg>
    </div>
  );
}

export function SystemLog({ registrations = [], products = [] }) {
  const [logs, setLogs] = useState([]);
  const [wibTime, setWibTime] = useState("");

  useEffect(() => {
    const all = [
      ...registrations.map(r => ({ type: 'EVENT', msg: `New Event Registration: ${r.user?.name}`, time: r.createdAt })),
      ...products.map(p => ({ type: 'PRODUCT', msg: `Inventory Sync: ${p.name}`, time: new Date() })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
    setLogs(all);
  }, [registrations, products]);

  return (
    <div className="p-5 overflow-hidden h-[450px] flex flex-col border-b border-white/10 bg-transparent">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono font-black text-sm uppercase tracking-tighter text-white flex items-center gap-2">
          LIVE SYSTEM FEED
          <span className="text-[10px] text-fuchsia-500/80 font-bold ml-2 opacity-80 border-l border-white/20 pl-2">
            {wibTime}
          </span>
        </h3>
        <RealTimeGraph active={logs.length > 0} />
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 font-mono text-[10px] scrollbar-hide">
        {logs.map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-3 border-l border-white/20 pl-3 py-1"
          >
            <span className="text-slate-400">{new Date(log.time).toLocaleTimeString()}</span>
            <span className={`font-bold ${log.type === 'EVENT' ? 'text-fuchsia-400' : log.type === 'BOOKING' ? 'text-cyan-400' : 'text-orange-400'}`}>
              {log.type}
            </span>
            <span className="text-slate-300">{log.msg}</span>
          </motion.div>
        ))}
        {!logs.length && <p className="text-slate-500 italic">No activity detected.</p>}
      </div>
    </div>
  );
}

export function BatteryStatus({ connected }) {
  const [key, setKey] = useState(0);
  useEffect(() => {
    // Slower polling for a more professional, "steady" system feel
    const t = setInterval(() => setKey(k => k + 1), 15000);
    return () => clearInterval(t);
  }, []);

  if (!connected) return <div className="w-20 h-8 border-2 border-white/10 rounded-md relative opacity-20" />;

  const segments = [
    { color: "bg-[#FF4D4D]", glow: "rgba(255,77,77,0.4)" },
    { color: "bg-[#FF8C00]", glow: "rgba(255,140,0,0.3)" },
    { color: "bg-[#FFD700]", glow: "rgba(255,215,0,0.3)" },
    { color: "bg-[#ADFF2F]", glow: "rgba(173,255,47,0.3)" },
    { color: "bg-[#00FF00]", glow: "rgba(0,255,0,0.5)" }
  ];

  return (
    <div key={key} className="relative flex items-center group scale-90">
      {/* Battery Body */}
      <div className="w-24 h-10 border-[2px] border-white/20 rounded-[4px] p-[3px] flex gap-1 relative overflow-hidden bg-black/60 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
        {segments.map((seg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scaleY: 0.5 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.6, delay: i * 0.4, ease: "easeInOut" }}
            className={`flex-1 h-full ${seg.color} rounded-[1px] relative`}
            style={{ boxShadow: `0 0 10px ${seg.glow}` }}
          />
        ))}
        {/* Slow fill-up sweep */}
        <motion.div
          initial={{ x: "-150%" }}
          animate={{ x: "150%" }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"
        />
      </div>
      {/* Battery Tip */}
      <div className="w-[5px] h-5 bg-white/20 rounded-r-[1px] ml-[2px] shadow-[2px_0_10px_rgba(255,255,255,0.1)]" />
    </div>
  );
}

export function MailerStatus() {
  const [ready, setReady] = useState(true);

  if (ready) {
    return (
      <div className="relative group">
        <span className="text-xs font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse">
          READY
        </span>
      </div>
    );
  } else {
    return (
      <div className="relative group">
        <span className="text-xs font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-900">
          NOT READY
        </span>
      </div>
    );
  }
}

export function LoomBackground() {
  const threads = useMemo(() => Array.from({ length: 24 }).map((_, i) => {
    const isRainbow = Math.random() > 0.7;
    const isVertical = Math.random() > 0.9;

    let startX, startY, endX, endY, cp1x, cp1y, cp2x, cp2y;

    if (isVertical) {
      startX = Math.random() * 100;
      startY = -20;
      endX = startX + (Math.random() - 0.5) * 30;
      endY = 120;
      cp1x = startX + (Math.random() - 0.5) * 50;
      cp1y = 30;
      cp2x = endX + (Math.random() - 0.5) * 50;
      cp2y = 70;
    } else {
      startX = -20;
      startY = Math.random() * 100;
      endX = 120;
      endY = startY + (Math.random() - 0.5) * 30;
      cp1x = 30;
      cp1y = startY + (Math.random() - 0.5) * 50;
      cp2x = 70;
      cp2y = endY + (Math.random() - 0.5) * 50;
    }

    return {
      id: i,
      d: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
      color: isRainbow ? `hsl(${Math.random() * 360}, 80%, 60%)` : (Math.random() > 0.5 ? "#a855f7" : "#fbbf24"),
      width: 0.5 + Math.random() * 1.5,
      duration: 12 + Math.random() * 18,
      delay: Math.random() * -20,
      glowIntensity: 8 + Math.random() * 15
    };
  }), []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-40 mix-blend-screen">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="hyper-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {threads.map((t) => (
          <g key={t.id} filter="url(#hyper-glow)">
            <motion.path
              d={t.d}
              stroke={t.color}
              strokeWidth={t.width / 20}
              fill="none"
              strokeLinecap="round"
              animate={{ pathLength: [0, 1, 0], opacity: [0, 0.7, 0] }}
              transition={{ duration: t.duration, repeat: Infinity, ease: "easeInOut", delay: t.delay }}
              style={{ filter: `drop-shadow(0 0 ${t.glowIntensity}px ${t.color})` }}
            />
          </g>
        ))}
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-yellow-400/5 blur-[120px] rounded-full" />
    </div>
  );
}

export function SystemHealth() {
  return (
    <div className="p-5 bg-transparent">
      <h3 className="font-mono font-black text-sm uppercase tracking-tighter text-white mb-6">SYSTEM HEALTH</h3>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <span className="font-sans font-medium text-[11px] text-slate-400 uppercase tracking-widest">DATABASE</span>
          <BatteryStatus connected={true} />
        </div>
        <div className="flex justify-between items-center">
          <span className="font-sans font-medium text-[11px] text-slate-400 uppercase tracking-widest">REDIS CACHE</span>
          <BatteryStatus connected={true} />
        </div>
        <div className="flex justify-between items-center bg-white/5 px-4 py-3 border border-white/5 mt-4 rounded-xl">
          <span className="font-sans font-medium text-[11px] text-slate-400 uppercase tracking-widest">MAILER</span>
          <MailerStatus />
        </div>
      </div>
    </div>
  );
}
