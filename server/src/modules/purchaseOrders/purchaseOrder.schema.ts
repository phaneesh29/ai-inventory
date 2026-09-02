import { z } from "zod";

export const PurchaseOrderQuerySchema = z.object({
  status: z.string().optional(),
  supplierId: z.uuid({ error: "Invalid supplier UUID" }).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const CreatePurchaseOrderItemSchema = z.object({
  itemId: z.uuid({ error: "Invalid item UUID format" }),
  supplierPartNumber: z.string().trim().min(1, { error: "Supplier part number is required" }),
  quantity: z.number().positive({ error: "Quantity must be greater than 0" }),
  unitPrice: z.number().positive({ error: "Unit price must be greater than 0" }),
});

export const CreatePurchaseOrderSchema = z.object({
  supplierId: z.uuid({ error: "Invalid supplier UUID format" }),
  currency: z.string().trim().default("USD"),
  notes: z.string().trim().optional(),
  status: z.string().trim().default("DRAFT"),
  items: z.array(CreatePurchaseOrderItemSchema).min(1, { error: "At least one item is required" }),
});

export const UpdatePurchaseOrderStatusSchema = z.object({
  status: z.string().trim().min(1, { error: "Status is required" }),
  notes: z.string().trim().optional(),
});

export const ReceivePurchaseOrderSchema = z.object({
  deliveryDate: z.string().datetime({ error: "Invalid ISO datetime" }).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export type PurchaseOrderQueryInput = z.infer<typeof PurchaseOrderQuerySchema>;
export type CreatePurchaseOrderItemInput = z.infer<typeof CreatePurchaseOrderItemSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;
export type UpdatePurchaseOrderStatusInput = z.infer<typeof UpdatePurchaseOrderStatusSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof ReceivePurchaseOrderSchema>;
