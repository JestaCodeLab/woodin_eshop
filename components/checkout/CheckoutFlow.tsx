"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { IMG, LOGO } from "@/lib/images";
import { MAIN_LINKS } from "@/lib/links";
import { METHODS, type MethodId, type ZoneId } from "@/lib/checkout-config";

/**
 * Checkout. Two modes, chosen by the server (`payments`):
 *  - payments ON: POST /api/checkout/start creates a pending WooCommerce order and a Paystack
 *    transaction (amounts are decided on the server, never here), then the Paystack popup opens on
 *    this page. The customer never leaves the eshop. We poll /api/checkout/confirm and move to
 *    /checkout/confirmation when the payment is verified.
 *  - payments OFF: the old simulated flow (no money, no orders, nothing stored).
 */

type Step = "form" | "paying" | "done";
type Errors = Partial<Record<"name" | "phone" | "email" | "address" | "store" | "shipName" | "shipPhone" | "shipAddress", string>>;

export interface SavedAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  area: string;
}
const GH_PHONE = /^(\+?233|0)\d{9}$/;

const inputCls = "h-[54px] border border-line-strong bg-white px-4 text-[15px] aria-[invalid=true]:border-lowstock";
const labelCls = "label-caps tracking-[0.14em]";
const radioOn = "border border-brown shadow-[inset_0_0_0_1px_var(--color-brown)]";
const radioOff = "border border-line-strong";

function Field({
  id, label, error, children,
}: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelCls}>{label}</label>
      {children}
      {error ? <span id={`${id}-err`} className="text-[13px] text-lowstock">{error}</span> : null}
    </div>
  );
}

export interface PickupStore {
  id: string;
  name: string;
  address: string;
}

export interface DeliveryChoice {
  id: ZoneId;
  name: string;
  short: string;
  eta: string;
  fee: number | null;
  /** "Free Accra delivery over GH₵ X" applies to this option. */
  freeEligible: boolean;
}

interface PaystackPopup {
  resumeTransaction: (accessCode: string, callbacks?: { onSuccess?: () => void; onCancel?: () => void; onError?: () => void }) => void;
}
declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopup;
  }
}

interface Attempt {
  reference: string;
  accessCode: string;
  authorizationUrl: string;
}

const INLINE_SRC = "https://js.paystack.co/v2/inline.js";

function loadInlineScript(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${INLINE_SRC}"]`);
    const el = existing ?? Object.assign(document.createElement("script"), { src: INLINE_SRC, async: true });
    el.addEventListener("load", () => resolve(), { once: true });
    el.addEventListener("error", () => reject(new Error("Paystack script failed to load")), { once: true });
    if (!existing) document.head.appendChild(el);
  });
}

export function CheckoutFlow({
  pickupStores,
  payments,
  deliveryOptions,
  freeDeliveryThreshold,
  prefill,
  savedAddresses = [],
}: {
  pickupStores: PickupStore[];
  payments: boolean;
  deliveryOptions: DeliveryChoice[];
  freeDeliveryThreshold: number | null;
  /** Saved details of the signed-in customer. Undefined for guests. */
  prefill?: { name: string; phone: string; email: string; address: string; area: string } | null;
  /** The signed-in customer's address book, offered when shipping to a different address. */
  savedAddresses?: SavedAddress[];
}) {
  const router = useRouter();
  const { cart, status, clear } = useCart();
  const search = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<Step>("form");
  const [zoneId, setZoneId] = useState<ZoneId>(deliveryOptions[0]?.id ?? "store");
  const [methodId, setMethodId] = useState<MethodId>(
    METHODS.some((m) => m.id === search.get("pay")) ? (search.get("pay") as MethodId) : "mtn",
  );
  const [errors, setErrors] = useState<Errors>({});
  // Shipping address: by default the billing address is used. Unticking shows a separate recipient + address.
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [ship, setShip] = useState({ name: "", phone: "", address: "", area: "" });
  const setShipField = (k: keyof typeof ship) => (e: React.ChangeEvent<HTMLInputElement>) => setShip((s) => ({ ...s, [k]: e.target.value }));
  const [phone, setPhone] = useState("");
  const [receipt, setReceipt] = useState<{ total: string; zone: string; method: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const zone = deliveryOptions.find((z) => z.id === zoneId) ?? deliveryOptions[0];
  const method = METHODS.find((m) => m.id === methodId)!;
  const currency = cart?.currency ?? "GHS";
  const money = (n: number | null) => (n === null ? "GH₵ [PRICE]" : formatMoney(n, currency));
  const subtotal = cart?.subtotal ?? 0;
  // Same rule the server applies: "Free Accra delivery over GH₵ X".
  const feeFor = (z: DeliveryChoice) => (z.freeEligible && freeDeliveryThreshold !== null && subtotal >= freeDeliveryThreshold ? 0 : z.fee);
  const fee = feeFor(zone);
  const total = subtotal + (fee ?? 0);
  const feeLabel = fee === null ? "GH₵ [FEE]" : fee === 0 ? "Free" : money(fee);
  const isCard = methodId === "card";

  const steps = ["Bag", "Details", "Payment", "Confirmation"];
  const stepIdx = step === "done" ? 3 : 2;

  function validate(data: FormData): Errors {
    const e: Errors = {};
    const get = (k: string) => String(data.get(k) ?? "").trim();
    if (get("name").length < 2) e.name = "Enter your full name.";
    if (!/^(\+?233|0)\d{9}$/.test(get("phone").replace(/[\s-]/g, ""))) e.phone = "Enter a Ghana mobile number, for example 024 000 0000.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get("email"))) e.email = "Enter an email address for your receipt.";
    if (zoneId !== "store" && get("address").length < 3) e.address = "Enter your address or GhanaPostGPS code.";
    if (zoneId === "store" && !get("store")) e.store = "Choose a store to collect from.";
    if (zoneId !== "store" && !sameAsBilling) {
      if (ship.name.trim().length < 2) e.shipName = "Enter the recipient's full name.";
      if (!GH_PHONE.test(ship.phone.replace(/[\s-]/g, ""))) e.shipPhone = "Enter a Ghana mobile number for the courier.";
      if (ship.address.trim().length < 3) e.shipAddress = "Enter the delivery address or GhanaPostGPS code.";
    }
    return e;
  }

  async function finish() {
    setReceipt({ total: money(total), zone: zone.name, method: method.short });
    setStep("done");
    await clear();
  }

  async function openPaystack(a: Attempt) {
    setPayError(null);
    try {
      await loadInlineScript();
      if (!window.PaystackPop) throw new Error("no popup");
      new window.PaystackPop().resumeTransaction(a.accessCode, {
        onSuccess: () => router.push(`/checkout/confirmation?reference=${a.reference}`),
        onCancel: () => undefined, // stays on the "complete your payment" screen; polling continues
      });
    } catch {
      // Popup unavailable (blocked script, ad blocker): use Paystack's hosted page, which returns to /checkout/confirmation.
      window.location.assign(a.authorizationUrl);
    }
  }

  async function startPayment(data: FormData) {
    setSubmitting(true);
    setPayError(null);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    try {
      const res = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: { name: get("name"), phone: get("phone"), email: get("email") },
          delivery: {
            zone: zoneId,
            address: get("address") || undefined,
            area: get("area") || undefined,
            storeId: get("store") || undefined,
            shipTo: zoneId !== "store" && !sameAsBilling ? { name: ship.name.trim(), phone: ship.phone.trim(), address: ship.address.trim(), area: ship.area.trim() || undefined } : undefined,
          },
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setPayError(body?.message ?? "We could not start your payment. Please try again.");
        return;
      }
      const a: Attempt = { reference: body.reference, accessCode: body.accessCode, authorizationUrl: body.authorizationUrl };
      setAttempt(a);
      setStep("paying");
      void openPaystack(a);
    } catch {
      setPayError("We could not reach the shop. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // While the payment window is open (or a MoMo prompt is waiting on the phone), watch for the result.
  useEffect(() => {
    if (!payments || step !== "paying" || !attempt) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: attempt.reference }),
        });
        const body = await res.json().catch(() => null);
        if (stop) return;
        if (body?.status === "paid" || body?.status === "review") router.push(`/checkout/confirmation?reference=${attempt.reference}`);
        else if (body?.status === "failed") setPayError("That payment did not go through. You have not been charged. Please try again.");
      } catch {
        /* transient: try again on the next tick */
      }
    };
    const id = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [payments, step, attempt, router]);

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const data = new FormData(ev.currentTarget);
    const found = validate(data);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setPhone(String(data.get("phone")));
    if (payments) void startPayment(data);
    else if (isCard) void finish();
    else setStep("paying");
  }

  const stepNav = (
    <nav aria-label="Checkout steps" className="content-wrap pb-2 pt-10">
      <ol className="m-0 flex list-none flex-wrap gap-x-7 gap-y-2 p-0 label-caps tracking-[0.18em]">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={i === stepIdx ? "step" : undefined}
            className={`pb-1.5 ${i === stepIdx ? "border-b border-brown text-brown" : i < stepIdx ? "text-ink" : "text-[#8c8279]"}`}
          >
            <span className="mr-2 font-display text-base font-normal normal-case italic tracking-normal">{["i.", "ii.", "iii.", "iv."][i]}</span>
            {label}
          </li>
        ))}
      </ol>
    </nav>
  );

  // Loading / empty bag (not shown once an order is confirmed: the bag has been cleared by then).
  if (step === "form") {
    if (status === "loading") {
      return (
        <>
          {stepNav}
          <div aria-busy="true" className="content-wrap py-16"><div className="h-64 animate-pulse bg-sand" /></div>
        </>
      );
    }
    if (!cart || cart.items.length === 0) {
      return (
        <>
          {stepNav}
          <div className="content-wrap flex flex-col items-center gap-4 py-20 text-center">
            <h1 className="m-0 font-display text-[40px] font-normal text-brown">Your bag is empty</h1>
            <Button href="/shop" variant="primary">Shop new in</Button>
          </div>
        </>
      );
    }
  }

  if (step === "paying" && payments && attempt) {
    return (
      <>
        {stepNav}
        <section className="mx-auto flex max-w-[640px] flex-col items-center gap-[22px] px-4 pb-28 pt-20 text-center">
          <span className="flex h-[110px] w-[110px] items-center justify-center rounded-full border border-brown text-brown">
            <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h3" />
            </svg>
          </span>
          <h1 className="m-0 font-display text-[clamp(34px,6vw,52px)] font-normal leading-none">Complete your payment</h1>
          <p className="m-0 text-[19px] font-light leading-[1.7] text-body" role="status">
            {payError ?? "Pay in the secure Paystack window. For Mobile Money, approve the prompt on your phone. This page updates by itself."}
          </p>
          <Button onClick={() => void openPaystack(attempt)} variant="primary" size="lg" className="px-[34px]">
            Open the payment window
          </Button>
          <button
            type="button"
            onClick={() => {
              setAttempt(null);
              setPayError(null);
              setStep("form");
            }}
            className="h-11 border-0 bg-transparent px-3 text-sm text-ink underline"
          >
            Change my details
          </button>
        </section>
      </>
    );
  }

  if (step === "paying") {
    return (
      <>
        {stepNav}
        <section className="mx-auto flex max-w-[640px] flex-col items-center gap-[22px] px-4 pb-28 pt-20 text-center">
          <span className="flex h-[110px] w-[110px] items-center justify-center rounded-full border border-brown text-brown">
            <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" />
            </svg>
          </span>
          <h1 className="m-0 font-display text-[clamp(38px,6vw,58px)] font-normal leading-none">Check your phone</h1>
          <p className="m-0 text-[19px] font-light leading-[1.7] text-body" role="status">
            We sent a {method.short} prompt to {phone}. Enter your PIN to pay {money(total)} to Woodin.
          </p>
          <Button onClick={() => void finish()} variant="primary" size="lg" className="px-[34px]">
            Simulate approval (test mode)
          </Button>
          <button type="button" onClick={() => setStep("form")} className="h-11 border-0 bg-transparent px-3 text-sm text-ink underline">
            No prompt? Change payment method
          </button>
        </section>
      </>
    );
  }

  if (step === "done" && receipt) {
    return (
      <>
        {stepNav}
        <section className="content-wrap flex flex-wrap items-stretch pb-24 pt-6">
          <div className="relative min-h-[340px] min-w-0 flex-[1_1_520px] overflow-hidden bg-espresso md:min-h-[620px]">
            <Image src={IMG.modelsSmiling} alt="Three models smiling in Woodin prints" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" style={{ objectPosition: "50% 30%" }} />
          </div>
          <div className="flex min-w-0 flex-[1_1_460px] flex-col justify-center gap-5 border border-line bg-white p-8 md:p-14">
            <Image src={LOGO.mark.src} width={LOGO.mark.width} height={LOGO.mark.height} alt="" className="h-auto w-12" />
            <h1 className="m-0 font-display text-[clamp(40px,5vw,62px)] font-normal leading-none text-brown">
              Merci. <span className="italic">Thank you.</span>
            </h1>
            <p className="m-0 text-[19px] font-light leading-[1.7] text-body" role="status">
              Your order #WD-[NUMBER] is confirmed. We will send your receipt by SMS and email once payments go live. This is a demo order, so nothing was charged.
            </p>
            <dl className="m-0 flex flex-col gap-2.5 border-y border-line py-4 text-[15px] font-light">
              <div className="flex justify-between"><dt>Paid with</dt><dd className="m-0 font-medium">{receipt.method}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd className="m-0 font-medium">{receipt.zone}</dd></div>
              <div className="flex justify-between"><dt>Total</dt><dd className="m-0 font-medium">{receipt.total}</dd></div>
            </dl>
            <div className="flex flex-wrap gap-2.5">
              <Button href="/shop" variant="primary" className="px-[30px] py-[18px]">Continue shopping</Button>
              <Button href={MAIN_LINKS.home} variant="outline-brown" className="px-[30px] py-[17px]">Back to woodinfashion.com</Button>
            </div>
            <p className="m-0 font-display text-xl italic">Wear it, tag it — #WearWoodin</p>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {stepNav}
      <section className="content-wrap flex flex-wrap items-start gap-12 pb-24 pt-6">
        <form ref={formRef} onSubmit={onSubmit} noValidate className="flex min-w-0 flex-[999_1_600px] flex-col gap-10">
          <h1 className="m-0 font-display text-[clamp(44px,6vw,64px)] font-normal leading-none text-brown">Checkout</h1>

          {Object.keys(errors).length > 0 ? (
            <p role="alert" className="m-0 border border-lowstock bg-white px-4 py-3 text-sm text-lowstock">
              Please fix the highlighted fields to continue.
            </p>
          ) : null}

          <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
            <legend className="mb-4 p-0 font-display text-[30px]">1. Contact</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="co-name" label="Full name" error={errors.name}>
                <input id="co-name" name="name" defaultValue={prefill?.name} type="text" autoComplete="name" placeholder="Ama Mensah" aria-invalid={!!errors.name} aria-describedby={errors.name ? "co-name-err" : undefined} className={inputCls} />
              </Field>
              <Field id="co-phone" label="Phone number" error={errors.phone}>
                <input id="co-phone" name="phone" defaultValue={prefill?.phone} type="tel" autoComplete="tel" placeholder="024 000 0000" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "co-phone-err" : undefined} className={inputCls} />
              </Field>
            </div>
            <Field id="co-email" label="Email for your receipt" error={errors.email}>
              <input id="co-email" name="email" defaultValue={prefill?.email} type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? "co-email-err" : undefined} className={inputCls} />
            </Field>
          </fieldset>

          {zoneId !== "store" ? (
            <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
              <legend className="mb-4 p-0 font-display text-[30px]">2. Billing address</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="co-addr" label="Address or GhanaPostGPS" error={errors.address}>
                  <input id="co-addr" name="address" defaultValue={prefill?.address} type="text" autoComplete="street-address" placeholder="e.g. GA-123-4567" aria-invalid={!!errors.address} aria-describedby={errors.address ? "co-addr-err" : undefined} className={inputCls} />
                </Field>
                <Field id="co-area" label="Area / landmark">
                  <input id="co-area" name="area" defaultValue={prefill?.area} type="text" placeholder="e.g. Near Osu Castle" className={inputCls} />
                </Field>
              </div>
            </fieldset>
          ) : null}

          <fieldset className="m-0 flex min-w-0 flex-col gap-3.5 border-0 p-0">
            <legend className="mb-4 p-0 font-display text-[30px]">{zoneId !== "store" ? "3" : "2"}. Delivery</legend>
            <div role="radiogroup" aria-label="Delivery option" className="grid gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
              {deliveryOptions.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  role="radio"
                  aria-checked={zoneId === z.id}
                  onClick={() => setZoneId(z.id)}
                  className={`flex min-h-[110px] flex-col items-start gap-1 bg-white p-[18px] text-left ${zoneId === z.id ? radioOn : radioOff}`}
                >
                  <span className="font-display text-xl">{z.name}</span>
                  {z.eta ? <span className="text-[13px] text-muted">{z.eta}</span> : null}
                  <span className="mt-1.5 text-[15px]">{feeFor(z) === null ? "GH₵ [FEE]" : feeFor(z) === 0 ? "Free" : money(feeFor(z))}</span>
                </button>
              ))}
            </div>
            {zoneId !== "store" ? (
              <>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                  <input type="checkbox" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} className="h-[18px] w-[18px] accent-brown" />
                  Ship to my billing address
                </label>
                {!sameAsBilling ? (
                  <div className="flex flex-col gap-4 border border-line bg-white p-5" role="group" aria-label="Shipping address">
                    <span className="label-caps tracking-[0.14em]">Shipping address</span>
                    {savedAddresses.length > 0 ? (
                      <Field id="co-saved" label="Use a saved address">
                        <select
                          id="co-saved"
                          defaultValue=""
                          onChange={(e) => {
                            const a = savedAddresses.find((x) => x.id === e.target.value);
                            if (a) setShip({ name: a.name, phone: a.phone, address: a.address, area: a.area });
                          }}
                          className={`${inputCls} px-3.5`}
                        >
                          <option value="">Choose a saved address…</option>
                          {savedAddresses.map((a) => (
                            <option key={a.id} value={a.id}>{a.label}: {a.address}</option>
                          ))}
                        </select>
                      </Field>
                    ) : null}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field id="co-ship-name" label="Recipient's full name" error={errors.shipName}>
                        <input id="co-ship-name" value={ship.name} onChange={setShipField("name")} type="text" autoComplete="shipping name" aria-invalid={!!errors.shipName} aria-describedby={errors.shipName ? "co-ship-name-err" : undefined} className={inputCls} />
                      </Field>
                      <Field id="co-ship-phone" label="Recipient's phone (for the courier)" error={errors.shipPhone}>
                        <input id="co-ship-phone" value={ship.phone} onChange={setShipField("phone")} type="tel" autoComplete="shipping tel" placeholder="024 000 0000" aria-invalid={!!errors.shipPhone} aria-describedby={errors.shipPhone ? "co-ship-phone-err" : undefined} className={inputCls} />
                      </Field>
                      <Field id="co-ship-addr" label="Address or GhanaPostGPS" error={errors.shipAddress}>
                        <input id="co-ship-addr" value={ship.address} onChange={setShipField("address")} type="text" autoComplete="shipping street-address" placeholder="e.g. GA-123-4567" aria-invalid={!!errors.shipAddress} aria-describedby={errors.shipAddress ? "co-ship-addr-err" : undefined} className={inputCls} />
                      </Field>
                      <Field id="co-ship-area" label="Area / landmark">
                        <input id="co-ship-area" value={ship.area} onChange={setShipField("area")} type="text" placeholder="e.g. Near Osu Castle" className={inputCls} />
                      </Field>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <Field id="co-store" label="Collect from" error={errors.store}>
                <select id="co-store" name="store" defaultValue={pickupStores[0]?.id} className={`${inputCls} px-3.5`}>
                  {pickupStores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </fieldset>

          <fieldset className="m-0 flex min-w-0 flex-col gap-3.5 border-0 p-0">
            <legend className="mb-4 p-0 font-display text-[30px]">{zoneId !== "store" ? "4" : "3"}. Payment</legend>
            {payments ? (
              <p className="m-0 border border-line bg-white p-4 text-sm font-light leading-[1.6] text-body">
                You will choose <strong className="font-medium">MTN MoMo, Telecel Cash, AT Money or card</strong> in the secure
                Paystack window on this page. For Mobile Money, approve the prompt on your phone.
              </p>
            ) : (
              <>
            <div role="radiogroup" aria-label="Payment method" className="grid gap-2.5 sm:grid-cols-2">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={methodId === m.id}
                    onClick={() => setMethodId(m.id)}
                    className={`flex min-h-[60px] items-center gap-3 bg-white px-[18px] text-[15px] ${methodId === m.id ? radioOn : radioOff}`}
                  >
                    <Image src={m.logo} alt="" width={80} height={56} unoptimized className="h-7 w-10 shrink-0 object-contain" />
                    <span className="flex-1 text-left">{m.name}</span>
                    {m.note ? <span className="text-[11px] uppercase tracking-[0.12em] text-muted">{m.note}</span> : null}
                  </button>
                ))}
              </div>
              <p className="m-0 text-sm font-light leading-[1.6] text-body">
                {isCard
                  ? "Enter your card details in the secure Paystack window. 3-D Secure supported."
                  : "You will get a prompt on the phone number above. Approve it with your Mobile Money PIN."}
              </p>
              </>
            )}
            {payError ? (
              <p role="alert" className="m-0 border border-lowstock bg-white px-4 py-3 text-sm text-lowstock">
                {payError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="label-caps h-16 border-0 bg-brown tracking-[0.2em] text-ivory transition-colors hover:bg-[#3a1307] disabled:bg-[#a99e90]"
            >
              {submitting ? "Preparing your order…" : payments ? `Pay ${money(total)}` : `Pay ${money(total)} with ${method.short}`}
            </button>
            <p className="m-0 text-center text-xs text-muted">
              Secured by Paystack{payments ? "" : " · This demo runs in test mode"}{fee === null ? " · Delivery fee to be confirmed" : ""}
            </p>
          </fieldset>
        </form>

        <aside aria-label="Order summary" className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px] border border-line bg-white p-6 md:p-[30px]">
          <h2 className="m-0 font-display text-[28px] font-normal">Your order</h2>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {cart?.items.map((i) => (
              <li key={i.key} className="flex items-center gap-3.5">
                <span className="relative block h-20 w-16 shrink-0 bg-sand">
                  {i.image ? <Image src={i.image} alt="" fill sizes="64px" className="object-cover object-top" /> : null}
                  <span className="absolute -right-2 -top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brown text-xs text-ivory">{i.quantity}</span>
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="font-display text-[17px]">{i.name}</span>
                  <span className="text-[13px] text-muted">{i.variation.map((v) => `${v.attribute} ${v.value}`).join(" · ")}</span>
                </span>
                <span className="text-[15px] font-light">{money(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="m-0 flex flex-col gap-2.5 border-t border-line pt-4 text-[15px] font-light">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="m-0">{money(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery · {zone.short}</dt><dd className="m-0">{feeLabel}</dd></div>
          </dl>
          <div className="flex items-baseline justify-between border-t border-line pt-4">
            <span className="label-caps tracking-[0.18em]">Total</span>
            <span className="font-display text-[32px]">{money(total)}</span>
          </div>
          <Button href="/cart" variant="outline" size="lg" className="w-full">Edit bag</Button>
        </aside>
      </section>
    </>
  );
}
