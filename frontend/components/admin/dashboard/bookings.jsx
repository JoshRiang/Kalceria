"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import ReceiptModal from "@/components/ReceiptModal";
import { useDebounce, ExpandableSearch } from "./primitives";
import { JITActionModal } from "./modals";
import {
  AcceptBookingModal,
  BookingCalendarView,
  BookingCardItem,
} from "./bookings/index";

export { AcceptBookingModal };

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

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Starts the existing async API load; state changes after its response.
  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status, version, extraData = {}) => {
    try {
      await api.patch(`/admin/services/${id}/status`, { status, version, ...extraData });
      
      // Auto-open Receipt Modal if successfully accepted
      if (status === "PROCESSED" && acceptModal) {
         const processedBooking = { ...acceptModal, ...extraData, status: "PROCESSED" };
         setReceiptModal({ type: "BOOKING", data: processedBooking });
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
      headers: jitToken ? { "x-jit-token": jitToken } : {},
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

    const dStr = d.toISOString().split("T")[0];
    const hourStr = hour.toString().padStart(2, "0") + ":00";

    const activeBooking = bookings.find(b =>
      b.slots?.some(s => {
        const sDate = new Date(s.date).toISOString().split("T")[0];
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
      {/* Navigation Header & Calendar Grid */}
      <BookingCalendarView
        viewYear={viewYear}
        viewMonth={viewMonth}
        viewWeekStart={viewWeekStart}
        minWeekStart={minWeekStart}
        today={today}
        shiftMonth={shiftMonth}
        shiftWeek={shiftWeek}
        getWeekNumber={getWeekNumber}
        getSlotColor={getSlotColor}
        HOURS={HOURS}
      />

      {/* Cards Section - with search header */}
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest">{filteredBookings.length} request{filteredBookings.length !== 1 ? "s" : ""}</p>
        <ExpandableSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search requestor..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBookings.map((b) => (
          <BookingCardItem
            key={b.id}
            booking={b}
            isSelected={selectedId === b.id}
            onSelect={selectBooking}
            onAccept={(booking) => setAcceptModal(booking)}
            onCancel={(booking) => updateStatus(booking.id, "CANCELLED", booking.version)}
            onViewReceipt={(booking) => setReceiptModal({ type: "BOOKING", data: booking })}
            onDelete={(booking) => del(booking.id, booking.version)}
          />
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
            updateStatus(acceptModal.id, "PROCESSED", acceptModal.version, extraData)
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
