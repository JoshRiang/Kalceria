"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { useDebounce, TrashIcon, LocalBlob, Badge, formatDate, ExpandableSearch } from './primitives';
import { JITActionModal } from './modals';

export function UsersPanel({ lowPowerMode }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [jitAction, setJitAction] = useState(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const filteredUsers = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return users;
    const terms = q.split(/\s+/);
    return users.filter((u) => {
      const searchString = [u.name, u.email, u.phone, u.role].filter(Boolean).join(" ").toLowerCase();
      return terms.every((term) => searchString.includes(term));
    });
  }, [users, debouncedSearchQuery]);

  const load = useCallback(async () => {
    const r = await api.get("/admin/users");
    setUsers(r.data.users);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Starts the existing async API load; state changes after its response.
  useEffect(() => { load(); }, [load]);

  async function setRole(id, role) { await api.patch(`/admin/users/${id}/role`, { role }); load(); }
  function del(id, name) {
    setJitAction({ id, label: name || `User #${id.slice(0, 8).toUpperCase()}` });
  }
  const executeDel = async (jitToken) => {
    await api.delete(`/admin/users/${jitAction.id}`, {
      headers: jitToken ? { 'x-jit-token': jitToken } : {},
    });
    setJitAction(null);
    load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search name, email, phone..." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((u) => (
        <div key={u.id} className={`relative aspect-square rounded-3xl p-6 group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/40 overflow-hidden flex flex-col justify-between ${
            lowPowerMode ? "bg-[#d6cdc2]" : "bg-white/70 backdrop-blur-xl"
          }`}>
          <LocalBlob color="bg-orange-400" />

          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <p className="font-sans font-black text-sm text-black tracking-tight leading-none uppercase truncate">{u.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge label={u.role} />
                  {u.isEmailVerified && <span className="font-sans text-[10px] text-emerald-600 uppercase tracking-[0.15em] font-black">Verified</span>}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-sans text-[10px] text-black/70 group-hover:text-black transition-colors duration-300 truncate">{u.email}</p>
              <p className="font-sans text-[10px] text-black/70 group-hover:text-black transition-colors duration-300">{u.phone}</p>
            </div>

            <div className="pt-2 border-t border-black/5 grid grid-cols-2 gap-y-1">
              <span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Bookings: {u._count?.bookings}</span>
              <span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Events: {u._count?.eventRegistrations}</span>
              <span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Services: {u._count?.serviceBookings}</span>
              <span className="font-sans text-[9px] text-black/50 group-hover:text-black transition-colors">Since: {formatDate(u.createdAt)}</span>
            </div>
          </div>

          <div className="relative z-10 flex gap-2 pt-4">
            {u.role === "USER" ? (
              <button onClick={() => setRole(u.id, "ADMIN")} title="Promote to Admin" className="w-10 h-10 flex items-center justify-center bg-red-500 rounded-2xl text-white shadow-[0_5px_15px_rgba(239,68,68,0.2)] hover:scale-105 transition-transform font-black text-lg">↑</button>
            ) : (
              <button onClick={() => setRole(u.id, "USER")} title="Demote to User" className="w-10 h-10 flex items-center justify-center bg-black/5 rounded-2xl text-black hover:bg-black/10 transition-colors font-black text-lg">→</button>
            )}
            <button onClick={() => del(u.id, u.name)} className="w-10 h-10 flex items-center justify-center bg-black/5 rounded-2xl text-black/40 hover:bg-red-500 hover:text-white transition-all"><TrashIcon /></button>
          </div>
        </div>
      ))}
      {!filteredUsers.length && <p className="font-mono text-sm text-slate-600 col-span-full py-10 text-center">{searchQuery ? `No users matching "${searchQuery}"` : "No users."}</p>}
      </div>

      {/* JIT Delete Modal */}
      {jitAction && (
        <JITActionModal
          title="Delete User"
          description={`You are permanently deleting user ${jitAction.label}. All their bookings, registrations, and data will be cascade-deleted. This requires JIT authorization.`}
          onClose={() => setJitAction(null)}
          onConfirm={executeDel}
        />
      )}
    </div>
  );
}
