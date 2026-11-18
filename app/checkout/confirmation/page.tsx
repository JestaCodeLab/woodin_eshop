import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmationView } from "@/components/checkout/ConfirmationView";
import { Header } from "@/components/layout/Header";
import { LogoLoader } from "@/components/ui/LogoLoader";

export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

export default function ConfirmationPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<LogoLoader label="Loading" className="min-h-[60vh]" />}>
          <ConfirmationView />
        </Suspense>
      </main>
    </>
  );
}
