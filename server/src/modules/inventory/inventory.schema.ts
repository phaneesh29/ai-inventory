import { z } from "zod";

export const AddInventoryItemSchema = z
  .object({
    itemId: z.uuid({ error: "Invalid item UUID" }).optional(),
    partNumber: z.string().trim().min(1, { error: "Part number cannot be empty" }).optional(),
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    category: z.string().trim().min(1).optional(),
    unit: z.string().trim().min(1).optional(),
    specifications: z.record(z.string(), z.any()).optional(),
    quantityOnHand: z
      .number({ error: "Quantity on hand must be a number" })
      .min(0, { error: "Quantity on hand cannot be negative" })
      .default(0),
    quantityReserved: z
      .number({ error: "Quantity reserved must be a number" })
      .min(0, { error: "Quantity reserved cannot be negative" })
      .default(0),
    reorderThreshold: z
      .number({ error: "Reorder threshold must be a number" })
      .min(0, { error: "Reorder threshold cannot be negative" })
      .default(10),
    location: z
      .string({ error: "Location must be a string" })
      .trim()
      .min(1, { error: "Location cannot be empty" })
      .max(100)
      .default("Main Warehouse"),
    unitCost: z.number().min(0, { error: "Unit cost cannot be negative" }).optional(),
  })
  .refine((data) => data.itemId !== undefined || data.partNumber !== undefined, {
    message: "Either itemId or partNumber must be provided",
  });

export const UpdateInventoryItemSchema = z.object({
  quantityOnHand: z.number().min(0, { error: "Quantity on hand cannot be negative" }).optional(),
  quantityReserved: z.number().min(0, { error: "Quantity reserved cannot be negative" }).optional(),
  reorderThreshold: z.number().min(0, { error: "Reorder threshold cannot be negative" }).optional(),
  location: z.string().trim().min(1).max(100).optional(),
  unitCost: z.number().min(0, { error: "Unit cost cannot be negative" }).nullable().optional(),
});

export const AdjustStockSchema = z.object({
  id: z.uuid({ error: "Invalid inventory UUID" }).optional(),
  itemId: z.uuid({ error: "Invalid item UUID" }).optional(),
  delta: z.number({ error: "Adjustment delta is required" }),
  reason: z.string().trim().min(1, { error: "Adjustment reason is required" }).default("Manual Adjustment"),
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
}).refine((data) => data.id !== undefined || data.itemId !== undefined, {
  message: "Either inventory id or itemId must be provided",
});

export const AllocateStockSchema = z.object({
  id: z.uuid({ error: "Invalid inventory UUID" }).optional(),
  itemId: z.uuid({ error: "Invalid item UUID" }).optional(),
  quantity: z.number().positive({ error: "Quantity must be greater than 0" }),
  notes: z.string().trim().optional(),
}).refine((data) => data.id !== undefined || data.itemId !== undefined, {
  message: "Either inventory id or itemId must be provided",
});

export const ReleaseStockSchema = z.object({
  id: z.uuid({ error: "Invalid inventory UUID" }).optional(),
  itemId: z.uuid({ error: "Invalid item UUID" }).optional(),
  quantity: z.number().positive({ error: "Quantity must be greater than 0" }),
  notes: z.string().trim().optional(),
}).refine((data) => data.id !== undefined || data.itemId !== undefined, {
  message: "Either inventory id or itemId must be provided",
});

export const InventoryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  lowStock: z.enum(["true", "false"]).optional(),
});

export const InventoryIdParamSchema = z.object({
  id: z.uuid({ error: "Invalid inventory UUID format" }),
});

export type AddInventoryItemInput = z.infer<typeof AddInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof UpdateInventoryItemSchema>;
export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;
export type AllocateStockInput = z.infer<typeof AllocateStockSchema>;
export type ReleaseStockInput = z.infer<typeof ReleaseStockSchema>;
export type InventoryQueryInput = z.infer<typeof InventoryQuerySchema>;
