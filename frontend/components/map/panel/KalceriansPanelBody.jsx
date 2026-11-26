"use client";

import { KalceriansCardList } from "./KalceriansCardList";
import { ChatWithOthersList } from "./ChatWithOthersList";
import { AssignMeetingList } from "./AssignMeetingList";

export function KalceriansPanelBody(props) {
  const { activePanel } = props;

  if (activePanel === "chat") {
    return (
      <ChatWithOthersList
        listContainerRef={props.listContainerRef}
        isDataLoading={props.isDataLoading}
        isMapDark={props.isMapDark}
        activeScope={props.activeScope}
        scopedKalcerians={props.scopedKalcerians}
        currentUser={props.currentUser}
        personalChatMap={props.personalChatMap}
        blockedUserIds={props.blockedUserIds}
        blockedByUserIds={props.blockedByUserIds}
        limits={props.limits}
        isSelfOffline={props.isSelfOffline}
        onOpenPersonalChat={props.handleOpenChatWithTransition}
      />
    );
  }

  if (activePanel === "meeting") {
    return (
      <AssignMeetingList
        listContainerRef={props.listContainerRef}
        isDataLoading={props.isDataLoading}
        isMapDark={props.isMapDark}
        events={props.events}
        currentUser={props.currentUser}
        acceptedCollabsMap={props.acceptedCollabsMap}
        eventRequestsMap={props.eventRequestsMap}
        eventGroupChatMap={props.eventGroupChatMap}
        pinnedMeetingEventIds={props.pinnedMeetingEventIds}
        searchQuery={props.searchQuery}
        onOpenItemOnMap={props.onOpenItemOnMap}
        focusUser={props.focusUser}
        setDrawerOpen={props.setDrawerOpen}
      />
    );
  }

  return <KalceriansCardList {...props} />;
}
