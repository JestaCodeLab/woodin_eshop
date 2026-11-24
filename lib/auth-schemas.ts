import { z } from "zod";
import { ghPhone } from "@/lib/checkout/schemas";

export const emailField = z.string().trim().toLowerCase().email().max(200);

/** Registration details. Typed by the customer, so validated again on the server. */
export const registerDetails = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: ghPhone,
});

export const requestSchema = z.object({
  mode: z.enum(["login", "register"]),
  email: emailField,
  name: z.string().optional(),
  phone: z.string().optional(),
  turnstile: z.string().optional(),
});

export const verifySchema = z.object({
  mode: z.enum(["login", "register"]),
  email: emailField,
  code: z.string().trim().regex(/^\d{6}$/),
  name: z.string().optional(),
  phone: z.string().optional(),
});
