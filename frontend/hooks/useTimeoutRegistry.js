import { useCallback, useEffect, useRef } from "react";

export function useTimeoutRegistry() {
  const timeouts = useRef(new Set());

  const scheduleTimeout = useCallback((callback, delay) => {
    const timeout = setTimeout(() => {
      timeouts.current.delete(timeout);
      callback();
    }, delay);
    timeouts.current.add(timeout);
    return timeout;
  }, []);

  useEffect(() => () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current.clear();
  }, []);

  return scheduleTimeout;
}
