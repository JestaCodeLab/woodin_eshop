import { z } from "zod";
import { MAX_LINE_QUANTITY } from "./types";

const variation = z.object({
  attribute: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(120),
});

export const addItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY).default(1),
  variation: z.array(variation).max(6).default([]),
});

export const updateItemSchema = z.object({
  key: z.string().min(1).max(300),
  /** 0 removes the line. */
  quantity: z.number().int().min(0).max(MAX_LINE_QUANTITY),
});

export const removeItemSchema = z.object({
  key: z.string().min(1).max(300),
});

export const couponSchema = z.object({
  code: z.string().trim().min(1).max(40),
});
