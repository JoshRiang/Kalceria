"use client";
import { CheckIcon, TrashIcon, XIcon, formatDate } from "../primitives";

export function BookingCardItem({
  booking,
  isSelected,
  onSelect,
  onAccept,
  onCancel,
  onViewReceipt,
  onDelete,
}) {
  return (
    <div
      onClick={() => onSelect(booking)}
      className={`relative rounded-[32px] p-6 group transition-all duration-500 cursor-pointer overflow-hidden flex flex-col border-none
        bg-[#d6cdc2]
        ${isSelected
          ? "shadow-[0_0_30px_rgba(249,115,22,0.25)] ring-2 ring-orange-400/40 scale-[1.002]"
          : "hover:shadow-[0_15px_30px_rgba(0,0,0,0.1)]"}
      `}
    >
      {/* Minimalist Image 2 Aesthetic: Beige background, no blobs */}
      <div className="relative z-10 space-y-1.5 flex flex-col">
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-sans font-black text-xl text-black tracking-tight leading-tight uppercase">{booking.requestor?.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {/* BUG 2 FIX: Read actual role from requestor, not hardcoded ADMIN */}
              <span className={`font-sans text-[8px] font-black uppercase tracking-widest ${
                booking.requestor?.role === "ADMIN" ? "text-red-500" : "text-blue-500"
              }`}>
                {booking.requestor?.role || "USER"}
              </span>
              <span className={`font-sans text-[8px] font-black uppercase tracking-widest ${
                booking.status === "PROCESSED" ? "text-emerald-600" : "text-orange-500"
              }`}>
                {booking.status === "PROCESSED" ? "VERIFIED" : "PENDING"}
              </span>
            </div>
          </div>
        </div>

        <div className="py-3 space-y-3">
          <div>
            <p className="font-sans text-[10px] text-black/70 font-medium mb-0 truncate">{booking.requestor?.email || "admin@gmail.com"}</p>
            <p className="font-sans text-[10px] text-black/70 font-medium tracking-widest">0000000000</p>
          </div>

          <div className="w-full h-px bg-black/5" />

          <div className="max-h-[160px] overflow-y-auto scrollbar-hide">
            <p className="font-sans text-[8px] text-black/30 uppercase font-black tracking-widest mb-1">Schedule ({booking.slots?.length || 0} Slots)</p>
            <div className="space-y-0.5">
              {(booking.slots || []).map((s, idx) => (
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
            <span className="font-sans text-[10px] text-black/40 font-medium">Since: {new Date(booking.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")}</span>

            <div className="col-span-1">
              <p className="font-sans text-[10px] text-black/40 font-medium">PIC: <span className="text-black/70">{booking.contactPerson?.split(" ")[0]}</span></p>
            </div>
            <div className="col-span-1">
              <p className="font-sans text-[10px] text-black/40 font-medium">Loc: <span className="text-black/70">{booking.locationString}</span></p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-3 mt-2 border-t border-black/5">
          {booking.status === "PENDING" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept(booking);
                }}
                className="w-9 h-9 flex items-center justify-center bg-emerald-500 rounded-full text-white shadow-md hover:scale-105 transition-all"
                title="Accept booking"
              >
                <CheckIcon />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(booking);
                }}
                className="w-9 h-9 flex items-center justify-center bg-red-500 rounded-full text-white shadow-md hover:scale-105 transition-all"
                title="Cancel booking"
              >
                <XIcon />
              </button>
            </>
          )}
          {booking.status === "PROCESSED" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewReceipt(booking);
              }}
              className="flex-1 h-9 flex items-center justify-center bg-blue-500 rounded-full text-white font-bold text-[10px] uppercase tracking-widest shadow-md hover:bg-blue-400 transition-all"
              title="View Receipt"
            >
              View Receipt
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(booking);
            }}
            className="w-9 h-9 flex items-center justify-center bg-black/5 rounded-full text-black/40 hover:bg-red-500 hover:text-white transition-all"
            title="Delete booking"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

