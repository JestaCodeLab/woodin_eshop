"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Footer "Join the Woodin circle" form.
 * TODO: post to the newsletter provider once Woodin picks one (see TODO.md).
 */
export function NewsletterForm() {
  const [joined, setJoined] = useState(false);

  if (joined) {
    return (
      <p
        role="status"
        className="m-0 flex-1 basis-[420px] font-display text-2xl italic text-ivory"
      >
        Welcome to the Woodin Nation. Check your inbox for your code.
      </p>
    );
  }

  return (
    <form
      className="flex min-w-0 flex-1 basis-[420px] flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setJoined(true);
      }}
    >
      <input
        id="ft-email"
        type="email"
        required
        autoComplete="email"
        placeholder="Email address"
        className="h-[54px] flex-1 basis-60 border border-ivory/45 bg-transparent px-[18px] text-[15px] text-ivory placeholder:text-ivory/70"
      />
      <Button type="submit" variant="ivory" className="h-[54px] px-[30px] text-[13px] tracking-[0.16em]">
        Subscribe
      </Button>
    </form>
  );
}
