"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useTimeoutRegistry } from "@/hooks/useTimeoutRegistry";
import { DARK, LABEL, XIcon, DynamicBlobs, StatCard, SectionTitle } from './primitives';
import { JITResetModal } from './modals';
import { EventsPanel } from './events';
import { RegistrationsPanel } from './registrations';
import { INITIAL_DUMMIES, ProductsPanel } from './products';
import { SystemHealth } from './system';
import { CommentsPanel } from './comments';
import { BookingsPanel } from './bookings';
import { EarningsPanel } from './earnings';
import { UsersPanel } from './users';

export const TABS = [
  { id: "events", label: "Events" },
  { id: "registrations", label: "Registrations" },
  { id: "products", label: "Products" },
  { id: "bookings", label: "Bookings" },
  { id: "earnings", label: "Earnings" },
  { id: "users", label: "Users" },
  { id: "comments", label: "Comments" },
];

export default function AdminDashboard() {
  const scheduleTimeout = useTimeoutRegistry();
  const router = useRouter();
  const [tab, setTab] = useState("events");
  const [stats, setStats] = useState({ events: 0, users: 0, regs: 0, products: 0, comments: 0, bookings: 0 });
  const [data, setData] = useState({ events: [], users: [], regs: [], products: [], comments: [], bookings: [], earnings: { daily: [], total: 0, totalRaw: 0, average: 0, breakdown: { serviceBookings: 0, eventRegistrations: 0, timekeeperBookings: 0, merch: 0 } } });
  const [mounted, setMounted] = useState(false);
  const [wibTime, setWibTime] = useState("");
  const [lowPowerMode, setLowPowerMode] = useState(false);

  // ─── NEW: Audit & Side Panel States ───
  const [logs, setLogs] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isExportingLogs, setIsExportingLogs] = useState(false);
  const [systemToast, setSystemToast] = useState(null); // null | { type: 'success'|'error', msg }
  const [isChatRetracted, setIsChatRetracted] = useState(false); // Manual toggle
  const [isChatFaded, setIsChatFaded] = useState(false);       // Auto-hide (opacity)
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPulse, setShowPulse] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const chatScrollRef = useRef(null);
  const prevLogIdRef = useRef(null);


  // ─── CSV Export: All Audit Logs ───────────────────────────────────────────
  const exportLogs = async () => {
    setIsExportingLogs(true);
    try {
      const res = await api.get('/admin/system/logs');
      const logs = res.data.logs || [];

      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const headers = ['Date', 'Admin/User', 'Action', 'Details'];
      const rows = logs.map((l) => [
        escape(new Date(l.createdAt).toLocaleString('id-ID')),
        escape(l.adminEmail),
        escape(l.action),
        escape(l.details || ''),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kalceria_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setSystemToast({ type: 'error', msg: 'Failed to export logs. Check your connection.' });
      scheduleTimeout(() => setSystemToast(null), 4000);
    } finally {
      setIsExportingLogs(false);
    }
  };

  // ─── System Reset: post-execution handler ──────────────────────────────────
  const handleResetSuccess = async () => {
    setShowResetModal(false);
    setIsDrawerOpen(false);
    setSystemToast({ type: 'success', msg: '✓ System reset complete. Logging out...' });
    scheduleTimeout(() => {
      // Force logout and hard-reload for clean state
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/admin/login';
    }, 2500);
  };

  // Auto-fade chatbox after 5s of inactivity
  useEffect(() => {
    if (isChatRetracted || isChatFaded) return;
    const timer = setTimeout(() => {
      setIsChatFaded(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isChatRetracted, isChatFaded, lastActivity]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    const t = setInterval(() => {
      setWibTime(new Date().toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + " WIB");
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const loadAll = useCallback(() => {
    Promise.all([
      api.get("/admin/events").catch(() => ({ data: { events: [] } })),
      api.get("/admin/users").catch(() => ({ data: { users: [] } })),
      api.get("/admin/registrations").catch(() => ({ data: { registrations: [] } })),
      api.get("/admin/comments").catch(() => ({ data: { comments: [] } })),
      api.get("/admin/services").catch(() => ({ data: { bookings: [] } })),
      api.get("/admin/earnings").catch(() => ({ data: { daily: [], total: 0, totalRaw: 0, average: 0, breakdown: { serviceBookings: 0, eventRegistrations: 0, timekeeperBookings: 0, merch: 0 } } })),
    ]).then(([ev, us, re, co, bk, ea]) => {
      const eList = ev.data.events || [];
      const uList = us.data.users || [];
      const rList = re.data.registrations || [];
      const cList = co.data.comments || [];
      const bList = bk.data.bookings || [];

      const savedProducts = JSON.parse(localStorage.getItem("kalceria_dummy_products") || "[]");
      const pList = savedProducts.length ? savedProducts : INITIAL_DUMMIES;

      setStats({
        events: eList.length,
        users: uList.length,
        regs: rList.length,
        products: pList.length,
        comments: cList.length,
        bookings: bList.length,
      });

      setData({
        events: eList,
        users: uList,
        regs: rList,
        products: pList,
        comments: cList,
        bookings: bList,
        earnings: ea.data || { daily: [], total: 0, totalRaw: 0, average: 0, breakdown: {} },
      });
    });
  }, []);

  // Polling Logs for Chatbox
  const isChatRetractedRef = useRef(isChatRetracted);
  useEffect(() => {
    isChatRetractedRef.current = isChatRetracted;
  }, [isChatRetracted]);

  const fetchLogs = useCallback(async () => {
    try {
      const r = await api.get("/admin/logs");
      const newLogs = r.data.logs || [];
      
      if (prevLogIdRef.current && newLogs.length > 0 && newLogs[0].id !== prevLogIdRef.current) {
        if (isChatRetractedRef.current) setUnreadCount(prev => prev + 1);
        setShowPulse(true);
        setIsChatFaded(false); // Make visible on new log
        setLastActivity(Date.now());
        scheduleTimeout(() => setShowPulse(false), 2000);
      }
      
      if (newLogs.length > 0) prevLogIdRef.current = newLogs[0].id;
      setLogs(newLogs);
    } catch (err) { console.error(err); }
  }, [scheduleTimeout]);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("adminToken");
    if (!token) { router.replace("/admin/login"); return; }
    
    loadAll();
    const logInterval = setInterval(fetchLogs, 5000);
    
    if (localStorage.getItem("lowPowerMode") === "true") {
      setLowPowerMode(true);
    }

    return () => clearInterval(logInterval);
  }, [router, loadAll, fetchLogs]);

  function logout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("token");
    router.replace("/admin/login");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: mounted ? 1 : 0 }}
      transition={{ duration: 0.8 }}
      className={`min-h-screen ${DARK} text-white`}
    >
      {!lowPowerMode && <DynamicBlobs />}

      {/* Video Background Replacement for LoomBackground */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 mix-blend-screen opacity-100"
        style={{ pointerEvents: 'none' }}
      >
        <source src="/videoLoomBackground.mp4" type="video/mp4" />
      </video>

      {/* Global Override for Low Power Mode (No Blurs) */}
      {lowPowerMode && (
        <style dangerouslySetInnerHTML={{
          __html: `
          .backdrop-blur-xl, .backdrop-blur-md, .backdrop-blur-3xl {
            backdrop-filter: none !important;
            background-color: #0a1122 !important;
          }
        `}} />
      )}

      {/* Top nav */}
      <header className="relative z-10 border-b border-slate-900 px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/logologin.webp" alt="Kalceria" width={1874} height={560} unoptimized loading="eager" decoding="auto" className="h-7 w-auto object-contain" draggable={false} />
          <div className="h-4 w-px bg-white/20 ml-2" />
          <div className="font-sans text-[11px] text-white font-medium underline tracking-widest opacity-90">
            {wibTime}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const nextMode = !lowPowerMode;
              setLowPowerMode(nextMode);
              localStorage.setItem("lowPowerMode", nextMode);
            }}
            title={lowPowerMode ? "Low Power Mode: ON" : "Low Power Mode: OFF"}
            className={`relative overflow-hidden flex items-center justify-center p-2 rounded-xl border backdrop-blur-xl transition-all duration-500 hover:scale-110 group ${
              lowPowerMode 
                ? "border-emerald-500/50 bg-white/5 shadow-[0_0_25px_rgba(16,185,129,0.4)] text-emerald-400" 
                : "border-red-500/50 bg-white/5 shadow-[0_0_20px_rgba(239,68,68,0.4)] text-red-400"
            }`}
          >
            {/* Dynamic Blob Inside Button */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full blur-xl opacity-50 transition-colors duration-700 group-hover:opacity-80 ${
              lowPowerMode ? "bg-emerald-500" : "bg-red-500"
            }`} />
            
            <div 
              className="relative z-10 w-5 h-5 drop-shadow-md bg-current" 
              style={{
                WebkitMaskImage: 'url(/powerModeSymbol.svg)',
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center'
              }}
            />
          </button>

          {/* Control Drawer Toggle */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
            title="Control Center & System Health"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button onClick={logout} className="font-mono text-xs text-slate-600 hover:text-white transition-colors uppercase tracking-widest ml-2">
            Logout
          </button>
        </div>
      </header>

      <div className="relative z-10 px-6 md:px-12 py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-8">
          <div className="col-span-1">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
              <StatCard label="Events" value={stats.events} />
              <StatCard label="Users" value={stats.users} />
              <StatCard label="Registrations" value={stats.regs} />
              <StatCard label="Comments" value={stats.comments} />
              <StatCard label="Bookings" value={stats.bookings} />
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded p-1 mb-8 w-fit shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative px-5 py-2 text-xs font-mono font-black uppercase tracking-widest transition-colors rounded ${tab === t.id ? "text-white" : "text-slate-500 hover:text-slate-300"
                    }`}
                >
                  {tab === t.id && (
                    <motion.div
                      layoutId="admin-tab-pill"
                      className="absolute inset-0 bg-white/10 rounded"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Panel */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.4)]"
              >
                <SectionTitle>{TABS.find((t) => t.id === tab)?.label}</SectionTitle>
                {tab === "events" && <EventsPanel initialEvents={data.events} onRefresh={loadAll} />}
                {tab === "registrations" && <RegistrationsPanel initialRegs={data.regs} onRefresh={loadAll} lowPowerMode={lowPowerMode} />}
                {tab === "products" && <ProductsPanel onRefresh={loadAll} lowPowerMode={lowPowerMode} />}
                {tab === "bookings" && <BookingsPanel onRefresh={loadAll} lowPowerMode={lowPowerMode} />}
                {tab === "earnings" && <EarningsPanel data={data.earnings} />}
                {tab === "users" && <UsersPanel initialUsers={data.users} onRefresh={loadAll} lowPowerMode={lowPowerMode} />}
                {tab === "comments" && <CommentsPanel onRefresh={loadAll} lowPowerMode={lowPowerMode} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─── FLOATING COMPONENTS ────────────────────────────────────────────────── */}

      {/* Audit Log Chatbox (Left-Top Floating) */}
      <div className="fixed left-6 top-24 z-[100] pointer-events-none">
        <div className="flex flex-col gap-4 pointer-events-auto">
          {/* Chat Icon / Toggle */}
          <button
            onClick={() => {
              const next = !isChatRetracted;
              setIsChatRetracted(next);
              if (!next) {
                setUnreadCount(0);
                setIsChatFaded(false);
                setLastActivity(Date.now());
              }
            }}
            className={`w-12 h-12 rounded-full border border-white/20 bg-black/40 backdrop-blur-xl flex items-center justify-center text-white shadow-2xl transition-all relative ${
              showPulse ? "animate-pulse scale-110 border-emerald-500 shadow-emerald-500/20" : "hover:scale-110"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            
            {/* Unread Badge (Only when retracted) */}
            {isChatRetracted && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#050a14]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Actual Chatbox */}
          <AnimatePresence>
            {!isChatRetracted && (
              <div
                className="pointer-events-auto"
                onMouseEnter={() => {
                  setIsChatFaded(false);
                  setLastActivity(Date.now());
                }}
                onMouseLeave={() => setLastActivity(Date.now())}
              >
                <motion.div
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ 
                    opacity: isChatFaded ? 0 : 1, 
                    x: 0, 
                    scale: 1,
                  }}
                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                  className="w-80 max-h-[400px] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 overflow-hidden transition-opacity duration-700"
                  style={{ pointerEvents: isChatFaded ? 'none' : 'auto' }}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Audit Log Feed</span>
                    <button onClick={() => {
                      const text = logs.map(l => `[${new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${l.adminEmail}: ${l.action}`).join('\n');
                      navigator.clipboard.writeText(text);
                      alert("Logs copied to clipboard!");
                    }} className="text-[9px] text-slate-500 hover:text-white uppercase font-bold">Copy Log</button>
                  </div>
                  
                  <div 
                    ref={chatScrollRef}
                    className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide flex flex-col"
                  >
                    <div className="mt-auto" /> {/* Push content to bottom */}
                    {logs.length === 0 ? (
                      <div className="text-[10px] text-slate-600 italic text-center py-4">Waiting for activity...</div>
                    ) : logs.slice().reverse().map((log) => (
                      <div key={log.id} className="group animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[8px] font-mono text-slate-500">[{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                          <span className="text-[9px] font-black text-emerald-500/80 truncate max-w-[120px]">{log.adminEmail}</span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-medium leading-relaxed bg-white/5 p-2 rounded-lg border border-white/5 group-hover:border-white/20 transition-all">
                          {log.action}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* JIT Reset Modal — rendered at root level, above everything */}
      {showResetModal && (
        <JITResetModal
          onClose={() => setShowResetModal(false)}
          onConfirm={handleResetSuccess}
        />
      )}

      {/* System Toast */}
      {systemToast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[600] px-8 py-4 rounded-2xl font-mono font-black text-sm uppercase tracking-widest shadow-2xl transition-all ${
          systemToast.type === 'success'
            ? 'bg-emerald-600 text-white shadow-[0_0_40px_rgba(16,185,129,0.5)]'
            : 'bg-red-600 text-white shadow-[0_0_40px_rgba(220,38,38,0.5)]'
        }`}>
          {systemToast.msg}
        </div>
      )}

      {/* Control Drawer (Right-Side Slider) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-80 md:w-96 bg-[#050a14] border-l border-white/10 z-[201] shadow-2xl p-8 flex flex-col gap-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">System Center</h2>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all"
                >
                  <XIcon />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                <SystemHealth />
                
                <div className="space-y-4">
                  <span className={LABEL}>Quick Actions (JIT Required)</span>
                  <button
                    onClick={() => { setIsDrawerOpen(false); if (handleResetSuccess) setShowResetModal(true); }}
                    className="w-full py-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-100 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                    Reset System Database
                  </button>
                  <button
                    onClick={exportLogs}
                    disabled={isExportingLogs}
                    className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-50">
                    {isExportingLogs ? 'Exporting...' : 'Export All Audit Logs (.csv)'}
                  </button>
                </div>
                
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <span className={LABEL}>Active Admins</span>
                  <div className="space-y-2 mt-3">
                    {["Reinathan", "Josh", "Coki", "Otniel"].map(name => (
                      <div key={name} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-300">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 text-[9px] text-slate-600 font-mono text-center">
                Kalceria Admin Engine v2.0.4-LTS
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
