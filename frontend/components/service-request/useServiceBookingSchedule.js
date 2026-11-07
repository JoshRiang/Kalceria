"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";

export function useServiceBookingSchedule({ setError, mounted }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlots, setSelectedSlots] = useState({}); // { "date-hour": true }
  const [publicBookings, setPublicBookings] = useState([]);

  const fetchBookings = useCallback(() => {
    api
      .get("/services/bookings")
      .then((res) => setPublicBookings(res.data.bookings || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 20000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  // Distribute computing: Pre-index bookings
  const bookingMap = useMemo(() => {
    const map = {};
    publicBookings.forEach((b) => {
      const bDate = new Date(b.targetDate).toISOString().split("T")[0];
      const startH = parseInt(b.startTime.split(":")[0], 10);
      const endH = parseInt(b.endTime.split(":")[0], 10);
      if (startH === 0 && endH === 1) {
        map[`${bDate}-24`] = b.status;
        return;
      }
      for (let h = startH; h < (endH === 0 ? 24 : endH); h++) {
        map[`${bDate}-${h}`] = b.status;
      }
    });
    return map;
  }, [publicBookings]);

  // ── Synchronize to WIB (Asia/Jakarta, UTC+7) ──────────────────────────────
  const getWibNow = () => {
    const now = new Date();
    const wibFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = wibFormatter.formatToParts(now);
    const getPart = (type) => parts.find((p) => p.type === type)?.value;
    const y = parseInt(getPart("year") || "2026", 10);
    const m = parseInt(getPart("month") || "11", 10) - 1;
    const d = parseInt(getPart("day") || "1", 10);
    return new Date(y, m, d);
  };

  // High-Fidelity Heatmap Matrix
  const hoursA = Array.from({ length: 8 }, (_, i) => 9 + i); // 09:00 - 16:00
  const hoursB = Array.from({ length: 8 }, (_, i) => 17 + i); // 17:00 - 00:00

  const getDays = useCallback(() => {
    const days = [];
    const startOfWeek = getWibNow();
    startOfWeek.setDate(startOfWeek.getDate() + weekOffset * 7);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dayNum = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${dayNum}`;
      days.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "Asia/Jakarta" }),
        dayNum: d.getDate(),
        isMonday: d.getDay() === 1,
      });
    }
    return days;
  }, [weekOffset]);

  const currentMonthYear = useMemo(() => {
    const startOfWeek = getWibNow();
    startOfWeek.setDate(startOfWeek.getDate() + weekOffset * 7);
    const month = startOfWeek.toLocaleDateString("en-US", { month: "long", timeZone: "Asia/Jakarta" });
    const year = startOfWeek.toLocaleDateString("en-US", { year: "numeric", timeZone: "Asia/Jakarta" });
    return `${month}, ${year}`;
  }, [weekOffset]);

  const currentWeekNumber = useMemo(() => {
    const startOfWeek = getWibNow();
    startOfWeek.setDate(startOfWeek.getDate() + weekOffset * 7);
    const targetMonth = startOfWeek.getMonth();
    const targetYear = startOfWeek.getFullYear();

    let weekNum = 1;
    const runner = new Date(startOfWeek);
    while (true) {
      runner.setDate(runner.getDate() - 7);
      if (runner.getMonth() === targetMonth && runner.getFullYear() === targetYear) {
        weekNum++;
      } else {
        break;
      }
    }
    return weekNum;
  }, [weekOffset]);

  const toggleSlot = (dStr, hour) => {
    const key = `${dStr}-${hour}`;
    const currentlySelectedCount = Object.values(selectedSlots).filter(Boolean).length;

    if (!selectedSlots[key] && currentlySelectedCount >= 10) {
      setError("Maximum 10 slots per order. Please complete this transaction first.");
      return;
    }

    setSelectedSlots((prev) => ({ ...prev, [key]: !prev[key] }));
    setError("");
  };

  const renderGrid = (hourList) => {
    const days = getDays();
    return (
      <div className="grid grid-cols-[14px_repeat(7,1fr)] xs:grid-cols-[18px_repeat(7,1fr)] sm:grid-cols-[25px_repeat(7,1fr)] gap-0.5 sm:gap-1">
        <div />
        {days.map((d, i) => (
          <div
            key={i}
            className={`text-center font-sans text-[6px] xs:text-[7px] sm:text-[8px] font-black uppercase ${
              d.isMonday ? "text-red-400" : "text-white"
            } leading-tight`}
          >
            {d.label}
            <br />
            {d.dayNum}
          </div>
        ))}
        {hourList.map((h) => (
          <React.Fragment key={h}>
            <div className="text-[6px] xs:text-[7px] sm:text-[8px] font-black text-white flex items-center justify-end pr-0.5 xs:pr-1 sm:pr-1.5 font-sans leading-none">
              {h === 24 ? "00" : h.toString().padStart(2, "0")}
            </div>
            {days.map((d, i) => {
              const isMonday = d.isMonday;
              const slotKey = `${d.date}-${h}`;
              const isSelected = !!selectedSlots[slotKey];
              const isBooked = !!bookingMap[slotKey];

              return (
                <div
                  key={i}
                  onClick={() => !isMonday && !isBooked && toggleSlot(d.date, h)}
                  onDoubleClick={() => !isMonday && !isBooked && toggleSlot(d.date, h)}
                  className={`
                    aspect-square w-full rounded-[2px] transition-all duration-200 cursor-pointer relative
                    ${
                      isMonday
                        ? "bg-red-500/30 border border-red-500/20 cursor-not-allowed"
                        : isBooked
                        ? "bg-white/5 opacity-5 cursor-not-allowed"
                        : isSelected
                        ? "bg-[#FF00FF] shadow-[0_0_12px_#FF00FF] z-10 scale-110"
                        : "bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/40"
                    }
                  `}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const bookingSchedule = useMemo(() => {
    const rawKeys = Object.entries(selectedSlots)
      .filter(([, val]) => val)
      .map(([k]) => k);
    if (!rawKeys.length) return { dates: "—", hours: "—" };

    const dateMap = {};
    rawKeys.forEach((k) => {
      const [date, hourStr] = k.split(/-(?=\d+$)/);
      const h = parseInt(hourStr, 10);
      if (!dateMap[date]) dateMap[date] = [];
      dateMap[date].push(h);
    });

    const sortedDates = Object.keys(dateMap).sort();
    const formattedDatesList = sortedDates
      .map((d) => {
        const [y, m, day] = d.split("-").map(Number);
        const dObj = new Date(y, m - 1, day);
        return dObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      })
      .join(", ");

    const formattedHoursList = sortedDates
      .map((d) => {
        const hours = dateMap[d].sort((a, b) => a - b);
        const blocks = [];
        let start = hours[0];
        let prev = hours[0];

        for (let i = 1; i < hours.length; i++) {
          if (hours[i] === prev + 1) {
            prev = hours[i];
          } else {
            blocks.push({ start, end: prev + 1 });
            start = hours[i];
            prev = hours[i];
          }
        }
        blocks.push({ start, end: prev + 1 });

        const blockStrs = blocks.map((b) => {
          const sStr = (b.start === 24 ? 0 : b.start).toString().padStart(2, "0") + ":00";
          const eStr =
            (b.end === 24 ? "00" : b.end === 25 ? "01" : b.end).toString().padStart(2, "0") + ":00";
          return `${sStr} - ${eStr}`;
        });

        const [y, m, day] = d.split("-").map(Number);
        const dObj = new Date(y, m - 1, day);
        const shortDate = dObj.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

        if (sortedDates.length === 1) {
          return blockStrs.join(", ") + " WIB";
        } else {
          return `${shortDate} (${blockStrs.join(", ")} WIB)`;
        }
      })
      .join("; ");

    return { dates: formattedDatesList, hours: formattedHoursList };
  }, [selectedSlots]);

  return {
    weekOffset,
    setWeekOffset,
    selectedSlots,
    setSelectedSlots,
    publicBookings,
    bookingMap,
    hoursA,
    hoursB,
    currentMonthYear,
    currentWeekNumber,
    toggleSlot,
    renderGrid,
    bookingSchedule,
  };
}
