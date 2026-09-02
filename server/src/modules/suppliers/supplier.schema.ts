import { z } from "zod";

export const PriceTierSchema = z.object({
  minQuantity: z.number().int().positive({ error: "Minimum quantity must be greater than 0" }),
  unitPrice: z.number().positive({ error: "Unit price must be greater than 0" }),
});

export const CreateSupplierSchema = z.object({
  name: z
    .string({ error: "Supplier name is required" })
    .trim()
    .min(2, { error: "Supplier name must be at least 2 characters" })
    .max(255),
  code: z
    .string({ error: "Supplier code is required" })
    .trim()
    .min(2, { error: "Supplier code must be at least 2 characters" })
    .max(50)
    .toUpperCase(),
  contactEmail: z.string().trim().email({ error: "Invalid email format" }).optional(),
  contactPhone: z.string().trim().max(50).optional(),
  website: z.string().trim().url({ error: "Invalid website URL" }).optional(),
  reliabilityScore: z
    .number({ error: "Reliability score must be a number" })
    .min(0)
    .max(100)
    .default(95.0),
  leadTimeDaysAverage: z
    .number({ error: "Average lead time must be a number" })
    .min(0)
    .default(3.0),
  paymentTerms: z.string().trim().max(100).default("Net 30"),
  currency: z.string().trim().max(10).default("USD"),
});

export const UpdateSupplierSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  contactEmail: z.string().trim().email().nullable().optional(),
  contactPhone: z.string().trim().max(50).nullable().optional(),
  website: z.string().trim().url().nullable().optional(),
  reliabilityScore: z.number().min(0).max(100).optional(),
  leadTimeDaysAverage: z.number().min(0).optional(),
  paymentTerms: z.string().trim().max(100).optional(),
  currency: z.string().trim().max(10).optional(),
});

export const SupplierQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  search: z.string().trim().optional(),
});

export const SupplierIdParamSchema = z.object({
  id: z.uuid({ error: "Invalid supplier UUID format" }),
});

export const AddSupplierItemSchema = z
  .object({
    itemId: z.uuid({ error: "Invalid item UUID format" }).optional(),
    partNumber: z.string().trim().min(1, { error: "Part number cannot be empty" }).optional(),
    supplierPartNumber: z
      .string({ error: "Supplier part number is required" })
      .trim()
      .min(1, { error: "Supplier part number cannot be empty" })
      .max(100),
    unitPrice: z
      .number({ error: "Unit price must be a number" })
      .positive({ error: "Unit price must be greater than 0" }),
    minimumOrderQuantity: z
      .number({ error: "Minimum order quantity must be a number" })
      .positive()
      .default(1),
    packageType: z.string().trim().max(100).default("Bulk"),
    stockAvailable: z
      .number({ error: "Stock available must be a number" })
      .min(0)
      .default(0),
    leadTimeDays: z
      .number({ error: "Lead time must be a number" })
      .min(0)
      .default(3.0),
    priceTiers: z.array(PriceTierSchema).default([]),
    isPreferred: z.boolean().default(false),
  })
  .refine((data) => data.itemId !== undefined || data.partNumber !== undefined, {
    message: "Either itemId or partNumber must be provided",
  });

export const UpdateSupplierItemSchema = z.object({
  supplierPartNumber: z.string().trim().min(1).max(100).optional(),
  unitPrice: z.number().positive().optional(),
  minimumOrderQuantity: z.number().positive().optional(),
  packageType: z.string().trim().max(100).optional(),
  stockAvailable: z.number().min(0).optional(),
  leadTimeDays: z.number().min(0).optional(),
  priceTiers: z.array(PriceTierSchema).optional(),
  isPreferred: z.boolean().optional(),
});

export const SupplierItemIdParamSchema = z.object({
  id: z.uuid({ error: "Invalid supplier UUID format" }),
  itemId: z.uuid({ error: "Invalid item UUID format" }),
});

export const ItemParamSchema = z.object({
  itemId: z.uuid({ error: "Invalid item UUID format" }),
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;
export type SupplierQueryInput = z.infer<typeof SupplierQuerySchema>;
export type AddSupplierItemInput = z.infer<typeof AddSupplierItemSchema>;
export type UpdateSupplierItemInput = z.infer<typeof UpdateSupplierItemSchema>;
