"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toSmartTitleCase } from "@/lib/titleCase";
import { LocationAutocomplete } from "@/components/service-request/LocationAutocomplete";

import { EVENT_CATEGORIES_GRID } from "./eventForm/eventCategories";
import { EventMediaSection } from "./eventForm/EventMediaSection";
import { EventFormActions } from "./eventForm/EventFormActions";
import {
  MODAL_GENIE_BACKDROP,
  MODAL_GENIE_SURFACE,
  useModalBackClose,
} from "./modalMotion";

export { EVENT_CATEGORIES_GRID };

export function EventFormModal({
  show,
  onClose,
  isModalDark,
  saveMiniEvent,
  eventForm,
  setEventForm,
  activeOwnEvent,
  editingEventId,
  busy,
  onPromptDeleteConfirm,
}) {
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  useModalBackClose(Boolean(show), onClose);

  const isEventFormValid = Boolean(
    (eventForm.category || "cafe").trim() &&
    (eventForm.title || "").trim() &&
    (eventForm.location || "").trim() &&
    (eventForm.description || "").trim()
  );

  const isEditing = Boolean(editingEventId || activeOwnEvent);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="event-form-backdrop"
          {...MODAL_GENIE_BACKDROP}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-2.5 xs:p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm select-none"
          onClick={onClose}
        >
          <motion.div
            key="event-form-surface"
            {...MODAL_GENIE_SURFACE}
            className={`relative w-full max-w-[460px] my-auto max-h-[92dvh] sm:max-h-[88vh] flex flex-col rounded-[20px] sm:rounded-[26px] shadow-2xl overflow-hidden transition-colors duration-300 ${
              isModalDark
                ? "bg-[#010101] border border-[#30363d] text-[#f0f6fc]"
                : "bg-[#ffffff] border border-[#d0d7de] text-[#1f2328]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
        {/* 3-Piece Smooth-Trimmed Background (BGCreateMini_Light / BGCreateMini_Dark) with clear reading gaps */}
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden"
          style={{
            backgroundColor: isModalDark ? "#010101" : "#ffffff",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, transparent 13%, black 19%, black 34%, transparent 40%, transparent 55%, black 60%, black 67%, transparent 72%, transparent 83%, black 88%, black 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, transparent 13%, black 19%, black 34%, transparent 40%, transparent 55%, black 60%, black 67%, transparent 72%, transparent 83%, black 88%, black 100%)",
          }}
        >
          <div
            className="w-full h-full"
            style={{
              backgroundImage: isModalDark
                ? "url('/BG_IMPROVE_FOR_MAP/BGCreateMini_Dark.webp')"
                : "url('/BG_IMPROVE_FOR_MAP/BGCreateMini_Light.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              opacity: isModalDark ? 0.45 : 0.58,
            }}
          />
        </div>

        {/* Header (Solid #010101 / #ffffff, uncontaminated by background) */}
        <div
          className={`shrink-0 relative z-10 flex justify-between items-center px-4 xs:px-6 py-3.5 sm:py-4 border-none ${
            isModalDark ? "bg-[#010101]" : "bg-[#ffffff]"
          }`}
        >
          <h2
            className={`font-sans font-bold text-base sm:text-lg tracking-tight ${
              isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
            }`}
          >
            {isEditing ? "Edit Event" : "Create Your Own Event"}
          </h2>
          <button
            type="button"
            className={`text-2xl leading-none relative z-10 p-1 transition-colors cursor-pointer ${
              isModalDark
                ? "text-[#8b949e] hover:text-[#f0f6fc]"
                : "text-[#57606a] hover:text-[#1f2328]"
            }`}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            if (!isEventFormValid) {
              e.preventDefault();
              return;
            }
            saveMiniEvent(e);
          }}
          className="relative z-10 p-4 xs:p-5 sm:p-6 flex-1 overflow-y-auto flex flex-col gap-3 sm:gap-4 custom-scrollbar"
        >
          <p
            className={`text-xs sm:text-sm leading-relaxed tracking-normal ${
              isModalDark ? "text-[#8b949e]" : "text-[#57606a]"
            }`}
          >
            Share your current activity with other Kalcerians for 24h.
          </p>

          {/* 2x2 Category Selector */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label
              className={`text-[11px] sm:text-xs font-semibold tracking-wider ${
                isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
              }`}
            >
              Category <span className="text-[#ef4444]">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {EVENT_CATEGORIES_GRID.map((cat) => {
                const isSelected = (eventForm.category || "cafe") === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEventForm((f) => ({ ...f, category: cat.id }))}
                    className={`flex flex-col items-center justify-center p-2.5 xs:p-3 rounded-xl border transition-all duration-200 outline-none cursor-pointer ${
                      isSelected
                        ? isModalDark
                          ? "bg-[#16181d]/90 border-2 border-[#ffffff] shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                          : "bg-[#f6f8fa]/95 border-2 border-[#000000] shadow-[0_0_12px_rgba(0,0,0,0.15)]"
                        : isModalDark
                        ? "bg-[#0a0c10]/88 border-[#30363d] hover:border-[#8b949e]"
                        : "bg-[#ffffff]/90 border-[#d0d7de] hover:border-[#8c959f]"
                    }`}
                  >
                    <div className="transition-transform duration-200">
                      {cat.renderIcon(isSelected, isModalDark)}
                    </div>
                    <span
                      className={`text-[10px] xs:text-[11px] leading-tight text-center mt-1.5 transition-colors duration-200 ${
                        isSelected
                          ? isModalDark
                            ? "text-[#ffffff] font-bold"
                            : "text-[#000000] font-bold"
                          : isModalDark
                          ? "text-[#8b949e] font-medium"
                          : "text-[#57606a] font-medium"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event Title */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label
              className={`text-[11px] sm:text-xs font-semibold tracking-wider ${
                isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
              }`}
            >
              Event Title <span className="text-[#ef4444]">*</span>
            </label>
            <input
              className={`w-full border rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm outline-none transition-all ${
                isModalDark
                  ? "bg-[#0a0c10]/92 border-[#30363d] text-[#ffffff] placeholder-[#8b949e] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  : "bg-[#f6f8fa]/95 border-[#d0d7de] text-[#000000] placeholder-[#8c959f] focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
              }`}
              value={eventForm.title}
              onChange={(e) =>
                setEventForm((f) => ({
                  ...f,
                  title: toSmartTitleCase(e.target.value, { preserveSpaces: true }),
                }))
              }
              onBlur={() =>
                setEventForm((f) => ({
                  ...f,
                  title: toSmartTitleCase(f.title || "", { preserveSpaces: false }),
                }))
              }
              placeholder="Nongs FM Sini"
            />
          </div>

          {/* Location & Venue Segment (Modularized from LocationAutocomplete) */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <LocationAutocomplete
              value={eventForm.location || ""}
              onChange={(loc, item) => {
                setEventForm((f) => ({
                  ...f,
                  location: loc,
                  lat: item?.lat || item?.latitude || f.lat,
                  lng: item?.lon || item?.lng || item?.longitude || f.lng,
                }));
              }}
              isVerified={isLocationVerified}
              setIsVerified={setIsLocationVerified}
              required={true}
              isModalDark={isModalDark}
              label={<>Deployment Area <span className="text-[#ef4444]">*</span></>}
              hideCheckmark={true}
            />
          </div>

          {/* Briefing */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label
              className={`text-[11px] sm:text-xs font-semibold tracking-wider ${
                isModalDark ? "text-[#f0f6fc]" : "text-[#1f2328]"
              }`}
            >
              Briefing <span className="text-[#ef4444]">*</span>
            </label>
            <textarea
              className={`w-full border rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm outline-none min-h-[75px] sm:min-h-[100px] resize-y transition-all ${
                isModalDark
                  ? "bg-[#0a0c10]/92 border-[#30363d] text-[#ffffff] placeholder-[#8b949e] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  : "bg-[#f6f8fa]/95 border-[#d0d7de] text-[#000000] placeholder-[#8c959f] focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
              }`}
              value={eventForm.description}
              onChange={(e) =>
                setEventForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Agenda details"
            />
          </div>

          {/* Video / GIF Live Feed Attachment */}
          <EventMediaSection
            eventForm={eventForm}
            setEventForm={setEventForm}
            isModalDark={isModalDark}
            busy={busy}
            isOwner={isEditing}
          />

          {/* Action Buttons */}
          <EventFormActions
            isEditing={isEditing}
            onPromptDeleteConfirm={onPromptDeleteConfirm}
            busy={busy}
            isEventFormValid={isEventFormValid}
            isModalDark={isModalDark}
          />
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
