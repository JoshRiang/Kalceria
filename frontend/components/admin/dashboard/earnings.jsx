"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { CARD, INPUT } from './primitives';

export function EarningsPanel({ data: initialData }) {
  const [target, setTarget] = useState(10); // in Juta
  const [range, setRange] = useState({ start: "2026-01-01", end: "2026-12-31" });
  const [granularity, setGranularity] = useState("month");
  const [useIntelligence, setUseIntelligence] = useState(false);
  const [earningsData, setEarningsData] = useState(initialData);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await api.get(`/admin/earnings?start=${range.start}&end=${range.end}`);
        setEarningsData(res.data);
      } catch (err) {
        console.error("Failed to fetch earnings:", err);
      }
    };
    fetchEarnings();
  }, [range.start, range.end]);

  const chartData = useMemo(() => {
    const start = new Date(range.start);
    const end = new Date(range.end);
    const transactions = earningsData.transactions || [];
    const points = [];
    const historicalAvg = earningsData.average || 2.5; // Backend monthly avg

    if (granularity === "day") {
      let curr = new Date(start);
      while (curr <= end) {
        const currDate = curr.toLocaleDateString('en-CA'); // "YYYY-MM-DD" in local TZ
        const label = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(curr);
        const val = transactions.filter(t => new Date(t.date).toLocaleDateString('en-CA') === currDate).reduce((s, t) => s + (t.total || 0), 0) / 1_000_000;
        points.push({ label, value: val, projected: useIntelligence ? historicalAvg / 30 : 0 });
        curr.setDate(curr.getDate() + 1);
      }
    } else if (granularity === "week") {
      let curr = new Date(start);
      let weekCount = 1;
      while (curr <= end) {
        const next = new Date(curr);
        next.setDate(next.getDate() + 7);
        const label = `W${weekCount}`;
        const val = transactions.filter(t => {
          const d = new Date(t.date);
          return d >= curr && d < next;
        }).reduce((s, t) => s + (t.total || 0), 0) / 1_000_000;
        points.push({ label, value: val, projected: useIntelligence ? historicalAvg / 4 : 0 });
        curr = next;
        weekCount++;
      }
    } else {
      let curr = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      while (curr <= endMonth) {
        const currMonth = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
        const label = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(curr);
        const val = transactions.filter(t => {
          const d = new Date(t.date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currMonth;
        }).reduce((s, t) => s + (t.total || 0), 0) / 1_000_000;
        points.push({ label, value: val, projected: useIntelligence ? historicalAvg : 0 });
        curr.setMonth(curr.getMonth() + 1);
      }
    }

    if (points.length === 0) return [{ label: "No Data", value: 0, projected: 0 }];
    return points;
  }, [range, granularity, earningsData, useIntelligence]);

  const maxVal = Math.max(...chartData.map(p => Math.max(p.value, p.projected)), target, 1) * 1.2;

  const totalRaw = earningsData.totalRaw || 0;
  const breakdown = earningsData.breakdown || {};

  const formatIDR = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-8">
      {/* ── Real-Time KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: totalRaw, accent: 'text-yellow-400', border: 'border-yellow-400/20', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.08)]' },
          { label: 'Service Bookings', value: breakdown.serviceBookings || 0, accent: 'text-orange-400', border: 'border-orange-400/10', glow: '' },
          { label: 'Event Registrations', value: breakdown.eventRegistrations || 0, accent: 'text-cyan-400', border: 'border-cyan-400/10', glow: '' },
          { label: 'Merch Sales', value: (breakdown.merch || 0) + (breakdown.timekeeperBookings || 0), accent: 'text-emerald-400', border: 'border-emerald-400/10', glow: '' },
        ].map(({ label, value, accent, border, glow }) => (
          <div key={label} className={`bg-white/[0.03] border ${border} rounded-2xl p-5 ${glow}`}>
            <p className="font-mono text-[9px] text-white/30 uppercase tracking-widest mb-2">{label}</p>
            <p className={`font-mono font-black text-lg tracking-tighter ${accent}`}>{formatIDR(value)}</p>
          </div>
        ))}
      </div>

      {/* ── Config + Chart Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Target Form */}
      <div className={`${CARD} p-8 space-y-6 bg-white/[0.03] border-white/5 rounded-3xl`}>
        <div>
          <h3 className="font-sans font-black text-xs text-white uppercase tracking-tighter mb-6">Target Configuration</h3>
          <div className="space-y-4">
            <div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-sans font-bold text-[9px] text-white/20 uppercase tracking-widest block ml-1">Start Period</label>
                  <input type="date" className={INPUT} value={range.start} onChange={e => setRange({ ...range, start: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="font-sans font-bold text-[9px] text-white/20 uppercase tracking-widest block ml-1">End Period</label>
                  <input type="date" className={INPUT} value={range.end} onChange={e => setRange({ ...range, end: e.target.value })} />
                </div>
              </div>
            </div>
            <div>
              <label className="font-sans font-bold text-[10px] text-white/40 mb-2 block">Profit Target (Juta IDR)</label>
              <div className="relative group/input">
                <input type="number" className={INPUT} value={target} onChange={e => setTarget(Number(e.target.value))} />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20">
                  <button
                    onClick={() => setTarget(prev => prev + 1)}
                    className="text-white/20 hover:text-white transition-colors p-0.5"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setTarget(prev => Math.max(0, prev - 1))}
                    className="text-white/20 hover:text-white transition-colors p-0.5"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="font-sans font-bold text-[10px] text-white/40 mb-2 block">Growth Intelligence</label>
              <button
                onClick={() => setUseIntelligence(!useIntelligence)}
                className={`relative w-full py-4 px-6 rounded-2xl border transition-all font-sans font-medium text-[10px] flex items-center justify-between overflow-hidden group shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${useIntelligence
                    ? "border-white/40 bg-white/10 ring-1 ring-white/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
              >
                {/* Glow Blobs (Menonjol Effect) */}
                <div className="absolute -left-10 -top-10 w-24 h-24 bg-red-600/20 blur-[40px] rounded-full group-hover:bg-red-600/40 transition-all duration-700" />
                <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-amber-500/20 blur-[40px] rounded-full group-hover:bg-amber-500/40 transition-all duration-700" />

                <span className="relative z-10 text-white shadow-sm">Use Historical Avg</span>
                <div className={`relative z-10 w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] ${useIntelligence ? "bg-white animate-pulse scale-110" : "bg-white/20"
                  }`} />
              </button>
            </div>
            <div>
              <label className="font-sans font-bold text-[10px] text-white/40 mb-2 block">Display Metric</label>
              <div className="flex gap-2">
                {["Day", "Week", "Month"].map(g => (
                  <button key={g} onClick={() => setGranularity(g.toLowerCase())} className={`flex-1 py-2 rounded-lg border font-sans font-bold text-[9px] tracking-widest transition-all ${granularity === g.toLowerCase() ? "bg-white text-black border-white" : "border-white/10 text-white/40 hover:text-white"
                    }`}>{g}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Chart Visualization */}
      <div className="xl:col-span-2 relative min-h-[500px] bg-white/[0.01] backdrop-blur-3xl rounded-[40px] border border-white/5 overflow-hidden p-10 group">
        {/* Geometric Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />

        <div className="relative h-full flex flex-col">
          <div className="flex justify-between items-start mb-10">
            <h3 className="font-sans font-black text-sm text-white uppercase tracking-tighter">Earnings Growth <span className="text-white/20 font-sans font-black tracking-tighter uppercase">/ Rp. X1000</span></h3>
            <div className="text-right">
              <p className="font-mono text-[10px] text-white/40 uppercase">Total Revenue (YTD)</p>
              <p className="font-sans text-2xl font-black text-yellow-400 tracking-tighter">{formatIDR(totalRaw)}</p>
            </div>
          </div>

          <div className="flex-1 relative">
            {/* SVG Chart */}
            <svg viewBox="0 0 1000 400" className="w-full h-full preserve-3d overflow-visible">
              {/* Horizontal Y-Lines (Targets) */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                <g key={i}>
                  <line x1="0" y1={400 - (p * 400)} x2="1000" y2={400 - (p * 400)} stroke="white" strokeOpacity="0.05" strokeDasharray="4 4" />
                  <text x="-10" y={400 - (p * 400)} className="fill-white/20 font-mono text-[10px]" textAnchor="end">{(p * maxVal).toFixed(1)}</text>
                </g>
              ))}

              {/* Target Line (Red Solid) */}
              <line
                x1="0" y1={400 - (target / maxVal * 400)} x2="1000" y2={400 - (target / maxVal * 400)}
                stroke="#FF0000" strokeOpacity="0.8" strokeWidth="2"
              />
              <text x="1000" y={400 - (target / maxVal * 400) - 10} fill="white" className="font-mono text-[16px] uppercase font-black" textAnchor="end">Target</text>

              {/* Projection Line (Blue) */}
              {useIntelligence && (
                <path
                  d={`M ${chartData.map((p, i) => `${(i / (chartData.length - 1)) * 1000},${400 - (p.projected / maxVal * 400)}`).join(' L ')}`}
                  fill="none" stroke="#00FFFF" strokeWidth="2" strokeDasharray="4 4" className="opacity-60"
                />
              )}

              {/* The Primary Line Path (Yellow) */}
              <path
                d={`M ${chartData.map((p, i) => `${(i / (chartData.length - 1)) * 1000},${400 - (p.value / maxVal * 400)}`).join(' L ')}`}
                fill="none" stroke="#FFFF00" strokeWidth="3" className="drop-shadow-[0_0_15px_rgba(255,255,0,0.4)]"
              />

              {/* Data Points */}
              {chartData.map((p, i) => (
                <circle
                  key={i}
                  cx={(i / (chartData.length - 1)) * 1000}
                  cy={400 - (p.value / maxVal * 400)}
                  r="4" className="fill-yellow-400 group-hover:r-6 transition-all cursor-crosshair"
                />
              ))}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between mt-4">
              {chartData.map((p, i) => (
                <span key={i} className="font-mono text-[9px] text-white/30 uppercase">{p.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
      
      {/* ── Recent Financial Transactions ── */}
      <div className={`${CARD} p-8 rounded-3xl bg-white/[0.03] border-white/5`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-sans font-black text-sm text-white uppercase tracking-tighter">Recent Financial Transactions</h3>
          <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest">{earningsData.transactions?.length || 0} Records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">Date & Time</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">Source</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">Item/Service</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold">User/Admin</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold text-right">Qty</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold text-right">Price</th>
                <th className="py-4 px-4 font-mono text-[10px] text-white/40 uppercase tracking-widest font-bold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {(earningsData.transactions || []).slice(0, 15).map((t, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-4 text-white/60">
                    <span className="text-white block">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className="text-[10px] text-white/40">{new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                      t.source === 'Merch Sale' ? 'bg-emerald-500/20 text-emerald-400' :
                      t.source === 'Service Booking' ? 'bg-orange-500/20 text-orange-400' :
                      t.source === 'Event Registration' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {t.source}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-white max-w-[200px] truncate" title={t.item}>{t.item}</td>
                  <td className="py-4 px-4 text-white/60">{t.who}</td>
                  <td className="py-4 px-4 text-right text-white/80">{t.qty}</td>
                  <td className="py-4 px-4 text-right text-white/80">{formatIDR(t.price)}</td>
                  <td className="py-4 px-4 text-right font-black text-yellow-400/90">{formatIDR(t.total)}</td>
                </tr>
              ))}
              {(!earningsData.transactions || earningsData.transactions.length === 0) && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-white/30 text-xs italic">No financial transactions recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
