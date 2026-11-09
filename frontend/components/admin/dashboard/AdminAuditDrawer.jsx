"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LABEL, XIcon } from "./primitives";
import { SystemHealth } from "./system";

export function AdminAuditDrawer({
  isDrawerOpen,
  setIsDrawerOpen,
  exportLogs,
  isExportingLogs,
  setShowResetModal,
  handleResetSuccess,
}) {
  return (
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
  );
}
