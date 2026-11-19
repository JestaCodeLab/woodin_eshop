"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";

/**
 * Header search: the icon opens a full-width bar over the header. It is a plain GET form to /shop?q=,
 * so submitting works the same everywhere. Esc, the close button or a click outside closes it.
 */
export function HeaderSearch({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" aria-label="Search the shop" aria-expanded={open} onClick={() => setOpen(true)} className={className}>
        <SearchIcon />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 text-ink">
          <div aria-hidden="true" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <form action="/shop" method="get" role="search" className="relative border-b border-line bg-ivory">
            <div className="content-wrap flex h-[72px] items-center gap-3">
              <SearchIcon size={22} className="shrink-0 text-muted" />
              <label htmlFor="header-search" className="sr-only">
                Search products by name or code
              </label>
              <input
                ref={input}
                id="header-search"
                type="search"
                name="q"
                required
                autoComplete="off"
                placeholder="Search by name or code"
                className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
              />
              <button type="submit" className="label-caps h-11 shrink-0 bg-brown px-5 text-ivory">
                Search
              </button>
              <button type="button" aria-label="Close search" onClick={() => setOpen(false)} className="flex h-11 w-11 shrink-0 items-center justify-center">
                <CloseIcon />
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
