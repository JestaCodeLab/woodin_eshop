import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { TrackOrder } from "@/components/track/TrackOrder";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Follow your Woodin order: enter your order number and email to see where it is.",
  robots: { index: false },
};

export default function TrackPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<div className="content-wrap py-16"><div className="h-64 animate-pulse bg-sand" /></div>}>
          <TrackOrder />
        </Suspense>
      </main>
    </>
  );
}
