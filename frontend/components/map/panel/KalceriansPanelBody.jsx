"use client";

import { KalceriansCardList } from "./KalceriansCardList";
import { ChatWithOthersList } from "./ChatWithOthersList";
import { AssignMeetingList } from "./AssignMeetingList";
import { ReelsDiscoveryList } from "../reels/ReelsDiscoveryList";

export function KalceriansPanelBody(props) {
  const { activePanel } = props;

  if (activePanel === "reels") {
    return (
      <ReelsDiscoveryList
        listContainerRef={props.listContainerRef}
        isMapDark={props.isMapDark}
        activeScope={props.activeScope}
        events={props.events}
        sidebarKalcerians={props.sidebarKalcerians}
        currentUser={props.currentUser}
        isUserFriend={props.isUserFriend}
        searchQuery={props.searchQuery}
        isSelfOffline={props.isSelfOffline}
        onOpenItemOnMap={props.onOpenItemOnMap}
        focusUser={props.focusUser}
        setDrawerOpen={props.setDrawerOpen}
        onOpenPersonalChat={props.handleOpenChatWithTransition}
      />
    );
  }

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
        groupSummaryMap={props.groupSummaryMap}
        pinnedMeetingEventIds={props.pinnedMeetingEventIds}
        searchQuery={props.searchQuery}
        onOpenGroupChat={props.onOpenGroupChat}
      />
    );
  }

  return <KalceriansCardList {...props} />;
}
