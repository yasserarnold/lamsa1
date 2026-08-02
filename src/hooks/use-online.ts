import { useEffect, useState } from "react";

/**
 * Reactive online/offline flag. Defaults to `true` during SSR.
 * `navigator.onLine` is notoriously unreliable (often reports offline
 * while the device is actually online), so we verify with a real
 * network probe before flipping to offline.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    let cancelled = false;

    const probe = async (): Promise<boolean> => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        await fetch("/favicon.ico", {
          method: "HEAD",
          cache: "no-store",
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        return true;
      } catch {
        return false;
      }
    };

    const on = () => {
      if (!cancelled) setOnline(true);
    };
    const off = async () => {
      // Double-check before showing offline banner — navigator.onLine lies.
      const reallyOnline = await probe();
      if (!cancelled) setOnline(reallyOnline);
    };

    // Verify initial state if browser claims we're offline.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      void off();
    }

    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      cancelled = true;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}