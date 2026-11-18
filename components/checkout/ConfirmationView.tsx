"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { formatMoney } from "@/lib/format";
import { IMG, LOGO } from "@/lib/images";
import { MAIN_LINKS } from "@/lib/links";

type Result = { status: "paid" | "pending" | "failed" | "review"; orderNumber?: string; total?: string; delivery?: string };
type View = { kind: "checking" } | { kind: "result"; result: Result } | { kind: "error"; message: string };

const POLL_MS = 3000;
const MAX_TRIES = 25; // ~75s: enough for a Mobile Money approval

/**
 * Landing page after paying. Never trusts the URL: it asks the server, which asks Paystack.
 * Safe to refresh. Empties the bag once the order is confirmed paid.
 */
export function ConfirmationView() {
  const reference = useSearchParams().get("reference") ?? "";
  const { clear } = useCart();
  const [view, setView] = useState<View>({ kind: "checking" });
  const cleared = useRef(false);

  useEffect(() => {
    if (!/^WD-\d+-[a-f0-9]{8}$/.test(reference)) return;
    let stop = false;
    let tries = 0;

    const tick = async () => {
      tries++;
      try {
        const res = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const body = await res.json().catch(() => null);
        if (stop) return;
        if (!res.ok) {
          setView({ kind: "error", message: body?.message ?? "We could not confirm your payment yet." });
          return;
        }
        const result = body as Result;
        if (result.status === "pending" && tries < MAX_TRIES) {
          timer = setTimeout(tick, POLL_MS);
          return;
        }
        setView({ kind: "result", result });
        if (result.status === "paid" && !cleared.current) {
          cleared.current = true;
          void clear();
        }
      } catch {
        if (!stop && tries < MAX_TRIES) timer = setTimeout(tick, POLL_MS);
        else if (!stop) setView({ kind: "error", message: "We could not reach the shop. Your payment is safe: refresh this page in a moment." });
      }
    };
    let timer = setTimeout(tick, 0);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
    // `clear` is stable enough for a one-shot call; re-running would restart polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  if (!/^WD-\d+-[a-f0-9]{8}$/.test(reference)) {
    return (
      <Message title="We could not find that order" body="The payment link looks incomplete. If you were charged, check your email for the receipt.">
        <Button href="/shop" variant="primary">Back to the shop</Button>
      </Message>
    );
  }

  if (view.kind === "checking") {
    return (
      <div className="content-wrap">
        <LogoLoader label="Confirming your payment" className="min-h-[60vh]" />
        <p className="-mt-24 pb-24 text-center text-[15px] font-light text-body">Confirming your payment…</p>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <Message title="Still confirming" body={view.message}>
        <Button onClick={() => window.location.reload()} variant="primary">Check again</Button>
      </Message>
    );
  }

  const { status, orderNumber, total, delivery } = view.result;

  if (status === "failed") {
    return (
      <Message title="Payment not completed" body="That payment did not go through, and you have not been charged. Your bag is still saved.">
        <Button href="/checkout" variant="primary">Try again</Button>
        <Button href="/cart" variant="outline-brown">Back to bag</Button>
      </Message>
    );
  }
  if (status === "review") {
    return (
      <Message title="We are checking your order" body={`Your payment was received for order #${orderNumber ?? ""}, but we need to confirm a detail before we process it. We will email you shortly.`}>
        <Button href="/shop" variant="primary">Continue shopping</Button>
      </Message>
    );
  }
  if (status === "pending") {
    return (
      <Message title="Waiting for your payment" body="We have not received the payment yet. If you approved a Mobile Money prompt, it can take a minute.">
        <Button onClick={() => window.location.reload()} variant="primary">Check again</Button>
      </Message>
    );
  }

  return (
    <section className="content-wrap flex flex-wrap items-stretch pb-24 pt-10">
      <div className="relative min-h-[340px] min-w-0 flex-[1_1_520px] overflow-hidden bg-espresso md:min-h-[620px]">
        <Image src={IMG.modelsSmiling} alt="Three models smiling in Woodin prints" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" style={{ objectPosition: "50% 30%" }} />
      </div>
      <div className="flex min-w-0 flex-[1_1_460px] flex-col justify-center gap-5 border border-line bg-white p-8 md:p-14">
        <Image src={LOGO.mark.src} width={LOGO.mark.width} height={LOGO.mark.height} alt="" className="h-auto w-12" />
        <h1 className="m-0 font-display text-[clamp(40px,5vw,62px)] font-normal leading-none text-brown">
          Merci. <span className="italic">Thank you.</span>
        </h1>
        <p className="m-0 text-base font-light leading-[1.7] text-body" role="status">
          Your order <strong className="font-medium">#{orderNumber}</strong> is confirmed and paid. We have sent your receipt by email.
        </p>
        <dl className="m-0 flex flex-col gap-2.5 border-y border-line py-4 text-[15px] font-light">
          <div className="flex justify-between"><dt>Paid with</dt><dd className="m-0 font-medium">Paystack</dd></div>
          {delivery ? <div className="flex justify-between gap-4"><dt>Delivery</dt><dd className="m-0 text-right font-medium">{delivery}</dd></div> : null}
          {total ? <div className="flex justify-between"><dt>Total</dt><dd className="m-0 font-medium">{formatMoney(Number(total), "GHS")}</dd></div> : null}
        </dl>
        <div className="flex flex-wrap gap-2.5">
          <Button href="/shop" variant="primary" className="px-[30px] py-[18px]">Continue shopping</Button>
          <Button href={MAIN_LINKS.home} variant="outline-brown" className="px-[30px] py-[17px]">Back to woodinfashion.com</Button>
        </div>
        <p className="m-0 font-display text-xl italic">Wear it, tag it — #WearWoodin</p>
      </div>
    </section>
  );
}

function Message({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto flex max-w-[640px] flex-col items-center gap-5 px-4 pb-28 pt-24 text-center">
      <h1 className="m-0 font-display text-[clamp(34px,5vw,48px)] font-normal leading-none text-brown">{title}</h1>
      <p className="m-0 text-base font-light leading-[1.7] text-body" role="status">{body}</p>
      <div className="flex flex-wrap justify-center gap-3">{children}</div>
    </section>
  );
}
