import Image from "next/image";
import { LOGO } from "@/lib/images";

interface LogoLoaderProps {
  /** Announced to screen readers, e.g. "Loading products". */
  label?: string;
  /** W height: sm 40px, md 56px, lg 80px. */
  size?: "sm" | "md" | "lg";
  /** Extra classes for the wrapper, e.g. "min-h-[60vh]" to reserve space. */
  className?: string;
}

const HEIGHT = { sm: "h-10", md: "h-14", lg: "h-20" } as const;

/**
 * The Woodin "W" mark (no wordmark) pulsing gently over a sweeping line. Used by the full-screen page loader and
 * as the in-page loading state (shop products, route changes). Pure CSS: no client JS needed.
 */
export function LogoLoader({ label = "Loading", size = "md", className = "" }: LogoLoaderProps) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-5 ${className}`}>
      <Image
        src={LOGO.mark.src}
        width={LOGO.mark.width}
        height={LOGO.mark.height}
        alt=""
        priority
        className={`woodin-logo ${HEIGHT[size]} w-auto animate-[woodin-pulse_1.8s_ease-in-out_infinite]`}
      />
      <span aria-hidden="true" className="relative block h-0.5 w-40 overflow-hidden bg-line-strong">
        <span className="woodin-sweep absolute inset-y-0 left-0 w-2/5 animate-[woodin-sweep_1.5s_ease-in-out_infinite] bg-brown" />
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
