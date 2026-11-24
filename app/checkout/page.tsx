import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { Header } from "@/components/layout/Header";
import { getCheckoutPrefill } from "@/lib/account";
import { freeDeliveryThreshold } from "@/lib/config";
import { getDeliveryOptions } from "@/lib/delivery";
import { paymentsEnabled } from "@/lib/payments-config";
import { getStores } from "@/lib/stores";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

async function CheckoutContent() {
  const [deliveryOptions, prefill] = await Promise.all([getDeliveryOptions(), getCheckoutPrefill()]);
  return (
    <CheckoutFlow
      pickupStores={getStores().map(({ id, name, address }) => ({ id, name, address }))}
      payments={paymentsEnabled()}
      deliveryOptions={deliveryOptions.map(({ id, name, short, eta, fee, freeEligible }) => ({ id, name, short, eta, fee, freeEligible }))}
      freeDeliveryThreshold={freeDeliveryThreshold()}
      prefill={prefill}
      savedAddresses={prefill?.addresses.map(({ id, label, name, phone, address, area }) => ({ id, label, name, phone, address, area })) ?? []}
    />
  );
}

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<div aria-busy="true" className="content-wrap py-16"><div className="h-64 animate-pulse bg-sand" /></div>}>
          <CheckoutContent />
        </Suspense>
      </main>
    </>
  );
}
