"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** True after the browser has hydrated the component, with an SSR-safe snapshot. */
export function useHasMounted() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
