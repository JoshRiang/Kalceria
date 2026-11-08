"use client";

import { memo } from "react";
import ContentImage from "@/components/ui/ContentImage";

export const KalcerianCardHoverFlyout = memo(function KalcerianCardHoverFlyout({
  user,
  userEvent,
  isMapDark,
  avatarUrl,
  cleanDesc,
  focusUser,
  setFocusedUserId,
  scheduleTimeout,
}) {
  return (
    <div
      className={`absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 w-[220px] border rounded-lg shadow-xl p-3 flex flex-col gap-2.5 pointer-events-auto hidden md:flex font-sans backdrop-blur-md ${
        isMapDark
          ? "bg-[#161b22]/95 border-[#30363d] text-[#f0f6fc]"
          : "bg-[#ffffff]/95 border-[#d0d7de] text-[#1f2328]"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-9 h-9 rounded-full overflow-hidden border flex-shrink-0 ${
            isMapDark ? "border-[#30363d]" : "border-[#d0d7de]"
          }`}
        >
          <ContentImage
            src={avatarUrl(user)}
            alt=""
            className="w-full h-full object-cover"
            width={64}
            height={64}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold truncate leading-tight">
            {user.name}
          </p>
          {user.nickname && (
            <p
              className={`text-[10.5px] truncate mt-0.5 ${
                isMapDark ? "text-[#8b949e]" : "text-[#656d76]"
              }`}
            >
              @{user.nickname}
            </p>
          )}
        </div>
      </div>

      {(userEvent?.description || user.broadcast?.message) && (
        <p
          className={`text-[11px] border-l-2 pl-2 line-clamp-2 ${
            isMapDark
              ? "text-[#8b949e] border-[#ffd60a]/40"
              : "text-[#656d76] border-[#d97706]"
          }`}
        >
          &quot;{cleanDesc(userEvent?.description || user.broadcast?.message)}&quot;
        </p>
      )}

      <div className="flex gap-2 mt-1">
        <a
          href={`/user/${user.id}`}
          className={`flex-1 py-1.5 text-center text-[10.5px] font-medium border rounded transition-colors ${
            isMapDark
              ? "bg-[#21262d] border-[#30363d] text-[#f0f6fc] hover:bg-[#30363d]"
              : "bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328] hover:bg-[#f3f4f6]"
          }`}
        >
          Profile
        </a>
        {Boolean(user?.isOnline && user?.allowLiveLocation !== false) && (
          <button
            type="button"
            className={`flex-1 py-1.5 text-center text-[10.5px] font-medium border rounded transition-colors cursor-pointer ${
              isMapDark
                ? "bg-[#238636] border-[#2ea043] text-white hover:bg-[#2ea043]"
                : "bg-[#1f883d] border-[#1a7f37] text-white hover:bg-[#1a7f37]"
            }`}
            onClick={() => {
              if (userEvent) {
                focusUser(userEvent);
              } else {
                setFocusedUserId(user.id);
                focusUser(user);
                scheduleTimeout(() => setFocusedUserId(null), 100);
              }
            }}
          >
            Focus
          </button>
        )}
      </div>
    </div>
  );
});
