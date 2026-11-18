import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { Header } from "@/components/layout/Header";
import { getStores } from "@/lib/stores";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<div aria-busy="true" className="content-wrap py-16"><div className="h-64 animate-pulse bg-sand" /></div>}>
          <CheckoutFlow pickupStores={getStores().map(({ id, name, address }) => ({ id, name, address }))} />
        </Suspense>
      </main>
    </>
  );
}
