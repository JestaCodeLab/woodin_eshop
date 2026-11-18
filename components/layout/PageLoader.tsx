"use client";

import { useEffect, useState } from "react";
import { LogoLoader } from "@/components/ui/LogoLoader";

/** Shortest time the loader stays up, so it reads as a brand moment, not a flicker. */
const MIN_VISIBLE_MS = 600;
const FADE_MS = 450;

/**
 * Full-screen Woodin loader shown on a full page load (first visit, refresh, arriving from the
 * main site's "Shop Now"). It is part of the server HTML, so it covers the page from the first
 * paint, then fades out once the page has loaded. Client-side navigations don't reload the page,
 * so they never trigger it.
 *
 * If JavaScript fails, a CSS animation (woodin-autohide) hides it after 4s so it can never stick.
 */
export function PageLoader() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const finish = () => {
      timer = setTimeout(() => setPhase("fade"), MIN_VISIBLE_MS);
    };
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    return () => {
      window.removeEventListener("load", finish);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "fade") return;
    const t = setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-ivory transition-opacity ease-out ${
        phase === "fade" ? "pointer-events-none opacity-0" : "opacity-100"
      } animate-[woodin-autohide_0.3s_ease_4s_forwards]`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <LogoLoader label="Loading Woodin" size="lg" />
    </div>
  );
}
