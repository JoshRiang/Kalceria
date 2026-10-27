"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import ReceiptModal from "@/components/ReceiptModal";
import { useDebounce, CheckIcon, TrashIcon, XIcon, LocalBlob, Badge, formatRp, formatDate, ExpandableSearch } from './primitives';
import { JITActionModal } from './modals';

export function RegistrationsPanel({ lowPowerMode }) {
  const [regs, setRegs] = useState([]);
  const [receiptModal, setReceiptModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [jitAction, setJitAction] = useState(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const filteredRegs = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return regs;
    const terms = q.split(/\s+/);
    return regs.filter((r) => {
      const searchString = [r.user?.name, r.user?.email, r.event?.title, r.status].filter(Boolean).join(" ").toLowerCase();
      return terms.every((term) => searchString.includes(term));
    });
  }, [regs, debouncedSearchQuery]);

  const load = useCallback(async () => {
    const r = await api.get("/admin/registrations").catch(() => ({ data: { registrations: [] } }));
    setRegs(r.data.registrations || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function confirmPayment(id, status, version) {
    await api.patch(`/admin/registrations/${id}/payment`, { status, version });
    load();
  }
  function del(id, name, version) {
    setJitAction({ id, version, label: name || `Registration #${id.slice(0, 8).toUpperCase()}` });
  }
  const executeDel = async (jitToken) => {
    await api.delete(`/admin/registrations/${jitAction.id}`, {
      headers: jitToken ? { 'x-jit-token': jitToken } : {},
      data: { version: jitAction.version },
    });
    setJitAction(null);
    load();
  };
  function exportPdf(r) {
    setReceiptModal({ type: "REGISTRATION", data: r });
    setTimeout(() => load(), 1000); // Reload slightly later so modal can mark it exported in BG
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search name or email..." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRegs.map((r) => (
        <div key={r.id} className={`relative aspect-square rounded-3xl p-6 group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/40 overflow-hidden flex flex-col justify-between ${
            lowPowerMode ? "bg-[#d6cdc2]" : "bg-white/70 backdrop-blur-xl"
          }`}>
          <LocalBlob color="bg-cyan-400" />

          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <p className="font-sans font-black text-sm text-black tracking-tight leading-none uppercase">{r.user?.name}</p>
              <Badge label={r.paymentStatus} />
            </div>

            <div className="space-y-1">
              <p className="font-sans text-[10px] text-black/70 group-hover:text-black transition-colors duration-300 truncate">{r.user?.email}</p>
              <p className="font-sans text-[10px] text-black/70 group-hover:text-black transition-colors duration-300">{r.event?.title}</p>
            </div>

            <div className="pt-2 border-t border-black/5 space-y-1">
              <p className="font-sans text-[10px] text-black/60 group-hover:text-black transition-colors duration-300">Session: {r.selectedSession}</p>
              <p className="font-sans text-[10px] text-black/60 group-hover:text-black transition-colors duration-300">{formatDate(r.createdAt)}</p>
              <p className="font-sans text-[10px] text-black/60 group-hover:text-black transition-colors duration-300 font-bold">{formatRp(r.event?.price)}</p>
            </div>
          </div>

          <div className="relative z-10 flex gap-2 pt-4">
            {r.paymentStatus === "PENDING" && (
              <>
                <button onClick={() => confirmPayment(r.id, "CONFIRMED", r.version)} title="Confirm Payment" className="flex-1 h-10 flex items-center justify-center bg-emerald-500 rounded-2xl text-white shadow-[0_5px_15px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform"><CheckIcon /></button>
                <button onClick={() => confirmPayment(r.id, "REJECTED", r.version)} title="Reject Payment" className="flex-1 h-10 flex items-center justify-center bg-red-500 rounded-2xl text-white shadow-[0_5px_15px_rgba(239,68,68,0.3)] hover:scale-105 transition-transform"><XIcon /></button>
              </>
            )}
            {r.paymentStatus === "CONFIRMED" && (
              <button onClick={() => exportPdf(r)} className="flex-1 h-10 bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-[0_5px_15px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform">
                VIEW RECEIPT
              </button>
            )}
            <button onClick={() => del(r.id, r.user?.name, r.version)} className="w-10 h-10 flex items-center justify-center bg-black/5 rounded-2xl text-black/40 hover:bg-red-500 hover:text-white transition-all"><TrashIcon /></button>
          </div>
        </div>
      ))}
      {!filteredRegs.length && <p className="font-mono text-sm text-slate-500 col-span-full py-10 text-center">{searchQuery ? `No registrations matching "${searchQuery}"` : "No registrations."}</p>}
      
      {/* JIT Delete Modal */}
      {jitAction && (
        <JITActionModal
          title="Delete Registration"
          description={`You are permanently deleting the registration for ${jitAction.label}. This action cannot be undone and requires JIT authorization.`}
          onClose={() => setJitAction(null)}
          onConfirm={executeDel}
        />
      )}

      {/* Universal Receipt Modal */}
      {receiptModal && (
        <ReceiptModal
          type={receiptModal.type}
          data={receiptModal.data}
          onClose={() => setReceiptModal(null)}
        />
      )}
      </div>
    </div>
  );
}
