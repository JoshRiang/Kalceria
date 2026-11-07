"use client";
import { memo } from "react";
import {
  ClosingUsersMapSection,
  ClosingJoinUsSection,
  ClosingLegacySection,
} from "./closing";

export const ClosingSections = memo(function ClosingSections({ isMobile, onOpenIdeaModal }) {
  return (
    <>
      {/* ── Section 7: Big Square Concept ── */}
      <ClosingUsersMapSection isMobile={isMobile} />

      {/* ── Section 8: Final Scene / Tokyo Nights ── */}
      <ClosingJoinUsSection isMobile={isMobile} />

      {/* ── Section 9: The Legacy ── */}
      <ClosingLegacySection isMobile={isMobile} onOpenIdeaModal={onOpenIdeaModal} />
    </>
  );
});

export {
  ClosingUsersMapSection,
  ClosingJoinUsSection,
  ClosingLegacySection,
};
