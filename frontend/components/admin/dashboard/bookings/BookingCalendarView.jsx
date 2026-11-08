"use client";
import { CARD } from "../primitives";

export function BookingCalendarView({
  viewYear,
  viewMonth,
  viewWeekStart,
  minWeekStart,
  today,
  shiftMonth,
  shiftWeek,
  getWeekNumber,
  getSlotColor,
  HOURS,
}) {
  return (
    <>
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
              {new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(viewYear, viewMonth, 1))}
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
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => {
                  const dateObj = new Date(currentStart);
                  dateObj.setDate(currentStart.getDate() + i);
                  return (
                    <div key={i} className="flex flex-col items-center">
                      <span className="font-mono text-[11px] font-black text-white/50">{d}</span>
                      <span className={`font-mono text-[11px] font-black ${dateObj.getTime() === today.getTime() ? "text-orange-500 scale-125 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" : (dateObj < today || dateObj.getMonth() !== viewMonth) ? "text-white/20" : "text-white/70"}`}>
                        {dateObj.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1">
                {HOURS.map(h => (
                  <div key={h} className="grid grid-cols-[40px_repeat(7,1fr)] gap-1">
                    <div className="flex items-center justify-end pr-2 font-mono text-[11px] font-black text-white/60">{h.toString().padStart(2, "0")}:00</div>
                    {Array.from({ length: 7 }).map((_, i) => {
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
    </>
  );
}

