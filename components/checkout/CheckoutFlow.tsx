"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { IMG, LOGO } from "@/lib/images";
import { MAIN_LINKS } from "@/lib/links";
import { METHODS, ZONES, type MethodId, type ZoneId } from "@/lib/checkout-config";

/**
 * Checkout, demo mode. Nothing here is sent anywhere or stored: the form lives in component
 * state and disappears on reload. Payment is simulated in the style of Paystack test mode.
 *
 * Going live (later): replace `startPayment` with a redirect to the WooCommerce checkout
 * page where the Paystack plugin runs, or to a Paystack inline transaction.
 */

type Step = "form" | "paying" | "done";
type Errors = Partial<Record<"name" | "phone" | "email" | "address" | "store", string>>;

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

export function CheckoutFlow({ pickupStores }: { pickupStores: PickupStore[] }) {
  const { cart, status, clear } = useCart();
  const search = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const [step, setStep] = useState<Step>("form");
  const [zoneId, setZoneId] = useState<ZoneId>("accra");
  const [methodId, setMethodId] = useState<MethodId>(
    METHODS.some((m) => m.id === search.get("pay")) ? (search.get("pay") as MethodId) : "mtn",
  );
  const [errors, setErrors] = useState<Errors>({});
  const [phone, setPhone] = useState("");
  const [receipt, setReceipt] = useState<{ total: string; zone: string; method: string } | null>(null);

  const zone = ZONES.find((z) => z.id === zoneId)!;
  const method = METHODS.find((m) => m.id === methodId)!;
  const currency = cart?.currency ?? "GHS";
  const money = (n: number | null) => (n === null ? "GH₵ [PRICE]" : formatMoney(n, currency));
  const subtotal = cart?.subtotal ?? 0;
  const total = subtotal + (zone.fee ?? 0);
  const feeLabel = zone.fee === null ? "GH₵ [FEE]" : zone.fee === 0 ? "Free" : money(zone.fee);
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
    return e;
  }

  async function finish() {
    setReceipt({ total: money(total), zone: zone.name, method: method.short });
    setStep("done");
    await clear();
  }

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
    if (isCard) void finish();
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
          <p className="m-0 text-[17px] font-light leading-[1.7] text-body" role="status">
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
            <p className="m-0 text-base font-light leading-[1.7] text-body" role="status">
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
                <input id="co-name" name="name" type="text" autoComplete="name" placeholder="Ama Mensah" aria-invalid={!!errors.name} aria-describedby={errors.name ? "co-name-err" : undefined} className={inputCls} />
              </Field>
              <Field id="co-phone" label="Phone number" error={errors.phone}>
                <input id="co-phone" name="phone" type="tel" autoComplete="tel" placeholder="024 000 0000" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "co-phone-err" : undefined} className={inputCls} />
              </Field>
            </div>
            <Field id="co-email" label="Email for your receipt" error={errors.email}>
              <input id="co-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? "co-email-err" : undefined} className={inputCls} />
            </Field>
          </fieldset>

          <fieldset className="m-0 flex min-w-0 flex-col gap-3.5 border-0 p-0">
            <legend className="mb-4 p-0 font-display text-[30px]">2. Delivery</legend>
            <div role="radiogroup" aria-label="Delivery option" className="grid gap-2.5 sm:grid-cols-3">
              {ZONES.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  role="radio"
                  aria-checked={zoneId === z.id}
                  onClick={() => setZoneId(z.id)}
                  className={`flex min-h-[110px] flex-col items-start gap-1 bg-white p-[18px] text-left ${zoneId === z.id ? radioOn : radioOff}`}
                >
                  <span className="font-display text-xl">{z.name}</span>
                  <span className="text-[13px] text-muted">{z.eta}</span>
                  <span className="mt-1.5 text-[15px]">{z.fee === null ? "GH₵ [FEE]" : z.fee === 0 ? "Free" : money(z.fee)}</span>
                </button>
              ))}
            </div>
            {zoneId !== "store" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="co-addr" label="Address or GhanaPostGPS" error={errors.address}>
                  <input id="co-addr" name="address" type="text" placeholder="e.g. GA-123-4567" aria-invalid={!!errors.address} aria-describedby={errors.address ? "co-addr-err" : undefined} className={inputCls} />
                </Field>
                <Field id="co-area" label="Area / landmark">
                  <input id="co-area" name="area" type="text" placeholder="e.g. Near Osu Castle" className={inputCls} />
                </Field>
              </div>
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
            <legend className="mb-4 p-0 font-display text-[30px]">3. Payment</legend>
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
                  <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: m.dot }} />
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
            <button type="submit" className="label-caps h-16 border-0 bg-brown tracking-[0.2em] text-ivory transition-colors hover:bg-[#3a1307]">
              Pay {money(total)} with {method.short}
            </button>
            <p className="m-0 text-center text-xs text-muted">
              Secured by Paystack · This demo runs in test mode{zone.fee === null ? " · Delivery fee to be confirmed" : ""}
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
          <Link href="/cart" className="p-2 text-center text-[13px]">Edit bag</Link>
        </aside>
      </section>
    </>
  );
}
