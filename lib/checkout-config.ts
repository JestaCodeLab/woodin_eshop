/** "store" (click & collect) or "zone-<WooCommerce zone id>"; fallback options use accra / nation / store. */
export type ZoneId = string;

/** Label used for the WooCommerce shipping line of a store-pickup order. */
export const PICKUP_ZONE_LABEL = "Click & collect";

/** Built-in fallback options, used by the simulated checkout and when WooCommerce zones are unavailable. Fees are unconfirmed ([FEE]). */
export const ZONES: { id: ZoneId; name: string; short: string; eta: string; fee: number | null }[] = [
  { id: "accra", name: "Accra & Tema", short: "Accra", eta: "Arrives by [DAY]", fee: null },
  { id: "nation", name: "Other regions", short: "Nationwide", eta: "[X] working days", fee: null },
  { id: "store", name: "Click & collect", short: "Store pickup", eta: "Ready in [X] hours", fee: 0 },
];

export type MethodId = "mtn" | "telecel" | "at" | "card";

export const METHODS: { id: MethodId; name: string; short: string; logo: string; note: string }[] = [
  { id: "mtn", name: "MTN MoMo", short: "MTN MoMo", logo: "/payments/mtn.png", note: "Most used" },
  { id: "telecel", name: "Telecel Cash", short: "Telecel Cash", logo: "/payments/telecel.png", note: "" },
  { id: "at", name: "AT Money", short: "AT Money", logo: "/payments/at.png", note: "" },
  { id: "card", name: "Visa or Mastercard", short: "card", logo: "/payments/visa.png", note: "3-D Secure" },
];
