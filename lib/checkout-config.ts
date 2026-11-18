import stores from "@/data/stores.json";

/** Demo store list for the click & collect dropdown. All values are placeholders. [CONFIRM] */
export const PICKUP_STORES: { id: string; name: string; region: string; address: string }[] = stores;

export type ZoneId = "accra" | "nation" | "store";

/** Delivery fees are unconfirmed ([FEE]); null renders the placeholder and is left out of the total. */
export const ZONES: { id: ZoneId; name: string; short: string; eta: string; fee: number | null }[] = [
  { id: "accra", name: "Accra & Tema", short: "Accra", eta: "Arrives by [DAY]", fee: null },
  { id: "nation", name: "Other regions", short: "Nationwide", eta: "[X] working days", fee: null },
  { id: "store", name: "Click & collect", short: "Store pickup", eta: "Ready in [X] hours", fee: 0 },
];

export type MethodId = "mtn" | "telecel" | "at" | "card";

export const METHODS: { id: MethodId; name: string; short: string; dot: string; note: string }[] = [
  { id: "mtn", name: "MTN MoMo", short: "MTN MoMo", dot: "#FFCC00", note: "Most used" },
  { id: "telecel", name: "Telecel Cash", short: "Telecel Cash", dot: "#E60000", note: "" },
  { id: "at", name: "AT Money", short: "AT Money", dot: "#1E4FA8", note: "" },
  { id: "card", name: "Visa or Mastercard", short: "card", dot: "#1A120E", note: "3-D Secure" },
];
