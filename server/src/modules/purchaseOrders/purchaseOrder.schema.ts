import { z } from "zod";

export const PurchaseOrderQuerySchema = z.object({
  status: z.string().optional(),
  supplierId: z.uuid({ error: "Invalid supplier UUID" }).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ReceivePurchaseOrderSchema = z.object({
  deliveryDate: z.string().datetime({ error: "Invalid ISO datetime" }).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export type PurchaseOrderQueryInput = z.infer<typeof PurchaseOrderQuerySchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof ReceivePurchaseOrderSchema>;
