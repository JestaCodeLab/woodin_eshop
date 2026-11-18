import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cartBackend, CartError, type Cart } from "@/lib/cart";
import { freeDeliveryThreshold } from "@/lib/config";
import { getDeliveryOptions, type DeliveryOption } from "@/lib/delivery";
import { PICKUP_ZONE_LABEL } from "@/lib/checkout-config";
import { addOrderNote, createOrder, getOrder, updateOrder, type NewOrder } from "@/lib/orders";
import { initializeTransaction, verifyTransaction } from "@/lib/paystack";
import { isLivePaystackKey, paystackChannels } from "@/lib/payments-config";
import { SITE_URL } from "@/lib/site";
import { getStores } from "@/lib/stores";
import type { StartCheckoutInput } from "./schemas";

/** Thrown for problems the customer can understand (shown as-is). Everything else is a generic 500. */
export class CheckoutError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
const pesewas = (n: number) => Math.round(n * 100);

const PENDING_COOKIE = "woodin_pending_order";

// ---------------------------------------------------------------------------
// Quote: the ONLY place prices are decided. Nothing from the browser sets an amount.
// ---------------------------------------------------------------------------

export interface Quote {
  cart: Cart;
  option: DeliveryOption;
  subtotal: number;
  shipping: number;
  total: number;
  usesDemoPrices: boolean;
}

export async function buildQuote(zone: string): Promise<Quote> {
  const cart = await cartBackend().get();
  if (cart.items.length === 0) throw new CheckoutError(409, "empty_cart", "Your bag is empty.");
  if (cart.currency !== "GHS") throw new CheckoutError(500, "currency", "Unsupported currency.");
  if (cart.items.some((i) => !i.inStock)) throw new CheckoutError(409, "out_of_stock", "An item in your bag is out of stock.");
  if (cart.items.some((i) => i.unitPrice === null)) throw new CheckoutError(409, "no_price", "An item in your bag has no price yet.");

  const option = (await getDeliveryOptions()).find((o) => o.id === zone);
  if (!option || option.fee === null) throw new CheckoutError(409, "no_delivery_fee", "That delivery option is not available yet.");

  const subtotal = cart.items.reduce((n, i) => n + (i.lineTotal ?? 0), 0);
  const threshold = freeDeliveryThreshold();
  // "Free Accra delivery over GH₵ X" (announcement bar + bag progress bar)
  const shipping = option.freeEligible && threshold !== null && subtotal >= threshold ? 0 : option.fee;
  return {
    cart,
    option,
    subtotal,
    shipping,
    total: subtotal + shipping,
    usesDemoPrices: cart.items.some((i) => i.demoPrice) || option.demo,
  };
}

// ---------------------------------------------------------------------------
// Start: create a pending WooCommerce order, then a Paystack transaction for it.
// ---------------------------------------------------------------------------

export interface StartResult {
  orderId: number;
  orderNumber: string;
  reference: string;
  accessCode: string;
  authorizationUrl: string;
  /** Pesewas. */
  amount: number;
  total: number;
}

export async function startCheckout(input: StartCheckoutInput): Promise<StartResult> {
  const quote = await buildQuote(input.delivery.zone);

  // Demo prices are placeholders. They may be charged in Paystack TEST mode only.
  if (quote.usesDemoPrices && isLivePaystackKey()) {
    console.error("[checkout] refused: demo prices with a live Paystack key");
    throw new CheckoutError(409, "demo_prices_blocked", "Checkout is not available yet.");
  }

  const store = input.delivery.zone === "store" ? getStores().find((s) => s.id === input.delivery.storeId) : undefined;
  if (input.delivery.zone === "store" && !store) throw new CheckoutError(400, "bad_store", "Choose a store to collect from.");

  const [first, ...rest] = input.contact.name.split(" ");
  const phone = input.contact.phone.replace(/^0/, "+233").replace(/^233/, "+233");
  const address = store ? { address_1: `Collect from: ${store.name}`, address_2: store.address } : { address_1: input.delivery.address ?? "", address_2: input.delivery.area ?? "" };
  const person = { first_name: first, last_name: rest.join(" "), country: "GH", ...address };
  const nonce = randomBytes(4).toString("hex");

  const order: NewOrder = {
    status: "pending",
    currency: "GHS",
    payment_method: "paystack",
    payment_method_title: "Paystack (Mobile Money / Card)",
    set_paid: false,
    billing: { ...person, email: input.contact.email, phone },
    shipping: person,
    customer_note: input.delivery.area ? `Landmark: ${input.delivery.area}` : undefined,
    line_items: quote.cart.items.map((i) => ({
      product_id: i.productId,
      quantity: i.quantity,
      // Explicit totals: the live catalogue price may differ from what the shopper was quoted.
      subtotal: money(i.lineTotal ?? 0),
      total: money(i.lineTotal ?? 0),
      meta_data: i.variation.map((v) => ({ key: v.attribute, value: v.value })),
    })),
    shipping_lines: [
      {
        method_id: input.delivery.zone === "store" ? "local_pickup" : "flat_rate",
        method_title: input.delivery.zone === "store" ? `${PICKUP_ZONE_LABEL}: ${store?.name}` : quote.option.name,
        total: money(quote.shipping),
      },
    ],
    meta_data: [
      { key: "woodin_eshop", value: "1" },
      { key: "woodin_nonce", value: nonce },
      ...(quote.usesDemoPrices ? [{ key: "woodin_demo_prices", value: "yes (TEST ORDER)" }] : []),
    ],
  };

  const created = await createOrder(order);
  const reference = `WD-${created.id}-${nonce}`;

  let tx;
  try {
    tx = await initializeTransaction({
      email: input.contact.email,
      amount: pesewas(quote.total),
      reference,
      callbackUrl: `${SITE_URL}/checkout/confirmation?reference=${reference}`,
      channels: paystackChannels(),
      metadata: { order_id: created.id, order_number: created.number },
    });
  } catch (e) {
    await updateOrder(created.id, { status: "cancelled" }).catch(() => undefined);
    throw e;
  }

  // One pending order per browser: cancel the previous unpaid attempt, remember this one.
  const jar = await cookies();
  const previous = Number(jar.get(PENDING_COOKIE)?.value);
  if (Number.isInteger(previous) && previous > 0 && previous !== created.id) {
    const old = await getOrder(previous).catch(() => null);
    if (old?.status === "pending") await updateOrder(previous, { status: "cancelled" }).catch(() => undefined);
  }
  jar.set(PENDING_COOKIE, String(created.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 });

  return {
    orderId: created.id,
    orderNumber: created.number,
    reference,
    accessCode: tx.access_code,
    authorizationUrl: tx.authorization_url,
    amount: pesewas(quote.total),
    total: quote.total,
  };
}

// ---------------------------------------------------------------------------
// Finalize: called by the webhook AND by the confirmation page. Safe to call repeatedly.
// ---------------------------------------------------------------------------

export interface FinalizeResult {
  status: "paid" | "pending" | "failed" | "review";
  orderNumber?: string;
  total?: string;
  delivery?: string;
}

export async function finalizeByReference(reference: string): Promise<FinalizeResult> {
  const m = /^WD-(\d+)-([a-f0-9]{8})$/.exec(reference);
  if (!m) throw new CheckoutError(400, "bad_reference", "Unknown payment reference.");
  const orderId = Number(m[1]);

  const order = await getOrder(orderId).catch(() => null);
  const nonce = order?.meta_data.find((x) => x.key === "woodin_nonce")?.value;
  if (!order || nonce !== m[2]) throw new CheckoutError(404, "order_not_found", "We could not find that order.");

  const summary = { orderNumber: order.number, total: order.total, delivery: order.shipping_lines[0]?.method_title };
  if (order.status === "processing" || order.status === "completed") return { status: "paid", ...summary };
  if (order.status === "cancelled" || order.status === "failed") return { status: "failed", ...summary };

  // Never trust the browser or the webhook body: ask Paystack.
  const tx = await verifyTransaction(reference);
  // "abandoned" is what Paystack reports for a transaction that was started but not paid YET (the
  // popup is open, or a Mobile Money prompt is waiting on the phone), so it counts as pending.
  if (tx.status === "failed" || tx.status === "reversed") return { status: "failed", ...summary };
  if (tx.status !== "success") return { status: "pending", ...summary };

  if (tx.reference !== reference || tx.currency !== "GHS" || tx.amount !== pesewas(Number(order.total))) {
    await updateOrder(orderId, { status: "on-hold" }).catch(() => undefined);
    await addOrderNote(orderId, `Paystack payment ${reference} succeeded but did not match the order (paid ${tx.amount / 100} ${tx.currency}, order ${order.total}). Review manually.`).catch(() => undefined);
    return { status: "review", ...summary };
  }

  await updateOrder(orderId, { status: "processing", set_paid: true, transaction_id: String(tx.id) });
  await addOrderNote(orderId, `Paid with Paystack. Reference ${reference}, transaction ${tx.id}.`).catch(() => undefined);
  return { status: "paid", ...summary };
}

export { CartError };
