import { z } from "zod";

const ghPhone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+?233|0)\d{9}$/, "Enter a Ghana mobile number"));

export const startCheckoutSchema = z
  .object({
    contact: z.object({
      name: z.string().trim().min(2).max(120),
      phone: ghPhone,
      email: z.string().trim().toLowerCase().email().max(200),
    }),
    delivery: z.object({
      zone: z.enum(["accra", "nation", "store"]),
      address: z.string().trim().max(240).optional(),
      area: z.string().trim().max(160).optional(),
      storeId: z.string().trim().max(60).optional(),
    }),
  })
  .refine((v) => v.delivery.zone === "store" || (v.delivery.address ?? "").length >= 3, {
    path: ["delivery", "address"],
    message: "Address is required for delivery",
  })
  .refine((v) => v.delivery.zone !== "store" || !!v.delivery.storeId, {
    path: ["delivery", "storeId"],
    message: "Choose a store",
  });

export type StartCheckoutInput = z.infer<typeof startCheckoutSchema>;

/** WD-<orderId>-<8 hex>. The random part makes the reference unguessable. */
export const referenceSchema = z.object({ reference: z.string().regex(/^WD-\d+-[a-f0-9]{8}$/) });
