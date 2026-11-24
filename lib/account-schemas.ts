import { z } from "zod";
import { ghPhone } from "@/lib/checkout/schemas";

/** One address as the customer types it. The id and default flag are decided by the server. */
export const addressInput = z.object({
  label: z.string().trim().min(1, "Give it a name, e.g. Home").max(30),
  name: z.string().trim().min(2, "Enter the full name").max(120),
  phone: ghPhone,
  address: z.string().trim().min(3, "Enter the address or GhanaPostGPS").max(240),
  area: z.string().trim().max(160).default(""),
});
export type AddressInput = z.infer<typeof addressInput>;

export const addressOp = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), address: addressInput }),
  z.object({ op: z.literal("update"), id: z.string().regex(/^[a-z0-9]{4,20}$/), address: addressInput }),
  z.object({ op: z.literal("remove"), id: z.string().regex(/^[a-z0-9]{4,20}$/) }),
  z.object({ op: z.literal("default"), id: z.string().regex(/^[a-z0-9]{4,20}$/) }),
]);

export const profileInput = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(60),
  lastName: z.string().trim().max(60).default(""),
  phone: z.union([ghPhone, z.literal("")]).default(""),
});
