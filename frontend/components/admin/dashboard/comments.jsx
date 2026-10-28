"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { INPUT, TrashIcon, LocalBlob, formatDate } from './primitives';

export function CommentsPanel({ lowPowerMode }) {
  const [comments, setComments] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(["All"]); // Max 2

  const load = useCallback(async () => {
    let pinned = filters.includes("Pinned") ? "true" : "";
    let type = filters.find(f => f === "Advice" || f === "Idea") || "All";

    const r = await api.get("/admin/comments", {
      params: { search, pinned, type }
    });
    setComments(r.data.comments || []);
  }, [search, filters]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Starts the existing async API load; state changes after its response.
  useEffect(() => { load(); }, [load]);

  const toggleFilter = (f) => {
    setFilters(prev => {
      if (f === "All") return ["All"];
      let next = prev.filter(x => x !== "All");
      if (next.includes(f)) {
        next = next.filter(x => x !== f);
        return next.length === 0 ? ["All"] : next;
      }
      if (next.length >= 2) next.shift();
      return [...next, f];
    });
  };

  async function togglePin(id) {
    await api.patch(`/admin/comments/${id}/pin`);
    load();
  }

  async function del(id) {
    if (!confirm("Delete this comment?")) return;
    await api.delete(`/admin/comments/${id}`);
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-72">
          <input
            className={INPUT}
            placeholder="SEARCH USERNAME..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All", "Pinned", "Advice", "Idea"].map(f => (
            <button
              key={f}
              onClick={() => toggleFilter(f)}
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-widest border transition-all ${filters.includes(f)
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-slate-500 border-white/10 hover:border-white/30"
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {comments.map((c) => (
          <motion.div
            key={c.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          className={`relative aspect-square rounded-3xl p-6 group transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/40 overflow-hidden flex flex-col justify-between ${
              lowPowerMode ? "bg-[#d6cdc2]" : "bg-white/70 backdrop-blur-xl"
            }`}
          >
            <LocalBlob color="bg-fuchsia-400" />

            <div className="relative z-10 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-black/5 border border-black/10 overflow-hidden flex-shrink-0">
                  <img
                    src={c.user?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.username || 'anon'}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-sans font-black text-sm text-black tracking-tight leading-none uppercase truncate">
                    {c.username || "ANONYMOUS"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`font-sans font-black text-[9px] uppercase tracking-tighter ${c.type === 'ADVICE' ? 'text-[#1a365d]' : 'text-red-600'
                      }`}>
                      {c.type}
                    </span>
                    <span className="text-black/20 text-[9px]">-</span>
                    <span className={`font-sans font-black text-[9px] uppercase tracking-tighter ${c.category?.toUpperCase() === 'EVENT' ? 'text-fuchsia-600' :
                        c.category?.toUpperCase() === 'WEB DEV' ? 'text-yellow-600' : 'text-emerald-600'
                      }`}>
                      {c.category || 'OTHER'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <p className="font-sans text-[12px] text-black/80 leading-relaxed font-medium group-hover:text-black transition-colors duration-300">
                  {c.content}
                </p>
              </div>

              <p className="font-sans text-[10px] text-black/40 mt-4 uppercase tracking-widest">
                {formatDate(c.createdAt)}
              </p>
            </div>

            <div className="relative z-10 flex gap-2 pt-4">
              <button
                onClick={() => togglePin(c.id)}
                className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${c.isPinned
                    ? "bg-emerald-500 text-white shadow-[0_5px_15px_rgba(34,197,94,0.3)]"
                    : "bg-black/5 text-black/30 hover:bg-black/10 hover:text-black"
                  }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
                </svg>
              </button>
              <button
                onClick={() => del(c.id)}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/5 text-black/30 hover:bg-red-500 hover:text-white transition-all"
              >
                <TrashIcon />
              </button>
            </div>
          </motion.div>
        ))}
        {!comments.length && (
          <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl">
            <p className="font-mono text-xs text-slate-600 uppercase tracking-[0.2em]">No comments found</p>
          </div>
        )}
      </div>
    </div>
  );
}
