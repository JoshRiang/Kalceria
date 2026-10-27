"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import ReceiptModal from "@/components/ReceiptModal";
import { useDebounce, CARD, LABEL, INPUT, CheckIcon, TrashIcon, XIcon, formatDate, ExpandableSearch } from './primitives';
import { JITActionModal } from './modals';

export function AcceptBookingModal({ booking, onClose, onConfirm }) {
  const [deploymentArea, setDeploymentArea] = useState(booking.deploymentArea || '');
  const [technicalBrief, setTechnicalBrief] = useState(booking.technicalBrief || '');
  const [pricePerHour, setPricePerHour] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate total duration from all slots (in hours)
  const totalHours = (booking.slots || []).reduce((acc, s) => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    return acc + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  }, 0);

  const totalPrice = pricePerHour ? parseFloat(pricePerHour) * totalHours : 0;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm({ deploymentArea, technicalBrief, totalPrice });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl bg-[#0d1117] border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
          <div>
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">Phase 3 — Acceptance & Pricing</p>
            <h2 className="font-mono font-black text-xl text-white uppercase tracking-tighter mt-0.5">
              Review & Accept Booking
            </h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl font-mono">&times;</button>
        </div>

        {/* Body - Two Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">

          {/* LEFT: Data Review */}
          <div className="p-8 space-y-5">
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-4">Data Review (Read-Only)</p>

            {/* Request Title */}
            <div>
              <label className={LABEL}>Request Title / Service</label>
              <div className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-white/40 cursor-not-allowed">
                {booking.serviceName || booking.serviceType || '—'}
              </div>
            </div>

            {/* Operator Name */}
            <div>
              <label className={LABEL}>Operator / Contact Person</label>
              <div className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-white/40 cursor-not-allowed">
                {booking.contactPerson || booking.requestor?.name || '—'}
              </div>
            </div>

            {/* Comms */}
            <div>
              <label className={LABEL}>Comms (WhatsApp)</label>
              <div className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-white/40 cursor-not-allowed">
                {booking.whatsapp || '—'}
              </div>
            </div>

            {/* Editable: Deployment Area */}
            <div>
              <label className={LABEL}>Deployment Area *</label>
              <textarea
                value={deploymentArea}
                onChange={(e) => setDeploymentArea(e.target.value)}
                placeholder="e.g. Hall A, Stage 2, Main Entrance..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm text-white focus:outline-none focus:border-white/30 transition-all placeholder:text-white/20 resize-none"
              />
            </div>

            {/* Editable: Technical Brief */}
            <div>
              <label className={LABEL}>Technical Brief *</label>
              <textarea
                value={technicalBrief}
                onChange={(e) => setTechnicalBrief(e.target.value)}
                placeholder="e.g. Power requirements, rigging notes, special setup..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm text-white focus:outline-none focus:border-white/30 transition-all placeholder:text-white/20 resize-none"
              />
            </div>
          </div>

          {/* RIGHT: Real-Time Financials */}
          <div className="p-8 space-y-5 flex flex-col">
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-4">Financial Calculation</p>

            {/* Duration Summary */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-1">
              <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">Booking Duration</p>
              <p className="font-mono font-black text-2xl text-white">{totalHours.toFixed(1)} hrs</p>
              <p className="font-mono text-[10px] text-white/30">{booking.slots?.length || 0} slot(s) total</p>
            </div>

            {/* Price Per Hour Input */}
            <div>
              <label className={LABEL}>Price per Hour (IDR)</label>
              <input
                type="number"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value)}
                placeholder="e.g. 500000"
                min="0"
                className={INPUT}
              />
            </div>

            {/* Total Price Display */}
            <div className={`rounded-xl border p-5 transition-all duration-300 flex-1 flex flex-col justify-center items-center text-center ${
              totalPrice > 0
                ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                : 'border-white/5 bg-white/[0.02]'
            }`}>
              <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-2">Total Price</p>
              <p className={`font-mono font-black text-3xl transition-all duration-300 ${
                totalPrice > 0 ? 'text-emerald-400' : 'text-white/10'
              }`}>
                {totalPrice > 0 ? formatRupiah(totalPrice) : 'IDR 0'}
              </p>
              {totalPrice > 0 && pricePerHour && (
                <p className="font-mono text-[10px] text-white/30 mt-2">
                  {formatRupiah(parseFloat(pricePerHour))} × {totalHours.toFixed(1)} hrs
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white/50 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting || totalPrice <= 0}
                className="flex-1 py-3 bg-emerald-500 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white hover:bg-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                {isSubmitting ? 'Processing...' : 'Confirm & Accept ✓'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookingsPanel({ onRefresh }) {
  const [bookings, setBookings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [acceptModal, setAcceptModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [jitAction, setJitAction] = useState(null); // null | { id, version, label }

  const filteredBookings = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return bookings;
    const terms = q.split(/\s+/);
    return bookings.filter((b) => {
      const searchString = [b.requestor?.name, b.requestor?.email, b.title, b.serviceType, b.status].filter(Boolean).join(" ").toLowerCase();
      return terms.every((term) => searchString.includes(term));
    });
  }, [bookings, debouncedSearchQuery]);
  
  // Math Setup
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getStartOfWeek = (d) => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() - dt.getDay());
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  const currentWeekStart = getStartOfWeek(today);

  // Admin can only navigate backwards a maximum of ONE completely passed week
  const minWeekStart = new Date(currentWeekStart);
  minWeekStart.setDate(currentWeekStart.getDate() - 7);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewWeekStart, setViewWeekStart] = useState(currentWeekStart);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/admin/services");
      setBookings(r.data.bookings || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status, version, extraData = {}) => {
    try {
      await api.patch(`/admin/services/${id}/status`, { status, version, ...extraData });
      
      // Auto-open Receipt Modal if successfully accepted
      if (status === 'PROCESSED' && acceptModal) {
         const processedBooking = { ...acceptModal, ...extraData, status: 'PROCESSED' };
         setReceiptModal({ type: 'BOOKING', data: processedBooking });
      }

      setAcceptModal(null);
      load();
      onRefresh();
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        alert(err.response.data.error || "Gagal mengupdate status. Silakan refresh halaman.");
        load();
      } else {
        alert("Terjadi kesalahan: " + (err.response?.data?.error || err.message));
      }
    }
  };

  const del = (id, version) => {
    setJitAction({ id, version, label: `Booking #${id.slice(0, 8).toUpperCase()}` });
  };

  const executeDel = async (jitToken) => {
    const { id, version } = jitAction;
    await api.delete(`/admin/services/${id}`, {
      data: { version },
      headers: jitToken ? { 'x-jit-token': jitToken } : {},
    });
    setJitAction(null);
    load();
    onRefresh();
  };

  const getWeek1OfMonth = (y, m) => {
    const firstDay = new Date(y, m, 1);
    return getStartOfWeek(firstDay);
  };

  const getWeekNumber = (weekStart, m, y) => {
    const week1Start = getWeek1OfMonth(y, m);
    const diffDays = Math.round((weekStart - week1Start) / (24 * 60 * 60 * 1000));
    return Math.floor(diffDays / 7) + 1;
  };

  const HOURS = [...Array.from({ length: 15 }, (_, i) => 9 + i), 0]; // 09:00 to 00:00

  const getSlotColor = (dayOffset, hour) => {
    const d = new Date(viewWeekStart);
    d.setDate(viewWeekStart.getDate() + dayOffset);

    const dStr = d.toISOString().split('T')[0];
    const hourStr = hour.toString().padStart(2, '0') + ":00";

    const activeBooking = bookings.find(b =>
      b.slots?.some(s => {
        const sDate = new Date(s.date).toISOString().split('T')[0];
        return sDate === dStr && s.startTime <= hourStr && s.endTime > hourStr;
      })
    );

    let colorClass = "bg-emerald-500/10"; // Available
    let borderClass = "border border-white/5"; // Default border

    if (d.getDay() === 1) {
      colorClass = "bg-red-900/20"; // Closed on Monday
    } else if (activeBooking) {
      // BUG 3 FIX: Status drives BASE color. Selection drives BORDER ONLY.
      if (activeBooking.status === "PROCESSED") {
        colorClass = "bg-white shadow-[0_0_8px_rgba(255,255,255,0.3)]";
      } else if (activeBooking.status === "PENDING") {
        colorClass = "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]";
      }

      // Selection adds glowing orange BORDER, never overrides the status color
      if (activeBooking.id === selectedId) {
        borderClass = "border-2 border-orange-500 shadow-[0_0_8px_theme(colors.orange.500)] z-10";
      }
    }

    // Past / spillover: grayscale + dimmed (preserves booking color visibility)
    const isPast = d < today;
    const isSpillover = d.getMonth() !== viewMonth;

    if (isPast || isSpillover) {
      return `${colorClass} ${borderClass} opacity-40 grayscale pointer-events-none`;
    }

    return `${colorClass} ${borderClass}`;
  };

  const shiftWeek = (n) => {
    const nextWeekStart = new Date(viewWeekStart);
    nextWeekStart.setDate(viewWeekStart.getDate() + (n * 7));
    
    if (nextWeekStart < minWeekStart) return;

    setViewWeekStart(nextWeekStart);
    
    // Auto-update month if the Wednesday of this week falls in another month
    const wednesday = new Date(nextWeekStart);
    wednesday.setDate(nextWeekStart.getDate() + 3);
    if (wednesday.getMonth() !== viewMonth) {
      setViewMonth(wednesday.getMonth());
      setViewYear(wednesday.getFullYear());
    }
  };

  const shiftMonth = (n) => {
    const nextMonthDate = new Date(viewYear, viewMonth + n, 1);
    const nextM = nextMonthDate.getMonth();
    const nextY = nextMonthDate.getFullYear();

    const currentMDate = new Date(today.getFullYear(), today.getMonth(), 1);

    setViewMonth(nextM);
    setViewYear(nextY);

    if (n > 0) {
      // Going Forward (>): Always lands on Week 1 of the target month
      setViewWeekStart(getWeek1OfMonth(nextY, nextM));
    } else {
      // Going Backward (<)
      if (nextMonthDate > currentMDate) {
        // Purely future month -> land on Week 1
        setViewWeekStart(getWeek1OfMonth(nextY, nextM));
      } else {
        // Moving back to Current Active Month -> land on earliest accessible week
        setViewWeekStart(new Date(minWeekStart));
      }
    }
  };

  const selectBooking = (b) => {
    if (selectedId === b.id) {
      setSelectedId(null);
    } else {
      setSelectedId(b.id);
      if (b.slots?.length > 0) {
        const slotDate = new Date(b.slots[0].date);
        slotDate.setHours(0,0,0,0);
        const targetWeekStart = getStartOfWeek(slotDate);
        if (targetWeekStart >= minWeekStart) {
          setViewWeekStart(targetWeekStart);
          const wednesday = new Date(targetWeekStart);
          wednesday.setDate(targetWeekStart.getDate() + 3);
          setViewMonth(wednesday.getMonth());
          setViewYear(wednesday.getFullYear());
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Header Area */}
      <div className="relative w-full max-w-5xl mx-auto mb-4">
        {/* Centered Navigation Boxes */}
        <div className="flex items-center justify-center gap-8">
          
          {/* Box 1: Month Selector */}
          <div className="flex items-center gap-1 bg-gray-800/60 backdrop-blur-md rounded-md p-2 border border-white/10 shadow-md">
            <button 
              onClick={() => shiftMonth(-1)} 
              disabled={new Date(viewYear, viewMonth, 1) <= new Date(today.getFullYear(), today.getMonth(), 1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ←
            </button>
            <span className="font-mono font-black text-[16px] uppercase w-32 text-center text-white/80 tracking-widest">
              {new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(viewYear, viewMonth, 1))}
            </span>
            <button 
              onClick={() => shiftMonth(1)} 
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white"
            >
              →
            </button>
          </div>

          {/* Box 2: Week Selector */}
          <div className="flex items-center gap-1 bg-gray-800/60 backdrop-blur-md rounded-md p-2 border border-white/10 shadow-md">
            <button 
              onClick={() => shiftWeek(-1)} 
              disabled={viewWeekStart <= minWeekStart}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ←
            </button>
            <span className="font-mono font-black text-[16px] uppercase w-32 text-center text-white/80 tracking-widest">
              Week {getWeekNumber(viewWeekStart, viewMonth, viewYear)}
            </span>
            <button 
              onClick={() => shiftWeek(1)} 
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-sm text-white"
            >
              →
            </button>
          </div>

        </div>

        {/* Far-Right Year Indicator */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block">
          <span className="font-mono font-black text-[16px] text-white/30 tracking-widest">
            {viewYear}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-5xl mx-auto items-start">
        {[0, 1].map((weekOffset) => {
          const currentStart = new Date(viewWeekStart);
          currentStart.setDate(viewWeekStart.getDate() + (weekOffset * 7));

          return (
            <div key={weekOffset} className={`${CARD} rounded-[20px] p-4 border-white/5 bg-white/[0.02] w-full overflow-hidden`}>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono font-black text-[16px] uppercase tracking-tighter text-white">
                    Week {getWeekNumber(viewWeekStart, viewMonth, viewYear) + weekOffset}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-1 mb-2">
                <div />
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => {
                  const dateObj = new Date(currentStart);
                  dateObj.setDate(currentStart.getDate() + i);
                  return (
          <div key={i} className="flex flex-col items-center">
                       <span className="font-mono text-[11px] font-black text-white/50">{d}</span>
                      <span className={`font-mono text-[11px] font-black ${dateObj.getTime() === today.getTime() ? 'text-orange-500 scale-125 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]' : (dateObj < today || dateObj.getMonth() !== viewMonth) ? 'text-white/20' : 'text-white/70'}`}>
                        {dateObj.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1">
                {HOURS.map(h => (
                  <div key={h} className="grid grid-cols-[40px_repeat(7,1fr)] gap-1">
                    <div className="flex items-center justify-end pr-2 font-mono text-[11px] font-black text-white/60">{h.toString().padStart(2, '0')}:00</div>
                    {Array.from({ length: 7 }).map((_, i) => {
                      const slotDay = new Date(currentStart);
                      slotDay.setDate(currentStart.getDate() + i);
                      return (
                        <div key={i} className={`aspect-square w-full rounded-[4px] transition-all duration-300 ${getSlotColor(i + (weekOffset * 7), h)}`} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cards Section - with search header */}
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">{filteredBookings.length} request{filteredBookings.length !== 1 ? "s" : ""}</p>
        <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search requestor..." />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBookings.map((b) => (
          <div
            key={b.id}
            onClick={() => selectBooking(b)}
            className={`relative rounded-[32px] p-6 group transition-all duration-500 cursor-pointer overflow-hidden flex flex-col border-none
              bg-[#d6cdc2]
              ${selectedId === b.id
                ? "shadow-[0_0_30px_rgba(249,115,22,0.25)] ring-2 ring-orange-400/40 scale-[1.002]"
                : "hover:shadow-[0_15px_30px_rgba(0,0,0,0.1)]"}
            `}
          >
            {/* Minimalist Image 2 Aesthetic: Beige background, no blobs */}

            <div className="relative z-10 space-y-1.5 flex flex-col">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <h3 className="font-sans font-black text-xl text-black tracking-tight leading-tight uppercase">{b.requestor?.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {/* BUG 2 FIX: Read actual role from requestor, not hardcoded ADMIN */}
                    <span className={`font-sans text-[8px] font-black uppercase tracking-widest ${
                      b.requestor?.role === 'ADMIN' ? 'text-red-500' : 'text-blue-500'
                    }`}>
                      {b.requestor?.role || 'USER'}
                    </span>
                    <span className={`font-sans text-[8px] font-black uppercase tracking-widest ${b.status === 'PROCESSED' ? 'text-emerald-600' : 'text-orange-500'
                      }`}>
                      {b.status === 'PROCESSED' ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="py-3 space-y-3">
                <div>
                  <p className="font-sans text-[10px] text-black/70 font-medium mb-0 truncate">{b.requestor?.email || "admin@gmail.com"}</p>
                  <p className="font-sans text-[10px] text-black/70 font-medium tracking-widest">0000000000</p>
                </div>

                <div className="w-full h-px bg-black/5" />

                <div className="max-h-[160px] overflow-y-auto scrollbar-hide">
                  <p className="font-sans text-[8px] text-black/30 uppercase font-black tracking-widest mb-1">Schedule ({b.slots?.length || 0} Slots)</p>
                  <div className="space-y-0.5">
                    {(b.slots || []).map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between py-0.5">
                        <span className="font-sans text-[9px] font-bold text-black/50">{formatDate(s.date)}</span>
                        <span className="font-sans text-[9px] font-black text-black tracking-tighter">{s.startTime}-{s.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <span className="font-sans text-[10px] text-black/40 font-medium">Book: 0</span>
                  <span className="font-sans text-[10px] text-black/40 font-medium">Ev: 0</span>
                  <span className="font-sans text-[10px] text-black/40 font-medium">Svc: 0</span>
                  <span className="font-sans text-[10px] text-black/40 font-medium">Since: {new Date(b.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</span>

                  <div className="col-span-1">
                    <p className="font-sans text-[10px] text-black/40 font-medium">PIC: <span className="text-black/70">{b.contactPerson?.split(' ')[0]}</span></p>
                  </div>
                  <div className="col-span-1">
                    <p className="font-sans text-[10px] text-black/40 font-medium">Loc: <span className="text-black/70">{b.locationString}</span></p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 mt-2 border-t border-black/5">
                {b.status === 'PENDING' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Phase 3: Open Acceptance Modal instead of firing API directly
                        setAcceptModal(b);
                      }}
                      className="w-9 h-9 flex items-center justify-center bg-emerald-500 rounded-full text-white shadow-md hover:scale-105 transition-all"
                    >
                      <CheckIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateStatus(b.id, 'CANCELLED', b.version); }}
                      className="w-9 h-9 flex items-center justify-center bg-red-500 rounded-full text-white shadow-md hover:scale-105 transition-all"
                    >
                      <XIcon />
                    </button>
                  </>
                )}
                {b.status === 'PROCESSED' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setReceiptModal({ type: 'BOOKING', data: b }); }}
                    className="flex-1 h-9 flex items-center justify-center bg-blue-500 rounded-full text-white font-bold text-[10px] uppercase tracking-widest shadow-md hover:bg-blue-400 transition-all"
                    title="View Receipt"
                  >
                    View Receipt
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); del(b.id, b.version); }}
                  className="w-9 h-9 flex items-center justify-center bg-black/5 rounded-full text-black/40 hover:bg-red-500 hover:text-white transition-all"
                  title="Delete booking"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!filteredBookings.length && (
          <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-[40px]">
            <p className="font-mono text-xs text-slate-600 uppercase tracking-[0.2em]">{searchQuery ? `No requests matching "${searchQuery}"` : "No booking requests found"}</p>
          </div>
        )}
      </div>

      {/* Accept Booking Modal — Phase 3 Financial Acceptance Workflow */}
      {acceptModal && (
        <AcceptBookingModal
          booking={acceptModal}
          onClose={() => setAcceptModal(null)}
          onConfirm={(extraData) =>
            updateStatus(acceptModal.id, 'PROCESSED', acceptModal.version, extraData)
          }
        />
      )}

      {/* JIT Delete Modal */}
      {jitAction && (
        <JITActionModal
          title="Delete Booking"
          description={`You are permanently deleting ${jitAction.label}. This action cannot be undone and requires JIT authorization.`}
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
  );
}
