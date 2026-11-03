"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { userPopup } from "@/components/map/UserPopup";
import { ConfirmationPromptModal } from "./modals/ConfirmationPromptModal";
import { StatusModal } from "./modals/StatusModal";
import { EventFormModal } from "./modals/EventFormModal";
import { CollabRequestsModal } from "./modals/CollabRequestsModal";

export const MapModals = memo(function MapModals({
  offlineUserObj,
  setSelectedOfflineUser,
  showStatusModal,
  setShowStatusModal,
  isMapDark,
  saveBroadcast,
  statusText,
  setStatusText,
  busy,
  showEventModal,
  setShowEventModal,
  saveMiniEvent,
  eventForm,
  setEventForm,
  activeOwnEvent,
  deleteMiniEvent,
  editingEventId,
  showCancelRequestModal,
  setShowCancelRequestModal,
  cancelRequestTarget,
  handleConfirmCancelRequest,
  showRequestsModal,
  setShowRequestsModal,
  viewingRequestsEvent,
  currentRequestsList = [],
  onAcceptCollabRequest,
  onDeclineCollabRequest,
  showQuitModal,
  setShowQuitModal,
  handleQuitConfirm,
  showDeleteAccountModal,
  setShowDeleteAccountModal,
  handleConfirmDeleteAccount,
  isExiting,
}) {
  const [quitChoice, setQuitChoice] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteChoice, setDeleteChoice] = useState(null);
  const [cancelChoice, setCancelChoice] = useState(null);
  const [deleteAccountChoice, setDeleteAccountChoice] = useState(null);

  const isModalDark = Boolean(isMapDark);

  const handleQuitYesClick = () => {
    setQuitChoice("yes");
    setTimeout(() => {
      handleQuitConfirm?.();
    }, 220);
  };

  const handleQuitNoClick = () => {
    setQuitChoice("no");
    setTimeout(() => {
      setShowQuitModal(false);
      setQuitChoice(null);
    }, 160);
  };

  return (
    <>
      {/* Offline User Global Popup */}
      {offlineUserObj && !offlineUserObj.isOnline && (
        <div
          className="fixed inset-0 md:inset-auto md:left-[380px] md:top-1/2 md:-translate-y-1/2 z-[3000] flex items-center justify-center md:block pointer-events-auto bg-black/60 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none"
          onClick={() => setSelectedOfflineUser(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative [&>.popup-tail]:hidden shadow-2xl rounded-[16px] overflow-hidden bg-[#0a0e27]/40 backdrop-blur-3xl"
            dangerouslySetInnerHTML={{ __html: userPopup(offlineUserObj, isMapDark, true) }}
          />
        </div>
      )}

      {/* 1. Update Status Modal */}
      <StatusModal
        show={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        isModalDark={isModalDark}
        saveBroadcast={saveBroadcast}
        statusText={statusText}
        setStatusText={setStatusText}
        busy={busy}
      />

      {/* 2. Create Your Own Event / Edit Event Modal */}
      <EventFormModal
        show={showEventModal}
        onClose={() => setShowEventModal(false)}
        isModalDark={isModalDark}
        saveMiniEvent={saveMiniEvent}
        eventForm={eventForm}
        setEventForm={setEventForm}
        activeOwnEvent={activeOwnEvent}
        editingEventId={editingEventId}
        busy={busy}
        onPromptDeleteConfirm={() => setShowDeleteConfirm(true)}
      />

      {/* Cinematic Solid White Light Flash Layer */}
      <AnimatePresence>
        {isExiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: "easeInOut" }}
            className="fixed inset-0 bg-white z-[9999] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* 3. Backdrop-Blurred Confirmation Modals: Quit Map, Delete Event, Remove Request, Delete Account */}
      <ConfirmationPromptModal
        show={showQuitModal}
        title="Quit the map"
        isMapDark={isMapDark}
        choice={quitChoice}
        onConfirm={handleQuitYesClick}
        onClose={handleQuitNoClick}
      />

      <ConfirmationPromptModal
        show={showDeleteConfirm}
        title="Delete this event"
        isMapDark={isMapDark}
        choice={deleteChoice}
        onConfirm={() => {
          setDeleteChoice("yes");
          setTimeout(() => {
            deleteMiniEvent?.(editingEventId || activeOwnEvent?.id);
            setShowDeleteConfirm(false);
            setDeleteChoice(null);
            setShowEventModal?.(false);
          }, 200);
        }}
        onClose={() => {
          setDeleteChoice("no");
          setTimeout(() => {
            setShowDeleteConfirm(false);
            setDeleteChoice(null);
          }, 160);
        }}
      />

      <ConfirmationPromptModal
        show={showCancelRequestModal}
        title="Remove the request from "
        highlightText={cancelRequestTarget?.eventTitle || "this event"}
        isMapDark={isMapDark}
        choice={cancelChoice}
        onConfirm={() => {
          setCancelChoice("yes");
          setTimeout(() => {
            handleConfirmCancelRequest?.();
            setCancelChoice(null);
          }, 200);
        }}
        onClose={() => {
          setCancelChoice("no");
          setTimeout(() => {
            setShowCancelRequestModal(false);
            setCancelChoice(null);
          }, 160);
        }}
      />

      <ConfirmationPromptModal
        show={showDeleteAccountModal}
        title="Are you sure want to "
        highlightText="Delete Account"
        isMapDark={isMapDark}
        choice={deleteAccountChoice}
        onConfirm={() => {
          setDeleteAccountChoice("yes");
          setTimeout(() => {
            handleConfirmDeleteAccount?.();
            setDeleteAccountChoice(null);
          }, 200);
        }}
        onClose={() => {
          setDeleteAccountChoice("no");
          setTimeout(() => {
            setShowDeleteAccountModal?.(false);
            setDeleteAccountChoice(null);
          }, 160);
        }}
      />

      {/* 4. Collaboration Requests Modal (from the Envelope icon) */}
      <CollabRequestsModal
        show={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
        isModalDark={isModalDark}
        viewingRequestsEvent={viewingRequestsEvent}
        currentRequestsList={currentRequestsList}
        onAcceptCollabRequest={onAcceptCollabRequest}
        onDeclineCollabRequest={onDeclineCollabRequest}
      />
    </>
  );
});
