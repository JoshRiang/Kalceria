"use client";

import { motion, AnimatePresence } from "framer-motion";

export function AdminAuditChatbox({
  isChatRetracted,
  setIsChatRetracted,
  unreadCount,
  setUnreadCount,
  isChatFaded,
  setIsChatFaded,
  setLastActivity,
  showPulse,
  logs,
  chatScrollRef,
}) {
  return (
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
  );
}
