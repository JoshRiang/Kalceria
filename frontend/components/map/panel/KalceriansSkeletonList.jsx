"use client";

export function KalceriansSkeletonList({ isMapDark }) {
  return (
    <div className="flex flex-col">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className={`shrink-0 min-h-[66px] my-1 rounded-xl border grid grid-cols-[64px_1fr] items-center gap-3 px-3.5 py-3 animate-pulse ${
            isMapDark ? "border-[#30363d]/60 bg-[#21262d]/30" : "border-[#d0d7de]/70 bg-white/40"
          }`}
        >
          <div className="flex justify-center">
            <div
              className={`w-11 h-11 rounded-full ${
                isMapDark ? "bg-[#21262d]" : "bg-[#eaecf0]"
              }`}
            />
          </div>
          <div className="space-y-2">
            <div
              className={`h-3.5 w-[130px] rounded ${
                isMapDark ? "bg-[#21262d]" : "bg-[#eaecf0]"
              }`}
            />
            <div
              className={`h-2.5 w-[180px] rounded ${
                isMapDark ? "bg-[#21262d]" : "bg-[#eaecf0]"
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
