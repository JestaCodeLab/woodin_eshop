import type { ReactNode } from "react";

/** Small tracked gold label above a section heading. `tone="light"` is for dark bands. */
export function Eyebrow({
  children,
  tone = "dark",
  className = "",
}: {
  children: ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <span
      className={`label-caps tracking-[0.24em] ${tone === "light" ? "text-gold-light" : "text-gold"} ${className}`}
    >
      {children}
    </span>
  );
}
