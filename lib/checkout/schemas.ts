import { z } from "zod";
import { REFERENCE_PATTERN } from "./reference";

export const ghPhone = z
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
      zone: z.string().trim().regex(/^[a-z0-9-]{1,40}$/),
      address: z.string().trim().max(240).optional(),
      area: z.string().trim().max(160).optional(),
      storeId: z.string().trim().max(60).optional(),
      /**
       * Where to deliver when it differs from the billing address (address/area above). Absent means
       * "ship to my billing address". Ignored for store pickup.
       */
      shipTo: z
        .object({
          name: z.string().trim().min(2).max(120),
          phone: ghPhone,
          address: z.string().trim().min(3).max(240),
          area: z.string().trim().max(160).optional(),
        })
        .optional(),
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

/** WD-<orderId>-<24 hex>. The random part makes the reference unguessable (8 hex accepted for older orders). */
export const referenceSchema = z.object({ reference: z.string().regex(REFERENCE_PATTERN) });
