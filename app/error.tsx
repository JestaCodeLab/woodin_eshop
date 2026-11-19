"use client";

import Link from "next/link";

/** Route error boundary. Client component, so it cannot render the (server) Header: it links home instead. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="content-wrap flex flex-col items-center gap-4 py-28 text-center">
      <h1 className="m-0 font-display text-[clamp(32px,5vw,44px)] font-normal text-brown">The shop is taking a moment</h1>
      <p className="m-0 max-w-md text-[19px] font-light text-body">
        We could not load this page. Please try again.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="label-caps bg-brown px-8 py-4 text-ivory">
          Try again
        </button>
        <Link href="/shop" className="label-caps border border-brown px-8 py-4 text-brown no-underline">
          Back to the shop
        </Link>
      </div>
    </main>
  );
}
